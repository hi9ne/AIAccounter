const apiDebug = {
    log: (...args) => window.IS_LOCALHOST && console.log('[API]', ...args),
    warn: (...args) => window.IS_LOCALHOST && console.warn('[API]', ...args),
    error: (...args) => console.error('[API]', ...args)
};

class APIHelper {
    constructor() {
        this.config = window.MiniAppConfig || {};
        this.baseUrl = this.config.api?.baseUrl || 'http://localhost:8000/api/v1';
        this.token = localStorage.getItem('auth_token');
        this.pendingRequests = new Map(); 
    }

    //   
    setToken(token) {
        apiDebug.log('?? Setting token:', token ? token.substring(0, 20) + '...' : 'null');
        this.token = token;
        localStorage.setItem('auth_token', token);
        apiDebug.log('?? Token set. Current token:', this.token ? 'exists' : 'null');
    }

    //  
    getHeaders() {
        const headers = {
            'Content-Type': 'application/json',
        };
        
        if (this.token) {
            headers['Authorization'] = `Bearer ${this.token}`;
        }
        
        return headers;
    }

    //  
    async request(endpoint, options = {}) {
        const url = `${this.baseUrl}${endpoint}`;
        const config = {
            ...options,
            headers: {
                ...this.getHeaders(),
                ...options.headers
            }
        };

        //     ( auth)
        const isAuthRequest = endpoint.includes('/auth/');
        const requestKey = `${options.method || 'GET'}:${url}:${JSON.stringify(options.body || '')}`;
        
        if (!isAuthRequest && this.pendingRequests.has(requestKey)) {
            apiDebug.log('? Reusing pending request:', requestKey);
            return this.pendingRequests.get(requestKey);
        }

        const requestPromise = (async () => {
            try {
                const response = await fetch(url, config);
                
                if (!response.ok) {
                    let errorMessage = `HTTP ${response.status}`;
                    try {
                        const error = await response.json();
                        // Обработка формата ошибок FastAPI
                        if (Array.isArray(error)) {
                            errorMessage = error.map(e => `${e.loc?.join('.')}: ${e.msg}`).join(', ');
                        } else {
                            errorMessage = error.detail || error.message || errorMessage;
                        }
                    } catch (e) {
                        // Не JSON ответ
                    }
                    console.error('API Error:', errorMessage);
                    throw new Error(errorMessage);
                }
                
                // 204 No Content - возвращаем пустой объект
                if (response.status === 204) {
                    return { success: true };
                }
                
                return await response.json();
            } catch (error) {
                console.error('API Request failed:', error.message || error);
                throw error;
            } finally {
                //     
                this.pendingRequests.delete(requestKey);
            }
        })();

        this.pendingRequests.set(requestKey, requestPromise);
        return requestPromise;
    }

    // GET 
    async get(endpoint, params = {}) {
        const queryString = new URLSearchParams(params).toString();
        const url = queryString ? `${endpoint}?${queryString}` : endpoint;
        
        return this.request(url, {
            method: 'GET'
        });
    }

    // POST 
    async post(endpoint, data = {}) {
        return this.request(endpoint, {
            method: 'POST',
            body: JSON.stringify(data)
        });
    }

    // PUT 
    async put(endpoint, data = {}) {
        return this.request(endpoint, {
            method: 'PUT',
            body: JSON.stringify(data)
        });
    }

    // DELETE 
    async delete(endpoint) {
        return this.request(endpoint, {
            method: 'DELETE'
        });
    }

    // ===== AUTH =====
    
    async authTelegram(telegramData) {
        return this.post('/auth/telegram', telegramData);
    }

    // ===== CATEGORIES =====
    
    async getExpenseCategories() {
        // Используем публичный эндпоинт если нет токена
        const endpoint = this.token ? '/categories/expenses' : '/categories/public/expenses';
        return this.get(endpoint);
    }

    async getIncomeCategories() {
        // Используем публичный эндпоинт если нет токена
        const endpoint = this.token ? '/categories/income' : '/categories/public/income';
        return this.get(endpoint);
    }

