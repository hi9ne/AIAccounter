#!/usr/bin/env python3
"""
🤖 Автоматический тестер для Telegram бота
Отправляет тестовые сообщения и проверяет ответы
"""

import asyncio
import json
import time
from typing import List, Dict, Optional
from dataclasses import dataclass
import aiohttp
import os
from datetime import datetime

@dataclass
class TestCase:
    name: str
    message: str
    expected_keywords: List[str]
    timeout: int = 10
    should_contain_emoji: bool = True

class TelegramTester:
    def __init__(self, bot_token: str, chat_id: str):
        self.bot_token = bot_token
        self.chat_id = chat_id
        self.base_url = f"https://api.telegram.org/bot{bot_token}"
        self.session = None
        
    async def __aenter__(self):
        self.session = aiohttp.ClientSession()
        return self
        
    async def __aexit__(self, exc_type, exc_val, exc_tb):
        if self.session:
            await self.session.close()
    
    async def send_message(self, text: str) -> Dict:
        """Отправляет сообщение боту"""
        url = f"{self.base_url}/sendMessage"
        data = {
            "chat_id": self.chat_id,
            "text": text
        }
        
        async with self.session.post(url, json=data) as response:
            return await response.json()
    
    async def get_updates(self, offset: int = 0) -> Dict:
        """Получает обновления от бота"""
        url = f"{self.base_url}/getUpdates"
        params = {"offset": offset, "timeout": 1}
        
        async with self.session.get(url, params=params) as response:
            return await response.json()
    
    async def wait_for_response(self, timeout: int = 10) -> Optional[str]:
        """Ждет ответ от бота"""
        start_time = time.time()
        last_update_id = 0
        
        while time.time() - start_time < timeout:
            updates = await self.get_updates(last_update_id)
            
            if updates.get("ok") and updates.get("result"):
                for update in updates["result"]:
                    last_update_id = max(last_update_id, update["update_id"] + 1)
                    
                    if "message" in update and "text" in update["message"]:
                        # Проверяем, что сообщение от бота (не от нас)
                        if update["message"].get("from", {}).get("is_bot", False):
                            return update["message"]["text"]
            
            await asyncio.sleep(0.5)
        
        return None
    
    async def run_test(self, test_case: TestCase) -> Dict:
        """Запускает один тест"""
        print(f"🧪 Запуск теста: {test_case.name}")
        print(f"📤 Отправляем: {test_case.message}")
        
        # Отправляем сообщение
        send_result = await self.send_message(test_case.message)
        if not send_result.get("ok"):
            return {
                "name": test_case.name,
                "status": "FAIL",
                "error": f"Не удалось отправить сообщение: {send_result}"
            }
        
        # Ждем ответ
        response = await self.wait_for_response(test_case.timeout)
        if not response:
            return {
                "name": test_case.name,
                "status": "FAIL",
                "error": f"Нет ответа в течение {test_case.timeout} секунд"
            }
        
        print(f"📥 Получили: {response[:100]}...")
        
        # Проверяем ключевые слова
        missing_keywords = []
        for keyword in test_case.expected_keywords:
            if keyword.lower() not in response.lower():
                missing_keywords.append(keyword)
        
        # Проверяем эмодзи
        has_emoji = any(ord(char) > 127 for char in response)
        
        if missing_keywords:
            return {
                "name": test_case.name,
                "status": "FAIL",
                "error": f"Отсутствуют ключевые слова: {missing_keywords}",
                "response": response
            }
        
        if test_case.should_contain_emoji and not has_emoji:
            return {
                "name": test_case.name,
                "status": "FAIL",
                "error": "Ответ не содержит эмодзи",
                "response": response
            }
        
        return {
            "name": test_case.name,
            "status": "PASS",
            "response": response
        }

