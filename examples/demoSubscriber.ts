import { createClient } from '../src';
import { Order } from './demoPublisher';

(async () => {
  const client = await createClient('postgres://postgres:postgres@127.0.0.1:5432/pg_queue_poc');

  const topic = await client.provideTopic('order.created');
  const subscription = await client.provideSubscription(topic, 'order.created.inventory_check');
  const failurePolicy = client.provideFailurePolicy({ strategy: 'backoff', maxRetries: 3, interval: 1000 });

  const handlerId = await client.subscribe<Order>(subscription, { failurePolicy }, async (message) => {
    console.log('New message received', message);
    if (Math.random() > 0.5) {
      throw new Error('Processing error');
    }
  });

  setTimeout(() => {
    console.log('Stopping subscribing');
    client.unsubscribe(handlerId);
  }, 8000);
})();
