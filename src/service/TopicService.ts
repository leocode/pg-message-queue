import { DatabaseManager } from './DatabaseManager';
import { v4 as uuid4 } from 'uuid';
import { Topic } from '../types/Topic';

export class TopicService {
  constructor(private readonly databaseManager: DatabaseManager) {}

  async provideTopic(topicName: string): Promise<Topic> {
    const topic = await this.findByName(topicName);

    if (topic) {
      return topic;
    }

    return this.create(topicName);
  }

  private async findByName(name: string): Promise<Topic | undefined> {
    const queryBuilder = this.databaseManager.getTopicsQueryBuilder();

    return queryBuilder.column({ id: 'topic_id' }, { name: 'topic_name' }).where('topic_name', name).first();
  }

  private async create(topicName: string): Promise<Topic> {
    const id = uuid4();

    await this.databaseManager.getTopicsQueryBuilder().insert({ topic_id: id, topic_name: topicName });

    return {
      id,
      name: topicName,
    };
  }
}
