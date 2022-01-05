import { DatabaseManager } from './DatabaseManager';
import { Subscription } from '../types/Subscription';
import { MessageHandler } from '../types/Message';
import { Knex } from 'knex';
import { v4 as uuid4 } from 'uuid';
import Transaction = Knex.Transaction;
import { SubscriptionMessageState } from '../types/SubscriptionMessage';
import { FailurePolicy } from './FailurePolicy';

const wait = async (milliseconds: number): Promise<unknown> =>
  new Promise((resolve) => setTimeout(resolve, milliseconds));

export interface MessageSubscriberOptions {
  failurePolicy?: FailurePolicy;
}

export class MessageSubscriber {
  private readonly WITH_MESSAGES_TIMEOUT = 1;
  private readonly WITHOUT_MESSAGES_TIMEOUT = 200;

  private readonly messageHandlerSubscriptions: Record<string, boolean>;

  constructor(private readonly databaseManager: DatabaseManager) {
    this.messageHandlerSubscriptions = {};
  }

  async subscribe<T>(
    { id: subscriptionId }: Subscription,
    options: MessageSubscriberOptions = {},
    handler: MessageHandler<T>,
  ): Promise<string> {
    let timeout: number;
    const handlerId = uuid4();
    this.messageHandlerSubscriptions[handlerId] = true;

    const runner = async () => {
      while (this.messageHandlerSubscriptions[handlerId]) {
        await this.databaseManager.transactional(async (transactionScope) => {
          const message = await this.findMessage(subscriptionId, options, transactionScope);

          if (!message) {
            timeout = this.WITHOUT_MESSAGES_TIMEOUT;
            return;
          }

          timeout = this.WITH_MESSAGES_TIMEOUT;

          try {
            await handler(message);
            await this.markSubscriptionMessageAsProcessed(message.subscriptionsMessageId, transactionScope);
          } catch (error) {
            if (options.failurePolicy?.shouldRetryMessage(message)) {
              return await this.markSubscriptionMessageAsProcessedErrorRetry(
                message.subscriptionsMessageId,
                message.retries,
                options.failurePolicy?.getNextRunAtDate(message),
                transactionScope,
              );
            }

            return await this.markSubscriptionMessageAsProcessedError(message.subscriptionsMessageId, transactionScope);
          }
        });

        await wait(timeout);
      }
    };

    setImmediate(runner);

    return handlerId;
  }

  public unsubscribe(handlerId: string): void {
    if (!this.messageHandlerSubscriptions[handlerId]) {
      return;
    }

    this.messageHandlerSubscriptions[handlerId] = false;
  }

  private async findMessage(
    subscriptionId: string,
    options: MessageSubscriberOptions,
    transaction: Transaction,
  ): Promise<any> {
    const queryBuilder = this.databaseManager
      .subscriptionsMessages(transaction)
      .innerJoin('messages', 'messages.message_id', 'subscriptions_messages.message_id')
      .column(
        { subscriptionsMessageId: 'subscriptions_messages.id' },
        { createdAt: 'messages.created_at' },
        { data: 'messages.message_data' },
        { retries: 'retries' },
      )
      .where({
        'subscriptions_messages.subscription_id': subscriptionId,
        'subscriptions_messages.message_state': SubscriptionMessageState.Published,
      })
      .forUpdate()
      .skipLocked()
      .first();

    if (options.failurePolicy) {
      queryBuilder
        .orWhere({
          'subscriptions_messages.message_state': SubscriptionMessageState.ProcessingError,
        })
        .andWhere('subscriptions_messages.run_at', '<=', new Date());
    }

    return queryBuilder;
  }

  private async markSubscriptionMessageAsProcessed(
    subscriptionsMessageId: string,
    transactionScope: Knex.Transaction,
  ): Promise<void> {
    await this.databaseManager.subscriptionsMessages(transactionScope).where('id', subscriptionsMessageId).update({
      message_state: SubscriptionMessageState.Processed,
    });
  }

  private async markSubscriptionMessageAsProcessedError(
    subscriptionsMessageId: string,
    transactionScope: Knex.Transaction,
  ): Promise<void> {
    await this.databaseManager.subscriptionsMessages(transactionScope).where('id', subscriptionsMessageId).update({
      message_state: SubscriptionMessageState.ProcessingError,
      run_at: null,
    });
  }

  private async markSubscriptionMessageAsProcessedErrorRetry(
    subscriptionsMessageId: string,
    retryCount: number,
    runAt: number,
    transactionScope: Knex.Transaction,
  ): Promise<void> {
    await this.databaseManager
      .subscriptionsMessages(transactionScope)
      .where('id', subscriptionsMessageId)
      .update({
        message_state: SubscriptionMessageState.ProcessingError,
        retries: retryCount + 1,
        run_at: new Date(runAt),
      });
  }
}
