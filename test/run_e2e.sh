#!/bin/sh

docker-compose up --remove-orphans -d db

docker-compose build test

docker-compose run -d test node dist/test/e2e/subscriber.js

npm run test:e2e

docker-compose down test