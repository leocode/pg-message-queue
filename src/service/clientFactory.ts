import { DatabaseManager } from './DatabaseManager';
import { TopicService } from './TopicService';
import { SubscriptionService } from './SubscriptionService';
import { ClientApi } from './ClientApi';
import { Publisher } from './Publisher';
import { MessageSubscriber } from './MessageSubscriber';

export const createClient = async (postgresDsn: string): Promise<ClientApi> => {
  const databaseManager = new DatabaseManager(postgresDsn);

  await databaseManager.checkConnection();

  const topicService = new TopicService(databaseManager);
  const subscriptionService = new SubscriptionService(databaseManager);
  const publisher = new Publisher(databaseManager);
  const messageSubscriber = new MessageSubscriber(databaseManager);

  return {
    subscribe: messageSubscriber.registerHandler.bind(messageSubscriber),
    provideSubscription: subscriptionService.provideSubscription.bind(subscriptionService),
    provideTopic: topicService.provideTopic.bind(topicService),
    publish: publisher.publish.bind(publisher),
  };
};
