type RetryPolicyStrategy = 'default' | 'backoff';

export interface RetryPolicyOptions {
  strategy: RetryPolicyStrategy;
  maxRetries: number;
  interval: number;
}
export class RetryPolicy {
  constructor(private readonly options: RetryPolicyOptions) {}

  shouldRetryMessage(message: { retries: number }): boolean {
    return this.options.maxRetries > message.retries;
  }

  getNextRetryTime(message: { retries: number }): number {
    const now = Date.now();

    switch (this.options.strategy) {
      case 'backoff':
        return now + 2 ** (message.retries + 1) * this.options.interval;
      case 'default':
        return now + this.options.interval;
      default:
        return now;
    }
  }
}
