"""
Categories API endpoints
CRUD для категорий из БД
"""
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_, or_, func
from typing import List, Optional

from app.database import get_db
from app.models.models import User, Category
from app.schemas.category import (
    CategoryCreate,
    CategoryUpdate, 
    CategoryResponse,
    CategoryListResponse
)
from app.utils.auth import get_current_user

router = APIRouter()

# Валюты (статические, не в БД)
CURRENCIES = [
    {"code": "KGS", "name": "Кыргызский сом", "symbol": "сом", "flag": "🇰🇬"},
    {"code": "USD", "name": "Доллар США", "symbol": "$", "flag": "🇺🇸"},
    {"code": "EUR", "name": "Евро", "symbol": "€", "flag": "🇪🇺"},
    {"code": "RUB", "name": "Российский рубль", "symbol": "₽", "flag": "🇷🇺"},
]


# ===== ПУБЛИЧНЫЕ ЭНДПОИНТЫ (БЕЗ АВТОРИЗАЦИИ) =====
# Для загрузки категорий в фронте ДО авторизации

@router.get("/public/expenses", response_model=List[CategoryResponse])
async def get_expense_categories_public(db: AsyncSession = Depends(get_db)):
    """
    Получить все дефолтные категории расходов (PUBLIC)
    Не требует авторизации - используется для предзаполнения перед логином
    """
    query = select(Category).where(
        and_(
            Category.type == "expense",
            Category.is_active == True,
            Category.user_id.is_(None)  # Только дефолтные категории
        )
    ).order_by(Category.sort_order, Category.name)
    
    result = await db.execute(query)
    categories = result.scalars().all()
    return categories


@router.get("/public/income", response_model=List[CategoryResponse])
async def get_income_categories_public(db: AsyncSession = Depends(get_db)):
    """
    Получить все дефолтные категории доходов (PUBLIC)
    Не требует авторизации - используется для предзаполнения перед логином
    """
    query = select(Category).where(
        and_(
            Category.type == "income",
            Category.is_active == True,
            Category.user_id.is_(None)  # Только дефолтные категории
        )
    ).order_by(Category.sort_order, Category.name)
    
    result = await db.execute(query)
    categories = result.scalars().all()
    return categories


@router.get("/currencies", response_model=List[dict])
async def get_currencies():
    """Получить список валют (PUBLIC - не требует авторизации)"""
    return CURRENCIES


# ===== ПРИВАТНЫЕ ЭНДПОИНТЫ (С АВТОРИЗАЦИЕЙ) =====

