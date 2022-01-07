import { IFailureStrategy } from './IFailureStrategy';
import { QueueMessage, QueueMessageConstructor } from './QueuedMessageRepository';

export class RetryFailureStrategy implements IFailureStrategy {
  constructor(private retryTimes: number) {}

  execute<T>(queueMessage: QueueMessage<T>): QueueMessageConstructor<T> | null {
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
