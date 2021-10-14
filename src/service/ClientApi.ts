import { Message, MessageHandler, Subscription, Topic } from '../types';

export interface ClientApi {
  provideTopic(topicName: string): Promise<Topic>;

  provideSubscription(topic: Topic, name: string): Promise<Subscription>;

  publish<T>(topic: Topic, message: Message<T>): Promise<void>;

  subscribe<T>({ topicId }: Subscription, handler: MessageHandler<T>): Promise<void>;
}
