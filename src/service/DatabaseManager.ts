import { Pool, PoolConfig } from 'pg';

export class DatabaseManager {
  private readonly pool: Pool;

  private isConnected = false;

  constructor(poolConfig: PoolConfig) {
    this.pool = new Pool(poolConfig);

    this.pool.on('error', (error) => {
      throw error;
    });
  }

  async connect(): Promise<void> {
    await this.pool.connect();
    this.isConnected = true;
  }

  async executeQuery(query: string, ...params: any[]): Promise<any> {
    if (!this.isConnected) {
      throw new Error('Client is not connected!');
    }

    return this.pool.query(query, params);
  }

  async transactional(runner: () => Promise<void>): Promise<void> {
    try {
      await this.pool.query('BEGIN');
      await runner();
      await this.pool.query('COMMIT');
    } catch (error) {
      await this.pool.query('ROLLBACK');
      throw error;
    }
  }
}
