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
import { SubscriptionMessageState } from '../types/SubscriptionMessage';
import { FailurePolicy } from './FailurePolicy';

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

    await messageSubscriber.subscribe<Order>(subscription, {}, jest.fn().mockResolvedValue({}));

    const message = await createMessage(topic.id, messageData);
    await createSubscriptionMessage(subscription.id, {
      message_id: message.message_id,
      message_state: SubscriptionMessageState.Published,
    });

    await new Promise((resolve) => setTimeout(resolve, 100));

    const messageFound = await databaseManager
      .subscriptionsMessages(Transactionless)
      .where('message_id', message.message_id)
      .first();

    expect(messageFound.message_state).toEqual(SubscriptionMessageState.Processed);
  });

  it('Should consume message and set message_state to "processing_error"', async () => {
    const messageData = { prop1: 1, prop2: 2 };

    const topic = await createTopic();
    const subscription = await createSubscription(topic.id);

    await messageSubscriber.subscribe<Order>(subscription, {}, jest.fn().mockRejectedValue({}));

    const message = await createMessage(topic.id, messageData);
    await createSubscriptionMessage(subscription.id, {
      message_id: message.message_id,
      message_state: SubscriptionMessageState.Published,
    });

    await new Promise((resolve) => setTimeout(resolve, 500));

    const messageFound = await databaseManager
      .subscriptionsMessages(Transactionless)
      .where('message_id', message.message_id)
      .first();

    expect(messageFound.message_state).toEqual(SubscriptionMessageState.ProcessingError);
  });

  it('Should unsubscribe and not consume message', async () => {
    const messageData = { prop1: 1, prop2: 2 };

    const topic = await createTopic();
    const subscription = await createSubscription(topic.id);

    const handlerId = await messageSubscriber.subscribe<Order>(subscription, {}, jest.fn().mockRejectedValue({}));

    await new Promise((resolve) => setTimeout(resolve, 500));

    messageSubscriber.unsubscribe(handlerId);

    const message = await createMessage(topic.id, messageData);
    await createSubscriptionMessage(subscription.id, {
      message_id: message.message_id,
      message_state: SubscriptionMessageState.Published,
    });

    const messageFound = await databaseManager
      .subscriptionsMessages(Transactionless)
      .where('message_id', message.message_id)
      .first();

    expect(messageFound.message_state).toEqual(SubscriptionMessageState.Published);
  });

  it('Should retry to consume message 3 times', async () => {
    const messageData = { prop1: 1, prop2: 2 };

    const handlerMock = jest.fn();

    const topic = await createTopic();
    const subscription = await createSubscription(topic.id);
    const failurePolicy = new FailurePolicy({ strategy: 'default', maxRetries: 3, interval: 50 });

    await messageSubscriber.subscribe<Order>(subscription, { failurePolicy }, handlerMock.mockRejectedValue({}));

    const message = await createMessage(topic.id, messageData);
    await createSubscriptionMessage(subscription.id, {
      message_id: message.message_id,
      message_state: SubscriptionMessageState.Published,
    });

    await new Promise((resolve) => setTimeout(resolve, 1000));

    const messageFound = await databaseManager
      .subscriptionsMessages(Transactionless)
      .where('message_id', message.message_id)
      .first();

    expect(messageFound.message_state).toEqual(SubscriptionMessageState.ProcessingError);
    expect(messageFound.retries).toEqual(3);
    expect(handlerMock).toHaveBeenCalledTimes(4);
  });
});
