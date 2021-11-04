export const POSTGRES_DSN = 'postgres://postgres:postgres@127.0.0.1:5432/pg_queue_poc';
export const POSTGRES_SCHEMA = 'queue';

export type TestOrder = {
  products: number[];
  userId: number;
  messageId: number;
};