    async getCurrencies() {
        return this.get('/categories/currencies');
    }

    async getAllCategories() {
        return this.get('/categories/all');
    }

    async getUserCategories(type = null) {
        const params = type ? { type } : {};
        return this.get('/categories/my', params);
    }

    async createCategory(data) {
        return this.post('/categories/', data);
    }

    async updateCategory(id, data) {
        return this.put(`/categories/${id}`, data);
    }

    async deleteCategory(id) {
        return this.delete(`/categories/${id}`);
    }

    async restoreCategory(id) {
        return this.post(`/categories/${id}/restore`);
    }

    // ===== TRANSACTIONS =====
    
    async getTransactions(params = {}) {
        // Unified endpoint  expenses + income   
        // : page, page_size, type (expense/income), category, start_date, end_date
        return this.get('/transactions', params);
    }

    // ===== EXPENSES =====
    
    async getExpenses(params = {}) {
        // Pagination support: page, page_size
        return this.get('/expenses/', params);
    }

    async createExpense(data) {
        return this.post('/expenses/', data);
    }

    async updateExpense(id, data) {
        return this.put(`/expenses/${id}`, data);
    }

    async deleteExpense(id) {
        return this.delete(`/expenses/${id}`);
    }

    // ===== INCOME =====
    
    async getIncome(params = {}) {
        // Pagination support: page, page_size
        return this.get('/income/', params);
    }

    async createIncome(data) {
        return this.post('/income/', data);
    }

    async updateIncome(id, data) {
        return this.put(`/income/${id}`, data);
    }

    async deleteIncome(id) {
        return this.delete(`/income/${id}`);
    }

    // ===== BUDGET =====
    
    async getBudgets(params = {}) {
        return this.get('/budget', params);
    }
    
    async getCurrentBudgetStatus() {
        return this.get('/budget/current/status');
    }
    
    async getBudgetStatus(month) {
        return this.get(`/budget/${month}/status`);
    }

    async createBudget(data) {
        return this.post('/budget', data);
    }

    async updateBudget(month, data) {
        return this.put(`/budget/${month}`, data);
    }

    // ===== EXCHANGE RATES =====
    
    async getRates() {
        return this.get('/rates');
    }

    async getRate(from, to) {
        return this.get(`/rates/${from}/${to}`);
    }

    async convertAmount(data) {
        return this.post('/rates/convert', data);
    }
    
    async convertAmountBatch(conversions) {
        return this.post('/rates/convert/batch', { conversions });
    }

    async refreshRates() {
        return this.post('/rates/refresh');
    }

    // ===== ANALYTICS =====
    
    async getOverview(params = {}) {
        return this.get('/analytics/dashboard', params);
    }
    
    /**
     * 🚀 BATCH API - Загружает ВСЕ данные за один запрос
     * Значительно быстрее чем множество отдельных запросов
     */
    async getBatchAnalytics(period = 'month', include = 'all') {
        return this.get('/analytics/batch', { period, include });
    }

    async getIncomeExpenseStats(params = {}) {
        return this.get('/analytics/stats', params);
    }

    async getCategoryAnalytics(params = {}) {
        return this.get('/analytics/categories/top', params);
    }

    async getTrends(params = {}) {
        return this.get('/analytics/chart/balance-trend', params);
    }

    async getSpendingTrends() {
        return this.get('/analytics/trends');
    }

    async getPatterns(params = {}) {
        return this.get('/analytics/patterns', params);
    }

    async getSpendingPatterns() {
        return this.get('/analytics/patterns');
    }

    // ===== GAMIFICATION =====
    
    async getGamificationProfile(lang = 'ru') {
        return this.get('/gamification/profile', { lang });
    }

    async getAchievements(lang = 'ru', category = null) {
        const params = { lang };
        if (category) params.category = category;
        return this.get('/gamification/achievements', params);
    }

    async getDailyQuests(lang = 'ru') {
        return this.get('/gamification/daily-quests', { lang });
    }

