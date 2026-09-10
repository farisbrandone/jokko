import { Migration } from '@mikro-orm/migrations';

export class Migration20260923000000_shop_delivery_zones extends Migration {
  override async up(): Promise<void> {
    this.addSql(
      `alter table "shops" add column "delivery_zones" jsonb not null default '[]'::jsonb;`,
    );
  }

  override async down(): Promise<void> {
    this.addSql(`alter table "shops" drop column "delivery_zones";`);
  }
}
