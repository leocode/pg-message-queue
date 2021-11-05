import { ClientApi } from '../../dist/service/ClientApi';
import { createClient } from '../../src';
import { POSTGRES_DSN, testDatabaseManager } from '../database';
import { Order } from '../../src/demoPublisher';
import { Transactionless } from '../../dist/service/DatabaseManager';

describe('publisher-subscriber e2e', () => {
  let publisher: ClientApi;
  let subscriber: ClientApi;

  beforeAll(async () => {
    publisher = await createClient(POSTGRES_DSN);
    subscriber = await createClient(POSTGRES_DSN);
  });

  it('should publish and consume message', async () => {
    const messageData: Order = {
      products: [10, 20, 30],
      userId: 10,
      messageId: 10,
    };

    const messageHandler = jest.fn();
    const subscriberTopic = await subscriber.provideTopic('test.topic');
    const subscriberSubscription = await subscriber.provideSubscription(subscriberTopic, 'test.subscription');

    await subscriber.subscribe<Order>(subscriberSubscription, messageHandler.mockResolvedValue({}));

    const publisherTopic = await publisher.provideTopic('test.topic');

    await publisher.publish<Order>(publisherTopic, {
      data: messageData,
      headers: {},
    });

    await new Promise((resolve) => setTimeout(resolve, 500));

    const receivedMessage = await testDatabaseManager
      .subscriptionsMessages(Transactionless)
      .innerJoin('messages', 'messages.message_id', 'subscriptions_messages.message_id')
      .where({
        'subscriptions_messages.subscription_id': subscriberSubscription.id,
      })
      .first();

    expect(receivedMessage.message_state).toEqual('processed');
    expect(receivedMessage.message_data).toEqual(messageData);
  });
});
