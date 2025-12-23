// In development, use empty string to use Vite proxy. In production, use full URL.
const API_BASE_URL = import.meta.env.DEV ? '' : (import.meta.env.VITE_API_BASE_URL || 'https://api.pawatasty.com');
const API_KEY = import.meta.env.VITE_API_KEY || 'b0834cfeae781e2c13213b55741d2717';
const API_SECRET = import.meta.env.VITE_API_SECRET || 'db0572a02b9aa963b0138e7180ba994fa730ddf63cfc5b60798c15a234b6523f';

interface APIResponse<T> {
  status: string;
  data: T;
}

class APIClient {
  private baseURL: string;
  private authToken: string | null = null;
  private apiKey: string;
  private apiSecret: string;

  constructor(baseURL: string, apiKey: string, apiSecret: string) {
    this.baseURL = baseURL;
    this.apiKey = apiKey;
    this.apiSecret = apiSecret;
  }

  setAuthToken(token: string | null) {
    this.authToken = token;
  }

  private async request<T>(
    endpoint: string,
    options?: RequestInit,
    useApiKey: boolean = false
  ): Promise<T> {
    const url = `${this.baseURL}${endpoint}`;

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    if (options?.headers) {
      Object.assign(headers, options.headers);
    }

    if (useApiKey) {
      headers['X-API-Key'] = this.apiKey;
      headers['X-API-Secret'] = this.apiSecret;
    } else if (this.authToken) {
      headers['Authorization'] = `Bearer ${this.authToken}`;
    }

    console.log(`API Request: ${options?.method || 'GET'} ${url}`);

    const response = await fetch(url, {
      ...options,
      headers,
    });

    if (!response.ok) {
      const errorText = await response.text();
      let errorMessage = `API Error: ${response.status} ${response.statusText}`;

      try {
        const errorJson = JSON.parse(errorText);
        errorMessage = errorJson.message || errorJson.error || errorJson.data?.message || errorMessage;
      } catch {
        errorMessage = errorText || errorMessage;
      }

      throw new Error(errorMessage);
    }

    const result = await response.json();
    console.log('API Response:', result);

    // Handle mobile API response format: {success: true/false, data: {...}}
    if (result && typeof result === 'object') {
      if ('success' in result && result.success === false) {
        const errorMessage = result.error || result.message || 'Request failed';
        throw new Error(errorMessage);
      }

      if ('data' in result) {
        return (result as APIResponse<T>).data;
      }
    }

    return result as T;
  }

  async get<T>(endpoint: string, params?: Record<string, string>, useApiKey?: boolean): Promise<T> {
    const queryString = params
      ? '?' + new URLSearchParams(params).toString()
      : '';
    return this.request<T>(`${endpoint}${queryString}`, {
      method: 'GET',
    }, useApiKey);
  }

  async post<T>(endpoint: string, data?: unknown, useApiKey?: boolean): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'POST',
      body: data ? JSON.stringify(data) : undefined,
    }, useApiKey);
  }

  async put<T>(endpoint: string, data?: unknown, useApiKey?: boolean): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'PUT',
      body: data ? JSON.stringify(data) : undefined,
    }, useApiKey);
  }

  async delete<T>(endpoint: string, useApiKey?: boolean): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'DELETE',
    }, useApiKey);
  }
}

export const apiClient = new APIClient(API_BASE_URL, API_KEY, API_SECRET);
