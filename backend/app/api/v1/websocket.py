"""
WebSocket API для real-time updates
"""
from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
import logging

from app.database import get_db
from app.services.websocket import ws_manager
from app.utils.auth import decode_access_token

router = APIRouter()
logger = logging.getLogger(__name__)


@router.websocket("/ws")
async def websocket_endpoint(
    websocket: WebSocket,
    token: str = Query(..., description="JWT токен для авторизации"),
    db: AsyncSession = Depends(get_db)
):
    """
    WebSocket endpoint для real-time updates
    
    Подключение: ws://host/api/v1/ws?token=<jwt_token>
    
    Формат сообщений от сервера:
    {
        "type": "transaction_created" | "transaction_deleted" | "budget_alert" | "connection",
        "data": {...}
    }
    """
    user_id = None
    
    try:
        # Декодируем токен для получения user_id
        payload = decode_access_token(token)
        user_id = int(payload.get("sub"))
        
        # Подключаем пользователя
        await ws_manager.connect(websocket, user_id)
        
        # Отправляем приветственное сообщение
        await websocket.send_json({
            "type": "connection",
            "data": {
                "status": "connected",
                "user_id": user_id,
                "message": "WebSocket connection established"
            }
        })
        
        # Слушаем сообщения от клиента (ping/pong для keep-alive)
        while True:
            data = await websocket.receive_text()
            
            # Простой ping-pong для поддержания соединения
            if data == "ping":
                await websocket.send_json({
                    "type": "pong",
                    "data": {"timestamp": "now"}
                })
            
    except WebSocketDisconnect:
        logger.info(f"WebSocket disconnected normally: user_id={user_id}")
        if user_id:
            ws_manager.disconnect(websocket, user_id)
    
    except Exception as e:
        logger.error(f"WebSocket error: {e}")
        if user_id:
            ws_manager.disconnect(websocket, user_id)
        try:
            await websocket.close()
        except:
            pass


@router.get("/ws/stats")
async def get_websocket_stats():
    """Получить статистику WebSocket соединений"""
    return {
        "active_users": ws_manager.get_active_users_count(),
        "active_connections": ws_manager.get_active_connections_count()
    }
