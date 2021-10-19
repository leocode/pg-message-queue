import { createClient } from './service/clientFactory';

type Order = {
  products: number[];
  userId: number;
  messageId: number;
};

(async () => {
  const client = await createClient('postgres://postgres:postgres@127.0.0.1:5432/pg_queue_poc');

  const topic = await client.provideTopic('order.created');
  let messageIterator = 0;

  while (true) {
    await client.publish<Order>(topic, {
      data: {
        products: [4345, 543, 5623],
        userId: 3242,
        messageId: messageIterator,
      },
      headers: {},
    });
    messageIterator++;
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }
})();
