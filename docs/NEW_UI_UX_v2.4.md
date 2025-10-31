# AIAccounter v2.4.0 - New UI/UX Documentation

## 🎨 Design Overview

Полностью переработанный пользовательский интерфейс с современным Material Design 3 для Telegram Mini App.

**Дата создания:** 2024  
**Версия:** 2.4.0  
**Дизайн система:** Material Design 3 + Telegram Mini Apps Guidelines  
**Файлы:**
- `miniapp/index-new.html` (515 строк)
- `miniapp/style-new.css` (1000+ строк)
- `miniapp/app-new.js` (1000+ строк)

---

## 📱 Key Features

### 1. **Screen-Based Navigation**
Вместо горизонтальных вкладок - полноэкранные страницы с плавными переходами:
- **Home (Главная)** - Dashboard с балансом, быстрой статистикой и последними транзакциями
- **Analytics (Аналитика)** - Графики, метрики, анализ расходов/доходов
- **Team (Команда)** - Управление workspace и участниками
- **Reports (Отчеты)** - Генерация PDF/Excel/CSV отчетов
- **Settings (Настройки)** - Валюта, тема, уведомления
- **History (История)** - Полная история транзакций с фильтрами

### 2. **Bottom Navigation**
5 основных разделов + FAB (Floating Action Button):
```
┌─────┬─────┬─────┬─────┬─────┐
│Home │Analy│ [+] │Team │Sett.│
└─────┴─────┴─────┴─────┴─────┘
```
- Всегда видна внизу экрана
- Active state с цветовым выделением
- FAB вынесен над навигацией для быстрого добавления транзакций

### 3. **Card-Based Layout**
Все элементы упакованы в карточки с тенями:
- Balance Card (градиент, большой баланс)
- Quick Stats Cards (доход/расход)
- Transaction Cards (иконка, категория, сумма)
- Metric Cards (аналитика с градиентами)
- Chart Cards (графики с заголовками)

### 4. **Bottom Sheet Modals**
Модальные окна выезжают снизу (как в нативных приложениях):
- Добавление транзакции
- Фильтры
- Редактирование

### 5. **Modern Color System**
4 градиента для разных типов карточек:
- **Gradient 1:** Фиолетовый (Primary) - баланс, баланс-тренд
- **Gradient 2:** Розово-красный - expenses
- **Gradient 3:** Синий - информация
- **Gradient 4:** Зелёный - доходы

### 6. **Dark Mode Support**
Автоматическая поддержка тёмной темы:
```css
[data-theme="dark"] {
    --bg-primary: #111827;
    --text-primary: #F9FAFB;
    /* ... */
}
```

---

## 🧩 Components

### Balance Card (Home Screen)
```html
<div class="balance-card">
    <div class="balance-label">Текущий баланс</div>
    <div class="balance-amount">125 450 с</div>
    <div class="balance-change">
        <span class="change-positive">+12.5%</span>
        <span class="change-period">за месяц</span>
    </div>
</div>
```
**Особенности:**
- Градиентный фон (Gradient 1)
- Крупный баланс (48px)
- Изменение за период с процентами
- Цвет изменения: зелёный/красный

### Quick Stats
```html
<div class="quick-stats">
    <div class="stat-item income">
        <i class="fas fa-arrow-down"></i>
        <div class="stat-content">
            <div class="stat-label">Доходы</div>
            <div class="stat-value">45 000 с</div>
        </div>
    </div>
    <!-- expense card -->
</div>
```
**Особенности:**
- 2 колонки (доход/расход)
- Иконки с цветами (зелёный/красный)
- Компактная информация

### Quick Actions Grid
```html
<div class="quick-actions-grid">
    <button class="action-btn primary">
        <i class="fas fa-arrow-down"></i>
        <span>Доход</span>
    </button>
    <!-- expense, transfer, budget -->
</div>
```
**Особенности:**
- 4 кнопки (2x2 grid на маленьких экранах)
- Градиентные фоны
- Hover эффект (поднятие карточки)

