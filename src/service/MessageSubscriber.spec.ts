import { DatabaseManager, Transactionless } from './DatabaseManager';
import { SubscriptionService } from './SubscriptionService';
import { TopicService } from './TopicService';
import { POSTGRES_DSN, POSTGRES_SCHEMA, TestOrder } from '../../test/helper';
import { MessageSubscriber } from './MessageSubscriber';
import { v4 as uuid4 } from 'uuid';

describe('Message Subscriber', () => {
  let databaseManager: DatabaseManager;
  let subscriptionService: SubscriptionService;
  let topicService: TopicService;
  let messageSubscriber: MessageSubscriber;

  beforeAll(async () => {
    databaseManager = new DatabaseManager(POSTGRES_DSN, POSTGRES_SCHEMA);
    subscriptionService = new SubscriptionService(databaseManager);
    topicService = new TopicService(databaseManager);
    messageSubscriber = new MessageSubscriber(databaseManager);
  });

  it('Should consume message and set message_state to "processed"', async () => {
    const topic = await topicService.provideTopic('test.message_state.processed');
    const subscription = await subscriptionService.provideSubscription(topic, 'test.message_state.processed_check');

    const messageId = uuid4();

    await databaseManager.messages(Transactionless).insert({
      message_id: messageId,
      topic_id: topic.id,
      message_data: { test: 'test' },
    });

    await databaseManager.subscriptionsMessages(Transactionless).insert({
      id: uuid4(),
      subscription_id: subscription.id,
      message_id: messageId,
      message_state: 'published',
    });

    const handlerId = await messageSubscriber.subscribe<TestOrder>(subscription, jest.fn().mockResolvedValue({}));

    await new Promise((resolve) => setTimeout(resolve, 500));

    messageSubscriber.unsubscribe(handlerId);

    const message = await databaseManager.subscriptionsMessages(Transactionless).where('message_id', messageId).first();

    expect(message.message_state).toEqual('processed');
  });

  it('Should consume message and set message_state to "processing_error"', async () => {
    const topic = await topicService.provideTopic('test.message_state.processing_error');
    const subscription = await subscriptionService.provideSubscription(
      topic,
      'test.message_state.processing_error_check',
    );

    const messageId = uuid4();

    await databaseManager.messages(Transactionless).insert({
      message_id: messageId,
      topic_id: topic.id,
      message_data: { test: 'test' },
    });

    await databaseManager.subscriptionsMessages(Transactionless).insert({
      id: uuid4(),
      subscription_id: subscription.id,
      message_id: messageId,
      message_state: 'published',
    });

    const handlerId = await messageSubscriber.subscribe<TestOrder>(subscription, jest.fn().mockRejectedValue({}));

    await new Promise((resolve) => setTimeout(resolve, 500));

    messageSubscriber.unsubscribe(handlerId);

    const message = await databaseManager.subscriptionsMessages(Transactionless).where('message_id', messageId).first();

    expect(message.message_state).toEqual('processing_error');
  });
});
