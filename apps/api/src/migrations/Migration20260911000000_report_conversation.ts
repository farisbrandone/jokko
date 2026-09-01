import { Migration } from '@mikro-orm/migrations';

export class Migration20260911000000_report_conversation extends Migration {
  override async up(): Promise<void> {
    // « conversation » (12 car.) ne rentre pas dans varchar(10).
    this.addSql(`alter table "content_reports" alter column "target_type" type varchar(16);`);
  }

  override async down(): Promise<void> {
    this.addSql(`alter table "content_reports" alter column "target_type" type varchar(10);`);
  }
}
