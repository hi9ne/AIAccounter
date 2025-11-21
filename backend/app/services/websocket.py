"""
WebSocket Manager для real-time updates
"""
from typing import Dict, Set
from fastapi import WebSocket
import logging
import json

logger = logging.getLogger(__name__)


class ConnectionManager:
    """Менеджер WebSocket соединений"""
    
    def __init__(self):
        # user_id -> set of WebSocket connections
        self.active_connections: Dict[int, Set[WebSocket]] = {}
    
    async def connect(self, websocket: WebSocket, user_id: int):
        """Подключить клиента"""
        await websocket.accept()
        
        if user_id not in self.active_connections:
            self.active_connections[user_id] = set()
        
        self.active_connections[user_id].add(websocket)
        logger.debug(f"WebSocket connected: user_id={user_id}, total={len(self.active_connections[user_id])}")
    
    def disconnect(self, websocket: WebSocket, user_id: int):
        """Отключить клиента"""
        if user_id in self.active_connections:
            self.active_connections[user_id].discard(websocket)
            
            # Удаляем пользователя если нет активных соединений
            if not self.active_connections[user_id]:
                del self.active_connections[user_id]
        
        logger.debug(f"WebSocket disconnected: user_id={user_id}")
    
    async def send_personal_message(self, message: dict, user_id: int):
        """Отправить сообщение конкретному пользователю"""
        if user_id not in self.active_connections:
            logger.debug(f"⚠️ No active connections for user_id={user_id}")
            return
        
        message_json = json.dumps(message)
        disconnected = []
        
        for connection in self.active_connections[user_id]:
            try:
                await connection.send_text(message_json)
                logger.debug(f"📤 Message sent to user_id={user_id}")
            except Exception as e:
                logger.error(f"❌ Error sending message to user_id={user_id}: {e}")
                disconnected.append(connection)
        
        # Удаляем отключенные соединения
        for connection in disconnected:
            self.disconnect(connection, user_id)
    
    async def broadcast(self, message: dict):
        """Отправить сообщение всем подключенным пользователям"""
        message_json = json.dumps(message)
        
        for user_id, connections in list(self.active_connections.items()):
            for connection in list(connections):
                try:
                    await connection.send_text(message_json)
                except Exception as e:
                    logger.error(f"❌ Broadcast error for user_id={user_id}: {e}")
                    self.disconnect(connection, user_id)
    
    def get_active_users_count(self) -> int:
        """Количество активных пользователей"""
        return len(self.active_connections)
    
    def get_active_connections_count(self) -> int:
        """Общее количество активных соединений"""
        return sum(len(connections) for connections in self.active_connections.values())
    
    def is_user_connected(self, user_id: int) -> bool:
        """Проверить подключен ли пользователь"""
        return user_id in self.active_connections and len(self.active_connections[user_id]) > 0


# Глобальный экземпляр
ws_manager = ConnectionManager()
