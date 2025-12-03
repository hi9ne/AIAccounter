# 💰 Бюджеты AIAccounter — Техническая документация

> Полное описание функционала бюджетов

---

## 🎯 Цели модуля бюджетов

1. **Контроль расходов** — установка лимитов на месяц/категорию
2. **Визуализация прогресса** — прогресс-бары использования бюджета
3. **Уведомления** — предупреждения при 80% и 100%
4. **Аналитика** — сравнение план/факт

---

## 📊 Текущее состояние

### ✅ Что уже есть

#### База данных (budgets)
| Поле | Тип | Описание |
|------|-----|----------|
| `id` | integer | PK |
| `user_id` | bigint | FK → users |
| `month` | varchar | YYYY-MM формат |
| `budget_amount` | numeric | Сумма бюджета |
| `currency` | varchar | Валюта (KGS, USD...) |
| `last_updated` | timestamp | Дата обновления |

#### Backend API (`/api/v1/budget`)
| Метод | Endpoint | Описание | Статус |
|-------|----------|----------|--------|
| POST | `/` | Создать/обновить бюджет | ✅ Работает |
| GET | `/{month}` | Получить бюджет | ✅ Работает |
| GET | `/{month}/status` | Статус бюджета + расходы | ✅ Работает |
| PUT | `/{month}` | Обновить бюджет | ✅ Работает |
| DELETE | `/{month}` | Удалить бюджет | ✅ Работает |

⚠️ **Проблема:** API принимает `user_id` как query parameter, а не из JWT токена!

#### Mini App (`api-helper.js`)
```javascript
// Есть методы, но не используются в UI
async getBudget(params = {}) { ... }
async createBudget(data) { ... }
async updateBudget(id, data) { ... }
```

#### Онбординг
- Шаг 3 устанавливает `users.monthly_budget`
- Создаётся запись в `budgets` на текущий месяц

---

## 🚀 План реализации

### Фаза 1: Фикс Backend API (Критично)

#### 1.1 Исправить авторизацию в `/budget`
Заменить `user_id: int` на `current_user = Depends(get_current_user)`

```python
# ДО:
@router.get("/{month}")
async def get_budget(month: str, user_id: int, db: AsyncSession = Depends(get_db)):

# ПОСЛЕ:
@router.get("/{month}")
async def get_budget(
    month: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    user_id = current_user.user_id
```

#### 1.2 Добавить GET /budget (список всех бюджетов)
```python
@router.get("/")
async def get_budgets(
    current_user: User = Depends(get_current_user),
    limit: int = 12,  # последние 12 месяцев
    db: AsyncSession = Depends(get_db)
):
    """Получить все бюджеты пользователя"""
```

#### 1.3 Добавить статус текущего месяца
```python
@router.get("/current/status")
async def get_current_budget_status(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Получить статус бюджета текущего месяца"""
```

---

### Фаза 2: Mini App — Виджет на главной

#### 2.1 UI компонент `BudgetWidget`

```
┌─────────────────────────────────────────┐
│  💰 Бюджет на декабрь                   │
│                                         │
│  ┌─────────────────────────────────┐    │
│  │████████████████░░░░░░░░░░░░░░░░│    │  ← Прогресс-бар
│  └─────────────────────────────────┘    │
│                                         │
│  Потрачено: 45,000 из 150,000 с         │
│  Осталось: 105,000 с (30%)              │
│                                         │
│  [Изменить бюджет]                      │
└─────────────────────────────────────────┘
```

#### 2.2 Состояния виджета
| Состояние | Условие | Цвет | Иконка |
|-----------|---------|------|--------|
| `on_track` | < 80% | 🟢 Зелёный | ✅ |
| `warning` | 80-99% | 🟡 Оранжевый | ⚠️ |
| `over_budget` | ≥ 100% | 🔴 Красный | 🚨 |
| `no_budget` | Не установлен | 🔵 Синий | ➕ |

#### 2.3 Добавить в `index.html`
После секции `balance-hero`:
```html
<!-- Budget Progress Widget -->
<section class="budget-widget" id="budget-widget">
    <div class="budget-header">
        <h3><i class="fas fa-wallet"></i> Бюджет</h3>
        <span class="budget-month">Декабрь</span>
    </div>
    <div class="budget-progress">
        <div class="progress-bar">
            <div class="progress-fill" style="width: 30%"></div>
        </div>
        <div class="progress-labels">
            <span class="spent">45,000 с</span>
            <span class="total">/ 150,000 с</span>
        </div>
    </div>
    <div class="budget-info">
        <span class="remaining">Осталось: 105,000 с</span>
        <span class="percentage">(30%)</span>
    </div>
    <button class="btn-edit-budget" onclick="openBudgetModal()">
        <i class="fas fa-edit"></i>
    </button>
</section>
```

