"""
Savings Goals API endpoints
Управление целями накоплений
"""
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update, func, and_
from sqlalchemy.orm import selectinload
from typing import Optional, List
from datetime import date, datetime, timedelta

from app.database import get_db
from app.models.models import User, SavingsGoal, GoalContribution
from app.schemas.goals import (
    GoalCreate, GoalUpdate, GoalResponse, GoalWithContributions,
    GoalListResponse, GoalStatsResponse,
    ContributionCreate, ContributionResponse,
    QuickDeposit, QuickDepositResponse
)
from app.utils.auth import get_current_user
from app.services.cache import cache_service

router = APIRouter()


# ============================================
# HELPER FUNCTIONS
# ============================================

def calculate_goal_fields(goal: SavingsGoal) -> dict:
    """Вычислить дополнительные поля цели"""
    progress = (goal.current_amount / goal.target_amount * 100) if goal.target_amount > 0 else 0
    remaining = max(0, goal.target_amount - goal.current_amount)
    
    days_left = None
    monthly_target = None
    
    if goal.deadline:
        days_left = (goal.deadline - date.today()).days
        if days_left > 0 and remaining > 0:
            months_left = max(1, days_left / 30)
            monthly_target = remaining / months_left
    
    return {
        "progress_percent": round(progress, 1),
        "remaining_amount": remaining,
        "days_left": days_left,
        "monthly_target": round(monthly_target, 2) if monthly_target else None
    }


def goal_to_response(goal: SavingsGoal) -> GoalResponse:
    """Преобразовать модель в response"""
    fields = calculate_goal_fields(goal)
    return GoalResponse(
        id=goal.id,
        name=goal.name,
        description=goal.description,
        target_amount=goal.target_amount,
        current_amount=goal.current_amount,
        currency=goal.currency,
        icon=goal.icon,
        color=goal.color,
        deadline=goal.deadline,
        is_completed=goal.is_completed,
        completed_at=goal.completed_at,
        is_active=goal.is_active,
        auto_contribute=goal.auto_contribute,
        auto_contribute_percent=goal.auto_contribute_percent,
        created_at=goal.created_at,
        updated_at=goal.updated_at,
        **fields
    )


# ============================================
# CRUD ENDPOINTS
# ============================================

