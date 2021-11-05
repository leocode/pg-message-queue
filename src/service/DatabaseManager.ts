import { Knex, knex } from 'knex';
import { Topic } from '../types/Topic';
import { Subscription } from '../types/Subscription';
import KnexTransaction = Knex.Transaction;
import { MessageEntity } from '../types/Message';

export const Transactionless = null;
export type Transaction = KnexTransaction | null;

const isTransactional = (transactional: Transaction): transactional is KnexTransaction => transactional !== null;

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

  async destroyConnection(): Promise<void> {
    await this.knex.destroy();
  }

  messages(transactionScope: Transaction) {
    return this.createQueryBuilder<MessageEntity>('messages', transactionScope);
  }

  subscriptions(transactionScope: Transaction) {
    return this.createQueryBuilder<Subscription>('subscriptions', transactionScope);
  }

  subscriptionsMessages(transactionScope: Transaction) {
    return this.createQueryBuilder('subscriptions_messages', transactionScope);
  }

  topics(transactionScope: Transaction) {
    return this.createQueryBuilder<Topic>('topics', transactionScope);
  }

  private createQueryBuilder<T>(tableName: string, transactionScope: Transaction) {
    const queryBuilder = this.knex.withSchema(this.schemaName).from<any, T>(tableName);

    if (isTransactional(transactionScope)) {
      queryBuilder.transacting(transactionScope);
    }

    return queryBuilder;
  }

  async transactional(runner: (transactionScope: KnexTransaction) => Promise<void>): Promise<void> {
    await this.knex.transaction(async (transactionScope: KnexTransaction) => {
      await runner(transactionScope);
    });
  }
}
