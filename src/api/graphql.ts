// graphql.ts
// GraphQL utilities and rate limiting

import { logger } from '../utils/logger';

// Simple rate limiter for GraphQL requests
class RateLimiter {
  private queue: Array<() => void> = [];
  private processing = false;
  private lastRequest = 0;
  private minDelay = 100; // Minimum 100ms between requests

  async execute<T>(fn: () => Promise<T>): Promise<T> {
    return new Promise((resolve, reject) => {
      this.queue.push(async () => {
        try {
          const now = Date.now();
          const timeSinceLastRequest = now - this.lastRequest;
          
          if (timeSinceLastRequest < this.minDelay) {
            await new Promise(resolve => setTimeout(resolve, this.minDelay - timeSinceLastRequest));
          }
          
          this.lastRequest = Date.now();
          const result = await fn();
          resolve(result);
        } catch (error) {
          reject(error);
        }
      });
      
      this.processQueue();
    });
  }

  private async processQueue() {
    if (this.processing || this.queue.length === 0) return;
    
    this.processing = true;
    
    while (this.queue.length > 0) {
      const task = this.queue.shift();
      if (task) {
        await task();
      }
    }
    
    this.processing = false;
  }
}

// Export rate limiter instance
const rateLimiter = new RateLimiter();

export const graphQLRateLimiter = <T>(fn: () => Promise<T>): Promise<T> => {
  return rateLimiter.execute(fn);
};

// GraphQL error handling utility
export const handleGraphQLError = (error: any): Error => {
  if (error.response?.errors?.[0]) {
    const graphQLError = error.response.errors[0];
    logger.error('GraphQL Error:', graphQLError);
    return new Error(graphQLError.message || 'GraphQL request failed');
  }
  
  if (error.message) {
    logger.error('Request Error:', error.message);
    return error;
  }
  
  logger.error('Unknown Error:', error);
  return new Error('An unknown error occurred');
};