import { DatabaseManager } from './DatabaseManager';
import { Subscription, Topic } from '../types';
import { v4 as uuid4 } from 'uuid';

export class SubscriptionService {
  constructor(private readonly databaseManager: DatabaseManager) {}

  async provideSubscription(topic: Topic, name: string): Promise<Subscription> {
    const subscription = await this.find(name, topic);

    if (subscription) {
      return subscription;
    }

    return this.create(name, topic);
  }

  private async find(name: string, { id: topicId }: Topic): Promise<Subscription | null> {
    const { rows } = await this.databaseManager.executeQuery(
      `SELECT subscription_id as id, name, topic_id as "topicId" FROM subscriptions WHERE name = $1 AND topic_id =  $2 LIMIT 1;`,
      name,
      topicId,
    );

    return rows.length ? rows[0] : null;
  }

  private async create(subscriptionName: string, { id }: Topic): Promise<Subscription> {
    const subscriptionId = uuid4();
    await this.databaseManager.executeQuery(
      'INSERT INTO subscriptions(subscription_id, name, topic_id) VALUES($1, $2, $3);',
      subscriptionId,
      subscriptionName,
      id,
    );

    return {
      id: subscriptionId,
      name: subscriptionName,
      topicId: id,
    };
  }
}
