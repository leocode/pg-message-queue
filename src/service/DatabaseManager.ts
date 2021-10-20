import { Knex, knex } from 'knex';
import { Topic } from '../types/Topic';
import { Subscription } from '../types/Subscription';
import Transaction = Knex.Transaction;
import { MessageEntity } from '../types/Message';

export class DatabaseManager {
  private readonly knex: Knex;

  constructor(postgresDsn: string, private readonly schemaName: string) {
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

  messages(transactionScope?: Transaction|undefined) {
    return this.createQueryBuilder<MessageEntity>('messages', transactionScope);
  }

  subscriptions(transactionScope?: Transaction|undefined) {
    return this.createQueryBuilder<Subscription>('subscriptions', transactionScope);
  }

  subscriptionsMessages(transactionScope?: Transaction|undefined) {
    return this.createQueryBuilder('subscriptions_messages', transactionScope);
  }

  topics(transactionScope?: Transaction|undefined) {
    return this.createQueryBuilder<Topic>('topics', transactionScope);
  }

  private createQueryBuilder<T>(tableName: string, transactionScope?: Transaction|undefined) {
    const queryBuilder = this.knex.withSchema(this.schemaName).from<any, T>(tableName);

    if (transactionScope) {
      queryBuilder.transacting(transactionScope);
    }

    return queryBuilder;
  }

  async transactional(runner: (transactionScope: Transaction) => Promise<void>): Promise<void> {
    await this.knex.transaction(async (transactionScope: Transaction) => {
      await runner(transactionScope);
    });
  }
}
