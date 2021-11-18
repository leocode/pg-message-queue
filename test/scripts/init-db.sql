CREATE SCHEMA queue;


SET search_path TO queue;


CREATE TYPE message_state AS enum ('published', 'processed', 'processing_error', 'processing_error_retry');


CREATE TABLE topics (topic_id UUID NOT NULL CONSTRAINT topics_pk PRIMARY KEY,
                     topic_name varchar(128) NOT NULL,
                     created_at TIMESTAMP DEFAULT now() NOT NULL);


CREATE UNIQUE INDEX topics_topic_id_uindex ON topics (topic_id);


CREATE TABLE messages (message_id UUID NOT NULL CONSTRAINT message_pk PRIMARY KEY,
                       topic_id UUID NOT NULL,
                       created_at TIMESTAMP DEFAULT now() NOT NULL,
                       last_updated_at TIMESTAMP,
                       message_data JSON NOT NULL,
                       priority smallint NOT NULL);


CREATE UNIQUE INDEX message_message_id_uindex ON messages (message_id);


CREATE TABLE subscriptions
(subscription_id UUID NOT NULL CONSTRAINT subscriptions_pk PRIMARY KEY,
 name varchar(128) NOT NULL,
 topic_id UUID NOT NULL CONSTRAINT subscriptions_topics_fk REFERENCES topics ON UPDATE RESTRICT ON DELETE RESTRICT,
 created_at TIMESTAMP DEFAULT now() NOT NULL);


CREATE UNIQUE INDEX subscriptions_subscription_id_uindex ON subscriptions (subscription_id);


CREATE TABLE subscriptions_messages (id UUID NOT NULL CONSTRAINT subscriptions_messages_pk PRIMARY KEY,
                                     subscription_id UUID NOT NULL,
                                     message_id UUID NOT NULL,
                                     message_state message_state DEFAULT 'published'::message_state NOT NULL,
                                     retries smallint NOT NULL DEFAULT 0,
                                     next_retry_at TIMESTAMP);


CREATE UNIQUE INDEX subscriptions_messages_id_uindex ON subscriptions_messages (id);