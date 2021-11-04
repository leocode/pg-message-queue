import { POSTGRES_DSN, POSTGRES_SCHEMA, TestOrder } from '../../test/helper';
import { DatabaseManager, Transactionless } from './DatabaseManager';
import { SubscriptionService } from './SubscriptionService';
import { TopicService } from './TopicService';
import { Publisher } from './Publisher';

describe('Publisher', () => {
  let databaseManager: DatabaseManager;
  let subscriptionService: SubscriptionService;
  let topicService: TopicService;
  let publisher: Publisher;

  beforeAll(async () => {
    databaseManager = new DatabaseManager(POSTGRES_DSN, POSTGRES_SCHEMA);
    topicService = new TopicService(databaseManager);
    subscriptionService = new SubscriptionService(databaseManager);
    publisher = new Publisher(subscriptionService, databaseManager);
  });

  it('should create subscription message with message_state "published"', async () => {
    const topic = await topicService.provideTopic('test.message_state.published');
    await subscriptionService.provideSubscription(topic, 'test.check');

    await publisher.publish<TestOrder>(topic, {
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
      .where('messages.topic_id', topic.id)
      .first();

    expect(subscriptionMessage.message_state).toEqual('published');
  });

  it('should create multiple subscription messages with message state "published" when multiple subscribers', async () => {
    const topic = await topicService.provideTopic('test.message_state.published');

    await subscriptionService.provideSubscription(topic, 'test.check_1');
    await subscriptionService.provideSubscription(topic, 'test.check_2');
    await subscriptionService.provideSubscription(topic, 'test.check_3');

    await publisher.publish<TestOrder>(topic, {
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
