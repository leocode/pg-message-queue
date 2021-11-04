create schema queue;

set
search_path TO queue;

create type message_state as enum ('published', 'processed', 'processing_error');

create table topics
(
    topic_id   uuid                    not null
        constraint topics_pk
            primary key,
    topic_name varchar(128)            not null,
    created_at timestamp default now() not null
);

create unique index topics_topic_id_uindex
    on topics (topic_id);

create table messages
(
    message_id      uuid                    not null
        constraint message_pk
            primary key,
    topic_id        uuid                    not null,
    created_at      timestamp default now() not null,
    last_updated_at timestamp,
    message_data    json                    not null
);

create unique index message_message_id_uindex
    on messages (message_id);

create table subscriptions
(
    subscription_id uuid                    not null
        constraint subscriptions_pk
            primary key,
    name            varchar(128)            not null,
    topic_id        uuid                    not null
        constraint subscriptions_topics_fk
            references topics
            on update restrict on delete restrict,
    created_at      timestamp default now() not null
);

create unique index subscriptions_subscription_id_uindex
    on subscriptions (subscription_id);

create table subscriptions_messages
(
    id              uuid not null
        constraint subscriptions_messages_pk
            primary key,
    subscription_id uuid not null,
    message_id      uuid not null,
    message_state   message_state default 'published'::message_state not null
);

create unique index subscriptions_messages_id_uindex
    on subscriptions_messages (id);