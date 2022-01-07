import { DatabaseManager } from '../DatabaseManager';
import { Knex } from 'knex';
import { SubscriptionMessageState } from '../../types/SubscriptionMessage';
import { v4 as uuid4 } from 'uuid';

export interface SubscriptionMessages<T> {
  id: string;
  payload: T;
  subscriptionId: string;
  messageId: string;
  retries: number;
  runAt: Date;
}

export type SubscriptionMessagesConstructor<T> = Omit<SubscriptionMessages<T>, 'payload' | 'retries' | 'runAt' | 'id'> &
  Partial<Pick<SubscriptionMessages<T>, 'runAt' | 'retries'>>;

interface TransactionalOptions {
  transaction: Knex.Transaction;
}

export class SubscriptionMessagesRepository {
  constructor(private readonly databaseManager: DatabaseManager) {}

  startTransaction(cb: (transaction: Knex.Transaction) => Promise<void>) {
    return this.databaseManager.transactional(cb);
  }

  async create<T>(data: SubscriptionMessagesConstructor<T>, options: TransactionalOptions) {
    const id = uuid4();

    await this.databaseManager.subscriptionsMessages(options.transaction).insert({
      id,
      subscription_id: data.subscriptionId,
      message_id: data.messageId,
      message_state: SubscriptionMessageState.Published,
      run_at: data.runAt || null,
      retries: data.retries || 0,
    });
  }

  async markAsFailProcessed(queuedMessageId: string, options: TransactionalOptions): Promise<void> {
    await this.databaseManager.subscriptionsMessages(options.transaction).where('id', queuedMessageId).update({
      message_state: SubscriptionMessageState.ProcessingError,
      run_at: null,
    });
  }

  async markAsSuccessfullyProcessed(queuedMessageId: string, options: TransactionalOptions): Promise<void> {
    await this.databaseManager.subscriptionsMessages(options.transaction).where('id', queuedMessageId).update({
      message_state: SubscriptionMessageState.Processed,
    });
  }

  async findBySubscriptionId<T>(
    subscriptionId: string,
    options: TransactionalOptions,
  ): Promise<SubscriptionMessages<T> | null> {
    return this.databaseManager
      .subscriptionsMessages(options.transaction)
      .innerJoin('messages', 'messages.message_id', 'subscriptions_messages.message_id')
      .column(
        { id: 'subscriptions_messages.id' },
        { createdAt: 'messages.created_at' },
        { payload: 'messages.message_data' },
        { retries: 'subscriptions_messages.retries' },
        { runAt: 'subscriptions_messages.run_at' },
        { subscriptionId: 'subscriptions_messages.subscription_id' },
        { messageId: 'subscriptions_messages.message_id' },
      )
      .where({
        'subscriptions_messages.subscription_id': subscriptionId,
        'subscriptions_messages.message_state': SubscriptionMessageState.Published,
      })
      .andWhere((qB) =>
        qB
          .where('subscriptions_messages.run_at', '<=', new Date())
          .orWhere('subscriptions_messages.run_at', 'is', null),
      )
      .forUpdate()
      .skipLocked()
      .first();
  }
}
