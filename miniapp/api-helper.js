// API Helper для работы с FastAPI Backend
// Использует конфигурацию из miniapp-config.js

class APIHelper {
    constructor() {
        this.config = window.MiniAppConfig || {};
        this.baseUrl = this.config.api?.baseUrl || 'http://localhost:8000/api/v1';
        this.token = localStorage.getItem('auth_token');
        this.pendingRequests = new Map(); // Кэш для предотвращения дублирующихся запросов
    }

    // Установить токен авторизации
    setToken(token) {
        this.token = token;
        localStorage.setItem('auth_token', token);
    }

    // Получить заголовки
    getHeaders() {
        const headers = {
            'Content-Type': 'application/json',
        };
        
        if (this.token) {
            headers['Authorization'] = `Bearer ${this.token}`;
        }
        
        return headers;
    }

    // Базовый запрос
    async request(endpoint, options = {}) {
        const url = `${this.baseUrl}${endpoint}`;
        const config = {
            ...options,
            headers: {
                ...this.getHeaders(),
                ...options.headers
            }
        };

        // Предотвращаем дублирование одновременных запросов
        const requestKey = `${options.method || 'GET'}:${url}:${JSON.stringify(options.body || '')}`;
        
        if (this.pendingRequests.has(requestKey)) {
            console.log('⚡ Reusing pending request:', requestKey);
            return this.pendingRequests.get(requestKey);
        }

        const requestPromise = (async () => {
            try {
                const response = await fetch(url, config);
                
                if (!response.ok) {
                    let errorMessage = `HTTP ${response.status}`;
                    try {
                        const error = await response.json();
                        // Обработка массива ошибок FastAPI
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
                
                return await response.json();
            } catch (error) {
                console.error('API Request failed:', error.message || error);
                throw error;
            } finally {
                // Удаляем из кэша после завершения
                this.pendingRequests.delete(requestKey);
            }
        })();

        this.pendingRequests.set(requestKey, requestPromise);
        return requestPromise;
    }

    // GET запрос
    async get(endpoint, params = {}) {
        const queryString = new URLSearchParams(params).toString();
        const url = queryString ? `${endpoint}?${queryString}` : endpoint;
        
        return this.request(url, {
            method: 'GET'
        });
    }

    // POST запрос
    async post(endpoint, data = {}) {
        return this.request(endpoint, {
            method: 'POST',
            body: JSON.stringify(data)
        });
    }

    // PUT запрос
    async put(endpoint, data = {}) {
        return this.request(endpoint, {
            method: 'PUT',
            body: JSON.stringify(data)
        });
    }

    // DELETE запрос
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
        return this.get('/categories/expenses');
    }

    async getIncomeCategories() {
        return this.get('/categories/income');
    }

    async getCurrencies() {
        return this.get('/categories/currencies');
    }

    async getAllCategories() {
        return this.get('/categories/all');
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
    
    async getBudget(params = {}) {
        return this.get('/budget', params);
    }

    async createBudget(data) {
        return this.post('/budget', data);
    }

    async updateBudget(id, data) {
        return this.put(`/budget/${id}`, data);
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

    async getIncomeExpenseStats(params = {}) {
        return this.get('/analytics/stats', params);
    }

    async getCategoryAnalytics(params = {}) {
        return this.get('/analytics/categories/top', params);
    }

    async getTrends(params = {}) {
        return this.get('/analytics/chart/balance-trend', params);
    }

    async getPatterns(params = {}) {
        return this.get('/analytics/patterns', params);
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
        
        // Для скачивания файла используем прямой URL
        const url = `${this.baseUrl}/reports/export/csv?${params}`;
        const token = localStorage.getItem('auth_token');
        
        // Скачиваем файл через fetch с blob
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

    async getUserPreferences() {
        return this.get('/users/me/preferences');
    }
}

// Создать глобальный экземпляр
window.api = new APIHelper();

console.log('✅ API Helper initialized');
console.log('📡 Base URL:', window.api.baseUrl);
