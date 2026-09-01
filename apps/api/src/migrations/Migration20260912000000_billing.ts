import { Migration } from '@mikro-orm/migrations';

export class Migration20260912000000_billing extends Migration {
  override async up(): Promise<void> {
    this.addSql(`
      create table "subscriptions" (
        "shop_id" uuid not null,
        "plan" varchar(10) not null default 'trial',
        "status" varchar(12) not null default 'trialing',
        "current_period_end" timestamptz not null,
        "provider_ref" varchar(120) null,
        "created_at" timestamptz not null default now(),
        "updated_at" timestamptz not null default now(),
        constraint "subscriptions_pkey" primary key ("shop_id")
      );
    `);
    this.addSql(
      `create index "subscriptions_period_idx" on "subscriptions" ("status", "current_period_end");`,
    );

    this.addSql(`
      create table "billing_payments" (
        "id" uuid not null default gen_random_uuid(),
        "shop_id" uuid not null,
        "tx_ref" varchar(80) not null,
        "provider_tx_id" varchar(120) null,
        "amount" int not null,
        "currency" varchar(3) not null default 'XOF',
        "status" varchar(12) not null default 'pending',
        "created_at" timestamptz not null default now(),
        "updated_at" timestamptz not null default now(),
        constraint "billing_payments_pkey" primary key ("id"),
        constraint "billing_payments_tx_ref_uniq" unique ("tx_ref")
      );
    `);
    this.addSql(
      `create index "billing_payments_shop_idx" on "billing_payments" ("shop_id", "created_at" desc);`,
    );
  }

  override async down(): Promise<void> {
    this.addSql(`drop table if exists "billing_payments" cascade;`);
    this.addSql(`drop table if exists "subscriptions" cascade;`);
  }
}
