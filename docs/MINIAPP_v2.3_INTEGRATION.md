# Mini App v2.3.0 Integration Guide

## ✅ Completed Tasks

### 1. HTML Interface (miniapp/index.html)
- ✅ Updated version to v2.3.0
- ✅ Added 3 new tabs: Подписки (Subscriptions), Уведомления (Notifications), Бюджет (Budget)
- ✅ Created Subscriptions tab content:
  - Subscription list display
  - Add subscription form (modal)
  - Monthly total calculation
  - Empty state handling
- ✅ Created Notifications tab content:
  - Notification cards with priority badges
  - Filter buttons (All, Unread, Urgent)
  - Mark as read functionality
  - Empty state handling
- ✅ Created Budget tab content:
  - Budget progress bar
  - Monthly statistics
  - Forecast display
  - Recommendations section
  - Alert settings configuration

### 2. CSS Styles (miniapp/style.css)
- ✅ Updated version to v2.3.0
- ✅ Added subscription card styles
- ✅ Added notification card styles with priority colors
- ✅ Added budget card styles with progress bar
- ✅ Added modal styles for forms
- ✅ Added filter button styles
- ✅ Added responsive styles

### 3. JavaScript Functions (miniapp/app.js)
- ✅ Updated version to v2.3.0
- ✅ Added `loadSubscriptions()` - load user subscriptions
- ✅ Added `showAddSubscription()` / `hideAddSubscription()` - modal controls
- ✅ Added `handleSubscriptionSubmit()` - create new subscription
- ✅ Added `cancelSubscription(id)` - cancel subscription
- ✅ Added `loadNotifications(filter)` - load notifications with filtering
- ✅ Added `filterNotifications(type)` - client-side filtering
- ✅ Added `markNotificationRead(id)` - mark single notification as read
- ✅ Added `markAllAsRead()` - mark all notifications as read
- ✅ Added `loadBudgetForecast()` - load budget data and forecast
- ✅ Added `refreshBudget()` - refresh budget display
- ✅ Added `saveAlertSettings()` - save threshold configuration
- ✅ Updated `switchTab()` to handle new tabs

## ⏳ Remaining Tasks

### 4. Update MiniApp_API.json (n8n Workflow)

You need to add 8 new actions to the Switch node in `MiniApp_API.json`:

#### New Actions to Add:

**1. get_subscriptions**
```json
{
  "conditions": {
    "conditions": [
      {
        "leftValue": "={{ $json.body.action }}",
        "rightValue": "get_subscriptions",
        "operator": { "type": "string", "operation": "equals" }
      }
    ]
  },
  "renameOutput": true,
  "outputKey": "get_subscriptions"
}
```
**SQL Query:**
```sql
SELECT * FROM recurring_payments 
WHERE user_id = {{ $json.body.userId }}
ORDER BY is_active DESC, next_payment_date ASC;
```

**2. create_subscription**
```json
{
  "conditions": {
    "conditions": [
      {
        "leftValue": "={{ $json.body.action }}",
        "rightValue": "create_subscription",
        "operator": { "type": "string", "operation": "equals" }
      }
    ]
  },
  "renameOutput": true,
  "outputKey": "create_subscription"
}
```
**SQL Query:**
```sql
SELECT create_recurring_payment(
  {{ $json.body.userId }}::BIGINT,
  '{{ $json.body.data.title }}'::VARCHAR,
  {{ $json.body.data.amount }}::NUMERIC,
  '{{ $json.body.data.currency }}'::VARCHAR,
  '{{ $json.body.data.category }}'::VARCHAR,
  '{{ $json.body.data.frequency }}'::VARCHAR,
  CURRENT_DATE,
  'Подписка'::VARCHAR,
  'expense'::VARCHAR,
  1::INTEGER,
  {{ $json.body.data.remind_days }}::INTEGER,
  {{ $json.body.data.auto_create }}::BOOLEAN
);
```

**3. cancel_subscription**
```json
{
  "conditions": {
    "conditions": [
      {
        "leftValue": "={{ $json.body.action }}",
        "rightValue": "cancel_subscription",
        "operator": { "type": "string", "operation": "equals" }
      }
    ]
  },
  "renameOutput": true,
  "outputKey": "cancel_subscription"
}
```
**SQL Query:**
```sql
UPDATE recurring_payments 
SET is_active = FALSE 
WHERE id = {{ $json.body.data.subscription_id }} 
  AND user_id = {{ $json.body.userId }};
```

**4. get_notifications**
```json
{
  "conditions": {
    "conditions": [
      {
        "leftValue": "={{ $json.body.action }}",
        "rightValue": "get_notifications",
        "operator": { "type": "string", "operation": "equals" }
      }
    ]
  },
  "renameOutput": true,
  "outputKey": "get_notifications"
}
```
**SQL Query:**
```sql
SELECT * FROM notifications 
WHERE user_id = {{ $json.body.userId }}
ORDER BY is_read ASC, priority DESC, created_at DESC
LIMIT 50;
```

