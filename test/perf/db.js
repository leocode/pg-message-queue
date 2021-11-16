/* eslint-disable @typescript-eslint/no-var-requires */
const { knex } = require('knex');

class DbManager {
  knexConn;

  constructor(postgreDsn) {
    this.knexConn = knex({
      client: 'pg',
      connection: postgreDsn,
    });
  }

  async resetDbAndClose() {
    console.log('DB cleanup');

    await this.knexConn.transaction(async (trx) => {
      await this.knexConn.withSchema('queue').from('subscriptions_messages').delete().transacting(trx);
      await this.knexConn.withSchema('queue').from('subscriptions').delete().transacting(trx);
      await this.knexConn.withSchema('queue').from('messages').delete().transacting(trx);
      await this.knexConn.withSchema('queue').from('topics').delete().transacting(trx);
    });
    await this.knexConn.destroy();
  }

  async getProcessedMessagesCount() {
    const { count } = await this.knexConn
      .withSchema('queue')
      .from('subscriptions_messages')
      .where('message_state', 'processed')
      .count()
      .first();

    return count;
  }
}

module.exports = DbManager;
