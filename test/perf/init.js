/* eslint-disable @typescript-eslint/no-var-requires */
const { spawn } = require('child_process');
const DbManager = require('./db');

const POSTGRES_DSN = 'postgres://postgres:postgres@127.0.0.1:5432/pg_queue_poc';

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const measureFuncTime = async (cb) => {
  const start = process.hrtime();
  await cb();
  const diff = process.hrtime(start);
  const dur = diff[0] * 1e3 + diff[1] * 1e-6;
  console.log(`Time: ${dur.toFixed(0)}ms`);
  return dur;
};

(async () => {
  const dbManager = new DbManager(POSTGRES_DSN);

  const topicName = 'topic.test';
  const subscriptionName = 'subscription.test';
  const messagesToProcess = 500;

  const subscriberChild = spawn('node', ['./subscriber.js', POSTGRES_DSN, topicName, subscriptionName]);
  await wait(200);
  const publisherChild = spawn('node', ['./publisher.js', POSTGRES_DSN, topicName, messagesToProcess]);

  await measureFuncTime(async () => {
    let processedCount;

    do {
      processedCount = await dbManager.getProcessedMessagesCount();
      await wait(100);
      console.log(`Processed messages ${processedCount}`);
    } while (processedCount != messagesToProcess);
  });

  subscriberChild.kill();
  publisherChild.kill();

  await dbManager.resetDbAndClose();
})();
