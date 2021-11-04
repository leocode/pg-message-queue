import { POSTGRES_DSN, POSTGRES_SCHEMA } from './helper';
import { DatabaseManager } from '../src/service/DatabaseManager';

const dm = new DatabaseManager(POSTGRES_DSN, POSTGRES_SCHEMA);

const clearDb = async () => {
  await dm.transactional(async (transactionScope) => {
    await dm.subscriptionsMessages(transactionScope).delete();
    await dm.subscriptions(transactionScope).delete();
    await dm.messages(transactionScope).delete();
    await dm.topics(transactionScope).delete();
  });
};

beforeEach(async () => {
  jest.clearAllMocks();
  await clearDb();
});
