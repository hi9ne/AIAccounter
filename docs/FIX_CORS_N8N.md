# 🔧 Fix CORS Errors - n8n Configuration

## 🚨 Проблема

```
Access to fetch at 'https://hi9neee.app.n8n.cloud/webhook/...' 
from origin 'https://hi9ne.github.io' has been blocked by CORS policy
```

Mini App на GitHub Pages не может обращаться к n8n webhooks из-за CORS политики.

---

## ✅ Решение: Настройка CORS в n8n

### Вариант 1: Добавить CORS заголовки в каждый workflow

**Для КАЖДОГО workflow (Workspace_API, Analytics_API, Reports_API, MiniApp_API):**

1. Откройте workflow в n8n редакторе
2. Найдите узел **Webhook** (первый узел в workflow)
3. Добавьте узел **Set** сразу после Webhook
4. Настройте узел **Set** для добавления заголовков:

```json
{
  "headers": {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Max-Age": "86400"
  }
}
```

5. Добавьте узел **Respond to Webhook** в конце workflow
6. В настройках **Respond to Webhook** укажите:
   - Response Code: `200`
   - Response Headers: `headers` (из узла Set)
   - Response Body: ваши данные

---

### Вариант 2: HTTP Node вместо Webhook (рекомендуется)

Замените **Webhook** узлы на **HTTP Request** узлы:

**Структура:**
```
HTTP Request (endpoint) 
  → Code/Function Node (обработка)
  → Supabase Query
  → Code/Function Node (форматирование ответа)
  → HTTP Response (с CORS headers)
```

**HTTP Response настройки:**
```javascript
// В Code Node перед HTTP Response
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Max-Age': '86400'
};

return {
  json: {
    ...yourData,
    headers: corsHeaders
  }
};
```

---

### Вариант 3: n8n CORS настройки (глобально)

Если у вас self-hosted n8n:

1. Откройте файл `docker-compose.yml` или `.env`
2. Добавьте переменные окружения:

```yaml
environment:
  - N8N_WEBHOOK_CORS_ALLOW_ORIGIN=*
  - N8N_WEBHOOK_CORS_ALLOW_METHODS=GET,POST,PUT,DELETE,OPTIONS
  - N8N_WEBHOOK_CORS_ALLOW_HEADERS=Content-Type,Authorization
```

3. Перезапустите n8n:
```bash
docker-compose down
docker-compose up -d
```

**Примечание:** Для n8n.cloud это не применимо.

---

### Вариант 4: Proxy Server (временное решение)

Создайте простой proxy на Vercel/Netlify:

**proxy.js (Node.js):**
```javascript
const express = require('express');
const fetch = require('node-fetch');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

app.post('/api/:endpoint', async (req, res) => {
  const { endpoint } = req.params;
  const webhooks = {
    miniapp: 'https://hi9neee.app.n8n.cloud/webhook/miniapp',
    workspace: 'https://hi9neee.app.n8n.cloud/webhook/workspace',
    analytics: 'https://hi9neee.app.n8n.cloud/webhook/analytics',
    reports: 'https://hi9neee.app.n8n.cloud/webhook/reports'
  };

  try {
    const response = await fetch(webhooks[endpoint], {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(req.body)
    });
    const data = await response.json();
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.listen(3000);
```

**Обновите miniapp-config.js:**
```javascript
const MiniAppConfig = {
    mode: 'n8n',
    n8nWebhooks: {
        miniapp: 'https://your-proxy.vercel.app/api/miniapp',
        workspace: 'https://your-proxy.vercel.app/api/workspace',
        analytics: 'https://your-proxy.vercel.app/api/analytics',
        reports: 'https://your-proxy.vercel.app/api/reports'
    }
};
```

---

## 🧪 Тестирование CORS

### 1. Проверка через curl
```bash
curl -X OPTIONS https://hi9neee.app.n8n.cloud/webhook/workspace \
  -H "Origin: https://hi9ne.github.io" \
  -H "Access-Control-Request-Method: POST" \
  -v
```

**Ожидаемый ответ:**
```
< Access-Control-Allow-Origin: *
< Access-Control-Allow-Methods: POST, GET, OPTIONS
```

### 2. Проверка в браузере (Console)
```javascript
fetch('https://hi9neee.app.n8n.cloud/webhook/workspace', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ test: true })
})
.then(r => r.json())
.then(d => console.log('✅ CORS OK:', d))
.catch(e => console.error('❌ CORS Error:', e));
```

---

## 📝 Рекомендации

### Для Production
1. **Специфичный Origin:** Вместо `*` укажите конкретный домен:
   ```
   Access-Control-Allow-Origin: https://hi9ne.github.io
   ```

2. **Credentials:** Если нужны cookies:
   ```
   Access-Control-Allow-Credentials: true
   ```

3. **Preflight Caching:** Увеличьте Max-Age:
   ```
   Access-Control-Max-Age: 86400
   ```

### Для Development
1. **Wildcard Origin:** Используйте `*` для простоты
2. **Подробное логирование:** Добавьте логи в n8n workflows
3. **Error Handling:** Обрабатывайте CORS ошибки в клиенте

---

## 🎯 Быстрое решение (прямо сейчас)

**Шаг 1:** Откройте любой workflow в n8n  
**Шаг 2:** Добавьте узел **HTTP Response** в конец  
**Шаг 3:** В настройках укажите:

```json
{
  "responseCode": 200,
  "headers": {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type"
  }
}
```

**Шаг 4:** Сохраните и активируйте workflow  
**Шаг 5:** Перезагрузите Mini App в браузере

---

## 📚 Дополнительные ресурсы

- **MDN CORS Guide:** https://developer.mozilla.org/en-US/docs/Web/HTTP/CORS
- **n8n Webhook Docs:** https://docs.n8n.io/integrations/builtin/core-nodes/n8n-nodes-base.webhook/
- **CORS Tester:** https://www.test-cors.org/

---

## ✅ После настройки CORS

Мини приложение должно работать:
- [x] Нет CORS ошибок в Console
- [x] API запросы проходят успешно
- [x] Данные загружаются
- [x] Транзакции сохраняются

---

**🔧 Настройте CORS и приложение заработает!**
