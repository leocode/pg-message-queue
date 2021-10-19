import { createClient } from './service/clientFactory';

type Order = {
  products: number[];
  userId: number;
};

(async () => {
  const client = await createClient('postgres://postgres:postgres@127.0.0.1:5432/pg_queue_poc');

  const topic = await client.provideTopic('order.created');
  const subscription = await client.provideSubscription(topic, 'order.created.inventory_check');

  await client.subscribe<Order>(subscription, async (message) => {
    console.log(message);
  });
})();