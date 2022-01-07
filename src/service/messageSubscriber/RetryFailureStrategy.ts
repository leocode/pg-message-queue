import { IFailureStrategy } from './IFailureStrategy';
import { SubscriptionMessages, SubscriptionMessagesConstructor } from './SubscriptionMessagesRepository';

export class RetryFailureStrategy implements IFailureStrategy {
  constructor(private retryTimes: number) {}

  execute<T>(queueMessage: SubscriptionMessages<T>): SubscriptionMessagesConstructor<T> | null {
    const retryTimesWhenCounterStartFrom0 = this.retryTimes - 1;
    if (queueMessage.retries < retryTimesWhenCounterStartFrom0) {
      return {
        subscriptionId: queueMessage.subscriptionId,
        messageId: queueMessage.messageId,
        retries: queueMessage.retries + 1,
      };
    }
    return null;
  }
}
