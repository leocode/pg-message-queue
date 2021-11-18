import { v4 as uuid4 } from 'uuid';
import * as crypto from 'crypto';
import { Subscription, Topic } from '../src';
import { DatabaseManager, Transactionless } from '../src/service/DatabaseManager';

export const POSTGRES_DSN = 'postgres://postgres:postgres@127.0.0.1:5432/pg_queue_poc';
export const POSTGRES_SCHEMA = 'queue';
export const testDatabaseManager = new DatabaseManager(POSTGRES_DSN, POSTGRES_SCHEMA);

const randomString = () => crypto.randomBytes(16).toString('hex');

export const createTopic = async (): Promise<Topic> => {
  const id = uuid4();
  const name = randomString();

  await testDatabaseManager.topics(Transactionless).insert({
    topic_id: id,
    topic_name: name,
  });

  return {
    id,
    name,
  };
};

export const createSubscription = async (topicId: string): Promise<Subscription> => {
  const id = uuid4();
  const name = randomString();

  await testDatabaseManager.subscriptions(Transactionless).insert({
    subscription_id: id,
    name,
    topic_id: topicId,
  });

  return {
    id,
    name,
    topicId: topicId,
  };
};

export const createMessage = async (
  topicId: string,
  messageData: object,
  priority = 1000,
): Promise<{ message_id: string; message_data: object }> => {
  const id = uuid4();

  await testDatabaseManager.messages(Transactionless).insert({
    message_id: id,
    message_data: messageData,
    topic_id: topicId,
    priority,
  });

  return {
    message_id: id,
    message_data: messageData,
  };
};

export const createSubscriptionMessage = async (
  subscriptionId: string,
  message: { message_id: string; message_state: string },
) => {
  const id = uuid4();

  await testDatabaseManager.subscriptionsMessages(Transactionless).insert({
    id,
    subscription_id: subscriptionId,
    message_id: message.message_id,
    message_state: message.message_state,
  });
};
