import { DatabaseManager } from './DatabaseManager';
import { MessageHandler, Subscription } from '../types';

const wait = async (milliseconds: number): Promise<unknown> =>
  new Promise((resolve) => setTimeout(resolve, milliseconds));

export class MessageSubscriber {
  private readonly WITH_MESSAGES_TIMEOUT = 20;
  private readonly WITHOUT_MESSAGES_TIMEOUT = 200;

  constructor(private readonly databaseManager: DatabaseManager) {}

  async registerHandler<T>({ id: subscriptionId }: Subscription, handler: MessageHandler<T>): Promise<void> {
    let timeout: number;

    const runner = async () => {
      while (true) {
        await this.databaseManager.transactional(async () => {
          const message = await this.findMessage(subscriptionId);

          if (!message) {
            timeout = this.WITHOUT_MESSAGES_TIMEOUT;
            return;
          }

          timeout = this.WITH_MESSAGES_TIMEOUT;

          try {
            await handler(message);
            await this.markSubscriptionMessageAsProcessed(message.subscriptionsMessageId);
          } catch (error) {
            await this.markSubscriptionMessageAsProcessedError(message.subscriptionsMessageId);
          }
        });

        await wait(timeout);
      }
    };

    setTimeout(runner, this.WITH_MESSAGES_TIMEOUT);
  }

  private async findMessage(subscriptionId: string): Promise<any> {
    const { rows } = await this.databaseManager.executeQuery(
      `
          SELECT sm.id as "subscriptionsMessageId", m.*
          FROM subscriptions_messages sm
                   INNER JOIN messages m on sm.message_id = m.message_id
          WHERE sm.subscription_id = $1
            AND sm.message_state = 'published'
              FOR UPDATE SKIP LOCKED
          LIMIT 1;`,
      subscriptionId,
    );

    return rows[0];
  }

  private async markSubscriptionMessageAsProcessed(subscriptionsMessageId: string): Promise<void> {
    await this.databaseManager.executeQuery(
      `UPDATE subscriptions_messages SET message_state = 'processed' WHERE id = $1`,
      subscriptionsMessageId,
    );
  }

  private async markSubscriptionMessageAsProcessedError(subscriptionsMessageId: string): Promise<void> {
    await this.databaseManager.executeQuery(
      `UPDATE subscriptions_messages SET message_state = 'processing_error' WHERE id = $1`,
      subscriptionsMessageId,
    );
  }
}
