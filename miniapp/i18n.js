// ═══════════════════════════════════════════════════════════════════════════
// INTERNATIONALIZATION (i18n) - Localization System
// ═══════════════════════════════════════════════════════════════════════════

const translations = {
    ru: {
        // General
        app_name: 'AIAccounter',
        loading: 'Загрузка...',
        save: 'Сохранить',
        cancel: 'Отмена',
        delete: 'Удалить',
        edit: 'Редактировать',
        add: 'Добавить',
        close: 'Закрыть',
        confirm: 'Подтвердить',
        yes: 'Да',
        no: 'Нет',
        all: 'Все',
        none: 'Нет',
        error: 'Ошибка',
        success: 'Успешно',
        
        // Navigation
        nav_home: 'Главная',
        nav_analytics: 'Аналитика',
        nav_add: 'Добавить',
        nav_history: 'История',
        nav_settings: 'Настройки',
        
        // Home Screen
        greeting: 'Привет',
        balance: 'Баланс',
        income: 'Доход',
        expense: 'Расход',
        expenses: 'Расходы',
        incomes: 'Доходы',
        this_month: 'в этом месяце',
        recent_operations: 'История операций',
        view_all: 'Смотреть все',
        no_transactions: 'Пока нет операций',
        add_first_transaction: 'Добавьте первую операцию через кнопку +',
        
        // Add Transaction
        add_expense: 'Расход',
        add_income: 'Доход',
        amount: 'Сумма',
        amount_placeholder: '0',
        category: 'Категория',
        description: 'Описание',
        description_placeholder: 'Комментарий (необязательно)',
        date: 'Дата',
        add_transaction: 'Добавить',
        
        // Categories
        categories: 'Категории',
        expense_categories: 'Категории расходов',
        income_categories: 'Категории доходов',
        new_category: 'Новая категория',
        category_name: 'Название',
        category_name_placeholder: 'Например: Кофе',
        category_type: 'Тип',
        category_icon: 'Иконка',
        add_category: 'Добавить',
        manage_categories: 'Управление категориями',
        
        // History
        history: 'История',
        search: 'Поиск',
        search_placeholder: 'Поиск по описанию...',
        filters: 'Фильтры',
        all_types: 'Все типы',
        period: 'Период',
        week: 'Неделя',
        month: 'Месяц',
        quarter: 'Квартал',
        year: 'Год',
        all_time: 'Всё время',
        all_categories: 'Все категории',
        sort_newest: 'Новые ↓',
        sort_oldest: 'Старые ↑',
        sort_amount_desc: 'Сумма ↓',
        sort_amount_asc: 'Сумма ↑',
        from_amount: 'От суммы',
        to_amount: 'До суммы',
        reset_filters: 'Сбросить',
        no_transactions_found: 'Транзакции не найдены',
        load_more: 'Загрузить ещё',
        
        // Export
        export: 'Экспорт',
        export_transactions: 'Экспорт транзакций',
        file_format: 'Формат файла',
        export_period: 'Период',
        last_week: 'Последняя неделя',
        last_month: 'Последний месяц',
        last_3_months: 'Последние 3 месяца',
        last_year: 'Последний год',
        custom_period: 'Свой период',
        operation_type: 'Тип операций',
        all_operations: 'Все',
        only_income: 'Только доходы',
        only_expenses: 'Только расходы',
        download: 'Скачать',
        preparing_file: 'Подготовка файла...',
        file_downloaded: 'Файл скачан!',
        export_error: 'Ошибка экспорта',
        from_date: 'С',
        to_date: 'По',
        
        // Analytics
        analytics: 'Аналитика',
        expenses_by_category: 'Расходы по категориям',
        income_by_category: 'Доходы по категориям',
        dynamics: 'Динамика',
        trends: 'Тренды месяца',
        vs_last_month: 'vs прошлый месяц',
        month_forecast: 'Прогноз на конец месяца',
        days_left: 'дней осталось',
        spending_by_day: 'Траты по дням',
        mon: 'Пн',
        tue: 'Вт',
        wed: 'Ср',
        thu: 'Чт',
        fri: 'Пт',
        sat: 'Сб',
        sun: 'Вс',
        category_changes: 'Изменения по категориям',
        no_data: 'Нет данных',
        
        // Settings
        settings: 'Настройки',
        profile: 'Профиль',
        currency: 'Валюта',
        main_currency: 'Основная валюта',
        language: 'Язык',
        select_language: 'Выбрать язык',
        notifications: 'Уведомления',
        notification_settings: 'Настройки уведомлений',
        daily_reminder: 'Ежедневное напоминание',
        weekly_report: 'Еженедельный отчёт',
        budget_alerts: 'Уведомления о бюджете',
        subscriptions: 'Подписки',
        manage_subscriptions: 'Управление подписками',
        budget: 'Бюджет',
        manage_budget: 'Управление бюджетом',
        debts: 'Долги',
        manage_debts: 'Управление долгами',
        reports: 'Отчёты',
        view_reports: 'Просмотр отчётов',
        about: 'О приложении',
        version: 'Версия',
        
        // Budget
        monthly_budget: 'Бюджет на месяц',
        set_budget: 'Установить бюджет',
        budget_spent: 'Потрачено',
        budget_remaining: 'Осталось',
        budget_exceeded: 'Превышено',
        no_budget: 'Бюджет не установлен',
        budget_history: 'История бюджетов',
        
        // Debts
        debts_title: 'Долги',
        i_owe: 'Я должен',
        owe_me: 'Мне должны',
        add_debt: 'Добавить долг',
        person_name: 'Имя человека',
        debt_amount: 'Сумма',
        pay_debt: 'Внести платёж',
        settle_debt: 'Закрыть долг',
        no_debts: 'Нет долгов',
        
        // Recurring
        recurring_title: 'Подписки',
        add_recurring: 'Добавить подписку',
        recurring_name: 'Название',
        recurring_amount: 'Сумма',
        frequency: 'Частота',
        daily: 'Ежедневно',
        weekly: 'Еженедельно',
        monthly: 'Ежемесячно',
        yearly: 'Ежегодно',
        next_payment: 'Следующий платёж',
        pause: 'Приостановить',
        resume: 'Возобновить',
        no_recurring: 'Нет подписок',
        
        // Reports
        reports_title: 'Отчёты',
        daily_report: 'Отчёт за день',
        weekly_report_title: 'Отчёт за неделю',
        monthly_report: 'Отчёт за месяц',
        period_report: 'Отчёт за период',
        generate_report: 'Сформировать',
        
        // Toasts
        transaction_added: 'Операция добавлена',
        transaction_deleted: 'Операция удалена',
        category_added: 'Категория добавлена',
        settings_saved: 'Настройки сохранены',
        budget_set: 'Бюджет установлен',
        
        // Errors
        error_loading: 'Ошибка загрузки',
        error_saving: 'Ошибка сохранения',
        error_network: 'Ошибка сети',
        try_again: 'Попробуйте снова'
    },
    
    en: {
        // General
        app_name: 'AIAccounter',
        loading: 'Loading...',
        save: 'Save',
        cancel: 'Cancel',
        delete: 'Delete',
        edit: 'Edit',
        add: 'Add',
        close: 'Close',
        confirm: 'Confirm',
        yes: 'Yes',
        no: 'No',
        all: 'All',
        none: 'None',
        error: 'Error',
        success: 'Success',
        
        // Navigation
        nav_home: 'Home',
        nav_analytics: 'Analytics',
        nav_add: 'Add',
        nav_history: 'History',
        nav_settings: 'Settings',
        
        // Home Screen
        greeting: 'Hello',
        balance: 'Balance',
        income: 'Income',
        expense: 'Expense',
        expenses: 'Expenses',
        incomes: 'Incomes',
        this_month: 'this month',
        recent_operations: 'Recent Operations',
        view_all: 'View All',
        no_transactions: 'No transactions yet',
        add_first_transaction: 'Add your first transaction with the + button',
        
        // Add Transaction
        add_expense: 'Expense',
        add_income: 'Income',
        amount: 'Amount',
        amount_placeholder: '0',
        category: 'Category',
        description: 'Description',
        description_placeholder: 'Comment (optional)',
        date: 'Date',
        add_transaction: 'Add',
        
        // Categories
        categories: 'Categories',
        expense_categories: 'Expense Categories',
        income_categories: 'Income Categories',
        new_category: 'New Category',
        category_name: 'Name',
        category_name_placeholder: 'e.g.: Coffee',
        category_type: 'Type',
        category_icon: 'Icon',
        add_category: 'Add',
        manage_categories: 'Manage Categories',
        
        // History
        history: 'History',
        search: 'Search',
        search_placeholder: 'Search by description...',
        filters: 'Filters',
        all_types: 'All types',
        period: 'Period',
        week: 'Week',
        month: 'Month',
        quarter: 'Quarter',
        year: 'Year',
        all_time: 'All time',
        all_categories: 'All categories',
        sort_newest: 'Newest ↓',
        sort_oldest: 'Oldest ↑',
        sort_amount_desc: 'Amount ↓',
        sort_amount_asc: 'Amount ↑',
        from_amount: 'From amount',
        to_amount: 'To amount',
        reset_filters: 'Reset',
        no_transactions_found: 'No transactions found',
        load_more: 'Load More',
        
        // Export
        export: 'Export',
        export_transactions: 'Export Transactions',
        file_format: 'File Format',
        export_period: 'Period',
        last_week: 'Last week',
        last_month: 'Last month',
        last_3_months: 'Last 3 months',
        last_year: 'Last year',
        custom_period: 'Custom period',
        operation_type: 'Operation type',
        all_operations: 'All',
        only_income: 'Income only',
        only_expenses: 'Expenses only',
        download: 'Download',
        preparing_file: 'Preparing file...',
        file_downloaded: 'File downloaded!',
        export_error: 'Export error',
        from_date: 'From',
        to_date: 'To',
        
        // Analytics
        analytics: 'Analytics',
        expenses_by_category: 'Expenses by Category',
        income_by_category: 'Income by Category',
        dynamics: 'Dynamics',
        trends: 'Monthly Trends',
        vs_last_month: 'vs last month',
        month_forecast: 'End of month forecast',
        days_left: 'days left',
        spending_by_day: 'Spending by Day',
        mon: 'Mon',
        tue: 'Tue',
        wed: 'Wed',
        thu: 'Thu',
        fri: 'Fri',
        sat: 'Sat',
        sun: 'Sun',
        category_changes: 'Category Changes',
        no_data: 'No data',
        
        // Settings
        settings: 'Settings',
        profile: 'Profile',
        currency: 'Currency',
        main_currency: 'Main Currency',
        language: 'Language',
        select_language: 'Select Language',
        notifications: 'Notifications',
        notification_settings: 'Notification Settings',
        daily_reminder: 'Daily Reminder',
        weekly_report: 'Weekly Report',
        budget_alerts: 'Budget Alerts',
        subscriptions: 'Subscriptions',
        manage_subscriptions: 'Manage Subscriptions',
        budget: 'Budget',
        manage_budget: 'Manage Budget',
        debts: 'Debts',
        manage_debts: 'Manage Debts',
        reports: 'Reports',
        view_reports: 'View Reports',
        about: 'About',
        version: 'Version',
        
        // Budget
        monthly_budget: 'Monthly Budget',
        set_budget: 'Set Budget',
        budget_spent: 'Spent',
        budget_remaining: 'Remaining',
        budget_exceeded: 'Exceeded',
        no_budget: 'No budget set',
        budget_history: 'Budget History',
        
        // Debts
        debts_title: 'Debts',
        i_owe: 'I Owe',
        owe_me: 'Owe Me',
        add_debt: 'Add Debt',
        person_name: 'Person Name',
        debt_amount: 'Amount',
        pay_debt: 'Make Payment',
        settle_debt: 'Settle Debt',
        no_debts: 'No debts',
        
        // Recurring
        recurring_title: 'Subscriptions',
        add_recurring: 'Add Subscription',
        recurring_name: 'Name',
        recurring_amount: 'Amount',
        frequency: 'Frequency',
        daily: 'Daily',
        weekly: 'Weekly',
        monthly: 'Monthly',
        yearly: 'Yearly',
        next_payment: 'Next Payment',
        pause: 'Pause',
        resume: 'Resume',
        no_recurring: 'No subscriptions',
        
        // Reports
        reports_title: 'Reports',
        daily_report: 'Daily Report',
        weekly_report_title: 'Weekly Report',
        monthly_report: 'Monthly Report',
        period_report: 'Period Report',
        generate_report: 'Generate',
        
        // Toasts
        transaction_added: 'Transaction added',
        transaction_deleted: 'Transaction deleted',
        category_added: 'Category added',
        settings_saved: 'Settings saved',
        budget_set: 'Budget set',
        
        // Errors
        error_loading: 'Loading error',
        error_saving: 'Saving error',
        error_network: 'Network error',
        try_again: 'Try again'
    },
    
    ky: {
        // General
        app_name: 'AIAccounter',
        loading: 'Жүктөлүүдө...',
        save: 'Сактоо',
        cancel: 'Жокко чыгаруу',
        delete: 'Өчүрүү',
        edit: 'Өзгөртүү',
        add: 'Кошуу',
        close: 'Жабуу',
        confirm: 'Ырастоо',
        yes: 'Ооба',
        no: 'Жок',
        all: 'Баары',
        none: 'Жок',
        error: 'Ката',
        success: 'Ийгилик',
        
        // Navigation
        nav_home: 'Башкы',
        nav_analytics: 'Аналитика',
        nav_add: 'Кошуу',
        nav_history: 'Тарых',
        nav_settings: 'Жөндөөлөр',
        
        // Home Screen
        greeting: 'Салам',
        balance: 'Баланс',
        income: 'Киреше',
        expense: 'Чыгым',
        expenses: 'Чыгымдар',
        incomes: 'Кирешелер',
        this_month: 'бул айда',
        recent_operations: 'Акыркы операциялар',
        view_all: 'Баарын көрүү',
        no_transactions: 'Операциялар жок',
        add_first_transaction: '+ баскычы менен биринчи операцияңызды кошуңуз',
        
        // Add Transaction
        add_expense: 'Чыгым',
        add_income: 'Киреше',
        amount: 'Сумма',
        amount_placeholder: '0',
        category: 'Категория',
        description: 'Сүрөттөмө',
        description_placeholder: 'Комментарий (милдеттүү эмес)',
        date: 'Күн',
        add_transaction: 'Кошуу',
        
        // Categories
        categories: 'Категориялар',
        expense_categories: 'Чыгым категориялары',
        income_categories: 'Киреше категориялары',
        new_category: 'Жаңы категория',
        category_name: 'Аталышы',
        category_name_placeholder: 'Мисалы: Кофе',
        category_type: 'Түрү',
        category_icon: 'Иконка',
        add_category: 'Кошуу',
        manage_categories: 'Категорияларды башкаруу',
        
        // History
        history: 'Тарых',
        search: 'Издөө',
        search_placeholder: 'Сүрөттөмө боюнча издөө...',
        filters: 'Чыпкалар',
        all_types: 'Бардык түрлөр',
        period: 'Мезгил',
        week: 'Жума',
        month: 'Ай',
        quarter: 'Чейрек',
        year: 'Жыл',
        all_time: 'Баардык убакыт',
        all_categories: 'Бардык категориялар',
        sort_newest: 'Жаңылар ↓',
        sort_oldest: 'Эскилер ↑',
        sort_amount_desc: 'Сумма ↓',
        sort_amount_asc: 'Сумма ↑',
        from_amount: 'Суммадан',
        to_amount: 'Суммага чейин',
        reset_filters: 'Тазалоо',
        no_transactions_found: 'Транзакциялар табылган жок',
        load_more: 'Дагы жүктөө',
        
        // Export
        export: 'Экспорт',
        export_transactions: 'Транзакцияларды экспорттоо',
        file_format: 'Файл форматы',
        export_period: 'Мезгил',
        last_week: 'Акыркы жума',
        last_month: 'Акыркы ай',
        last_3_months: 'Акыркы 3 ай',
        last_year: 'Акыркы жыл',
        custom_period: 'Өз мезгилиңиз',
        operation_type: 'Операция түрү',
        all_operations: 'Баары',
        only_income: 'Кирешелер гана',
        only_expenses: 'Чыгымдар гана',
        download: 'Жүктөө',
        preparing_file: 'Файл даярдалууда...',
        file_downloaded: 'Файл жүктөлдү!',
        export_error: 'Экспорт катасы',
        from_date: 'Башынан',
        to_date: 'Аягына чейин',
        
        // Analytics
        analytics: 'Аналитика',
        expenses_by_category: 'Категория боюнча чыгымдар',
        income_by_category: 'Категория боюнча кирешелер',
        dynamics: 'Динамика',
        trends: 'Ай тенденциялары',
        vs_last_month: 'өткөн айга салыштырмалуу',
        month_forecast: 'Ай аягына болжол',
        days_left: 'күн калды',
        spending_by_day: 'Күн боюнча чыгымдар',
        mon: 'Дш',
        tue: 'Шш',
        wed: 'Шр',
        thu: 'Бш',
        fri: 'Жм',
        sat: 'Иш',
        sun: 'Жк',
        category_changes: 'Категория өзгөрүүлөрү',
        no_data: 'Маалымат жок',
        
        // Settings
        settings: 'Жөндөөлөр',
        profile: 'Профиль',
        currency: 'Валюта',
        main_currency: 'Негизги валюта',
        language: 'Тил',
        select_language: 'Тилди тандоо',
        notifications: 'Билдирүүлөр',
        notification_settings: 'Билдирүү жөндөөлөрү',
        daily_reminder: 'Күнүмдүк эстетүү',
        weekly_report: 'Жумалык отчёт',
        budget_alerts: 'Бюджет эскертүүлөрү',
        subscriptions: 'Жазылуулар',
        manage_subscriptions: 'Жазылууларды башкаруу',
        budget: 'Бюджет',
        manage_budget: 'Бюджетти башкаруу',
        debts: 'Карыздар',
        manage_debts: 'Карыздарды башкаруу',
        reports: 'Отчёттор',
        view_reports: 'Отчётторду көрүү',
        about: 'Программа жөнүндө',
        version: 'Версия',
        
        // Budget
        monthly_budget: 'Айлык бюджет',
        set_budget: 'Бюджет коюу',
        budget_spent: 'Сарпталды',
        budget_remaining: 'Калды',
        budget_exceeded: 'Ашып кетти',
        no_budget: 'Бюджет коюлган эмес',
        budget_history: 'Бюджет тарыхы',
        
        // Debts
        debts_title: 'Карыздар',
        i_owe: 'Мен карызмын',
        owe_me: 'Мага карыз',
        add_debt: 'Карыз кошуу',
        person_name: 'Адамдын аты',
        debt_amount: 'Сумма',
        pay_debt: 'Төлөө',
        settle_debt: 'Карызды жабуу',
        no_debts: 'Карыздар жок',
        
        // Recurring
        recurring_title: 'Жазылуулар',
        add_recurring: 'Жазылуу кошуу',
        recurring_name: 'Аталышы',
        recurring_amount: 'Сумма',
        frequency: 'Жыштык',
        daily: 'Күн сайын',
        weekly: 'Жума сайын',
        monthly: 'Ай сайын',
        yearly: 'Жыл сайын',
        next_payment: 'Кийинки төлөм',
        pause: 'Тындыруу',
        resume: 'Улантуу',
        no_recurring: 'Жазылуулар жок',
        
        // Reports
        reports_title: 'Отчёттор',
        daily_report: 'Күндүк отчёт',
        weekly_report_title: 'Жумалык отчёт',
        monthly_report: 'Айлык отчёт',
        period_report: 'Мезгил отчёту',
        generate_report: 'Түзүү',
        
        // Toasts
        transaction_added: 'Операция кошулду',
        transaction_deleted: 'Операция өчүрүлдү',
        category_added: 'Категория кошулду',
        settings_saved: 'Жөндөөлөр сакталды',
        budget_set: 'Бюджет коюлду',
        
        // Errors
        error_loading: 'Жүктөө катасы',
        error_saving: 'Сактоо катасы',
        error_network: 'Тармак катасы',
        try_again: 'Кайра аракет кылыңыз'
    }
};

