import { DatabaseManager } from './DatabaseManager';
import { Topic } from '../types/Topic';
import { Message } from '../types/Message';
import { v4 as uuid4 } from 'uuid';
import { SubscriptionService } from './SubscriptionService';

export class Publisher {
  constructor(
    private readonly subscriptionService: SubscriptionService,
    private readonly databaseManager: DatabaseManager,
  ) {}

  async publish<T>({ id: topicId }: Topic, message: Message<T>): Promise<void> {
    await this.databaseManager.transactional(async (transactionScope) => {
      const subscriptions = await this.subscriptionService.findByTopicId(topicId);
      const messageId = await this.createMessage(topicId, message);

      for (const { id: subscriptionId } of subscriptions) {
        const id = uuid4();

        await this.databaseManager.subscriptionsMessages().insert({
          id,
          subscription_id: subscriptionId,
          message_id: messageId,
        });
      }
    });
  }

  private async createMessage<T>(topicId: string, message: Message<T>): Promise<string> {
    const messageId = uuid4();

    await this.databaseManager.messages().insert({
      message_id: messageId,
      topic_id: topicId,
      message_data: message.data,
    });

    return messageId;
  }
}