    async getXPHistory(limit = 20) {
        return this.get('/gamification/xp-history', { limit });
    }

    async updateGamificationSettings(settings) {
        return this.post('/gamification/settings', settings);
    }

    async getLeaderboard(period = 'week', limit = 10) {
        return this.get('/gamification/leaderboard', { period, limit });
    }

    // ===== EXPORT =====
    
    async exportTransactions(params = {}) {
        if (!this.token) {
            throw new Error('No token available');
        }
        
        const queryString = new URLSearchParams(params).toString();
        const url = `${this.baseUrl}/export/transactions${queryString ? '?' + queryString : ''}`;
        
        const response = await fetch(url, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${this.token}`
            }
        });
        
        if (!response.ok) {
            throw new Error('Export failed');
        }
        
        // Get filename from Content-Disposition header
        const disposition = response.headers.get('Content-Disposition');
        let filename = 'transactions.xlsx';
        if (disposition) {
            const match = disposition.match(/filename=(.+)/);
            if (match) filename = match[1];
        }
        
        // Download the file
        const blob = await response.blob();
        const downloadUrl = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = downloadUrl;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(downloadUrl);
        
        return true;
    }

    async getInsights(params = {}) {
        return this.get('/analytics/insights', params);
    }

    async getForecast(params = {}) {
        return this.get('/analytics/forecast', params);
    }

    // ===== REPORTS =====
    
    async getReports(params = {}) {
        return this.get('/reports', params);
    }
    
    async getReportsHistory(params = {}) {
        return this.get('/reports/history', params);
    }

    async getStats(params = {}) {
        // Convert period to date range
        if (params.period && !params.start_date) {
            const end = new Date();
            const start = new Date();
            
            switch (params.period) {
                case 'week':
                    start.setDate(end.getDate() - 7);
                    break;
                case 'month':
                    start.setMonth(end.getMonth() - 1);
                    break;
                case 'year':
                    start.setFullYear(end.getFullYear() - 1);
                    break;
                default:
                    start.setMonth(end.getMonth() - 1);
            }
            
            params.start_date = start.toISOString().split('T')[0];
            params.end_date = end.toISOString().split('T')[0];
            delete params.period;
        }
        
        return this.get('/analytics/stats', params);
    }
    
    async generateReportPDF(startDate, endDate, reportType = 'period') {
        const params = new URLSearchParams({
            start_date: startDate,
            end_date: endDate
        });
        
        if (reportType === 'weekly') {
            return this.post(`/reports/weekly?${params}`);
        } else if (reportType === 'monthly') {
            // Extract year and month from startDate
            const date = new Date(startDate);
            const yearMonth = new URLSearchParams({
                year: date.getFullYear(),
                month: date.getMonth() + 1
            });
            return this.post(`/reports/monthly?${yearMonth}`);
        } else {
            // Period report
            return this.post('/reports/period', {
                start_date: startDate,
                end_date: endDate,
                include_transactions: true
            });
        }
    }
    
    async exportCSV(startDate, endDate) {
        const params = new URLSearchParams({
            start_date: startDate,
            end_date: endDate
        });
        
        //      URL
        const url = `${this.baseUrl}/reports/export/csv?${params}`;
        const token = localStorage.getItem('auth_token');
        
        //    fetch  blob
        const response = await fetch(url, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        if (!response.ok) {
            throw new Error('Failed to export CSV');
        }
        
        const blob = await response.blob();
        const downloadUrl = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = downloadUrl;
        a.download = `transactions_${startDate}_${endDate}.csv`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(downloadUrl);
        document.body.removeChild(a);
        
        return { success: true };
    }
    
    async exportExcel(startDate, endDate) {
        const params = new URLSearchParams({
            start_date: startDate,
            end_date: endDate
        });
        
        const url = `${this.baseUrl}/reports/export/excel?${params}`;
        const token = localStorage.getItem('auth_token');
        
        const response = await fetch(url, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        if (!response.ok) {
            throw new Error('Failed to export Excel');
        }
        
        const blob = await response.blob();
        const downloadUrl = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = downloadUrl;
        a.download = `report_${startDate}_${endDate}.xlsx`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(downloadUrl);
        document.body.removeChild(a);
        
        return { success: true };
    }

    // ===== USER =====
    
    async getCurrentUser() {
        return this.get('/users/me');
    }

    async updateUser(data) {
        return this.put('/users/me', data);
    }

    async updateProfile(data) {
        return this.put('/users/me', data);
    }

    async getProfile() {
        return this.get('/users/me');
    }

    async getUserPreferences() {
        return this.get('/users/me/preferences');
    }

    // ===== RECURRING PAYMENTS =====
    
    async getRecurringPayments(activeOnly = true) {
        return this.get('/recurring/', { active_only: activeOnly });
    }

    async getRecurringPayment(id) {
        return this.get(`/recurring/${id}`);
    }

    async createRecurringPayment(data) {
        return this.post('/recurring/', data);
    }

    async updateRecurringPayment(id, data) {
        return this.put(`/recurring/${id}`, data);
    }

    async deleteRecurringPayment(id) {
        return this.delete(`/recurring/${id}`);
    }

    async markRecurringPaymentPaid(id, createExpense = true) {
        return this.post(`/recurring/${id}/mark-paid`, { create_expense: createExpense });
    }

    async getUpcomingSummary(days = 30) {
        return this.get('/recurring/upcoming/summary', { days });
    }

    // ===== DEBTS =====

    async getDebts(settled = null, debtType = null) {
        const params = {};
        if (settled !== null) params.settled = settled;
        if (debtType) params.debt_type = debtType;
        return this.get('/debts/', params);
    }

    async getDebtSummary() {
        return this.get('/debts/summary');
    }

    async getDebt(id) {
        return this.get(`/debts/${id}`);
    }

    async createDebt(data) {
        return this.post('/debts/', data);
    }

    async updateDebt(id, data) {
        return this.put(`/debts/${id}`, data);
    }

    async deleteDebt(id) {
        return this.delete(`/debts/${id}`);
    }

    async addDebtPayment(debtId, data) {
        return this.post(`/debts/${debtId}/payments`, data);
    }

    async settleDebt(id) {
        return this.post(`/debts/${id}/settle`);
    }

    // ===== AI ANALYTICS =====

    async getAIAnalysis(periodDays = 30) {
        return this.get('/ai-analytics/analyze', { period_days: periodDays });
    }

    async getAIInsights(limit = 10) {
        return this.get('/ai-analytics/insights', { limit });
    }

    async getSpendingTrends(months = 6) {
        return this.get('/ai-analytics/trends', { months });
    }

    // ===== SAVINGS GOALS =====

    async getGoals(activeOnly = true) {
        return this.get('/goals', { active_only: activeOnly });
    }

    async getGoalsStats() {
        return this.get('/goals/stats');
    }

    async getGoal(id) {
        return this.get(`/goals/${id}`);
    }

    async createGoal(data) {
        return this.post('/goals', data);
    }

    async updateGoal(id, data) {
        return this.put(`/goals/${id}`, data);
    }

    async deleteGoal(id) {
        return this.delete(`/goals/${id}`);
    }

    async contributeToGoal(goalId, data) {
        return this.post(`/goals/${goalId}/contribute`, data);
    }

    async quickDeposit(goalId, amount, note = null) {
        return this.post('/goals/quick-deposit', {
            goal_id: goalId,
            amount: amount,
            note: note
        });
    }

    async getGoalContributions(goalId, limit = 50) {
        return this.get(`/goals/${goalId}/contributions`, { limit });
    }

    async completeGoal(id) {
        return this.post(`/goals/${id}/complete`);
    }

    async reactivateGoal(id) {
        return this.post(`/goals/${id}/reactivate`);
    }
}

// Создаём глобальный экземпляр
window.api = new APIHelper();

apiDebug.log('? API Helper initialized');
apiDebug.log('?? Base URL:', window.api.baseUrl);


