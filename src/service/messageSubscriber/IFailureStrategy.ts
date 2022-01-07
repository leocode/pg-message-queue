import { QueueMessage, QueueMessageConstructor } from './QueuedMessageRepository';

export interface IFailureStrategy {
  execute: <T>(queueMessage: QueueMessage<T>) => QueueMessageConstructor<T> | null;
}
