# 📱 Telegram Mini App - Руководство по настройке

## 🚀 Быстрый старт

### 1. Подготовка Mini App

1. Скопируйте `miniapp-config.example.js` в `miniapp-config.js`
2. Заполните конфигурацию своими данными
3. Загрузите `TelegramMiniApp.html` на хостинг

### 2. Варианты хостинга

#### Вариант A: GitHub Pages (бесплатно)
```bash
# Создайте репозиторий на GitHub
# Загрузите TelegramMiniApp.html
# Включите GitHub Pages в Settings
# URL: https://username.github.io/repo-name/TelegramMiniApp.html
```

#### Вариант B: Vercel (бесплатно)
```bash
npm install -g vercel
vercel login
vercel --prod
# Получите URL вашего приложения
```

#### Вариант C: Netlify (бесплатно)
1. Зарегистрируйтесь на netlify.com
2. Перетащите файл TelegramMiniApp.html в Netlify Drop
3. Получите URL приложения

#### Вариант D: Свой сервер
```bash
# Nginx
sudo cp TelegramMiniApp.html /var/www/html/
# URL: https://yourdomain.com/TelegramMiniApp.html
```

### 3. Регистрация Mini App в Telegram

1. Откройте [@BotFather](https://t.me/BotFather) в Telegram
2. Отправьте команду `/newapp` или `/myapps`
3. Выберите вашего бота
4. Введите название: `AI Accounter`
5. Введите описание: `Финансовый помощник с AI`
6. Загрузите иконку (512x512 PNG)
7. Вставьте URL вашего Mini App
8. Выберите режим открытия: `Full Screen`

### 4. Настройка подключения

#### Режим 1: Через Telegram Bot (рекомендуется)
Самый простой вариант - все данные отправляются через бота в n8n.

В `miniapp-config.js`:
```javascript
mode: 'bot',
supabase.enabled: false
```

#### Режим 2: Прямое подключение к Supabase
Требует настройки CORS и RLS политик.

В `miniapp-config.js`:
```javascript
mode: 'supabase',
supabase: {
    url: 'https://your-project.supabase.co',
    anonKey: 'your-anon-key',
    enabled: true
}
```

**Настройка Supabase для Mini App:**

1. Откройте Supabase Dashboard → Authentication → URL Configuration
2. Добавьте URL вашего Mini App в `Site URL` и `Redirect URLs`

3. Настройте CORS в Supabase:
```sql
-- В Supabase SQL Editor
ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE income ENABLE ROW LEVEL SECURITY;

-- Политика для Mini App (анонимный доступ по telegram_user_id)
CREATE POLICY "Users can insert their own data"
ON expenses FOR INSERT
WITH CHECK (telegram_user_id = current_setting('request.jwt.claims')::json->>'telegram_user_id');

CREATE POLICY "Users can view their own data"
ON expenses FOR SELECT
USING (telegram_user_id = current_setting('request.jwt.claims')::json->>'telegram_user_id');
```

4. Обновите `TelegramMiniApp.html`:
```javascript
const USE_SUPABASE = true;
const SUPABASE_URL = 'https://your-project.supabase.co';
const SUPABASE_ANON_KEY = 'your-anon-key';
```

### 5. Тестирование

1. Откройте бота в Telegram
2. Отправьте команду `/start` или нажмите кнопку Menu
3. Выберите "AI Accounter" в меню
4. Попробуйте добавить транзакцию

### 6. Отладка

#### Проверка подключения:
```javascript
// Откройте DevTools в Telegram (для Desktop)
// Или используйте Eruda для мобильных устройств
console.log('Telegram WebApp:', window.Telegram.WebApp);
console.log('User ID:', window.Telegram.WebApp.initDataUnsafe.user.id);
```

#### Частые проблемы:

**Проблема:** Mini App не открывается
- Проверьте, что URL доступен по HTTPS
- Убедитесь, что Mini App зарегистрирован в BotFather
- Проверьте консоль браузера на ошибки

**Проблема:** Данные не сохраняются
- Режим 'bot': проверьте, что workflow активен в n8n
- Режим 'supabase': проверьте CORS и RLS политики
- Проверьте Network tab в DevTools

**Проблема:** Валюта отображается некорректно
- Убедитесь, что в базе данных есть колонка `currency`
- Выполните миграцию из `migrations/add_currency_field.sql`

## 📋 Функции Mini App

### ✅ Реализовано

- ✅ Добавление доходов/расходов
- ✅ Мультивалютность (KGS, USD, EUR, RUB)
- ✅ Выбор категории
- ✅ Голосовой ввод (Web Speech API)
- ✅ Статистика за месяц
- ✅ История транзакций
- ✅ Фильтрация по типу и периоду
- ✅ Адаптивный дизайн
- ✅ Темная/светлая тема (Telegram)

### 🔄 В разработке

- ⏳ PDF/Excel отчёты
- ⏳ Графики и диаграммы
- ⏳ Бюджеты и лимиты
- ⏳ Пуш-уведомления
- ⏳ Оффлайн режим
- ⏳ Синхронизация между устройствами

## 🎨 Кастомизация

### Изменение цветовой схемы

В `<style>` секции измените:
```css
background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
/* Ваш градиент */
```

### Добавление новых категорий

В `<script>` секции:
```javascript
const categories = {
    income: [..., 'Новая категория'],
    expense: [..., 'Новая категория']
};
```

### Изменение валют

```javascript
const currencies = {
    'KGS': { symbol: 'с', name: 'Сом' },
    'YOUR_CURRENCY': { symbol: '¥', name: 'Name' }
};
```

## 🔐 Безопасность

### Для режима 'bot':
- Все данные проходят через Telegram (защищено)
- User ID автоматически берётся из Telegram

### Для режима 'supabase':
- Используйте RLS (Row Level Security)
- Не храните service_role ключ в клиенте
- Используйте только anon key
- Проверяйте telegram_user_id на сервере

## 📊 Аналитика

### Google Analytics (опционально)

Добавьте в `<head>`:
```html
<!-- Google Analytics -->
<script async src="https://www.googletagmanager.com/gtag/js?id=GA_MEASUREMENT_ID"></script>
<script>
  window.dataLayer = window.dataLayer || [];
  function gtag(){dataLayer.push(arguments);}
  gtag('js', new Date());
  gtag('config', 'GA_MEASUREMENT_ID');
</script>
```

## 🆘 Поддержка

- 📖 [Telegram Mini Apps Documentation](https://core.telegram.org/bots/webapps)
- 💬 [Telegram Mini Apps Chat](https://t.me/WebAppsChat)
- 🐛 [GitHub Issues](https://github.com/your-repo/issues)

## 📝 Примечания

1. Mini App работает только в Telegram (Web, Desktop, Mobile)
2. Требуется HTTPS для production
3. Некоторые API (Camera, GPS) могут быть недоступны
4. Голосовой ввод работает не во всех браузерах

---

**🎉 Готово!** Ваш Mini App теперь доступен в Telegram!

Откройте бота → Menu → AI Accounter
