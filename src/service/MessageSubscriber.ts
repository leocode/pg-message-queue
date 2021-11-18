import { DatabaseManager } from './DatabaseManager';
import { Subscription } from '../types/Subscription';
import { MessageHandler } from '../types/Message';
import { Knex } from 'knex';
import { v4 as uuid4 } from 'uuid';
import Transaction = Knex.Transaction;
import { SubscriptionMessageState } from '../types/SubscriptionMessage';
import { RetryPolicy } from './RetryPolicy';

const wait = async (milliseconds: number): Promise<unknown> =>
  new Promise((resolve) => setTimeout(resolve, milliseconds));

export interface MessageSubscriberOptions {
  retryPolicy?: RetryPolicy;
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
      while (true) {
        if (!this.messageHandlerSubscriptions[handlerId]) {
          break;
        }

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
            if (options.retryPolicy?.shouldRetryMessage(message)) {
              return await this.markSubscriptionMessageAsProcessedErrorRetry(
                message.subscriptionsMessageId,
                message.retries,
                options.retryPolicy?.getNextRetry(message),
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
      .orderBy('messages.priority', 'desc')
      .first();

    if (options.retryPolicy) {
      queryBuilder
        .orWhere({
          'subscriptions_messages.subscription_id': subscriptionId,
          'subscriptions_messages.message_state': SubscriptionMessageState.ProcessingErrorRetry,
        })
        .andWhere('subscriptions_messages.next_retry_at', '<=', new Date());
    }

    return queryBuilder;
  }

  private async markSubscriptionMessageAsProcessed(
    subscriptionsMessageId: string,
    transactionScope: Knex.Transaction,
  ): Promise<void> {
    await this.databaseManager.subscriptionsMessages(transactionScope).where('id', subscriptionsMessageId).update({
      message_state: SubscriptionMessageState.Processed,
      next_retry_at: null,
    });
  }

  private async markSubscriptionMessageAsProcessedError(
    subscriptionsMessageId: string,
    transactionScope: Knex.Transaction,
  ): Promise<void> {
    await this.databaseManager.subscriptionsMessages(transactionScope).where('id', subscriptionsMessageId).update({
      message_state: SubscriptionMessageState.ProcessingError,
      next_retry_at: null,
    });
  }

  private async markSubscriptionMessageAsProcessedErrorRetry(
    subscriptionsMessageId: string,
    retryCount: number,
    next_retry_at: number,
    transactionScope: Knex.Transaction,
  ): Promise<void> {
    await this.databaseManager
      .subscriptionsMessages(transactionScope)
      .where('id', subscriptionsMessageId)
      .update({
        message_state: SubscriptionMessageState.ProcessingErrorRetry,
        retries: retryCount + 1,
        next_retry_at: new Date(next_retry_at),
      });
  }
}
