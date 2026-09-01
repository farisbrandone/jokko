import { Migration } from '@mikro-orm/migrations';

export class Migration20260906000000_notifications extends Migration {
  override async up(): Promise<void> {
    // Préférences de notification par boutique (1 ligne / boutique).
    this.addSql(`
      create table "notification_settings" (
        "shop_id" uuid not null,
        "email_enabled" boolean not null default true,
        "whatsapp_enabled" boolean not null default false,
        "sms_enabled" boolean not null default false,
        "cooldown_seconds" int not null default 300,
        "updated_at" timestamptz not null default now(),
        constraint "notification_settings_pkey" primary key ("shop_id")
      );
    `);
    this.addSql(`alter table "notification_settings" enable row level security;`);
    this.addSql(`alter table "notification_settings" force row level security;`);
    this.addSql(`
      create policy "notification_settings_tenant_isolation" on "notification_settings"
        using ("shop_id" = nullif(current_setting('app.current_shop_id', true), '')::uuid)
        with check ("shop_id" = nullif(current_setting('app.current_shop_id', true), '')::uuid);
    `);

    // Journal des notifications émises → anti-spam (cooldown par conversation & canal).
    this.addSql(`
      create table "notification_dispatch_log" (
        "id" uuid not null default gen_random_uuid(),
        "shop_id" uuid not null,
        "conversation_id" uuid not null,
        "channel" varchar(10) not null,
        "sent_at" timestamptz not null default now(),
        constraint "notification_dispatch_log_pkey" primary key ("id")
      );
    `);
    this.addSql(`
      create index "notification_dispatch_log_lookup_idx" on "notification_dispatch_log"
        ("shop_id", "conversation_id", "channel", "sent_at" desc);
    `);
    this.addSql(`alter table "notification_dispatch_log" enable row level security;`);
    this.addSql(`alter table "notification_dispatch_log" force row level security;`);
    this.addSql(`
      create policy "notification_dispatch_log_tenant_isolation" on "notification_dispatch_log"
        using ("shop_id" = nullif(current_setting('app.current_shop_id', true), '')::uuid)
        with check ("shop_id" = nullif(current_setting('app.current_shop_id', true), '')::uuid);
    `);
  }

  override async down(): Promise<void> {
    this.addSql(`drop table if exists "notification_dispatch_log" cascade;`);
    this.addSql(`drop table if exists "notification_settings" cascade;`);
  }
}
