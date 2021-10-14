import { Message, Topic } from '../types';
import { v4 as uuid4 } from 'uuid';
import { DatabaseManager } from './DatabaseManager';

export class Publisher {
  constructor(private readonly databaseManager: DatabaseManager) {}

  async publish<T>({ id: topicId }: Topic, message: Message<T>): Promise<void> {
    const messageId = uuid4();

    await this.databaseManager.transactional(async () => {
      const { rows } = await this.databaseManager.executeQuery(
        `SELECT subscription_id as "subscriptionId" FROM subscriptions WHERE topic_id = $1`,
        topicId,
      );

      await this.databaseManager.executeQuery(
        'INSERT INTO messages(message_id, topic_id, message_data) VALUES($1, $2, $3);',
        messageId,
        topicId,
        message.data,
      );

      for (const { subscriptionId } of rows) {
        const id = uuid4();
        await this.databaseManager.executeQuery(
          'INSERT INTO subscriptions_messages(id, subscription_id, message_id) VALUES ($1, $2, $3);',
          id,
          subscriptionId,
          messageId,
        );
      }
    });
  }
}
