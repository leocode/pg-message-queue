import { DatabaseManager, Transactionless } from './DatabaseManager';
import { SubscriptionService } from './SubscriptionService';
import { Publisher } from './Publisher';
import { createSubscription, createTopic, POSTGRES_SCHEMA, POSTGRES_DSN } from '../../test/database';
import { Order } from '../../test/types';

describe('Publisher', () => {
  let databaseManager: DatabaseManager;
  let subscriptionService: SubscriptionService;
  let publisher: Publisher;

  beforeAll(async () => {
    databaseManager = new DatabaseManager(POSTGRES_DSN, POSTGRES_SCHEMA);
    subscriptionService = new SubscriptionService(databaseManager);
    publisher = new Publisher(subscriptionService, databaseManager);
  });

  it('should create subscription message with message_state "published"', async () => {
    const messageData = {
      products: [1, 2, 3],
      userId: 10,
      messageId: 10,
    };

    const topic = await createTopic();
    await createSubscription(topic.id);

    await publisher.publish<Order>(topic, {
      data: messageData,
      headers: {},
    });

    const subscriptionMessage = await databaseManager
      .subscriptionsMessages(Transactionless)
      .innerJoin('messages', 'messages.message_id', 'subscriptions_messages.message_id')
      .where('messages.topic_id', topic.id)
      .first();

    expect(subscriptionMessage.message_state).toEqual('published');
    expect(subscriptionMessage.message_data).toEqual(messageData);
  });

  it('should create multiple subscription messages with message state "published" when multiple subscribers', async () => {
    const topic = await createTopic();

    await createSubscription(topic.id);
    await createSubscription(topic.id);
    await createSubscription(topic.id);

    await publisher.publish<Order>(topic, {
      data: {
        products: [1, 2, 3],
        userId: 10,
        messageId: 10,
      },
      headers: {},
    });

    const subscriptionMessage = await databaseManager
      .subscriptionsMessages(Transactionless)
      .innerJoin('messages', 'messages.message_id', 'subscriptions_messages.message_id')
      .where('messages.topic_id', topic.id);

    expect.assertions(3);

    (subscriptionMessage as Array<{ message_state: string }>).forEach((subMessage) => {
      expect(subMessage.message_state).toEqual('published');
    });
  });
});
