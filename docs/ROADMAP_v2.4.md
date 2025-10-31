# 🚀 AIAccounter v2.4.0 - Multi-tenancy & Analytics
 
**Статус:** 📋 Planning  
**Приоритет:** High

---

## 🎯 Главная цель релиза

**Превратить AIAccounter в платформу для командной работы и продвинутой аналитики**

### Для кого:
- 👥 **Семьи** - совместное управление семейным бюджетом
- 🏢 **Малый бизнес** - несколько сотрудников, разные роли
- 📊 **Аналитики** - глубокая визуализация данных
- 💼 **Фрилансеры** - разделение личных и бизнес-расходов

---

## ✨ Новые возможности

### 1. 👥 Multi-tenancy (Командная работа)

#### 1.1 Workspaces (Рабочие пространства)
```
Пользователь может создавать несколько workspace:
- 🏠 Личный бюджет
- 👨‍👩‍👧‍👦 Семейный бюджет
- 💼 Бизнес ИП "Имя"
- 🎯 Проект "Название"
```

**Функции:**
- Создать workspace
- Переключаться между workspace
- Приглашать участников
- Удалить workspace

#### 1.2 Роли и права доступа

**Роли:**
- 👑 **Owner** - создатель, полный контроль
- 🛠️ **Admin** - управление участниками, настройки
- ✏️ **Editor** - добавление/редактирование транзакций
- 👁️ **Viewer** - только просмотр статистики

**Права:**
| Действие | Owner | Admin | Editor | Viewer |
|----------|-------|-------|--------|--------|
| Добавить транзакцию | ✅ | ✅ | ✅ | ❌ |
| Редактировать транзакцию | ✅ | ✅ | ✅ | ❌ |
| Удалить транзакцию | ✅ | ✅ | ❌ | ❌ |
| Приглашать участников | ✅ | ✅ | ❌ | ❌ |
| Управлять ролями | ✅ | ✅ | ❌ | ❌ |
| Настройки workspace | ✅ | ✅ | ❌ | ❌ |
| Удалить workspace | ✅ | ❌ | ❌ | ❌ |
| Просмотр статистики | ✅ | ✅ | ✅ | ✅ |
| Экспорт отчётов | ✅ | ✅ | ✅ | ❌ |

#### 1.3 Приглашения

**Flow:**
1. Owner создаёт invite link: `https://t.me/bot?start=invite_ABC123`
2. Пользователь переходит по ссылке
3. Бот предлагает присоединиться к workspace
4. После подтверждения - доступ открыт

**Лимиты:**
- Free: до 3 участников
- Premium: до 10 участников
- Business: до 50 участников

#### 1.4 Audit Log (История действий)
```
🕐 31.10.2025 14:30 | 👤 Иван Петров (Editor)
    ➕ Добавил расход: 500 с на "Продукты питания"

🕐 31.10.2025 15:45 | 👤 Мария Сидорова (Admin)
    👥 Пригласила нового участника: @username

🕐 31.10.2025 16:00 | 👤 Петр Иванов (Owner)
    ⚙️ Изменил настройки бюджета: лимит 50,000 с → 60,000 с
```

---

### 2. 📊 Advanced Analytics (Продвинутая аналитика)

#### 2.1 Интерактивные графики (Chart.js)

**Типы графиков:**

1. **Line Chart** - Динамика за период
   ```
   📈 Доходы vs Расходы
   [График линий за последние 6 месяцев]
   ```

2. **Bar Chart** - Сравнение категорий
   ```
   📊 Топ категорий расходов
   [Столбчатая диаграмма]
   ```

3. **Pie Chart** - Распределение
   ```
   🥧 Структура расходов
   [Круговая диаграмма с процентами]
   ```

4. **Stacked Bar** - Сравнение по месяцам
   ```
   📊 Расходы по категориям
   [Накопительная столбчатая за год]
   ```

5. **Heatmap** - Интенсивность трат
   ```
   🔥 Календарь трат
   [Тепловая карта по дням месяца]
   ```

#### 2.2 Дашборд с метриками