### Transaction Item
```html
<div class="transaction-item">
    <div class="transaction-icon income">
        <i class="fas fa-arrow-down"></i>
    </div>
    <div class="transaction-info">
        <div class="transaction-category">Зарплата</div>
        <div class="transaction-description">Февраль 2024</div>
    </div>
    <div class="transaction-amount income">+50 000 с</div>
</div>
```
**Особенности:**
- Круглая иконка с цветным фоном
- Категория (жирный шрифт)
- Описание (серый цвет)
- Сумма с цветом (зелёная/красная)

### Metric Cards (Analytics)
```html
<div class="metrics-grid">
    <div class="metric-card gradient-1">
        <div class="metric-icon">
            <i class="fas fa-arrow-down"></i>
        </div>
        <div class="metric-info">
            <div class="metric-label">Доходы</div>
            <div class="metric-value">45 000 с</div>
        </div>
    </div>
    <!-- expenses, balance, savings rate -->
</div>
```
**Особенности:**
- 4 метрики (2x2 grid)
- Разные градиенты (Gradient 1-4)
- Иконки на полупрозрачном фоне
- Белый текст

### Chart Cards
```html
<div class="chart-card">
    <h3>
        <i class="fas fa-chart-line"></i>
        Доходы и Расходы
    </h3>
    <canvas id="incomeExpenseChart"></canvas>
</div>
```
**Особенности:**
- Белый фон с тенью
- Заголовок с иконкой
- Canvas для Chart.js
- Max-height: 250px

### Bottom Sheet Modal
```html
<div id="add-transaction-modal" class="modal">
    <div class="modal-overlay"></div>
    <div class="modal-content bottom-sheet">
        <div class="modal-header">
            <h2>Новая транзакция</h2>
            <button class="close-btn">×</button>
        </div>
        <!-- form content -->
    </div>
</div>
```
**Особенности:**
- Slide-up анимация (0.3s cubic-bezier)
- Затемнённый overlay (backdrop-filter blur)
- Закругление только сверху (24px)
- Max-height: 90vh с scroll

---

## 🎭 Animations

### Screen Transitions
```css
@keyframes fadeIn {
    from { opacity: 0; transform: translateY(10px); }
    to { opacity: 1; transform: translateY(0); }
}
```

### Modal Animations
```css
@keyframes slideUp {
    from { transform: translateY(100%); }
    to { transform: translateY(0); }
}

@keyframes modalFadeIn {
    from { opacity: 0; }
    to { opacity: 1; }
}
```

### Hover Effects
```css
.action-btn:hover {
    transform: translateY(-4px);
    box-shadow: var(--shadow-md);
}

.transaction-item:hover {
    transform: translateX(4px);
}
```

### Loading State
```css
@keyframes pulse {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.5; }
}
.loading { animation: pulse 1.5s ease-in-out infinite; }
```

---

## 🎨 Color Palette

### Primary Colors
```css
--primary: #6366F1;        /* Indigo */
--primary-dark: #4F46E5;
--primary-light: #818CF8;
--secondary: #10B981;      /* Green */
--accent: #F59E0B;         /* Amber */
--danger: #EF4444;         /* Red */
```

### Gradients
```css
--gradient-1: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
--gradient-2: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
--gradient-3: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%);
--gradient-4: linear-gradient(135deg, #43e97b 0%, #38f9d7 100%);
```

### Backgrounds
```css
--bg-primary: #FFFFFF;     /* Cards */
--bg-secondary: #F9FAFB;   /* App background */
--bg-tertiary: #F3F4F6;    /* Buttons */
```

### Text
```css
--text-primary: #111827;   /* Main text */
--text-secondary: #6B7280; /* Labels */
--text-tertiary: #9CA3AF;  /* Placeholders */
```

---

## 📐 Spacing System

```css
--spacing-xs: 4px;
--spacing-sm: 8px;
--spacing-md: 16px;
--spacing-lg: 24px;
--spacing-xl: 32px;
```

