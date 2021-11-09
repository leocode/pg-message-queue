/* eslint-disable @typescript-eslint/no-var-requires */
const { createClient } = require('../../dist/service/clientFactory');
const [POSTGRES_DSN, TOPIC_NAME, SUBSCRIPTION_NAME] = process.argv.slice(2);

(async () => {
  const client = await createClient(POSTGRES_DSN);

  const topic = await client.provideTopic(TOPIC_NAME);
  const subscription = await client.provideSubscription(topic, SUBSCRIPTION_NAME);

  await client.subscribe(subscription, async (message) => {
    console.log('New message received', message);
  });
})();
