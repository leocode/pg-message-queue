/* eslint-disable @typescript-eslint/no-var-requires */
const { knex } = require('knex');

const knexConn = knex({
  client: 'pg',
  connection: 'postgres://postgres:postgres@127.0.0.1:5432/pg_queue_poc',
});

const resetDbAndClose = async () => {
  console.log('DB cleanup');
  await knexConn.transaction(async (trx) => {
    await knexConn.withSchema('queue').from('subscriptions_messages').delete().transacting(trx);
    await knexConn.withSchema('queue').from('subscriptions').delete().transacting(trx);
    await knexConn.withSchema('queue').from('messages').delete().transacting(trx);
    await knexConn.withSchema('queue').from('topics').delete().transacting(trx);
  });
  await knexConn.destroy();
};

const getProcessedMessagesCount = async () => {
  const { count } = await knexConn
    .withSchema('queue')
    .from('subscriptions_messages')
    .where('message_state', 'processed')
    .count()
    .first();

  return count;
};

module.exports = {
  resetDbAndClose,
  getProcessedMessagesCount,
};
