import { Migration } from '@mikro-orm/migrations';

export class Migration20260924000000_order_delivery extends Migration {
  override async up(): Promise<void> {
    this.addSql(
      `alter table "orders" add column "payment_method" varchar(20) not null default 'online';`,
    );
    this.addSql(
      `alter table "orders" add column "delivery_method" varchar(12) not null default 'pickup';`,
    );
    this.addSql(`alter table "orders" add column "delivery_zone_label" varchar(60) null;`);
    this.addSql(
      `alter table "orders" add column "delivery_fee" integer not null default 0;`,
    );
    this.addSql(`alter table "orders" add column "delivery_address" varchar(600) null;`);
    this.addSql(`alter table "orders" add column "delivered_at" timestamptz null;`);
  }

  override async down(): Promise<void> {
    this.addSql(`alter table "orders" drop column "delivered_at";`);
    this.addSql(`alter table "orders" drop column "delivery_address";`);
    this.addSql(`alter table "orders" drop column "delivery_fee";`);
    this.addSql(`alter table "orders" drop column "delivery_zone_label";`);
    this.addSql(`alter table "orders" drop column "delivery_method";`);
    this.addSql(`alter table "orders" drop column "payment_method";`);
  }
}
