import { DatabaseManager } from './DatabaseManager';
import { TopicService } from './TopicService';
import { SubscriptionService } from './SubscriptionService';
import { ClientApi } from './ClientApi';
import { Publisher } from './Publisher';
import { MessageSubscriber } from './MessageSubscriber';

const DEFAULT_SCHEMA_NAME = 'queue';

export const createClient = async (postgresDsn: string, schemaName = DEFAULT_SCHEMA_NAME): Promise<ClientApi> => {
  const databaseManager = new DatabaseManager(postgresDsn, schemaName);

  await databaseManager.checkConnection();

  const topicService = new TopicService(databaseManager);
  const subscriptionService = new SubscriptionService(databaseManager);
  const publisher = new Publisher(subscriptionService, databaseManager);
  const messageSubscriber = new MessageSubscriber(databaseManager);

  return {
    subscribe: messageSubscriber.subscribe.bind(messageSubscriber),
    unsubscribe: messageSubscriber.unsubscribe.bind(messageSubscriber),
    provideSubscription: subscriptionService.provideSubscription.bind(subscriptionService),
    provideTopic: topicService.provideTopic.bind(topicService),
    publish: publisher.publish.bind(publisher),
  };
};