---

### Фаза 3: Mini App — Экран бюджетов

#### 3.1 Новый экран `/budgets`
Добавить в навигацию или в настройки

```
┌─────────────────────────────────────────┐
│  ← Бюджеты                              │
│                                         │
│  ┌─────────────────────────────────┐    │
│  │ 📊 Текущий месяц (Декабрь)      │    │
│  │                                 │    │
│  │ ████████████░░░░░░░░ 45,000    │    │
│  │                      / 150,000 │    │
│  │ Осталось: 105,000 с            │    │
│  └─────────────────────────────────┘    │
│                                         │
│  История:                               │
│  ┌─────────────────────────────────┐    │
│  │ Ноябрь 2024    148,000/150,000 │    │
│  │ ██████████████████████ 98% ⚠️  │    │
│  └─────────────────────────────────┘    │
│  ┌─────────────────────────────────┐    │
│  │ Октябрь 2024   165,000/150,000 │    │
│  │ ██████████████████████████ 110%│🔴  │
│  └─────────────────────────────────┘    │
│                                         │
│  [+ Установить бюджет на след. месяц]   │
└─────────────────────────────────────────┘
```

#### 3.2 Модалка изменения бюджета

```
┌─────────────────────────────────────────┐
│  Бюджет на декабрь              ✕       │
│                                         │
│  Сумма:                                 │
│  ┌─────────────────────────────────┐    │
│  │ 150,000                      с │    │
│  └─────────────────────────────────┘    │
│                                         │
│  Быстрый выбор:                         │
│  [50,000] [100,000] [150,000] [200,000] │
│                                         │
│  💡 В прошлом месяце: 148,000 с         │
│                                         │
│  [Отмена]              [Сохранить]      │
└─────────────────────────────────────────┘
```

---

### Фаза 4: Бюджеты по категориям (v2)

#### 4.1 Расширение таблицы `budgets`
```sql
ALTER TABLE budgets 
ADD COLUMN category VARCHAR DEFAULT NULL,
ADD COLUMN budget_type VARCHAR DEFAULT 'total';
-- budget_type: 'total' | 'category'
```

#### 4.2 Новые записи
| user_id | month | budget_amount | category | budget_type |
|---------|-------|---------------|----------|-------------|
| 123 | 2024-12 | 150000 | NULL | total |
| 123 | 2024-12 | 30000 | Еда | category |
| 123 | 2024-12 | 10000 | Развлечения | category |

#### 4.3 UI для категорийных бюджетов
```
┌─────────────────────────────────────────┐
│  📊 Бюджеты по категориям               │
│                                         │
│  🍔 Еда                    25,000/30,000│
│  ████████████████████░░░░░ 83% ⚠️       │
│                                         │
│  🎬 Развлечения             8,000/10,000│
│  ██████████████████░░░░░░░ 80% ⚠️       │
│                                         │
│  🚗 Транспорт              5,000/15,000 │
│  ██████████░░░░░░░░░░░░░░░ 33% ✅       │
│                                         │
│  [+ Добавить категорию]                 │
└─────────────────────────────────────────┘
```

---

### Фаза 5: Telegram Bot — Управление бюджетами

#### 5.1 Команды бота (через AI)
| Команда | Ответ |
|---------|-------|
| "мой бюджет" | Показать статус текущего бюджета |
| "установи бюджет 100000" | Установить/обновить бюджет |
| "бюджет на январь 200000" | Установить на конкретный месяц |
| "сколько осталось" | Остаток бюджета |

#### 5.2 Добавить в n8n workflow инструмент
```javascript
// В AI Agent добавить tool Budget_Manager
{
  name: "Budget_Manager",
  description: "Управление бюджетами пользователя",
  schema: {
    action: "get_status | set_budget",
    month: "YYYY-MM (optional)",
    amount: "number (for set_budget)"
  }
}
```

---

### Фаза 6: Уведомления о бюджете

#### 6.1 Триггеры уведомлений
| Событие | Порог | Сообщение |
|---------|-------|-----------|
| Приближение к лимиту | 80% | "⚠️ Потрачено 80% бюджета (120,000 из 150,000)" |
| Превышение | 100% | "🚨 Бюджет превышен! 155,000 из 150,000" |
| Экономия | конец месяца | "🎉 Молодец! Сэкономлено 25,000 в ноябре" |

