/* eslint-disable @typescript-eslint/no-var-requires */
const { createClient } = require('../../dist/service/clientFactory');
const [TOPIC_NAME, MESSAGES_COUNT] = process.argv.slice(2);

(async () => {
  const client = await createClient('postgres://postgres:postgres@127.0.0.1:5432/pg_queue_poc');

  const topic = await client.provideTopic(TOPIC_NAME);

  let messageIterator = 0;

  while (messageIterator < MESSAGES_COUNT) {
    await client.publish(topic, {
      data: {
        products: [10, 20, 30],
        userId: 10,
        messageId: 10,
      },
      headers: {},
    });

    messageIterator++;
    await new Promise((resolve) => setTimeout(resolve, 20));
  }
})();
