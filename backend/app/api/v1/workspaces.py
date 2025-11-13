"""
Workspaces API endpoints
Управление рабочими пространствами и участниками
"""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text, select, delete
from typing import List
from datetime import datetime

from app.database import get_db
from app.models.models import User, Workspace, WorkspaceMember, WorkspaceInvite
from app.schemas.workspace import (
    WorkspaceCreate,
    WorkspaceUpdate,
    WorkspaceSchema,
    WorkspaceMemberSchema,
    WorkspaceInviteCreate,
    WorkspaceInviteAccept,
    WorkspaceInviteSchema
)
from app.utils.auth import get_current_user

router = APIRouter()


@router.post("/", response_model=WorkspaceSchema, status_code=status.HTTP_201_CREATED)
async def create_workspace(
    workspace_data: WorkspaceCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Создать новый workspace
    Использует функцию create_workspace_with_owner() для автоматического добавления owner
    """
    try:
        query = text("""
            SELECT * FROM create_workspace_with_owner(
                :owner_id,
                :name,
                :description,
                :currency
            )
        """)
        
        result = await db.execute(query, {
            "owner_id": current_user.user_id,
            "name": workspace_data.name,
            "description": workspace_data.description,
            "currency": workspace_data.currency
        })
        
        workspace = result.fetchone()
        await db.commit()
        
        return {
            "workspace_id": workspace[0],
            "name": workspace[1],
            "description": workspace[2],
            "currency": workspace[3],
            "owner_id": current_user.user_id,
            "created_at": workspace[4]
        }
    except Exception as e:
        await db.rollback()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Failed to create workspace: {str(e)}"
        )


@router.get("/", response_model=List[WorkspaceSchema])
async def get_my_workspaces(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Получить список всех workspaces текущего пользователя
    """
    query = text("""
        SELECT 
            w.id as workspace_id,
            w.name,
            w.description,
            w.currency,
            w.owner_id,
            w.created_at,
            COALESCE(wm.role, 'owner') as role,
            wm.joined_at
        FROM workspaces w
        LEFT JOIN workspace_members wm 
            ON w.id = wm.workspace_id 
            AND wm.user_id = :user_id
        WHERE w.owner_id = :user_id OR wm.user_id = :user_id
        ORDER BY w.created_at DESC
    """)
    
    result = await db.execute(query, {"user_id": current_user.user_id})
    workspaces = result.fetchall()
    
    return [
        {
            "workspace_id": w[0],
            "name": w[1],
            "description": w[2],
            "currency": w[3],
            "owner_id": w[4],
            "created_at": w[5],
            "role": w[6] if len(w) > 6 else None,
            "joined_at": w[7] if len(w) > 7 else None
        }
        for w in workspaces
    ]


@router.get("/{workspace_id}", response_model=WorkspaceSchema)
async def get_workspace(
    workspace_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Получить информацию о workspace
    """
    # Проверка доступа - пользователь должен быть owner или member
    query_check = text("""
        SELECT 1 FROM workspaces w
        LEFT JOIN workspace_members wm ON w.id = wm.workspace_id AND wm.user_id = :user_id
        WHERE w.id = :workspace_id 
        AND (w.owner_id = :user_id OR wm.user_id = :user_id)
        LIMIT 1
    """)
    
    result = await db.execute(query_check, {
        "workspace_id": workspace_id,
        "user_id": current_user.user_id
    })
    
    has_access = result.scalar()
    
    if not has_access:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You don't have access to this workspace"
        )
    
    # Получение данных workspace
    query = select(Workspace).where(Workspace.workspace_id == workspace_id)
    result = await db.execute(query)
    workspace = result.scalar_one_or_none()
    
    if not workspace:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Workspace not found"
        )
    
    return workspace


@router.put("/{workspace_id}", response_model=WorkspaceSchema)
async def update_workspace(
    workspace_id: int,
    workspace_data: WorkspaceUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Обновить workspace (только admin/owner)
    """
    # Проверка прав admin/owner
    query_check = text("""
        SELECT 1 FROM workspaces w
        LEFT JOIN workspace_members wm ON w.id = wm.workspace_id AND wm.user_id = :user_id
        WHERE w.id = :workspace_id 
        AND (w.owner_id = :user_id OR (wm.user_id = :user_id AND wm.role IN ('admin', 'owner')))
        LIMIT 1
    """)
    
    result = await db.execute(query_check, {
        "workspace_id": workspace_id,
        "user_id": current_user.user_id
    })
    
    is_admin = result.scalar()
    
    if not is_admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only admin can update workspace"
        )
    
    # Обновление
    query = select(Workspace).where(Workspace.workspace_id == workspace_id)
    result = await db.execute(query)
    workspace = result.scalar_one_or_none()
    
    if not workspace:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Workspace not found"
        )
    
    # Применяем изменения
    update_data = workspace_data.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(workspace, key, value)
    
    await db.commit()
    await db.refresh(workspace)
    
    return workspace


