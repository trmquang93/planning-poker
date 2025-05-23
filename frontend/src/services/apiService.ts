import type { 
  CreateSessionRequest, 
  JoinSessionRequest, 
  CreateSessionResponse, 
  JoinSessionResponse,
  Session 
} from '@shared/types';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

class ApiService {
  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const url = `${API_BASE_URL}${endpoint}`;
    
    const config: RequestInit = {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      ...options,
    };

    const response = await fetch(url, config);
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
      throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
    }

    return response.json();
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
}

export const apiService = new ApiService();