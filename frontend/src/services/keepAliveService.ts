/**
 * Keep-Alive Service
 * Prevents server from going to sleep on free hosting platforms
 * by sending periodic pings to the server
 */

class KeepAliveService {
  private intervalId: NodeJS.Timeout | null = null;
  private isActive = false;
  private readonly PING_INTERVAL = 10 * 60 * 1000; // 10 minutes in milliseconds
  private readonly PING_URL: string;

  constructor() {
    // Determine server URL based on environment
    this.PING_URL = this.getServerUrl() + '/keep-alive';
  }

  /**
   * Get the server URL based on environment
   */
  private getServerUrl(): string {
    if (import.meta.env.VITE_BACKEND_URL) {
      return import.meta.env.VITE_BACKEND_URL;
    }
    
    // Fallback to localhost in development
    return window.location.protocol === 'https:' 
      ? 'https://planning-poker-juwg.onrender.com'
      : 'http://localhost:3001';
  }

  /**
   * Start the keep-alive ping service
   */
  public start(): void {
    if (this.isActive) {
      console.info('Keep-alive service is already running');
      return;
    }

    // Only start in production to avoid unnecessary pings in development
    const isProduction = window.location.protocol === 'https:';
    if (!isProduction) {
      console.info('Keep-alive service disabled in development environment');
      return;
    }

    console.info('Starting keep-alive service with interval:', this.PING_INTERVAL / 1000 / 60, 'minutes');
    
    // Send initial ping
    this.sendPing();
    
    // Set up periodic pings
    this.intervalId = setInterval(() => {
      this.sendPing();
    }, this.PING_INTERVAL);
    
    this.isActive = true;
  }

  /**
   * Stop the keep-alive ping service
   */
  public stop(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    
    this.isActive = false;
    console.info('Keep-alive service stopped');
  }

  /**
   * Send a ping to the server to keep it awake
   */
  private async sendPing(): Promise<void> {
    try {
      const response = await fetch(this.PING_URL, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        // Don't include credentials to avoid CORS issues
        credentials: 'omit'
      });

      if (response.ok) {
        const data = await response.json();
        console.info('Keep-alive ping successful:', {
          status: data.status,
          uptime: Math.round(data.uptime / 60), // Convert to minutes
          timestamp: new Date().toLocaleTimeString()
        });
      } else {
        console.warn('Keep-alive ping failed with status:', response.status);
      }
    } catch (error) {
      console.warn('Keep-alive ping error:', error instanceof Error ? error.message : error);
      // Don't throw - keep the service running even if individual pings fail
    }
  }

  /**
   * Check if the service is currently active
   */
  public get active(): boolean {
    return this.isActive;
  }

  /**
   * Get the current ping interval in minutes
   */
  public get intervalMinutes(): number {
    return this.PING_INTERVAL / 1000 / 60;
  }
}

// Export singleton instance
export const keepAliveService = new KeepAliveService();