#### 6.2 n8n Workflow для проверки
- Cron: каждые 6 часов
- SQL: проверка % использования бюджета
- Telegram: отправка если превышен порог

---

## 🗄️ База данных — Изменения

### Текущая схема budgets (OK)
```sql
CREATE TABLE budgets (
    id SERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL REFERENCES users(user_id),
    month VARCHAR NOT NULL,
    budget_amount NUMERIC NOT NULL,
    currency VARCHAR DEFAULT 'KGS',
    last_updated TIMESTAMP DEFAULT NOW()
);
```

### Будущая схема (v2)
```sql
ALTER TABLE budgets 
ADD COLUMN category VARCHAR DEFAULT NULL,
ADD COLUMN budget_type VARCHAR DEFAULT 'total' CHECK (budget_type IN ('total', 'category'));

CREATE INDEX idx_budgets_user_month ON budgets(user_id, month);
CREATE UNIQUE INDEX idx_budgets_unique ON budgets(user_id, month, COALESCE(category, ''));
```

---

## 📱 API изменения

### Новые эндпоинты
| Метод | Endpoint | Описание |
|-------|----------|----------|
| GET | `/budget` | Список всех бюджетов (последние 12 мес) |
| GET | `/budget/current` | Статус текущего месяца |
| POST | `/budget/category` | Создать бюджет категории (v2) |
| GET | `/budget/{month}/categories` | Бюджеты по категориям (v2) |

### Исправления
- [ ] Заменить `user_id: int` на JWT авторизацию во всех эндпоинтах

---

## 🎨 UI компоненты

### CSS переменные
```css
:root {
    --budget-ok: #10B981;
    --budget-warning: #F59E0B;
    --budget-danger: #EF4444;
    --budget-empty: #6B7280;
}
```

### Компоненты
1. `BudgetWidget` — виджет на главной
2. `BudgetProgress` — прогресс-бар
3. `BudgetModal` — модалка редактирования
4. `BudgetHistory` — история по месяцам
5. `CategoryBudgets` — бюджеты категорий (v2)

---

## ✅ Чеклист реализации

### Фаза 1: Backend (Критично) ✅
- [x] Исправить авторизацию в budget.py
- [x] Добавить GET /budget (список)
- [x] Добавить GET /budget/current/status
- [x] Тесты API

### Фаза 2: Mini App Widget ✅
- [x] HTML виджета на главной
- [x] CSS стили виджета
- [x] JS логика загрузки
- [x] Состояния (ok/warning/danger/empty)

### Фаза 3: Mini App экран ✅
- [x] Экран бюджетов
- [x] Модалка редактирования
- [x] История бюджетов
- [x] Навигация

### Фаза 4: Категорийные бюджеты (v2) ⏭️ ПРОПУЩЕНО
- [ ] ~~Миграция БД~~
- [ ] ~~API эндпоинты~~
- [ ] ~~UI категорийных бюджетов~~

### Фаза 5: Telegram бот ✅
- [x] Budget_Manager tool в n8n
- [x] Команды: мой бюджет, установить бюджет
- [x] Интеграция с AI Agent

### Фаза 6: Уведомления
- [ ] n8n workflow проверки бюджета
- [ ] Telegram уведомления 80%/100%
- [ ] Настройки порогов в user_preferences

---

## 📅 Приоритеты

| # | Задача | Сложность | Важность |
|---|--------|-----------|----------|
| 1 | Фикс авторизации Backend | 🟢 Низкая | 🔴 Критично |
| 2 | Виджет на главной | 🟡 Средняя | 🟠 Высокая |
| 3 | Экран бюджетов | 🟡 Средняя | 🟡 Средняя |
| 4 | Telegram команды | 🟢 Низкая | 🟡 Средняя |
| 5 | Уведомления | 🟡 Средняя | 🟡 Средняя |
| 6 | Категорийные бюджеты | 🔴 Высокая | 🟢 Низкая |

---

## 🔗 Связанные файлы

### Backend
- `backend/app/api/v1/budget.py` — API роуты
- `backend/app/models/models.py` — модель Budget
- `backend/app/schemas/schemas.py` — схемы Budget*

### Frontend
- `miniapp/index.html` — добавить виджет
- `miniapp/app.js` — логика бюджетов
- `miniapp/style.css` — стили виджета
- `miniapp/api-helper.js` — API методы

### n8n
- `n8n/workflows/AIAccounter.json` — добавить Budget_Manager tool

---

*Документ создан: 3 декабря 2025*
*Версия: 1.0*
