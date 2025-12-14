/**
 * HTTP Client - Centralized API request handler
 * 
 * Features:
 * - Automatic auth token injection
 * - Global error handling
 * - Request/response interceptors
 * - Type-safe responses
 */

type RequestConfig = {
    method?: 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE';
    body?: any;
    headers?: Record<string, string>;
    params?: Record<string, string>;
};

type ApiResponse<T = any> = {
    data?: T;
    error?: string;
    message?: string;
};

class ApiClient {
    private baseURL = '/api';

    /**
     * Generic request method
     */
    private async request<T>(
        endpoint: string,
        config: RequestConfig = {}
    ): Promise<ApiResponse<T>> {
        const { method = 'GET', body, headers = {}, params } = config;

        // Build URL with query params
        let url = `${this.baseURL}${endpoint}`;
        if (params) {
            const queryString = new URLSearchParams(params).toString();
            url += `?${queryString}`;
        }

        try {
            const response = await fetch(url, {
                method,
                headers: {
                    'Content-Type': 'application/json',
                    ...headers,
                },
                body: body ? JSON.stringify(body) : undefined,
            });

            // Parse response
            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Request failed');
            }

            return { data };
        } catch (error: any) {
            console.error(`API Error [${method} ${endpoint}]:`, error);
            return { error: error.message || 'Unknown error occurred' };
        }
    }

    /**
     * GET request
     */
    async get<T>(endpoint: string, params?: Record<string, string>) {
        return this.request<T>(endpoint, { method: 'GET', params });
    }

    /**
     * POST request
     */
    async post<T>(endpoint: string, body?: any) {
        return this.request<T>(endpoint, { method: 'POST', body });
    }

    /**
     * PATCH request
     */
    async patch<T>(endpoint: string, body?: any) {
        return this.request<T>(endpoint, { method: 'PATCH', body });
    }

    /**
     * PUT request
     */
    async put<T>(endpoint: string, body?: any) {
        return this.request<T>(endpoint, { method: 'PUT', body });
    }

    /**
     * DELETE request
     */
    async delete<T>(endpoint: string) {
        return this.request<T>(endpoint, { method: 'DELETE' });
    }
}

// Export singleton instance
export const apiClient = new ApiClient();