@router.delete("/{workspace_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_workspace(
    workspace_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Удалить workspace (только owner)
    """
    query = select(Workspace).where(Workspace.workspace_id == workspace_id)
    result = await db.execute(query)
    workspace = result.scalar_one_or_none()
    
    if not workspace:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Workspace not found"
        )
    
    if workspace.owner_id != current_user.user_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only owner can delete workspace"
        )
    
    await db.delete(workspace)
    await db.commit()


# ==================== MEMBERS ====================

@router.get("/{workspace_id}/members", response_model=List[WorkspaceMemberSchema])
async def get_workspace_members(
    workspace_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Получить список участников workspace
    """
    # Проверка доступа - пользователь должен быть owner или member
    query_check = text("""
        SELECT 1 FROM workspaces w
        LEFT JOIN workspace_members wm ON w.id = wm.workspace_id AND wm.user_id = :user_id
        WHERE w.id = :workspace_id 
        AND (w.owner_id = :user_id OR wm.user_id = :user_id)
        LIMIT 1
    """)
    
    result = await db.execute(query_check, {
        "workspace_id": workspace_id,
        "user_id": current_user.user_id
    })
    
    has_access = result.scalar()
    
    if not has_access:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You don't have access to this workspace"
        )
    
    # Получение участников
    query = text("""
        SELECT 
            wm.user_id,
            u.first_name,
            u.last_name,
            u.username,
            wm.role,
            wm.joined_at
        FROM workspace_members wm
        JOIN users u ON wm.user_id = u.user_id
        WHERE wm.workspace_id = :workspace_id
        ORDER BY 
            CASE wm.role
                WHEN 'owner' THEN 1
                WHEN 'admin' THEN 2
                WHEN 'editor' THEN 3
                WHEN 'viewer' THEN 4
            END,
            wm.joined_at
    """)
    
    result = await db.execute(query, {"workspace_id": workspace_id})
    members = result.fetchall()
    
    return [
        {
            "user_id": m[0],
            "first_name": m[1],
            "last_name": m[2],
            "telegram_username": m[3],
            "role": m[4],
            "joined_at": m[5]
        }
        for m in members
    ]


