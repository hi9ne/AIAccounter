# DATABASE SETUP GUIDE

## Current Issue
Your n8n workflows are trying to query PostgreSQL tables that don't exist yet:
- ❌ `transactions` table doesn't exist
- ❌ `workspaces` table doesn't exist  
- ❌ `get_income_expense_stats()` function doesn't exist
- ❌ `create_workspace_with_owner()` function doesn't exist
- ❌ `get_user_workspaces()` function doesn't exist

## Solution: Run Migration Scripts

### Step 1: Access your PostgreSQL database
Connect to your PostgreSQL database using one of:
- pgAdmin (GUI tool)
- psql command line
- DBeaver
- n8n Postgres node (though this won't work for large scripts)

### Step 2: Run migrations IN ORDER

Execute these SQL files in your PostgreSQL database:

```sql
-- 1. First: Create base transaction tables
\i migrations/SETUP_DATABASE.sql

-- 2. Create workspaces and multi-tenancy
\i migrations/v2.4.0_workspaces.sql

-- 3. Create analytics functions
\i migrations/v2.4.0_analytics.sql

-- 4. (Optional) Additional features
\i migrations/add_notifications_recurring_v2.3.sql
\i migrations/add_currency_field.sql
\i migrations/add_exchange_rates.sql
```

### Step 3: Verify Setup

Run these queries to verify tables exist:

```sql
-- Check tables
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public'
ORDER BY table_name;

-- Should see:
-- - workspaces
-- - workspace_members
-- - income
-- - expenses
-- - analytics_cache
-- - etc.

-- Check functions
SELECT routine_name 
FROM information_schema.routines 
WHERE routine_schema = 'public' 
  AND routine_type = 'FUNCTION'
ORDER BY routine_name;

-- Should see:
-- - create_workspace_with_owner
-- - get_user_workspaces
-- - get_income_expense_stats
-- - etc.
```

## Quick Setup (if you have psql)

```bash
# Connect to your database
psql -h <your-host> -U <your-user> -d <your-database>

# Run migrations
\i migrations/SETUP_DATABASE.sql
\i migrations/v2.4.0_workspaces.sql
\i migrations/v2.4.0_analytics.sql

# Verify
\dt  -- list tables
\df  -- list functions
```

## After Database Setup

Once the database is set up:

1. **Re-import workflows in n8n** (latest versions from GitHub)
   - Workspace_API.json
   - Analytics_API.json
   - Reports_API.json

2. **Test the Mini App**
   - Go to: https://hi9ne.github.io/AIAccounter/miniapp/
   - Hard refresh (Ctrl+F5)
   - Should now:
     - ✅ Create default workspace
     - ✅ Load statistics
     - ✅ Add transactions

## Current Workflow Status

✅ **Fixed in latest commit:**
- Extract Body nodes added
- Connections properly routed
- Action names corrected (get_user_workspaces)
- SQL queries use $json.field directly

❌ **Blocking issue:** Database schema not created

Once you run the migrations, everything should work! 🚀
