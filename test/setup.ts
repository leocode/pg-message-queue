import { testDatabaseManager } from './database';

const clearDb = async () => {
  await testDatabaseManager.transactional(async (transactionScope) => {
    await testDatabaseManager.subscriptionsMessages(transactionScope).delete();
    await testDatabaseManager.subscriptions(transactionScope).delete();
    await testDatabaseManager.messages(transactionScope).delete();
    await testDatabaseManager.topics(transactionScope).delete();
  });
};

beforeEach(() => {
  jest.clearAllMocks();
});

afterAll(async () => {
  await clearDb();
});
