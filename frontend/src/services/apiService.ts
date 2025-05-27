import type { 
  CreateSessionRequest, 
  JoinSessionRequest, 
  CreateSessionResponse, 
  JoinSessionResponse,
  Session 
} from '../shared/types';

const API_BASE_URL = (import.meta.env.VITE_BACKEND_URL || 'http://localhost:3001') + '/api';

console.info('API Configuration:', {
  VITE_BACKEND_URL: import.meta.env.VITE_BACKEND_URL,
  API_BASE_URL,
  buildTime: new Date().toISOString()
});

class ApiService {
  private async sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  private async request<T>(
    endpoint: string, 
    options: RequestInit = {}, 
    timeout: number = 60000, // 60 seconds for cold start tolerance
    maxRetries: number = 3
  ): Promise<T> {
    const url = `${API_BASE_URL}${endpoint}`;
    let lastError: Error;
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      // Add debugging to track all API calls
      console.log('🌐 API Request:', {
        url,
        method: options.method || 'GET',
        timeout: `${timeout}ms`,
        attempt: `${attempt}/${maxRetries}`,
        timestamp: new Date().toISOString()
      });
      
      // Create AbortController for timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => {
        controller.abort();
        console.warn('⏰ Request timeout:', { url, timeout, attempt });
      }, timeout);
      
      const config: RequestInit = {
        headers: {
          'Content-Type': 'application/json',
          ...options.headers,
        },
        signal: controller.signal,
        ...options,
      };

      try {
        const response = await fetch(url, config);
        clearTimeout(timeoutId);
        
        if (!response.ok) {
          const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
          throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
        }

        console.log('✅ API Request successful:', { url, attempt });
        return response.json();
      } catch (error) {
        clearTimeout(timeoutId);
        lastError = error instanceof Error ? error : new Error('Unknown error');
        
        const isTimeout = lastError.name === 'AbortError';
        const isNetworkError = lastError.message.includes('fetch') || isTimeout;
        
        console.warn('❌ API Request failed:', { 
          url, 
          attempt, 
          error: lastError.message,
          isTimeout,
          isNetworkError
        });
        
        // Don't retry for non-network errors (4xx status codes, etc.)
        if (!isNetworkError && attempt === 1) {
          throw lastError;
        }
        
        // If this is the last attempt, throw the error
        if (attempt === maxRetries) {
          if (isTimeout) {
            throw new Error(`Request timeout after ${timeout}ms (tried ${maxRetries} times). The server may be starting up - please try again.`);
          }
          throw lastError;
        }
        
        // Calculate exponential backoff delay (1s, 2s, 4s)
        const delay = Math.min(1000 * Math.pow(2, attempt - 1), 5000);
        console.log(`⏳ Retrying in ${delay}ms...`);
        await this.sleep(delay);
      }
    }
    
    throw lastError!;
  }

  /**
   * Create a new session
   */
  async createSession(request: CreateSessionRequest): Promise<CreateSessionResponse> {
    return this.request<CreateSessionResponse>('/sessions/create', {
      method: 'POST',
      body: JSON.stringify(request),
    });
  }

  /**
   * Join an existing session
   */
  async joinSession(request: JoinSessionRequest): Promise<JoinSessionResponse> {
    return this.request<JoinSessionResponse>('/sessions/join', {
      method: 'POST',
      body: JSON.stringify(request),
    });
  }

  /**
   * Get session by ID
   */
  async getSession(sessionId: string): Promise<{ session: Session }> {
    return this.request<{ session: Session }>(`/sessions/${sessionId}`);
  }

  /**
   * Get session by code
   */
  async getSessionByCode(code: string): Promise<{ session: Session }> {
    return this.request<{ session: Session }>(`/sessions/code/${code}`);
  }

  /**
   * Health check
   */
  async healthCheck(): Promise<{ message: string; timestamp: string }> {
    return this.request<{ message: string; timestamp: string }>('/sessions/health');
  }

  /**
   * Warmup the backend server (useful for cold starts)
   * This method is more aggressive with retries and provides user feedback
   */
  async warmupServer(): Promise<boolean> {
    console.log('🔥 Warming up backend server...');
    
    try {
      await this.request<{ message: string; timestamp: string }>(
        '/sessions/health',
        {},
        30000, // 30 second timeout for each attempt
        5 // More retries for warmup
      );
      console.log('✅ Backend server is warmed up and ready');
      return true;
    } catch (error) {
      console.warn('⚠️ Backend warmup failed:', error instanceof Error ? error.message : 'Unknown error');
      return false;
    }
  }
}

export const apiService = new ApiService();