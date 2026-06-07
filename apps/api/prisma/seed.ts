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
    await supabase.auth.admin.updateUserById(supabaseUserId, { password: adminPassword });
    console.log(`✓ Platform Admin already in Supabase Auth (id=${supabaseUserId}) - Password updated`);
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

  // ── 5. Create test Customer in Supabase Auth + DB
  const testCustomerEmail = 'customer@printslot.com';
  const testCustomerPassword = 'Customer123';
  let customerId: string;

  const existingCustomer = listData.users.find((u) => u.email === testCustomerEmail);
  if (existingCustomer) {
    customerId = existingCustomer.id;
    await supabase.auth.admin.updateUserById(customerId, { password: testCustomerPassword });
    console.log(`✓ Test Customer already exists (id=${customerId}) — password reset`);
  } else {
    const { data: createdCustomer, error: custErr } =
      await supabase.auth.admin.createUser({
        email: testCustomerEmail,
        password: testCustomerPassword,
        email_confirm: true,
      });
    if (custErr) throw new Error(`Customer createUser failed: ${custErr.message}`);
    customerId = createdCustomer.user.id;
    console.log(`✓ Test Customer created (id=${customerId})`);
  }

  await prisma.user.upsert({
    where: { id: customerId },
    create: { id: customerId, email: testCustomerEmail, name: 'Test Customer', role: 'CUSTOMER' },
    update: {},
  });
  console.log('✓ Test Customer User row upserted');

  // ── 6. Create test Shop Owner in Supabase Auth + DB
  const testOwnerEmail = 'owner@printslot.com';
  const testOwnerPassword = 'Owner123';
  let ownerId: string;

  const existingOwner = listData.users.find((u) => u.email === testOwnerEmail);
  if (existingOwner) {
    ownerId = existingOwner.id;
    await supabase.auth.admin.updateUserById(ownerId, { password: testOwnerPassword });
    console.log(`✓ Test Shop Owner already exists (id=${ownerId}) — password reset`);
  } else {
    const { data: createdOwner, error: ownerErr } =
      await supabase.auth.admin.createUser({
        email: testOwnerEmail,
        password: testOwnerPassword,
        email_confirm: true,
      });
    if (ownerErr) throw new Error(`Owner createUser failed: ${ownerErr.message}`);
    ownerId = createdOwner.user.id;
    console.log(`✓ Test Shop Owner created (id=${ownerId})`);
  }

  await prisma.user.upsert({
    where: { id: ownerId },
    create: { id: ownerId, email: testOwnerEmail, name: 'Test Shop Owner', role: 'SHOP_OWNER' },
    update: {},
  });
  console.log('✓ Test Shop Owner User row upserted');

  // ── 7. Create Active Shop
  const shop = await prisma.shop.upsert({
    where: { ownerId },
    create: {
      ownerId,
      name: 'Campus Print Hub',
      address: 'Dhaka University Campus, Gate 4',
      phone: '+8801711000000',
      status: 'ACTIVE',
      colorRate: 2.0,
      bwRate: 1.0,
      a3Surcharge: 0.5,
      duplexDiscount: 0.2,
      defaultProcessingMins: 15,
    },
    update: {},
  });
  console.log(`✓ Active Shop upserted (id=${shop.id})`);

  // ── 8. Create Slot Template (09:00–17:00 all-day window)
  let template = await prisma.slotTemplate.findFirst({
    where: { startTime: '09:00', endTime: '23:59', deletedAt: null },
  });
  if (!template) {
    template = await prisma.slotTemplate.create({
      data: { startTime: '09:00', endTime: '23:59' },
    });
    console.log(`✓ Slot Template created (id=${template.id})`);
  } else {
    console.log(`✓ Slot Template already exists (id=${template.id})`);
  }

  // ── 9. Create open ShopSlot for today (BST)
  const bstOffsetMs = 6 * 60 * 60 * 1000;
  const bstNow = new Date(Date.now() + bstOffsetMs);
  const todayStr = bstNow.toISOString().slice(0, 10);
  const todayDate = new Date(`${todayStr}T00:00:00.000Z`);

  const slot = await prisma.shopSlot.upsert({
    where: {
      shopId_templateId_date: {
        shopId: shop.id,
        templateId: template.id,
        date: todayDate,
      },
    },
    create: {
      shopId: shop.id,
      templateId: template.id,
      date: todayDate,
      isOpen: true,
      maxOrders: 50,
    },
    update: { isOpen: true },
  });
  console.log(`✓ Today's ShopSlot upserted (id=${slot.id}, date=${todayStr})`);

  // ── 10. Top up customer wallet with 500 BDT for testing
  const existingTopup = await prisma.walletTransaction.findFirst({
    where: { userId: customerId, reason: 'TOPUP_ADMIN' },
  });
  if (!existingTopup) {
    await prisma.walletTransaction.create({
      data: {
        userId: customerId,
        type: 'CREDIT',
        amount: 500,
        reason: 'TOPUP_ADMIN',
      },
    });
    console.log('✓ Customer wallet topped up with 500 BDT');
  } else {
    console.log('✓ Customer wallet already has a topup');
  }

  console.log('\n── Test Credentials ──');
  console.log(`Customer: ${testCustomerEmail} / ${testCustomerPassword}`);
  console.log(`Owner:    ${testOwnerEmail} / ${testOwnerPassword}`);
  console.log(`Admin:    ${adminEmail} / ${adminPassword}`);
  console.log(`Shop ID:  ${shop.id}`);
  console.log(`Shop ID:  ${shop.id}`);
  console.log(`Slot ID:  ${slot.id}`);
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
