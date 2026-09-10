import { Migration } from '@mikro-orm/migrations';

export class Migration20260922000000_shop_appearance extends Migration {
  override async up(): Promise<void> {
    this.addSql(`alter table "shops" add column "hero_title" varchar(80) null;`);
    this.addSql(`alter table "shops" add column "hero_subtitle" varchar(160) null;`);
    this.addSql(`alter table "shops" add column "hero_image_url" varchar(600) null;`);
    this.addSql(`alter table "shops" add column "accent_color" varchar(7) null;`);
    this.addSql(`alter table "shops" add column "announcement" varchar(160) null;`);
  }

  override async down(): Promise<void> {
    this.addSql(`alter table "shops" drop column "announcement";`);
    this.addSql(`alter table "shops" drop column "accent_color";`);
    this.addSql(`alter table "shops" drop column "hero_image_url";`);
    this.addSql(`alter table "shops" drop column "hero_subtitle";`);
    this.addSql(`alter table "shops" drop column "hero_title";`);
  }
}
