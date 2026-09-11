import { Migration } from '@mikro-orm/migrations';

export class Migration20260930000000_shop_theme_palette extends Migration {
  override async up(): Promise<void> {
    this.addSql(`alter table "shops" add column "theme_palette" varchar(20) null;`);
  }

  override async down(): Promise<void> {
    this.addSql(`alter table "shops" drop column "theme_palette";`);
  }
}