@router.get("/expenses", response_model=List[CategoryResponse])
async def get_expense_categories(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Получить все категории расходов для пользователя
    Включает дефолтные + пользовательские категории
    """
    query = select(Category).where(
        and_(
            Category.type == "expense",
            Category.is_active == True,
            or_(
                Category.user_id.is_(None),  # Дефолтные
                Category.user_id == current_user.user_id  # Пользовательские
            )
        )
    ).order_by(Category.is_default.desc(), Category.sort_order, Category.name)
    
    result = await db.execute(query)
    categories = result.scalars().all()
    
    return categories


@router.get("/income", response_model=List[CategoryResponse])
async def get_income_categories(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Получить все категории доходов для пользователя
    Включает дефолтные + пользовательские категории
    """
    query = select(Category).where(
        and_(
            Category.type == "income",
            Category.is_active == True,
            or_(
                Category.user_id.is_(None),  # Дефолтные
                Category.user_id == current_user.user_id  # Пользовательские
            )
        )
    ).order_by(Category.is_default.desc(), Category.sort_order, Category.name)
    
    result = await db.execute(query)
    categories = result.scalars().all()
    
    return categories


@router.get("/all", response_model=CategoryListResponse)
async def get_all_categories(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Получить все категории и валюты одним запросом
    """
    # Запрос для расходов
    expense_query = select(Category).where(
        and_(
            Category.type == "expense",
            Category.is_active == True,
            or_(
                Category.user_id.is_(None),
                Category.user_id == current_user.user_id
            )
        )
    ).order_by(Category.is_default.desc(), Category.sort_order, Category.name)
    
    # Запрос для доходов
    income_query = select(Category).where(
        and_(
            Category.type == "income",
            Category.is_active == True,
            or_(
                Category.user_id.is_(None),
                Category.user_id == current_user.user_id
            )
        )
    ).order_by(Category.is_default.desc(), Category.sort_order, Category.name)
    
    expense_result = await db.execute(expense_query)
    income_result = await db.execute(income_query)
    
    expense_categories = expense_result.scalars().all()
    income_categories = income_result.scalars().all()
    
    return {
        "expense_categories": expense_categories,
        "income_categories": income_categories,
        "total_expense": len(expense_categories),
        "total_income": len(income_categories)
    }


@router.get("/currencies")
async def get_currencies():
    """
    Получить список поддерживаемых валют
    """
    return CURRENCIES


@router.get("/my", response_model=List[CategoryResponse])
async def get_user_categories(
    type: Optional[str] = Query(None, pattern="^(expense|income)$"),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Получить только пользовательские категории (не дефолтные)
    """
    query = select(Category).where(
        and_(
            Category.user_id == current_user.user_id,
            Category.is_active == True
        )
    )
    
    if type:
        query = query.where(Category.type == type)
    
    query = query.order_by(Category.sort_order, Category.name)
    
    result = await db.execute(query)
    categories = result.scalars().all()
    
    return categories


@router.post("/", response_model=CategoryResponse, status_code=status.HTTP_201_CREATED)
async def create_category(
    category: CategoryCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Создать новую пользовательскую категорию
    """
    # Проверяем, нет ли уже такой категории
    existing_query = select(Category).where(
        and_(
            Category.name == category.name,
            Category.type == category.type,
            or_(
                Category.user_id.is_(None),
                Category.user_id == current_user.user_id
            )
        )
    )
    existing = await db.execute(existing_query)
    if existing.scalars().first():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Категория '{category.name}' уже существует"
        )
    
    # Получаем максимальный sort_order для этого типа
    max_order_query = select(func.max(Category.sort_order)).where(
        and_(
            Category.type == category.type,
            or_(
                Category.user_id.is_(None),
                Category.user_id == current_user.user_id
            )
        )
    )
    max_order_result = await db.execute(max_order_query)
    max_order = max_order_result.scalar() or 0
    
    new_category = Category(
        user_id=current_user.user_id,
        name=category.name,
        type=category.type,
        icon=category.icon or "📁",
        color=category.color or "#6B7280",
        is_default=False,
        is_active=True,
        sort_order=max_order + 1
    )
    
    db.add(new_category)
    await db.commit()
    await db.refresh(new_category)
    
    return new_category


@router.put("/{category_id}", response_model=CategoryResponse)
async def update_category(
    category_id: int,
    category_update: CategoryUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Обновить пользовательскую категорию
    Дефолтные категории нельзя редактировать
    """
    # Находим категорию
    query = select(Category).where(Category.id == category_id)
    result = await db.execute(query)
    category = result.scalars().first()
    
    if not category:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Категория не найдена"
        )
    
    # Проверяем права
    if category.is_default:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Нельзя редактировать дефолтные категории"
        )
    
    if category.user_id != current_user.user_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Нет прав на редактирование этой категории"
        )
    
    # Обновляем поля
    update_data = category_update.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(category, field, value)
    
    await db.commit()
    await db.refresh(category)
    
    return category


@router.delete("/{category_id}")
async def delete_category(
    category_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Удалить (деактивировать) пользовательскую категорию
    Дефолтные категории нельзя удалять
    """
    # Находим категорию
    query = select(Category).where(Category.id == category_id)
    result = await db.execute(query)
    category = result.scalars().first()
    
    if not category:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Категория не найдена"
        )
    
    # Проверяем права
    if category.is_default:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Нельзя удалить дефолтные категории"
        )
    
    if category.user_id != current_user.user_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Нет прав на удаление этой категории"
        )
    
    # Soft delete - деактивируем
    category.is_active = False
    await db.commit()
    
    return {"message": f"Категория '{category.name}' удалена", "success": True}


@router.post("/{category_id}/restore")
async def restore_category(
    category_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Восстановить удалённую категорию
    """
    query = select(Category).where(
        and_(
            Category.id == category_id,
            Category.user_id == current_user.user_id,
            Category.is_active == False
        )
    )
    result = await db.execute(query)
    category = result.scalars().first()
    
    if not category:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Категория не найдена или уже активна"
        )
    
    category.is_active = True
    await db.commit()
    
    return {"message": f"Категория '{category.name}' восстановлена", "success": True}
