import { createClient } from '../../src';
import { POSTGRES_DSN, testDatabaseManager } from '../database';
import { Order } from '../../examples/demoPublisher';
import { ClientApi } from '../../src/service/ClientApi';
import { Transactionless } from '../../src/service/DatabaseManager';
import { SubscriptionMessageState } from '../../src/types/SubscriptionMessage';

const wait = (timeInMilliseconds: number) => new Promise((resolve) => setTimeout(resolve, timeInMilliseconds));

describe('publisher-subscriber e2e', () => {
  let publisher: ClientApi;

  beforeAll(async () => {
    publisher = await createClient(POSTGRES_DSN);
  });

  it('should publish and consume message', async () => {
    const messageData: Order = {
      products: [10, 20, 30],
      userId: 10,
      messageId: 10,
    };

    const publisherTopic = await publisher.provideTopic('topic.test');

    await publisher.publish<Order>(publisherTopic, {
      data: messageData,
      headers: {},
    });

    await wait(500);

    const receivedMessage = await testDatabaseManager
      .subscriptionsMessages(Transactionless)
      .innerJoin('messages', 'messages.message_id', 'subscriptions_messages.message_id')
      .where({
        'messages.topic_id': publisherTopic.id,
      })
      .first();

    expect(receivedMessage.message_state).toEqual(SubscriptionMessageState.Processed);
    expect(receivedMessage.message_data).toEqual(messageData);
  });
});
