import { DatabaseManager, Transactionless } from './DatabaseManager';
import { MessageSubscriber } from './MessageSubscriber';
import {
  createMessage,
  createSubscription,
  createSubscriptionMessage,
  createTopic,
  POSTGRES_DSN,
  POSTGRES_SCHEMA,
} from '../../test/database';
import { Order } from '../../test/types';

describe('Message Subscriber', () => {
  let databaseManager: DatabaseManager;
  let messageSubscriber: MessageSubscriber;

  beforeAll(async () => {
    databaseManager = new DatabaseManager(POSTGRES_DSN, POSTGRES_SCHEMA);
    messageSubscriber = new MessageSubscriber(databaseManager);
  });

  it('Should consume message and set message_state to "processed"', async () => {
    const messageData = { prop1: 1, prop2: 2 };

    const topic = await createTopic();
    const subscription = await createSubscription(topic.id);
    const message = await createMessage(topic.id, messageData);

    await createSubscriptionMessage(subscription.id, {
      message_id: message.message_id,
      message_state: 'published',
    });

    const handlerId = await messageSubscriber.subscribe<Order>(subscription, jest.fn().mockResolvedValue({}));

    await new Promise((resolve) => setTimeout(resolve, 500));

    messageSubscriber.unsubscribe(handlerId);

    const messageFound = await databaseManager
      .subscriptionsMessages(Transactionless)
      .where('message_id', message.message_id)
      .first();

    expect(messageFound.message_state).toEqual('processed');
  });

  it('Should consume message and set message_state to "processing_error"', async () => {
    const messageData = { prop1: 1, prop2: 2 };

    const topic = await createTopic();
    const subscription = await createSubscription(topic.id);

    const message = await createMessage(topic.id, messageData);

    await createSubscriptionMessage(subscription.id, {
      message_id: message.message_id,
      message_state: 'published',
    });

    const handlerId = await messageSubscriber.subscribe<Order>(subscription, jest.fn().mockRejectedValue({}));

    await new Promise((resolve) => setTimeout(resolve, 500));

    messageSubscriber.unsubscribe(handlerId);

    const messageFound = await databaseManager
      .subscriptionsMessages(Transactionless)
      .where('message_id', message.message_id)
      .first();

    expect(messageFound.message_state).toEqual('processing_error');
  });
});
