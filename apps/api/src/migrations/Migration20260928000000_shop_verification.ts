import { Migration } from '@mikro-orm/migrations';

export class Migration20260928000000_shop_verification extends Migration {
  override async up(): Promise<void> {
    this.addSql(`
      alter table "shops" add column "verification" jsonb not null default '{
        "status": "none", "legalName": null, "registryNumber": null, "note": null,
        "proofImageUrl": null, "submittedAt": null, "decidedAt": null, "decisionNote": null
      }'::jsonb;
    `);
  }

  override async down(): Promise<void> {
    this.addSql(`alter table "shops" drop column "verification";`);
  }
}
