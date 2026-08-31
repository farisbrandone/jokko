import { existsSync } from 'node:fs';
import { Client } from 'pg';

function loadEnv(): void {
  for (const c of ['.env', '../../.env']) {
    try {
      if (existsSync(c)) process.loadEnvFile(c);
    } catch {
      /* ignore */
    }
  }
}

async function main(): Promise<void> {
  loadEnv();
  const email = process.argv[2]?.trim().toLowerCase();
  if (!email) {
    console.error('Usage : pnpm --filter @jokko/api exec tsx src/cli/make-admin.ts <email>');
    process.exit(1);
  }
  const client = new Client({
    connectionString: process.env.DATABASE_ADMIN_URL ?? process.env.DATABASE_URL,
  });
  await client.connect();
  try {
    const res = await client.query(
      `update users set is_platform_admin = true where email = $1`,
      [email],
    );
    console.log(
      res.rowCount === 1
        ? `✓ ${email} est désormais administrateur de la plateforme.`
        : `Aucun utilisateur avec l'e-mail ${email}.`,
    );
  } finally {
    await client.end();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
