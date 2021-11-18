import { Subscription } from '../types/Subscription';
import { Topic } from '../types/Topic';
import { Message, MessageHandler } from '../types/Message';
import { RetryPolicy, RetryPolicyOptions } from './RetryPolicy';
import { MessageSubscriberOptions } from './MessageSubscriber';

export interface ClientApi {
  provideTopic(topicName: string): Promise<Topic>;

  provideSubscription(topic: Topic, name: string): Promise<Subscription>;

  publish<T>(topic: Topic, message: Message<T>): Promise<void>;

  subscribe<T>(
    { topicId }: Subscription,
    options: MessageSubscriberOptions,
    handler: MessageHandler<T>,
  ): Promise<string>;

  unsubscribe(handlerId: string): void;

  provideRetryPolicy(retryPolicyOptions: RetryPolicyOptions): RetryPolicy;
}
