import { Migration } from '@mikro-orm/migrations';

export class Migration20260902000000_identity_shop extends Migration {
  override async up(): Promise<void> {
    // ── Boutiques (registre des tenants — pas de RLS, résolues avant le contexte) ──
    this.addSql(`
      create table "shops" (
        "id" uuid not null,
        "slug" citext not null,
        "name" varchar(80) not null,
        "verticals" jsonb not null default '[]',
        "whatsapp" varchar(20) null,
        "theme_preset" varchar(20) not null default 'grid',
        "locale" varchar(10) not null default 'fr',
        "currency" varchar(3) not null default 'XOF',
        "custom_domain" citext null,
        "status" varchar(20) not null default 'active',
        "created_at" timestamptz not null default now(),
        "updated_at" timestamptz not null default now(),
        constraint "shops_pkey" primary key ("id")
      );
    `);
    this.addSql(`create unique index "shops_slug_uq" on "shops" ("slug");`);
    this.addSql(
      `create unique index "shops_custom_domain_uq" on "shops" ("custom_domain") where "custom_domain" is not null;`,
    );

    // ── Utilisateurs ──
    this.addSql(`
      create table "users" (
        "id" uuid not null,
        "email" citext not null,
        "name" varchar(80) not null,
        "password_hash" varchar(255) not null,
        "created_at" timestamptz not null default now(),
        "updated_at" timestamptz not null default now(),
        constraint "users_pkey" primary key ("id")
      );
    `);
    this.addSql(`create unique index "users_email_uq" on "users" ("email");`);

    // ── Appartenance à une boutique + rôle ──
    this.addSql(`
      create table "shop_memberships" (
        "id" uuid not null,
        "user_id" uuid not null references "users" ("id") on delete cascade,
        "shop_id" uuid not null references "shops" ("id") on delete cascade,
        "role" varchar(20) not null default 'viewer',
        "created_at" timestamptz not null default now(),
        constraint "shop_memberships_pkey" primary key ("id")
      );
    `);
    this.addSql(
      `create unique index "shop_memberships_user_shop_uq" on "shop_memberships" ("user_id", "shop_id");`,
    );
    this.addSql(
      `create index "shop_memberships_shop_idx" on "shop_memberships" ("shop_id");`,
    );

    // ── Sessions (refresh tokens rotatifs, révocables) ──
    this.addSql(`
      create table "auth_sessions" (
        "id" uuid not null,
        "user_id" uuid not null references "users" ("id") on delete cascade,
        "refresh_token_hash" varchar(255) not null,
        "user_agent" varchar(400) null,
        "expires_at" timestamptz not null,
        "created_at" timestamptz not null default now(),
        "revoked_at" timestamptz null,
        constraint "auth_sessions_pkey" primary key ("id")
      );
    `);
    this.addSql(
      `create unique index "auth_sessions_token_uq" on "auth_sessions" ("refresh_token_hash");`,
    );
    this.addSql(
      `create index "auth_sessions_user_idx" on "auth_sessions" ("user_id") where "revoked_at" is null;`,
    );
  }

  override async down(): Promise<void> {
    this.addSql(`drop table if exists "auth_sessions" cascade;`);
    this.addSql(`drop table if exists "shop_memberships" cascade;`);
    this.addSql(`drop table if exists "users" cascade;`);
    this.addSql(`drop table if exists "shops" cascade;`);
  }
}
