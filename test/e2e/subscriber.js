/* eslint-disable @typescript-eslint/no-var-requires */
const { createClient } = require('../../dist/service/clientFactory');

(async () => {
  const client = await createClient(process.env.TEST_CONNECTION_STRING);

  const topic = await client.provideTopic('topic.test');

  const subscription = await client.provideSubscription(topic, 'subscription.test');

  await client.subscribe(subscription, async (message) => {
    console.log('New message received', message);
  });
})();
