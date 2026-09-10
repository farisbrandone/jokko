import { Migration } from '@mikro-orm/migrations';

export class Migration20260921000000_shop_categories extends Migration {
  override async up(): Promise<void> {
    this.addSql(
      `alter table "shops" add column "categories" jsonb not null default '[]'::jsonb;`,
    );
  }

  override async down(): Promise<void> {
    this.addSql(`alter table "shops" drop column "categories";`);
  }
}
