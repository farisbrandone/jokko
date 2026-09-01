import { Migration } from '@mikro-orm/migrations';

export class Migration20260907000000_shop_brand extends Migration {
  override async up(): Promise<void> {
    this.addSql(`alter table "shops" add column "brand_color" varchar(7) null;`);
  }

  override async down(): Promise<void> {
    this.addSql(`alter table "shops" drop column "brand_color";`);
  }
}
