import { Migration } from '@mikro-orm/migrations';

export class Migration20260909000000_push extends Migration {
  override async up(): Promise<void> {
    this.addSql(
      `alter table "notification_settings" add column "push_enabled" boolean not null default true;`,
    );

    // Registre d'abonnements Web Push, clé = utilisateur (pas de RLS boutique).
    this.addSql(`
      create table "push_subscriptions" (
        "id" uuid not null default gen_random_uuid(),
        "user_id" uuid not null,
        "endpoint" text not null,
        "p256dh" text not null,
        "auth" text not null,
        "user_agent" varchar(255) null,
        "created_at" timestamptz not null default now(),
        constraint "push_subscriptions_pkey" primary key ("id"),
        constraint "push_subscriptions_endpoint_uniq" unique ("endpoint")
      );
    `);
    this.addSql(
      `create index "push_subscriptions_user_idx" on "push_subscriptions" ("user_id");`,
    );
  }

  override async down(): Promise<void> {
    this.addSql(`drop table if exists "push_subscriptions" cascade;`);
    this.addSql(`alter table "notification_settings" drop column "push_enabled";`);
  }
}
