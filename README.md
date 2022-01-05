# PG Message Queue (proof of concept, work in progress)

Simple MQ/PubSub implementation based on PostgreSQL.

## Install 

```
npm i -s ...
```
or
```
yarn add ...
```

## Usage

### Publisher

```typescript
import { createClient } from 'pg-queue';

type Order = {
  products: number[],
  userId: number,
};

(async () => {
  const client = await createClient({
    host: '127.0.0.1',
    port: 5432,
    user: 'postgres',
    password: 'postgres',
    database: 'database_name',
  });

  const topic = await client.provideTopic('order.created');

  await client.publish<Order>(topic, {
    data: {
      products: [4345, 543, 5623],
      userId: 3242
    },
    headers: {}
  });
})();
```

### Consumer

```typescript
import { createClient } from 'pg-queue';

type Order = {
  products: number[],
  userId: number,
};

(async () => {
  const client = await createClient({
    host: '127.0.0.1',
    port: 5432,
    user: 'postgres',
    password: 'postgres',
    database: 'database_name',
  });

  const topic = await client.provideTopic('order.created');
  const subscription = await client.provideSubscription(topic, 'order.created.inventory_check');

  await client.subscribe<Order>(subscription, async message => {
    // 💥🚀
  });
})();
```

## TODO/Ideas

1. Deadletter
2. Message ordering
3. Optional removing messages from db
4. Parameterized messages ordering / priority
5. Testcontainers
