import { Migration } from '@mikro-orm/migrations';

export class Migration20260917000000_custom_domain_verify extends Migration {
  override async up(): Promise<void> {
    this.addSql(
      `alter table "shops" add column "custom_domain_verified_at" timestamptz null;`,
    );
    this.addSql(`alter table "shops" add column "custom_domain_token" varchar(64) null;`);
  }

  override async down(): Promise<void> {
    this.addSql(`alter table "shops" drop column "custom_domain_token";`);
    this.addSql(`alter table "shops" drop column "custom_domain_verified_at";`);
  }
}
