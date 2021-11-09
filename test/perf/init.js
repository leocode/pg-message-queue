/* eslint-disable @typescript-eslint/no-var-requires */
const { spawn } = require('child_process');
const { resetDbAndClose, getProcessedMessagesCount } = require('./db');

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
  const topicName = 'topic.test';
  const subscriptionName = 'subscription.test';
  const messagesToProcess = 500;

  const subscriberChild = spawn('node', ['./subscriber.js', topicName, subscriptionName]);
  await wait(200);
  const publisherChild = spawn('node', ['./publisher.js', topicName, messagesToProcess]);

  await measureFuncTime(async () => {
    let processedCount;

    do {
      processedCount = await getProcessedMessagesCount();
      await wait(100);
      console.log(`Processed messages ${processedCount}`);
    } while (processedCount != messagesToProcess);
  });

  subscriberChild.kill();
  publisherChild.kill();

  await resetDbAndClose();
})();
