import { DatabaseManager } from './DatabaseManager';
import { v4 as uuid4 } from 'uuid';
import { Subscription } from '../types/Subscription';
import { Topic } from '../types/Topic';

export class SubscriptionService {
  constructor(private readonly databaseManager: DatabaseManager) {}

  async provideSubscription(topic: Topic, name: string): Promise<Subscription> {
    const subscription = await this.find(name, topic);

    if (subscription) {
      return subscription;
    }

    return this.create(name, topic);
  }

  private async find(name: string, { id: topic_id }: Topic): Promise<Subscription | null> {
    const queryBuilder = this.databaseManager.getSubscriptionsQueryBuilder();

    return queryBuilder
      .column({ id: 'subscription_id' }, 'name', { topicId: 'topic_id' })
      .where({
        topic_id: topic_id,
        name,
      })
      .first();
  }

  private async create(subscriptionName: string, { id: topicId }: Topic): Promise<Subscription> {
    const subscriptionId = uuid4();
    await this.databaseManager.getSubscriptionsQueryBuilder().insert({
      subscription_id: subscriptionId,
      topic_id: topicId,
      name: subscriptionName,
    });

    return {
      id: subscriptionId,
      name: subscriptionName,
      topicId,
    };
  }

  async findByTopicId(topicId: string): Promise<Subscription[]> {
    const queryBuilder = this.databaseManager.getSubscriptionsQueryBuilder();

    return queryBuilder.column({ id: 'subscription_id' }, 'name', { topicId: 'topic_id' }).where({
      topic_id: topicId,
    });
  }
}
