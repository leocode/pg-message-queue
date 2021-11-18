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
import { RetryPolicy } from './RetryPolicy';

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

  it('Should consume message with higher priority firstly', async () => {
    const messageData = { prop1: 1, prop2: 2 };

    const topic = await createTopic();
    const subscription = await createSubscription(topic.id);

    const message1 = await createMessage(topic.id, messageData, 1000);

    await createSubscriptionMessage(subscription.id, {
      message_id: message1.message_id,
      message_state: SubscriptionMessageState.Published,
    });

    const message2 = await createMessage(topic.id, messageData, 2000);

    await createSubscriptionMessage(subscription.id, {
      message_id: message2.message_id,
      message_state: SubscriptionMessageState.Published,
    });

    await messageSubscriber.subscribe<Order>(subscription, {}, jest.fn().mockResolvedValue({}));

    await new Promise((resolve) => setTimeout(resolve, 500));

    const messages = await databaseManager
      .subscriptionsMessages(Transactionless)
      .where('subscription_id', subscription.id);

    expect(messages).toHaveLength(2);

    const findById = (id: string) => (m: { message_id: string }) => id === m.message_id;

    const higherPriorityMessage = messages.find(findById(message2.message_id));
    const lowerPriorityMessage = messages.find(findById(message1.message_id));

    expect(lowerPriorityMessage.message_state).toEqual(SubscriptionMessageState.Processed);
    expect(higherPriorityMessage.message_state).toEqual(SubscriptionMessageState.Processed);

    expect(+higherPriorityMessage.last_updated_at).toBeLessThan(+lowerPriorityMessage.last_updated_at);
  });

  it('Should retry to consume message 3 times', async () => {
    const messageData = { prop1: 1, prop2: 2 };

    const handlerMock = jest.fn();

    const topic = await createTopic();
    const subscription = await createSubscription(topic.id);
    const retryPolicy = new RetryPolicy({ strategy: 'default', maxRetries: 3, interval: 50 });

    await messageSubscriber.subscribe<Order>(subscription, { retryPolicy }, handlerMock.mockRejectedValue({}));

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
