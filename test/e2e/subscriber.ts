import { createClient } from '../../src';
import { Order } from '../types';

(async () => {
  const client = await createClient('postgres://postgres:postgres@database:5432/pg_queue_poc');

  const topic = await client.provideTopic('topic.test');

  const subscription = await client.provideSubscription(topic, 'subscription.test');

  await client.subscribe<Order>(subscription, async (message) => {
    console.log('New message received', message);
  });
})();
