FROM node:16-alpine

WORKDIR /app

COPY package.json yarn.lock ./
COPY tsconfig.*json ./

RUN yarn install

COPY src src
COPY test test

RUN ./node_modules/typescript/bin/tsc