# 🧪 Определяем тестовые сценарии
TEST_CASES = [
    TestCase(
        name="Добавление расхода в сомах",
        message="Потратил 500 сом на продукты",
        expected_keywords=["добавлен", "500", "продукты", "KGS"]
    ),
    TestCase(
        name="Добавление расхода в долларах",
        message="Потратил $25 на кафе",
        expected_keywords=["добавлен", "25", "USD", "кафе"]
    ),
    TestCase(
        name="Добавление дохода",
        message="Заработал 50000 сом зарплата",
        expected_keywords=["доход", "добавлен", "50000", "зарплата"]
    ),
    TestCase(
        name="Конвертация валют",
        message="Конвертируй 100 долларов в сомы",
        expected_keywords=["100", "USD", "KGS", "курс"]
    ),
    TestCase(
        name="Запрос курсов валют",
        message="Какой курс доллара?",
        expected_keywords=["курс", "USD", "KGS"]
    ),
    TestCase(
        name="Анализ за месяц",
        message="Покажи расходы за ноябрь",
        expected_keywords=["ноябрь", "расход"]
    ),
    TestCase(
        name="Установка бюджета",
        message="Установи бюджет 30000 сом на ноябрь",
        expected_keywords=["бюджет", "30000", "ноябрь"]
    ),
    TestCase(
        name="Топ категорий",
        message="Покажи топ категорий расходов",
        expected_keywords=["категори", "расход"]
    ),
    TestCase(
        name="Редактирование транзакции",
        message="Измени последний расход на 600 сом",
        expected_keywords=["измен", "600", "сом"]
    ),
    TestCase(
        name="Создание подписки",
        message="Добавь подписку Netflix $12.99 каждый месяц",
        expected_keywords=["подписка", "Netflix", "12.99", "месяц"]
    ),
    TestCase(
        name="Список подписок",
        message="Покажи мои подписки",
        expected_keywords=["подписк"]
    ),
    TestCase(
        name="Прогноз бюджета",
        message="Как дела с бюджетом?",
        expected_keywords=["бюджет"]
    ),
    TestCase(
        name="Голосовое сообщение (текст)",
        message="Потратил тысячу рублей на такси",
        expected_keywords=["добавлен", "рубл", "такси"]
    )
]

async def main():
    """Основная функция тестирования"""
    
    # Получаем конфигурацию из переменных окружения
    bot_token = os.getenv("TELEGRAM_BOT_TOKEN")
    chat_id = os.getenv("TELEGRAM_CHAT_ID")
    
    if not bot_token or not chat_id:
        print("❌ Установите переменные окружения:")
        print("   TELEGRAM_BOT_TOKEN=your_bot_token")
        print("   TELEGRAM_CHAT_ID=your_chat_id")
        return
    
    print("🚀 Запуск автоматического тестирования...")
    print(f"🤖 Бот токен: {bot_token[:10]}...")
    print(f"💬 Chat ID: {chat_id}")
    print("=" * 50)
    
    results = []
    
    async with TelegramTester(bot_token, chat_id) as tester:
        for i, test_case in enumerate(TEST_CASES, 1):
            print(f"\n[{i}/{len(TEST_CASES)}] ", end="")
            
            try:
                result = await tester.run_test(test_case)
                results.append(result)
                
                if result["status"] == "PASS":
                    print("✅ PASS")
                else:
                    print(f"❌ FAIL: {result['error']}")
                    
            except Exception as e:
                print(f"❌ ERROR: {e}")
                results.append({
                    "name": test_case.name,
                    "status": "ERROR",
                    "error": str(e)
                })
            
            # Пауза между тестами
            await asyncio.sleep(2)
    
    # Генерируем отчет
    print("\n" + "=" * 50)
    print("📊 ИТОГОВЫЙ ОТЧЕТ")
    print("=" * 50)
    
    passed = sum(1 for r in results if r["status"] == "PASS")
    failed = sum(1 for r in results if r["status"] in ["FAIL", "ERROR"])
    
    print(f"✅ Пройдено: {passed}")
    print(f"❌ Провалено: {failed}")  
    print(f"📈 Процент успеха: {passed / len(results) * 100:.1f}%")
    
    # Детали провалов
    failures = [r for r in results if r["status"] in ["FAIL", "ERROR"]]
    if failures:
        print(f"\n❌ ДЕТАЛИ ПРОВАЛОВ:")
        for fail in failures:
            print(f"  • {fail['name']}: {fail['error']}")
    
    # Сохраняем отчет в файл
    report = {
        "timestamp": datetime.now().isoformat(),
        "summary": {
            "total": len(results),
            "passed": passed,
            "failed": failed,
            "success_rate": passed / len(results) * 100
        },
        "results": results
    }
    
    with open("test_results.json", "w", encoding="utf-8") as f:
        json.dump(report, f, ensure_ascii=False, indent=2)
    
    print(f"\n💾 Отчет сохранен в test_results.json")

if __name__ == "__main__":
    asyncio.run(main())