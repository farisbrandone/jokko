import { Migration } from '@mikro-orm/migrations';

export class Migration20260919000000_shop_directory extends Migration {
  override async up(): Promise<void> {
    this.addSql(
      `alter table "shops" add column "listed" boolean not null default false;`,
    );
    this.addSql(`alter table "shops" add column "tagline" varchar(140) null;`);
    this.addSql(
      `create index "shops_listed_idx" on "shops" ("listed") where "listed" = true;`,
    );
  }

  override async down(): Promise<void> {
    this.addSql(`drop index if exists "shops_listed_idx";`);
    this.addSql(`alter table "shops" drop column "tagline";`);
    this.addSql(`alter table "shops" drop column "listed";`);
  }
}