**Usage:**
- Form groups: `--spacing-lg` (24px)
- Card padding: `--spacing-lg` (24px)
- Grid gaps: `--spacing-md` (16px)
- Icon gaps: `--spacing-sm` (8px)

---

## 📱 Responsive Breakpoints

```css
@media (max-width: 380px) {
    .quick-actions-grid {
        grid-template-columns: repeat(2, 1fr);
    }
    .metrics-grid {
        grid-template-columns: 1fr;
    }
    .balance-amount {
        font-size: 36px;
    }
}
```

**Mobile-first подход:**
- Основной дизайн для 320-480px
- Адаптация для маленьких экранов (<380px)

---

## 🔧 JavaScript Architecture

### Navigation System
```javascript
function switchScreen(screenName) {
    // Hide all screens
    document.querySelectorAll('.screen').forEach(...);
    
    // Show selected screen
    document.getElementById(`${screenName}-screen`).classList.add('active');
    
    // Load screen data
    loadScreenData(screenName);
}
```

### Modal Management
```javascript
function openAddTransactionModal() {
    document.getElementById('add-transaction-modal').classList.add('active');
    resetTransactionForm();
}

function closeModal(modalId) {
    document.getElementById(modalId).classList.remove('active');
}
```

### API Integration (n8n)
```javascript
async function apiCall(endpoint, action, data = {}) {
    const payload = {
        user_id: getUserId(),
        workspace_id: currentWorkspaceId,
        action: action,
        ...data
    };
    
    const response = await fetch(config.n8nWebhooks[endpoint], {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
    });
    
    return await response.json();
}
```

### Chart.js Integration
```javascript
let charts = {
    incomeExpense: null,
    categoryPie: null,
    balanceTrend: null
};

function renderIncomeExpenseChart(data) {
    if (charts.incomeExpense) {
        charts.incomeExpense.destroy();
    }
    
    charts.incomeExpense = new Chart(ctx, {
        type: 'line',
        data: { /* ... */ },
        options: { /* ... */ }
    });
}
```

---

## 🚀 Quick Start

### 1. Замените старые файлы

**Вариант A (переименование):**
```bash
# Backup старой версии
mv miniapp/index.html miniapp/index-old.html
mv miniapp/style.css miniapp/style-old.css
mv miniapp/app.js miniapp/app-old.js

# Активируйте новую версию
mv miniapp/index-new.html miniapp/index.html
mv miniapp/style-new.css miniapp/style.css
mv miniapp/app-new.js miniapp/app.js
```

**Вариант B (использование новых файлов):**
```bash
# Обновите serve_miniapp.js чтобы он открывал index-new.html
node serve_miniapp.js
```

### 2. Запустите локальный сервер
```bash
node serve_miniapp.js
```

### 3. Откройте в браузере
```
http://localhost:3000/index-new.html
```

---

## 📊 Features Checklist

### Home Screen
- [x] Balance Card с градиентом
- [x] Quick Stats (доход/расход)
- [x] Quick Actions Grid (4 кнопки)
- [x] Recent Transactions (последние 5)
- [x] Пустое состояние (empty state)

### Analytics Screen
- [x] Period Selector (неделя/месяц/квартал/год)
- [x] 4 Metric Cards с градиентами
- [x] Income vs Expense Chart (Line)
- [x] Category Pie Chart (Pie)
- [x] Balance Trend Chart (Line/Area)

### Team Screen
- [x] Workspace Selector (dropdown)
- [x] Members List с ролями
- [x] Avatars с инициалами
- [x] Role badges (owner/admin/member)

### Reports Screen
- [x] Report Type Select
- [x] Date Range (start/end)
- [x] Format Buttons (PDF/Excel/CSV)
- [x] Generate Report Button
- [x] Download functionality

### Settings Screen
- [x] Default Currency Select
- [x] Dark Mode Toggle (Switch)
- [x] Notifications Toggle
- [x] Language Selector
- [x] About Section

