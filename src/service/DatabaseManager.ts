import { Knex, knex } from 'knex';
import { Topic } from '../types/Topic';
import { Subscription } from '../types/Subscription';
import Transaction = Knex.Transaction;
import { MessageEntity } from '../types/Message';

export class DatabaseManager {
  private readonly knex: Knex;

  constructor(postgresDsn: string) {
    this.knex = knex({
      client: 'pg',
      connection: postgresDsn,
    });
  }

  async checkConnection(): Promise<void> {
    try {
      await this.knex.raw('SELECT now()');
    } catch (error) {
      throw error;
    }
  }

  getMessagesQueryBuilder() {
    return this.knex.withSchema('pgpg').from<any, MessageEntity>('messages');
  }

  getSubscriptionsQueryBuilder() {
    return this.knex.withSchema('pgpg').from<any, Subscription>('subscriptions');
  }

  getSubscriptionsMessagesQueryBuilder() {
    return this.knex.withSchema('pgpg').from('subscriptions_messages');
  }

  getTopicsQueryBuilder() {
    return this.knex.withSchema('pgpg').from<any, Topic>('topics');
  }

  async transactional(runner: (transactionScope: Transaction) => Promise<void>): Promise<void> {
    await this.knex.transaction(async (transactionScope: Transaction) => {
      await runner(transactionScope);
    });
  }
}
