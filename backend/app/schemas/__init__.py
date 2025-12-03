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

# Category schemas
from .category import (
    CategoryCreate,
    CategoryUpdate,
    CategoryResponse,
    CategoryListResponse,
)

# Recurring Payment schemas
from .recurring import (
    RecurringPaymentCreate,
    RecurringPaymentUpdate,
    RecurringPaymentResponse,
    RecurringPaymentListResponse,
    MarkPaidRequest,
)

# Debt schemas
from .debt import (
    DebtCreate,
    DebtUpdate,
    DebtResponse,
    DebtListResponse,
    DebtPaymentCreate,
    DebtPaymentResponse,
    DebtSummary,
)

# Onboarding schemas
from .onboarding import (
    UsageType,
    Currency,
    OnboardingStatus,
    Step1Currency,
    Step2UsageType,
    Step3Budget,
    Step4Categories,
    Step5Notifications,
    NotificationSettings,
    CategoryTemplate,
    CategoryTemplates,
    OnboardingStepResponse,
    OnboardingCompleteResponse,
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
    # Categories
    "CategoryCreate",
    "CategoryUpdate",
    "CategoryResponse",
    "CategoryListResponse",
    # Recurring Payments
    "RecurringPaymentCreate",
    "RecurringPaymentUpdate",
    "RecurringPaymentResponse",
    "RecurringPaymentListResponse",
    "MarkPaidRequest",
    # Debts
    "DebtCreate",
    "DebtUpdate",
    "DebtResponse",
    "DebtListResponse",
    "DebtPaymentCreate",
    "DebtPaymentResponse",
    "DebtSummary",
    # Onboarding
    "UsageType",
    "Currency",
    "OnboardingStatus",
    "Step1Currency",
    "Step2UsageType",
    "Step3Budget",
    "Step4Categories",
    "Step5Notifications",
    "NotificationSettings",
    "CategoryTemplate",
    "CategoryTemplates",
    "OnboardingStepResponse",
    "OnboardingCompleteResponse",
    # Responses
    "MessageResponse",
    "ErrorResponse",
]