// Language names for display
const languageNames = {
    ru: { native: 'Русский', flag: '🇷🇺' },
    en: { native: 'English', flag: '🇬🇧' },
    ky: { native: 'Кыргызча', flag: '🇰🇬' }
};

// Current language
let currentLanguage = localStorage.getItem('app_language') || 'ru';

// Get translation
function t(key) {
    const lang = translations[currentLanguage] || translations['ru'];
    return lang[key] || translations['ru'][key] || key;
}

// Set language
function setLanguage(lang) {
    if (translations[lang]) {
        currentLanguage = lang;
        localStorage.setItem('app_language', lang);
        applyTranslations();
        
        // Dispatch event for other components
        window.dispatchEvent(new CustomEvent('languageChanged', { detail: { language: lang } }));
        
        return true;
    }
    return false;
}

// Get current language
function getCurrentLanguage() {
    return currentLanguage;
}

// Get available languages
function getAvailableLanguages() {
    return Object.keys(translations).map(code => ({
        code,
        ...languageNames[code]
    }));
}

// Apply translations to DOM elements with data-i18n attribute
function applyTranslations() {
    document.querySelectorAll('[data-i18n]').forEach(el => {
        const key = el.getAttribute('data-i18n');
        const translation = t(key);
        
        if (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA') {
            if (el.placeholder !== undefined) {
                el.placeholder = translation;
            }
        } else {
            el.textContent = translation;
        }
    });
    
    // Update placeholders
    document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
        const key = el.getAttribute('data-i18n-placeholder');
        el.placeholder = t(key);
    });
    
    // Update select options with data-i18n-option
    document.querySelectorAll('option[data-i18n]').forEach(el => {
        const key = el.getAttribute('data-i18n');
        el.textContent = t(key);
    });
}

// Initialize on load
document.addEventListener('DOMContentLoaded', () => {
    applyTranslations();
});

// Export for use in other files
window.i18n = {
    t,
    setLanguage,
    getCurrentLanguage,
    getAvailableLanguages,
    applyTranslations
};
