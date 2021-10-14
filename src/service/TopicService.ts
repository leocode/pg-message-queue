import { Topic } from '../types';
import { DatabaseManager } from './DatabaseManager';
import { v4 as uuid4 } from 'uuid';

export class TopicService {
  constructor(private readonly databaseManager: DatabaseManager) {}

  async provideTopic(topicName: string): Promise<Topic> {
    const topic = await this.findByName(topicName);

    if (topic) {
      return topic;
    }

    return this.create(topicName);
  }

  private async findByName(name: string): Promise<Topic | null> {
    const { rows } = await this.databaseManager.executeQuery(
      'SELECT topic_id as id, topic_name as name FROM topics WHERE topic_name = $1 LIMIT 1',
      name,
    );

    return rows.length ? rows[0] : null;
  }

  private async create(topicName: string): Promise<Topic> {
    const id = uuid4();
    await this.databaseManager.executeQuery('INSERT INTO topics(topic_id, topic_name) VALUES($1, $2)', id, topicName);

    return {
      id,
      name: topicName,
    };
  }
}
