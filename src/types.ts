export interface Message<T> {
  data: T;
  headers: Record<string, string>;
}

export interface Topic {
  id: string;
  name: string;
}

export interface Subscription {
  id: string;
  name: string;
  topicId: string;
}

export type MessageHandler<T> = (message: Message<T>) => Promise<void>;
