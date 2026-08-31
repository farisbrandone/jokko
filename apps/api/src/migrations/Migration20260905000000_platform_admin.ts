import { Migration } from '@mikro-orm/migrations';

export class Migration20260905000000_platform_admin extends Migration {
  override async up(): Promise<void> {
    this.addSql(
      `alter table "users" add column "is_platform_admin" boolean not null default false;`,
    );
  }

  override async down(): Promise<void> {
    this.addSql(`alter table "users" drop column "is_platform_admin";`);
  }
}
