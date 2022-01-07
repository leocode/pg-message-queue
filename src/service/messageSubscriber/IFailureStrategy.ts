import { SubscriptionMessages, SubscriptionMessagesConstructor } from './SubscriptionMessagesRepository';

export interface IFailureStrategy {
  execute: <T>(queueMessage: SubscriptionMessages<T>) => SubscriptionMessagesConstructor<T> | null;
}