**5. mark_notification_read**
```json
{
  "conditions": {
    "conditions": [
      {
        "leftValue": "={{ $json.body.action }}",
        "rightValue": "mark_notification_read",
        "operator": { "type": "string", "operation": "equals" }
      }
    ]
  },
  "renameOutput": true,
  "outputKey": "mark_notification_read"
}
```
**SQL Query:**
```sql
UPDATE notifications 
SET is_read = TRUE 
WHERE id = {{ $json.body.data.notification_id }} 
  AND user_id = {{ $json.body.userId }};
```

**6. mark_all_read**
```json
{
  "conditions": {
    "conditions": [
      {
        "leftValue": "={{ $json.body.action }}",
        "rightValue": "mark_all_read",
        "operator": { "type": "string", "operation": "equals" }
      }
    ]
  },
  "renameOutput": true,
  "outputKey": "mark_all_read"
}
```
**SQL Query:**
```sql
UPDATE notifications 
SET is_read = TRUE 
WHERE user_id = {{ $json.body.userId }} 
  AND is_read = FALSE;
```

**7. get_budget_forecast**
```json
{
  "conditions": {
    "conditions": [
      {
        "leftValue": "={{ $json.body.action }}",
        "rightValue": "get_budget_forecast",
        "operator": { "type": "string", "operation": "equals" }
      }
    ]
  },
  "renameOutput": true,
  "outputKey": "get_budget_forecast"
}
```
**SQL Query:**
```sql
SELECT * FROM get_budget_forecast({{ $json.body.userId }}::BIGINT);
```

**8. save_alert_settings**
```json
{
  "conditions": {
    "conditions": [
      {
        "leftValue": "={{ $json.body.action }}",
        "rightValue": "save_alert_settings",
        "operator": { "type": "string", "operation": "equals" }
      }
    ]
  },
  "renameOutput": true,
  "outputKey": "save_alert_settings"
}
```
**SQL Query:**
```sql
INSERT INTO budget_alerts_config (user_id, warning_threshold, critical_threshold)
VALUES (
  {{ $json.body.userId }},
  {{ $json.body.data.warning_threshold }},
  {{ $json.body.data.critical_threshold }}
)
ON CONFLICT (user_id) 
DO UPDATE SET 
  warning_threshold = EXCLUDED.warning_threshold,
  critical_threshold = EXCLUDED.critical_threshold,
  updated_at = CURRENT_TIMESTAMP;
```

### Implementation Steps:

1. **Open n8n workflow editor**
2. **Import or edit MiniApp_API.json**
3. **Find the "Switch" node** (after Webhook node)
4. **Add 8 new routing rules** with the conditions above
5. **For each new output**, add:
   - **Supabase node** to execute the SQL query
   - **Response node** to return success/error
6. **Test each action** through Mini App interface
7. **Save and activate** the workflow

## Testing Checklist

After updating MiniApp_API.json:

- [ ] Test subscription creation
- [ ] Test subscription list display
- [ ] Test subscription cancellation
- [ ] Test notifications loading
- [ ] Test notification filtering (all/unread/urgent)
- [ ] Test mark as read (single & all)
- [ ] Test budget forecast display
- [ ] Test alert settings save
- [ ] Verify progress bar updates correctly
- [ ] Verify currency symbols display correctly
- [ ] Test empty states for all tabs
- [ ] Test error handling

## Files Modified

✅ `miniapp/index.html` - +300 lines (tabs content)
✅ `miniapp/style.css` - +350 lines (new styles)
✅ `miniapp/app.js` - +450 lines (new functions)
⏳ `MiniApp_API.json` - needs 8 new routes + SQL queries

## Notes

- All frontend code is complete and ready
- Backend API routes need to be added to n8n workflow
- Database schema is already in place (migrations executed)
- AI tools are already configured in AnaliziFinance.json
- Once MiniApp_API.json is updated, v2.3.0 will be fully functional

## Deployment

After completing MiniApp_API.json update:

1. Deploy Mini App files to hosting:
   - `miniapp/index.html`
   - `miniapp/style.css`
   - `miniapp/app.js`
   - `miniapp/miniapp-config.js`

2. Update Telegram Bot Menu Button:
   ```
   /setmenubutton
   URL: https://your-domain.com/miniapp/
   ```

3. Test all features through Telegram app

4. Update CHANGELOG.md with deployment date

5. Create GitHub release tag: `v2.3.0`

## Support

If issues occur:
- Check n8n execution logs for API errors
- Check browser console for JavaScript errors
- Verify Supabase permissions for new tables
- Ensure webhook URL is correct in app.js
