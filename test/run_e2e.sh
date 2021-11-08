#!/bin/sh

docker-compose build app
docker-compose run app node dist/test/e2e/subscriber.js &

npm run test:e2e

docker-compose down app