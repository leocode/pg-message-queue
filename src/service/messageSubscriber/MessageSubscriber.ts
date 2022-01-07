import { DatabaseManager } from '../DatabaseManager';
import { Subscription } from '../../types/Subscription';
import { MessageHandler } from '../../types/Message';
import { Knex } from 'knex';
import { v4 as uuid4 } from 'uuid';
import { SubscriptionMessagesRepository, SubscriptionMessages } from './SubscriptionMessagesRepository';
import { wait } from '../../utils';
import { IFailureStrategy } from './IFailureStrategy';

export interface MessageSubscriberOptions {
  failureStrategy?: IFailureStrategy | null;
}

export class MessageSubscriber {
  private queueMessageRepository: SubscriptionMessagesRepository;
  private readonly WITH_MESSAGES_TIMEOUT = 1;
  private readonly WITHOUT_MESSAGES_TIMEOUT = 200;

  private readonly messageHandlerSubscriptions: Record<string, boolean>;

  constructor(databaseManager: DatabaseManager) {
    this.queueMessageRepository = new SubscriptionMessagesRepository(databaseManager);
    this.messageHandlerSubscriptions = {};
  }

  async subscribe<T>(
    { id: subscriptionId }: Subscription,
    options: MessageSubscriberOptions = {
      failureStrategy: null,
    },
    handler: MessageHandler<T>,
  ): Promise<string> {
    let timeout: number;
    const handlerId = uuid4();
    this.messageHandlerSubscriptions[handlerId] = true;

    const runner = async () => {
      while (this.messageHandlerSubscriptions[handlerId]) {
        await this.queueMessageRepository.startTransaction(async (transaction) => {
          const queuedMessage = await this.queueMessageRepository.findBySubscriptionId<T>(subscriptionId, {
            transaction,
          });

          if (!queuedMessage) {
            timeout = this.WITHOUT_MESSAGES_TIMEOUT;
            return;
          }

          timeout = this.WITH_MESSAGES_TIMEOUT;

          try {
            await handler({ headers: {}, data: queuedMessage.payload });
            await this.queueMessageRepository.markAsSuccessfullyProcessed(queuedMessage.id, { transaction });
          } catch (error) {
            if (options.failureStrategy) {
              await this.handleMessageHandlingFailure(queuedMessage, {
                transaction,
                failureStrategy: options.failureStrategy,
              });
            }
            await this.queueMessageRepository.markAsFailProcessed(queuedMessage.id, { transaction });
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

  private async handleMessageHandlingFailure<T>(
    message: SubscriptionMessages<T>,
    options: { transaction: Knex.Transaction; failureStrategy: IFailureStrategy },
  ) {
    const result = await options.failureStrategy.execute(message);
    if (result) {
      await this.queueMessageRepository.create(result, { transaction: options.transaction });
    }
  }
}
