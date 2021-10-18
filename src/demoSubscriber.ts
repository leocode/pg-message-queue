import { createClient } from './service/clientFactory';

type Order = {
  products: number[];
  userId: number;
};

(async () => {
  const client = await createClient({
    host: '127.0.0.1',
    port: 5432,
    user: 'postgres',
    password: 'postgres',
    database: 'pg_queue_poc',
  });

  const topic = await client.provideTopic('order.created');
  const subscription = await client.provideSubscription(topic, 'order.created.inventory_check');

  await client.subscribe<Order>(subscription, async (message) => {
    console.log(message);
  });
})();
