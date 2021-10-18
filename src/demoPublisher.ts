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

  await client.publish<Order>(topic, {
    data: {
      products: [4345, 543, 5623],
      userId: 3242,
    },
    headers: {},
  });
})();
