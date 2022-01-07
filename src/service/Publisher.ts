import { DatabaseManager, Transactionless } from './DatabaseManager';
import { Topic } from '../types/Topic';
import { Message } from '../types/Message';
import { v4 as uuid4 } from 'uuid';
import { SubscriptionService } from './SubscriptionService';
import { SubscriptionMessagesRepository } from './messageSubscriber/SubscriptionMessagesRepository';

export class Publisher {
  private queueMessageRepository: SubscriptionMessagesRepository;

  constructor(
    private readonly subscriptionService: SubscriptionService,
    private readonly databaseManager: DatabaseManager,
  ) {
    this.queueMessageRepository = new SubscriptionMessagesRepository(databaseManager);
  }

  async publish<T>({ id: topicId }: Topic, message: Message<T>): Promise<void> {
    await this.databaseManager.transactional(async (transactionScope) => {
      const subscriptions = await this.subscriptionService.findByTopicId(topicId);
      const messageId = await this.createMessage(topicId, message);

      for (const { id: subscriptionId } of subscriptions) {
        await this.queueMessageRepository.create<T>({ messageId, subscriptionId }, { transaction: transactionScope });
      }
    });
  }

  private async createMessage<T>(topicId: string, message: Message<T>): Promise<string> {
    const messageId = uuid4();

    await this.databaseManager.messages(Transactionless).insert({
      message_id: messageId,
      topic_id: topicId,
      message_data: message.data,
    });

    return messageId;
  }
}
