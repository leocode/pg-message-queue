import { DatabaseManager } from './DatabaseManager';
import { POSTGRES_DSN, POSTGRES_SCHEMA } from '../../test/database';

describe('DatabaseManager', () => {
  let databaseManager: DatabaseManager;

  beforeEach(() => {
    databaseManager = new DatabaseManager(POSTGRES_DSN, POSTGRES_SCHEMA);
  });

  it('Should throw error when connection is not established', async () => {
    await databaseManager.destroyConnection();
    await expect(databaseManager.checkConnection()).rejects.toThrow();
  });
});