### History Screen
- [x] Filter (all/income/expense)
- [x] Period (week/month/quarter/year)
- [x] Transactions List
- [x] Empty State
- [x] Transaction Details

### Add Transaction Modal
- [x] Type Toggle (expense/income)
- [x] Amount Input + Currency
- [x] Category Pills (dynamic)
- [x] Description (optional)
- [x] Date + Time Picker
- [x] Bottom Sheet Animation

### Navigation
- [x] Bottom Navigation (5 items)
- [x] FAB Button (Floating)
- [x] Active State Highlighting
- [x] Screen Switching
- [x] Back Buttons

---

## 🎯 Performance Optimizations

1. **Chart Destruction**
   ```javascript
   if (charts.incomeExpense) {
       charts.incomeExpense.destroy();
   }
   ```
   Предотвращает утечки памяти при пересоздании графиков

2. **Lazy Loading**
   ```javascript
   loadScreenData(screenName);
   ```
   Данные загружаются только при открытии экрана

3. **CSS Transitions**
   ```css
   --transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
   ```
   Аппаратное ускорение для плавных анимаций

4. **LocalStorage Caching**
   ```javascript
   localStorage.setItem('defaultCurrency', currency);
   localStorage.setItem('theme', theme);
   ```
   Сохранение настроек пользователя

---

## 🐛 Known Issues & Solutions

### Issue 1: Chart.js не отображается
**Решение:** Убедитесь что CDN загружен:
```html
<script src="https://cdn.jsdelivr.net/npm/chart.js@4.4.0/dist/chart.umd.min.js"></script>
```

### Issue 2: Telegram WebApp API не работает
**Решение:** Откройте через Telegram Mini App или используйте моки:
```javascript
const tg = window.Telegram?.WebApp || {
    ready: () => {},
    expand: () => {},
    initDataUnsafe: { user: { id: 123456 } }
};
```

### Issue 3: n8n webhooks возвращают CORS ошибки
**Решение:** Убедитесь что n8n настроен на разрешение CORS запросов

---

## 📝 Changelog from Old UI

### Removed
- ❌ Horizontal tab navigation (10 tabs)
- ❌ Old gradient header
- ❌ Inline forms on home screen
- ❌ Scattered layout

### Added
- ✅ Bottom navigation (5 items)
- ✅ Screen-based architecture
- ✅ FAB (Floating Action Button)
- ✅ Bottom sheet modals
- ✅ Card-based layouts
- ✅ Modern gradients
- ✅ Dark mode support
- ✅ Smooth animations
- ✅ Improved mobile UX

### Improved
- 🔄 Typography (Inter font)
- 🔄 Color system (Material Design 3)
- 🔄 Spacing consistency
- 🔄 Touch targets (минимум 40x40px)
- 🔄 Accessibility (ARIA labels)

---

## 🎓 Best Practices

1. **Mobile-First Design**
   - Основной размер: 320-480px
   - Тач-таргеты: минимум 40x40px
   - Шрифт: минимум 14px для контента

2. **Performance**
   - Lazy load screens
   - Destroy chart instances
   - Use CSS transitions (not JS animations)
   - Cache API responses

3. **Accessibility**
   - Color contrast ratio >= 4.5:1
   - Focus states for all interactive elements
   - ARIA labels for icons

4. **Code Structure**
   - Separate concerns (HTML/CSS/JS)
   - Reusable components
   - Clear naming conventions

---

## 📚 Resources

- **Design System:** Material Design 3 (https://m3.material.io)
- **Icons:** Font Awesome 6.4.0 (https://fontawesome.com)
- **Charts:** Chart.js 4.4.0 (https://www.chartjs.org)
- **Fonts:** Inter (Google Fonts)

---

## 👥 Team & Support

**Разработчик:** AI Agent  
**Версия:** 2.4.0  
**Дата релиза:** 2024  

**Обратная связь:**
- GitHub Issues
- Telegram Support Bot

---

**🎉 Готово к использованию! Наслаждайтесь новым UI/UX!**