@router.get("", response_model=GoalListResponse)
async def get_goals(
    active_only: bool = Query(True, description="Только активные цели"),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Получить все цели пользователя"""
    # Check cache
    cache_key = cache_service.make_key("goals", current_user.user_id, str(active_only))
    cached = await cache_service.get(cache_key)
    if cached:
        return cached
    
    query = select(SavingsGoal).where(
        SavingsGoal.user_id == current_user.user_id
    ).order_by(SavingsGoal.created_at.desc())
    
    if active_only:
        query = query.where(SavingsGoal.is_active == True)
    
    result = await db.execute(query)
    goals = result.scalars().all()
    
    items = [goal_to_response(g) for g in goals]
    
    response = GoalListResponse(
        items=items,
        total=len(items),
        active_count=len([g for g in items if g.is_active and not g.is_completed]),
        completed_count=len([g for g in items if g.is_completed]),
        total_saved=sum(g.current_amount for g in items),
        total_target=sum(g.target_amount for g in items if g.is_active)
    )
    
    await cache_service.set(cache_key, response.model_dump(), ttl=300)
    return response


@router.get("/stats", response_model=GoalStatsResponse)
async def get_goals_stats(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Получить статистику по целям"""
    result = await db.execute(
        select(SavingsGoal).where(SavingsGoal.user_id == current_user.user_id)
    )
    goals = result.scalars().all()
    
    active_goals = [g for g in goals if g.is_active and not g.is_completed]
    completed_goals = [g for g in goals if g.is_completed]
    
    total_saved = sum(g.current_amount for g in goals)
    total_target = sum(g.target_amount for g in active_goals)
    overall_progress = (total_saved / total_target * 100) if total_target > 0 else 0
    
    # Ближайшая цель по дедлайну
    nearest = None
    goals_with_deadline = [g for g in active_goals if g.deadline]
    if goals_with_deadline:
        nearest_goal = min(goals_with_deadline, key=lambda x: x.deadline)
        nearest = goal_to_response(nearest_goal)
    
    # Самая заполненная цель
    most_funded = None
    if active_goals:
        most_funded_goal = max(active_goals, key=lambda x: x.current_amount / x.target_amount if x.target_amount > 0 else 0)
        most_funded = goal_to_response(most_funded_goal)
    
    return GoalStatsResponse(
        total_goals=len(goals),
        active_goals=len(active_goals),
        completed_goals=len(completed_goals),
        total_saved=total_saved,
        total_target=total_target,
        overall_progress=round(overall_progress, 1),
        nearest_goal=nearest,
        most_funded=most_funded
    )


@router.get("/{goal_id}", response_model=GoalWithContributions)
async def get_goal(
    goal_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Получить цель с историей пополнений"""
    result = await db.execute(
        select(SavingsGoal)
        .options(selectinload(SavingsGoal.contributions))
        .where(
            SavingsGoal.id == goal_id,
            SavingsGoal.user_id == current_user.user_id
        )
    )
    goal = result.scalar_one_or_none()
    
    if not goal:
        raise HTTPException(status_code=404, detail="Goal not found")
    
    fields = calculate_goal_fields(goal)
    
    contributions = [
        ContributionResponse(
            id=c.id,
            goal_id=c.goal_id,
            amount=c.amount,
            type=c.type,
            note=c.note,
            source=c.source,
            created_at=c.created_at
        )
        for c in sorted(goal.contributions, key=lambda x: x.created_at, reverse=True)
    ]
    
    total_deposits = sum(c.amount for c in goal.contributions if c.type == "deposit")
    total_withdrawals = sum(c.amount for c in goal.contributions if c.type == "withdraw")
    
    return GoalWithContributions(
        id=goal.id,
        name=goal.name,
        description=goal.description,
        target_amount=goal.target_amount,
        current_amount=goal.current_amount,
        currency=goal.currency,
        icon=goal.icon,
        color=goal.color,
        deadline=goal.deadline,
        is_completed=goal.is_completed,
        completed_at=goal.completed_at,
        is_active=goal.is_active,
        auto_contribute=goal.auto_contribute,
        auto_contribute_percent=goal.auto_contribute_percent,
        created_at=goal.created_at,
        updated_at=goal.updated_at,
        contributions=contributions,
        total_deposits=total_deposits,
        total_withdrawals=total_withdrawals,
        **fields
    )


@router.post("", response_model=GoalResponse, status_code=status.HTTP_201_CREATED)
async def create_goal(
    data: GoalCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Создать новую цель"""
    goal = SavingsGoal(
        user_id=current_user.user_id,
        name=data.name,
        description=data.description,
        target_amount=data.target_amount,
        current_amount=data.initial_amount or 0,
        currency=data.currency,
        icon=data.icon,
        color=data.color,
        deadline=data.deadline,
        auto_contribute=data.auto_contribute,
        auto_contribute_percent=data.auto_contribute_percent
    )
    
    db.add(goal)
    await db.commit()
    await db.refresh(goal)
    
    # Если есть начальная сумма - добавим contribution
    if data.initial_amount and data.initial_amount > 0:
        contribution = GoalContribution(
            goal_id=goal.id,
            user_id=current_user.user_id,
            amount=data.initial_amount,
            type="deposit",
            note="Начальный взнос",
            source="manual"
        )
        db.add(contribution)
        await db.commit()
    
    # Invalidate cache
    await cache_service.delete_pattern(f"goals:{current_user.user_id}:*")
    
    return goal_to_response(goal)


@router.put("/{goal_id}", response_model=GoalResponse)
async def update_goal(
    goal_id: int,
    data: GoalUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Обновить цель"""
    result = await db.execute(
        select(SavingsGoal).where(
            SavingsGoal.id == goal_id,
            SavingsGoal.user_id == current_user.user_id
        )
    )
    goal = result.scalar_one_or_none()
    
    if not goal:
        raise HTTPException(status_code=404, detail="Goal not found")
    
    # Update fields
    update_data = data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(goal, field, value)
    
    goal.updated_at = datetime.utcnow()
    
    await db.commit()
    await db.refresh(goal)
    
    # Invalidate cache
    await cache_service.delete_pattern(f"goals:{current_user.user_id}:*")
    
    return goal_to_response(goal)


@router.delete("/{goal_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_goal(
    goal_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Удалить цель"""
    result = await db.execute(
        select(SavingsGoal).where(
            SavingsGoal.id == goal_id,
            SavingsGoal.user_id == current_user.user_id
        )
    )
    goal = result.scalar_one_or_none()
    
    if not goal:
        raise HTTPException(status_code=404, detail="Goal not found")
    
    await db.delete(goal)
    await db.commit()
    
    # Invalidate cache
    await cache_service.delete_pattern(f"goals:{current_user.user_id}:*")


# ============================================
# CONTRIBUTIONS
# ============================================

@router.post("/{goal_id}/contribute", response_model=QuickDepositResponse)
async def contribute_to_goal(
    goal_id: int,
    data: ContributionCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Пополнить или снять со цели"""
    result = await db.execute(
        select(SavingsGoal).where(
            SavingsGoal.id == goal_id,
            SavingsGoal.user_id == current_user.user_id,
            SavingsGoal.is_active == True
        )
    )
    goal = result.scalar_one_or_none()
    
    if not goal:
        raise HTTPException(status_code=404, detail="Goal not found or inactive")
    
    # Check if withdrawal is valid
    if data.type == "withdraw" and data.amount > goal.current_amount:
        raise HTTPException(
            status_code=400, 
            detail=f"Cannot withdraw {data.amount}. Current balance: {goal.current_amount}"
        )
    
    # Create contribution
    contribution = GoalContribution(
        goal_id=goal.id,
        user_id=current_user.user_id,
        amount=data.amount,
        type=data.type.value,
        note=data.note,
        source=data.source.value
    )
    db.add(contribution)
    
    # Update goal balance
    if data.type == "deposit":
        goal.current_amount += data.amount
    else:
        goal.current_amount -= data.amount
    
    # Check if completed
    was_completed = goal.is_completed
    if goal.current_amount >= goal.target_amount and not goal.is_completed:
        goal.is_completed = True
        goal.completed_at = datetime.utcnow()
    
    goal.updated_at = datetime.utcnow()
    
    await db.commit()
    await db.refresh(goal)
    await db.refresh(contribution)
    
    # Invalidate cache
    await cache_service.delete_pattern(f"goals:{current_user.user_id}:*")
    
    # Calculate XP (can be expanded with gamification service)
    xp_earned = 0
    message = ""
    
    if data.type == "deposit":
        xp_earned = 5  # XP за пополнение
        if goal.is_completed and not was_completed:
            xp_earned += 50  # Бонус за достижение цели
            message = f"🎉 Поздравляем! Цель «{goal.name}» достигнута!"
        else:
            progress = goal.current_amount / goal.target_amount * 100
            message = f"✅ Пополнение на {data.amount} {goal.currency}. Прогресс: {progress:.0f}%"
    else:
        message = f"💸 Снятие {data.amount} {goal.currency} с цели «{goal.name}»"
    
    return QuickDepositResponse(
        success=True,
        goal=goal_to_response(goal),
        contribution=ContributionResponse(
            id=contribution.id,
            goal_id=contribution.goal_id,
            amount=contribution.amount,
            type=contribution.type,
            note=contribution.note,
            source=contribution.source,
            created_at=contribution.created_at
        ),
        new_balance=goal.current_amount,
        progress_percent=round(goal.current_amount / goal.target_amount * 100, 1),
        is_completed=goal.is_completed,
        xp_earned=xp_earned,
        message=message
    )


@router.get("/{goal_id}/contributions", response_model=List[ContributionResponse])
async def get_contributions(
    goal_id: int,
    limit: int = Query(50, le=100),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Получить историю пополнений цели"""
    # Verify goal ownership
    goal_check = await db.execute(
        select(SavingsGoal.id).where(
            SavingsGoal.id == goal_id,
            SavingsGoal.user_id == current_user.user_id
        )
    )
    if not goal_check.scalar_one_or_none():
        raise HTTPException(status_code=404, detail="Goal not found")
    
    result = await db.execute(
        select(GoalContribution)
        .where(GoalContribution.goal_id == goal_id)
        .order_by(GoalContribution.created_at.desc())
        .limit(limit)
    )
    contributions = result.scalars().all()
    
    return [
        ContributionResponse(
            id=c.id,
            goal_id=c.goal_id,
            amount=c.amount,
            type=c.type,
            note=c.note,
            source=c.source,
            created_at=c.created_at
        )
        for c in contributions
    ]


# ============================================
# QUICK ACTIONS
# ============================================

@router.post("/quick-deposit", response_model=QuickDepositResponse)
async def quick_deposit(
    data: QuickDeposit,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Быстрое пополнение цели (для MiniApp)"""
    return await contribute_to_goal(
        goal_id=data.goal_id,
        data=ContributionCreate(
            amount=data.amount,
            type="deposit",
            note=data.note,
            source="manual"
        ),
        current_user=current_user,
        db=db
    )


@router.post("/{goal_id}/complete", response_model=GoalResponse)
async def mark_goal_complete(
    goal_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Отметить цель как выполненную (даже если сумма не набрана)"""
    result = await db.execute(
        select(SavingsGoal).where(
            SavingsGoal.id == goal_id,
            SavingsGoal.user_id == current_user.user_id
        )
    )
    goal = result.scalar_one_or_none()
    
    if not goal:
        raise HTTPException(status_code=404, detail="Goal not found")
    
    goal.is_completed = True
    goal.completed_at = datetime.utcnow()
    goal.updated_at = datetime.utcnow()
    
    await db.commit()
    await db.refresh(goal)
    
    await cache_service.delete_pattern(f"goals:{current_user.user_id}:*")
    
    return goal_to_response(goal)


@router.post("/{goal_id}/reactivate", response_model=GoalResponse)
async def reactivate_goal(
    goal_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Реактивировать завершённую цель"""
    result = await db.execute(
        select(SavingsGoal).where(
            SavingsGoal.id == goal_id,
            SavingsGoal.user_id == current_user.user_id
        )
    )
    goal = result.scalar_one_or_none()
    
    if not goal:
        raise HTTPException(status_code=404, detail="Goal not found")
    
    goal.is_completed = False
    goal.completed_at = None
    goal.is_active = True
    goal.updated_at = datetime.utcnow()
    
    await db.commit()
    await db.refresh(goal)
    
    await cache_service.delete_pattern(f"goals:{current_user.user_id}:*")
    
    return goal_to_response(goal)