@router.delete("/{workspace_id}/members/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
async def remove_member(
    workspace_id: int,
    user_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Удалить участника из workspace (только admin/owner)
    """
    try:
        query = text("""
            SELECT remove_workspace_member(
                :workspace_id,
                :user_id_to_remove,
                :removed_by
            )
        """)
        
        result = await db.execute(query, {
            "workspace_id": workspace_id,
            "user_id_to_remove": user_id,
            "removed_by": current_user.user_id
        })
        
        success = result.scalar()
        await db.commit()
        
        if not success:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Failed to remove member"
            )
    except Exception as e:
        await db.rollback()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )


# ==================== INVITES ====================

@router.post("/{workspace_id}/invites", status_code=status.HTTP_201_CREATED)
async def create_invite(
    workspace_id: int,
    invite_data: WorkspaceInviteCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Создать приглашение в workspace (только admin)
    Генерирует уникальный код приглашения
    """
    # Проверка прав admin/owner
    query_check = text("""
        SELECT 1 FROM workspaces w
        LEFT JOIN workspace_members wm ON w.id = wm.workspace_id AND wm.user_id = :user_id
        WHERE w.id = :workspace_id 
        AND (w.owner_id = :user_id OR (wm.user_id = :user_id AND wm.role IN ('admin', 'owner')))
        LIMIT 1
    """)
    
    result = await db.execute(query_check, {
        "workspace_id": workspace_id,
        "user_id": current_user.user_id
    })
    
    is_admin = result.fetchone()
    
    if not is_admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only admin can create invites"
        )
    
    # Генерация уникального кода приглашения
    import secrets
    invite_code = secrets.token_urlsafe(16)
    
    # Возвращаем простой объект без сохранения в БД
    # TODO: Реализовать сохранение в таблицу workspace_invites когда она будет создана
    return {
        "workspace_id": workspace_id,
        "invite_code": invite_code,
        "role": invite_data.role,
        "created_by": current_user.user_id,
        "max_uses": invite_data.max_uses,
        "used_count": 0,
        "is_active": True,
        "expires_at": None,
        "created_at": datetime.now().isoformat()
    }



@router.post("/accept-invite", status_code=status.HTTP_200_OK)
async def accept_invite(
    invite_data: WorkspaceInviteAccept,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Принять приглашение в workspace по коду
    """
    try:
        # Найти приглашение по коду
        query = select(WorkspaceInvite).where(
            WorkspaceInvite.invite_code == invite_data.invite_code,
            WorkspaceInvite.is_active == True
        )
        result = await db.execute(query)
        invite = result.scalar_one_or_none()
        
        if not invite:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Invalid or expired invite code"
            )
        
        # Проверка срока действия
        if invite.expires_at and invite.expires_at < datetime.now():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invite code has expired"
            )
        
        # Проверка лимита использований
        if invite.used_count >= invite.max_uses:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invite code has reached maximum uses"
            )
        
        # Проверка что пользователь уже не участник
        query_member = select(WorkspaceMember).where(
            WorkspaceMember.workspace_id == invite.workspace_id,
            WorkspaceMember.user_id == current_user.user_id
        )
        result_member = await db.execute(query_member)
        existing_member = result_member.scalar_one_or_none()
        
        if existing_member:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="You are already a member of this workspace"
            )
        
        # Добавление пользователя в workspace
        new_member = WorkspaceMember(
            workspace_id=invite.workspace_id,
            user_id=current_user.user_id,
            role=invite.role,
            is_active=True
        )
        db.add(new_member)
        
        # Обновление счётчика использований
        invite.used_count += 1
        if invite.used_count >= invite.max_uses:
            invite.is_active = False
        
        await db.commit()
        
        return {
            "message": "Successfully joined workspace",
            "workspace_id": invite.workspace_id,
            "role": invite.role
        }
        
    except HTTPException:
        raise
    except Exception as e:
        await db.rollback()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Failed to accept invite: {str(e)}"
        )


@router.get("/{workspace_id}/invites", response_model=List[WorkspaceInviteSchema])
async def get_workspace_invites(
    workspace_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Получить список активных приглашений workspace (только admin)
    """
    # Проверка прав admin/owner
    query_check = text("""
        SELECT 1 FROM workspaces w
        LEFT JOIN workspace_members wm ON w.id = wm.workspace_id AND wm.user_id = :user_id
        WHERE w.id = :workspace_id 
        AND (w.owner_id = :user_id OR (wm.user_id = :user_id AND wm.role IN ('admin', 'owner')))
        LIMIT 1
    """)
    
    result = await db.execute(query_check, {
        "workspace_id": workspace_id,
        "user_id": current_user.user_id
    })
    
    is_admin = result.scalar()
    
    if not is_admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only admin can view invites"
        )
    
    # Получение приглашений
    query = select(WorkspaceInvite).where(
        WorkspaceInvite.workspace_id == workspace_id,
        WorkspaceInvite.is_active == True
    ).order_by(WorkspaceInvite.created_at.desc())
    
    result = await db.execute(query)
    invites = result.scalars().all()
    
    return invites