**Главный экран:**
```
┌────────────────────────────────────────┐
│ 💰 Баланс: 45,000 с ▲ +15%            │
├────────────────────────────────────────┤
│ 📊 Этот месяц:                         │
│   Доходы:   60,000 с                   │
│   Расходы:  35,000 с                   │
│   Прибыль:  25,000 с (42%)             │
├────────────────────────────────────────┤
│ 🔥 Топ категории расходов:             │
│   1. Продукты   12,000 с (34%)         │
│   2. Транспорт   8,500 с (24%)         │
│   3. Аренда      7,000 с (20%)         │
├────────────────────────────────────────┤
│ 📈 Тренд: ▲ Расходы растут на 5% м/м  │
│ 💡 Совет: Сократите "Рестораны" на 20%│
└────────────────────────────────────────┘
```

#### 2.3 Прогнозирование (ML)

**Алгоритмы:**
- Linear Regression для простых трендов
- Prophet от Facebook для сезонности
- ARIMA для временных рядов

**Прогнозы:**
```
🔮 Прогноз на ноябрь 2025:
   Доходы:   58,000 ± 3,000 с (95% CI)
   Расходы:  37,000 ± 2,500 с (95% CI)
   Прибыль:  21,000 ± 4,000 с
   
   Статус: ⚠️ Прибыль может снизиться на 16%
   Рекомендация: Ограничьте необязательные расходы
```

#### 2.4 Сравнение периодов

**Примеры:**
```
📊 Октябрь 2025 vs Сентябрь 2025:
   Доходы:   ▲ +5,000 с (+9%)
   Расходы:  ▲ +3,200 с (+10%)
   Прибыль:  ▲ +1,800 с (+8%)

📊 Октябрь 2025 vs Октябрь 2024:
   Доходы:   ▲ +12,000 с (+25%)
   Расходы:  ▲ +8,500 с (+32%)
   Прибыль:  ▲ +3,500 с (+16%)
```

---

### 3. 📄 Export & Reports (Экспорт отчётов)

#### 3.1 PDF Reports

**Типы отчётов:**

1. **Monthly Report** - Месячный отчёт
   ```
   📄 Финансовый отчёт за октябрь 2025
   
   1. Резюме
      - Доходы: 60,000 с
      - Расходы: 35,000 с
      - Прибыль: 25,000 с (42%)
   
   2. Графики
      - Динамика за месяц
      - Топ категории
   
   3. Детализация
      - Таблица всех транзакций
      - Группировка по категориям
   
   4. Выводы
      - Тренды
      - Рекомендации
   ```

2. **Annual Report** - Годовой отчёт
   ```
   📄 Финансовый итоги 2025 года
   
   - Графики по месяцам
   - Сравнение Q1-Q4
   - ТОП-10 трат года
   - Статистика по категориям
   ```

3. **Tax Report** - Налоговый отчёт
   ```
   📄 Отчёт для налоговой (Кыргызстан)
   
   - Доходы по кварталам
   - НДС (если применимо)
   - Патентные платежи
   - Готов для подачи в ГНС
   ```

#### 3.2 Excel Export

**Формат:**
```
Лист 1: Транзакции
| Дата       | Тип    | Категория  | Сумма | Валюта | Описание |
|------------|--------|------------|-------|--------|----------|
| 31.10.2025 | Расход | Продукты   | 500   | KGS    | Народный |
| 30.10.2025 | Доход  | Зарплата   | 50000 | KGS    | Октябрь  |

Лист 2: Статистика
[Сводные таблицы, графики]

Лист 3: Бюджет
[Прогресс по категориям]
```

#### 3.3 CSV Export

**Для интеграции с 1C, Excel, Google Sheets:**
```csv
date,type,category,amount,currency,description,workspace
2025-10-31,expense,Продукты питания,500,KGS,"Народный",Личный
2025-10-30,income,Зарплата,50000,KGS,"Октябрь",Личный
```

---

### 4. 🎨 UI/UX Improvements

#### 4.1 Новые вкладки Mini App

**Добавить:**
- 📊 **Analytics** - графики и дашборд
- 👥 **Team** - управление командой
- ⚙️ **Settings** - расширенные настройки
- 📄 **Reports** - генерация отчётов

