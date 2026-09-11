import { Migration } from '@mikro-orm/migrations';

export class Migration20260929000000_disputes extends Migration {
  override async up(): Promise<void> {
    this.addSql(`
      create table "disputes" (
        "id" uuid not null,
        "shop_id" uuid not null,
        "order_id" uuid not null,
        "buyer_phone" varchar(20) not null,
        "reason" varchar(20) not null,
        "description" text not null,
        "status" varchar(20) not null default 'open',
        "seller_response" text null,
        "resolution" varchar(12) null,
        "resolution_note" text null,
        "escalation_note" text null,
        "admin_note" text null,
        "created_at" timestamptz not null,
        "updated_at" timestamptz not null,
        "escalated_at" timestamptz null,
        "closed_at" timestamptz null,
        constraint "disputes_pkey" primary key ("id")
      );
    `);
    this.addSql(`create index "disputes_shop_id_status_index" on "disputes" ("shop_id", "status");`);
    this.addSql(`create index "disputes_order_id_index" on "disputes" ("order_id");`);
  }

  override async down(): Promise<void> {
    this.addSql(`drop table if exists "disputes";`);
  }
}
