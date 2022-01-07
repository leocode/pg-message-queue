export interface Message<T> {
  data: T;
  headers: Record<string, string>;
}

export interface MessageEntity<T> {
  id: string;
  topicId: string;
  createdAt: Date;
  updatedAt: Date;
  message_data: T;
}

export type MessageHandler<T> = (message: Message<T>) => Promise<void>;
