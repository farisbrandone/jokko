import { Migration } from '@mikro-orm/migrations';

export class Migration20260915000000_webauthn extends Migration {
  override async up(): Promise<void> {
    this.addSql(`
      create table "webauthn_credentials" (
        "id" uuid not null default gen_random_uuid(),
        "user_id" uuid not null references "users" ("id") on delete cascade,
        "credential_id" text not null,
        "public_key" text not null,
        "counter" bigint not null default 0,
        -- le compteur WebAuthn tient sur 32 bits ; bigint par prudence, lu comme number côté app
        "transports" jsonb not null default '[]',
        "device_name" varchar(120) null,
        "created_at" timestamptz not null default now(),
        "last_used_at" timestamptz null,
        constraint "webauthn_credentials_pkey" primary key ("id")
      );
    `);
    this.addSql(
      `create unique index "webauthn_credentials_cred_uq" on "webauthn_credentials" ("credential_id");`,
    );
    this.addSql(
      `create index "webauthn_credentials_user_idx" on "webauthn_credentials" ("user_id");`,
    );
  }

  override async down(): Promise<void> {
    this.addSql(`drop table if exists "webauthn_credentials" cascade;`);
  }
}
