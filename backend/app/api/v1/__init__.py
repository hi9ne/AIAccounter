from fastapi import APIRouter
from . import expenses, income, budget, auth, users, categories, workspaces, rates, analytics, reports

router = APIRouter()

# Подключаем роуты
router.include_router(auth.router, prefix="/auth", tags=["Auth"])
router.include_router(users.router, prefix="/users", tags=["Users"])
router.include_router(categories.router, prefix="/categories", tags=["Categories"])
router.include_router(workspaces.router, prefix="/workspaces", tags=["Workspaces"])
router.include_router(rates.router, prefix="/rates", tags=["Exchange Rates"])
router.include_router(analytics.router, prefix="/analytics", tags=["Analytics"])
router.include_router(reports.router, prefix="/reports", tags=["Reports"])
router.include_router(expenses.router, prefix="/expenses", tags=["Expenses"])
router.include_router(income.router, prefix="/income", tags=["Income"])
router.include_router(budget.router, prefix="/budget", tags=["Budget"])
