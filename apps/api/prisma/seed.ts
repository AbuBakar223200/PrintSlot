import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;
  const adminEmail = process.env.ADMIN_EMAIL;
  const adminPassword = process.env.ADMIN_PASSWORD;

  if (!supabaseUrl) throw new Error('Missing env: SUPABASE_URL');
  if (!supabaseServiceKey) throw new Error('Missing env: SUPABASE_SERVICE_KEY');
  if (!adminEmail) throw new Error('Missing env: ADMIN_EMAIL');
  if (!adminPassword) throw new Error('Missing env: ADMIN_PASSWORD');

  const supabase = createClient(supabaseUrl, supabaseServiceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  // ── 1. Ensure order_number_seq exists (backup for envs where migration hasn't run yet)
  await prisma.$executeRawUnsafe(
    `CREATE SEQUENCE IF NOT EXISTS order_number_seq START 1;`,
  );
  console.log('✓ order_number_seq exists');

  // ── 2. Upsert Platform Admin in Supabase Auth
  let supabaseUserId: string;

  const { data: listData, error: listError } =
    await supabase.auth.admin.listUsers();
  if (listError) throw new Error(`Supabase listUsers failed: ${listError.message}`);

  const existing = listData.users.find((u) => u.email === adminEmail);

  if (existing) {
    supabaseUserId = existing.id;
    console.log(`✓ Platform Admin already in Supabase Auth (id=${supabaseUserId})`);
  } else {
    const { data: created, error: createError } =
      await supabase.auth.admin.createUser({
        email: adminEmail,
        password: adminPassword,
        email_confirm: true,
      });
    if (createError) throw new Error(`Supabase createUser failed: ${createError.message}`);
    supabaseUserId = created.user.id;
    console.log(`✓ Platform Admin created in Supabase Auth (id=${supabaseUserId})`);
  }

  // ── 3. Mirror User row in our DB (upsert — safe to run twice)
  await prisma.user.upsert({
    where: { id: supabaseUserId },
    create: {
      id: supabaseUserId,
      email: adminEmail,
      name: 'Platform Admin',
      role: 'PLATFORM_ADMIN',
    },
    update: {
      // do not overwrite name/email if admin updated them
    },
  });
  console.log('✓ Platform Admin User row upserted in DB');

  // ── 4. Upsert AppConfig defaults (update:{} = no-op if value was changed by admin)
  await prisma.appConfig.upsert({
    where: { key: 'LOW_BALANCE_THRESHOLD' },
    create: { key: 'LOW_BALANCE_THRESHOLD', value: '50' },
    update: {},
  });

  await prisma.appConfig.upsert({
    where: { key: 'SLOT_DURATION_MINS' },
    create: { key: 'SLOT_DURATION_MINS', value: '30' },
    update: {},
  });
  console.log('✓ AppConfig defaults seeded (LOW_BALANCE_THRESHOLD=50, SLOT_DURATION_MINS=30)');
}

main()
  .then(async () => {
    await prisma.$disconnect();
    console.log('\nSeed complete.');
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
