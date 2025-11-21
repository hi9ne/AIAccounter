from .schemas import (
    # User
    UserBase,
    UserCreate,
    UserUpdate,
    User,
    # Expense
    ExpenseBase,
    ExpenseCreate,
    ExpenseUpdate,
    Expense,
    # Income
    IncomeBase,
    IncomeCreate,
    IncomeUpdate,
    Income,
    # Budget
    BudgetBase,
    BudgetCreate,
    BudgetUpdate,
    Budget,
    # Responses
    MessageResponse,
    ErrorResponse,
    # Pagination
    PaginatedResponse,
)

# Auth schemas
from .auth import Token, TokenData, TelegramAuthData

# Rate schemas
from .rate import (
    ExchangeRateCreate,
    ExchangeRateSchema,
    ConversionRequest,
    ConversionResponse,
)

# Analytics schemas
from .analytics import (
    IncomeExpenseStatsSchema,
    TopCategorySchema,
    BalanceTrendSchema,
    ChartDataResponse,
    SpendingPatternSchema,
    CategoryAnalyticsSchema,
    DashboardDataSchema,
)

# Report schemas
from .report import (
    ReportType,
    ReportRequest,
    ReportResponse,
    ReportHistoryItem,
)

__all__ = [
    # User
    "UserBase",
    "UserCreate",
    "UserUpdate",
    "User",
    # Expense
    "ExpenseBase",
    "ExpenseCreate",
    "ExpenseUpdate",
    "Expense",
    # Income
    "IncomeBase",
    "IncomeCreate",
    "IncomeUpdate",
    "Income",
    # Budget
    "BudgetBase",
    "BudgetCreate",
    "BudgetUpdate",
    "Budget",
    # Auth
    "Token",
    "TokenData",
    "TelegramAuthData",
    # Rates
    "ExchangeRateCreate",
    "ExchangeRateSchema",
    "ConversionRequest",
    "ConversionResponse",
    # Analytics
    "IncomeExpenseStatsSchema",
    "TopCategorySchema",
    "BalanceTrendSchema",
    "ChartDataResponse",
    "SpendingPatternSchema",
    "CategoryAnalyticsSchema",
    "DashboardDataSchema",
    # Reports
    "ReportType",
    "ReportRequest",
    "ReportResponse",
    "ReportHistoryItem",
    # Responses
    "MessageResponse",
    "ErrorResponse",
]
