import { Migration } from '@mikro-orm/migrations';

export class Migration20260925000000_product_variants extends Migration {
  override async up(): Promise<void> {
    this.addSql(
      `alter table "catalog_products" add column "variants" jsonb not null default '[]'::jsonb;`,
    );
    this.addSql(
      `alter table "shops" add column "low_stock_threshold" integer not null default 3;`,
    );
  }

  override async down(): Promise<void> {
    this.addSql(`alter table "shops" drop column "low_stock_threshold";`);
    this.addSql(`alter table "catalog_products" drop column "variants";`);
  }
}
