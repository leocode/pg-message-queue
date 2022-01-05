type FailurePolicyStrategy = 'default' | 'backoff';

export interface FailurePolicyOptions {
  strategy: FailurePolicyStrategy;
  maxRetries: number;
  interval: number;
}

export class FailurePolicy {
  constructor(private readonly options: FailurePolicyOptions) {}

  shouldRetryMessage(message: { retries: number }): boolean {
    return this.options.maxRetries > message.retries;
  }

  getNextRunAtDate(message: { retries: number }): number {
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