**Итого вкладок:** 10
```
1. ➕ Add         - Добавить транзакцию
2. 📊 Stats       - Статистика (текущая)
3. 🔔 Subscriptions - Подписки (v2.3)
4. 🔔 Notifications - Уведомления (v2.3)
5. 💰 Budget      - Бюджет и прогноз (v2.3)
6. 📜 History     - История транзакций
7. 📊 Analytics   - Графики и аналитика ⭐ NEW
8. 👥 Team        - Команда и роли ⭐ NEW
9. 📄 Reports     - Экспорт отчётов ⭐ NEW
10. ⚙️ Settings   - Настройки ⭐ NEW
```

#### 4.2 Dark Mode

**Адаптивная тема:**
- 🌞 Light Mode (по умолчанию)
- 🌙 Dark Mode
- 🔄 Auto (по системе)

#### 4.3 Мобильная оптимизация

**Улучшения:**
- Swipe gestures для навигации
- Pull-to-refresh
- Оптимизация для маленьких экранов
- Кэширование данных (offline mode)

---

## 🗄️ Database Changes

### Новые таблицы (7 таблиц)

#### 1. workspaces
```sql
CREATE TABLE workspaces (
    id SERIAL PRIMARY KEY,
    name VARCHAR(200) NOT NULL,
    description TEXT,
    currency VARCHAR(3) DEFAULT 'KGS',
    owner_id BIGINT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

#### 2. workspace_members
```sql
CREATE TABLE workspace_members (
    id SERIAL PRIMARY KEY,
    workspace_id INTEGER REFERENCES workspaces(id) ON DELETE CASCADE,
    user_id BIGINT NOT NULL,
    role VARCHAR(20) NOT NULL, -- owner, admin, editor, viewer
    joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(workspace_id, user_id)
);
```

#### 3. workspace_invites
```sql
CREATE TABLE workspace_invites (
    id SERIAL PRIMARY KEY,
    workspace_id INTEGER REFERENCES workspaces(id) ON DELETE CASCADE,
    invite_code VARCHAR(50) UNIQUE NOT NULL,
    role VARCHAR(20) DEFAULT 'viewer',
    created_by BIGINT NOT NULL,
    expires_at TIMESTAMP,
    max_uses INTEGER DEFAULT 1,
    used_count INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

#### 4. audit_logs
```sql
CREATE TABLE audit_logs (
    id SERIAL PRIMARY KEY,
    workspace_id INTEGER REFERENCES workspaces(id) ON DELETE CASCADE,
    user_id BIGINT NOT NULL,
    action_type VARCHAR(50) NOT NULL,
    entity_type VARCHAR(50), -- transaction, budget, member, etc.
    entity_id INTEGER,
    changes JSONB,
    ip_address VARCHAR(45),
    user_agent TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

#### 5. analytics_cache
```sql
CREATE TABLE analytics_cache (
    id SERIAL PRIMARY KEY,
    workspace_id INTEGER REFERENCES workspaces(id) ON DELETE CASCADE,
    cache_key VARCHAR(200) NOT NULL,
    cache_data JSONB NOT NULL,
    expires_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(workspace_id, cache_key)
);
```

#### 6. reports
```sql
CREATE TABLE reports (
    id SERIAL PRIMARY KEY,
    workspace_id INTEGER REFERENCES workspaces(id) ON DELETE CASCADE,
    user_id BIGINT NOT NULL,
    report_type VARCHAR(50) NOT NULL, -- monthly, annual, tax
    format VARCHAR(10) NOT NULL, -- pdf, excel, csv
    parameters JSONB,
    file_url TEXT,
    status VARCHAR(20) DEFAULT 'pending', -- pending, processing, ready, failed
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP
);
```

#### 7. user_preferences
```sql
CREATE TABLE user_preferences (
    id SERIAL PRIMARY KEY,
    user_id BIGINT UNIQUE NOT NULL,
    theme VARCHAR(20) DEFAULT 'light', -- light, dark, auto
    language VARCHAR(10) DEFAULT 'ru',
    timezone VARCHAR(50) DEFAULT 'Asia/Bishkek',
    default_workspace_id INTEGER REFERENCES workspaces(id),
    notification_settings JSONB DEFAULT '{"email": true, "telegram": true}',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### Изменения существующих таблиц

#### Добавить workspace_id во все таблицы:
```sql
ALTER TABLE income ADD COLUMN workspace_id INTEGER REFERENCES workspaces(id);
ALTER TABLE expenses ADD COLUMN workspace_id INTEGER REFERENCES workspaces(id);
ALTER TABLE budgets ADD COLUMN workspace_id INTEGER REFERENCES workspaces(id);
ALTER TABLE recurring_payments ADD COLUMN workspace_id INTEGER REFERENCES workspaces(id);
ALTER TABLE notifications ADD COLUMN workspace_id INTEGER REFERENCES workspaces(id);

-- Создать индексы
CREATE INDEX idx_income_workspace ON income(workspace_id);
CREATE INDEX idx_expenses_workspace ON expenses(workspace_id);
CREATE INDEX idx_budgets_workspace ON budgets(workspace_id);
```

---

## 🤖 New AI Tools

### 1. Workspace Management
```javascript
{
  name: "Create_workspace",
  description: "Создать новое рабочее пространство",
  parameters: {
    name: "string",
    description: "string (optional)",
    currency: "string (default: KGS)"
  }
}
```

### 2. Team Management
```javascript
{
  name: "Invite_member",
  description: "Пригласить участника в workspace",
  parameters: {
    workspace_id: "integer",
    role: "owner|admin|editor|viewer"
  }
}
```

### 3. Analytics
```javascript
{
  name: "Get_analytics",
  description: "Получить аналитику с графиками",
  parameters: {
    workspace_id: "integer",
    chart_type: "line|bar|pie|stacked|heatmap",
    period: "week|month|quarter|year"
  }
}
```

### 4. Reports
```javascript
{
  name: "Generate_report",
  description: "Сгенерировать финансовый отчёт",
  parameters: {
    workspace_id: "integer",
    report_type: "monthly|annual|tax",
    format: "pdf|excel|csv",
    period: "string (YYYY-MM)"
  }
}
```

### 5. Forecasting
```javascript
{
  name: "Get_forecast",
  description: "Получить прогноз на основе ML",
  parameters: {
    workspace_id: "integer",
    months_ahead: "integer (1-12)",
    confidence_level: "float (0.9-0.99)"
  }
}
```

---

## 🔄 n8n Workflows

### 1. Report_Generator.json
**Trigger:** Webhook или Schedule  
**Функция:** Генерация PDF/Excel отчётов  
**Ноды:**
1. Webhook/Schedule Trigger
2. Get report parameters
3. Fetch data from DB
4. Generate PDF (using Puppeteer)
5. Upload to Supabase Storage
6. Send notification to user

### 2. Analytics_Cache_Updater.json
**Trigger:** Schedule (каждый час)  
**Функция:** Обновление кэша аналитики  
**Ноды:**
1. Schedule Trigger (hourly)
2. Loop all active workspaces
3. Calculate analytics metrics
4. Update analytics_cache table
5. Log completion

### 3. ML_Forecast_Updater.json
**Trigger:** Schedule (ежедневно 03:00)  
**Функция:** Обновление ML прогнозов  
**Ноды:**
1. Schedule Trigger (daily)
2. Get historical data
3. Call Python ML service (Flask API)
4. Store predictions
5. Send summary to admins

---

## 📱 Mini App Updates

### New Components:

#### 1. Chart.js Integration
```html
<canvas id="income-expense-chart"></canvas>
<canvas id="category-pie-chart"></canvas>
<canvas id="trend-line-chart"></canvas>
```

#### 2. Team Management UI
```html
<div class="team-tab">
  <h2>Участники (5)</h2>
  <div class="member-list">
    <!-- Member cards -->
  </div>
  <button onclick="inviteMember()">➕ Пригласить</button>
</div>
```

#### 3. Reports Generation
```html
<div class="reports-tab">
  <h2>Отчёты</h2>
  <select id="report-type">
    <option value="monthly">Месячный</option>
    <option value="annual">Годовой</option>
    <option value="tax">Налоговый</option>
  </select>
  <select id="report-format">
    <option value="pdf">PDF</option>
    <option value="excel">Excel</option>
    <option value="csv">CSV</option>
  </select>
  <button onclick="generateReport()">📄 Сгенерировать</button>
</div>
```

---

## 🧪 Testing Plan

### Unit Tests
- [ ] Workspace CRUD operations
- [ ] Role-based access control (RBAC)
- [ ] Invite link generation
- [ ] PDF generation
- [ ] Analytics calculations
- [ ] ML forecasting

### Integration Tests
- [ ] Multi-user workflow
- [ ] Report generation end-to-end
- [ ] Chart.js rendering
- [ ] Export to Excel/CSV

### Load Tests
- [ ] 100 concurrent users
- [ ] 1000 workspaces
- [ ] Large dataset analytics (10k+ transactions)

---

## 📊 Metrics & KPIs

**Success Criteria:**
- ✅ Workspaces created: >100
- ✅ Team invites accepted: >50%
- ✅ Reports generated: >500/month
- ✅ Chart views: >1000/day
- ✅ User retention: >70%

**Performance:**
- Chart rendering: <1s
- PDF generation: <5s
- Analytics query: <2s
- Forecast calculation: <10s

---

## 🚀 Roadmap

### Phase 1: Foundation (Weeks 1-2)
- [ ] Database schema migration
- [ ] Workspace CRUD API
- [ ] RBAC implementation
- [ ] Basic team management

### Phase 2: Analytics (Weeks 3-4)
- [ ] Chart.js integration
- [ ] Dashboard UI
- [ ] Analytics API endpoints
- [ ] Caching layer

### Phase 3: Reports (Weeks 5-6)
- [ ] PDF generation (Puppeteer)
- [ ] Excel export (ExcelJS)
- [ ] CSV export
- [ ] Report scheduling

### Phase 4: ML & Forecasting (Weeks 7-8)
- [ ] Python ML service setup
- [ ] Model training pipeline
- [ ] Forecast API integration
- [ ] UI for predictions

### Phase 5: Testing & Polish (Weeks 9-10)
- [ ] Full testing suite
- [ ] Bug fixes
- [ ] Performance optimization
- [ ] Documentation

### Phase 6: Release (Week 11)
- [ ] Final QA
- [ ] Deployment
- [ ] User training materials
- [ ] Launch announcement

---

## 💰 Monetization (Optional)

### Pricing Tiers:

**Free:**
- 1 workspace
- 3 team members
- Basic analytics
- Monthly reports

**Premium ($4.99/month):**
- 3 workspaces
- 10 team members
- Advanced analytics
- All report types
- Export to Excel/CSV
- ML forecasting

**Business ($14.99/month):**
- Unlimited workspaces
- 50 team members
- Priority support
- Custom reports
- API access
- White-label option

---

## 🔗 Dependencies

### New Libraries:
- **Chart.js** - графики и визуализация
- **Puppeteer** - генерация PDF
- **ExcelJS** - экспорт в Excel
- **Python Flask** - ML service (Prophet/ARIMA)
- **scikit-learn** - машинное обучение
- **pandas** - обработка данных

### External Services:
- **Supabase Storage** - хранение PDF/Excel файлов
- **Redis** (optional) - кэширование аналитики
- **ML Service** - отдельный микросервис на Python

---

## 📝 Documentation Plan

### New Docs:
- [ ] WORKSPACE_GUIDE.md - работа с командами
- [ ] ANALYTICS_GUIDE.md - использование аналитики
- [ ] REPORTS_GUIDE.md - генерация отчётов
- [ ] ML_FORECAST_GUIDE.md - как работает ML
- [ ] RBAC_GUIDE.md - роли и права доступа
- [ ] API_v2.4_REFERENCE.md - новые API endpoints

---

## 🎯 Success Metrics

**Technical:**
- Code coverage: >80%
- API response time: <200ms (p95)
- PDF generation: <5s
- Zero critical bugs

**Business:**
- 200+ new workspaces created
- 100+ teams with >2 members
- 1000+ reports generated
- 90% user satisfaction

---

## 🔮 Future Ideas (v2.5.0+)

- 🏦 Bank integrations (Demir Bank, KICB)
- 📱 Mobile app (React Native)
- 🔄 Automatic transaction categorization (ML)
- 🌍 Multi-language support
- 💳 Expense scanning (OCR for receipts)
- 🤖 Telegram Bot improvements (inline keyboards)
- 📊 Custom dashboard widgets
- 🔔 Advanced notification rules
- 💰 Cryptocurrency support
- 🔐 Two-factor authentication (2FA)

---

**v2.4.0 будет МОЩНЫМ релизом! 🚀**

Estimated timeline: **10-11 недель** (2.5 месяца)  
Estimated effort: **~200 часов разработки**

Ready to start? 🎉
