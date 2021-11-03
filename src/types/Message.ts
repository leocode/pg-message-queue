export interface Message<T> {
  data: T;
  headers: Record<string, string>;
}

export interface MessageEntity {}

export type MessageHandler<T> = (message: Message<T>) => Promise<void>;
