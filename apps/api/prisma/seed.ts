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

  // ── 6b. Create test Staff in Supabase Auth + DB
  const testStaffEmail = 'staff@printslot.com';
  const testStaffPassword = 'Staff123';
  let staffId: string;

  const existingStaff = listData.users.find((u) => u.email === testStaffEmail);
  if (existingStaff) {
    staffId = existingStaff.id;
    await supabase.auth.admin.updateUserById(staffId, { password: testStaffPassword });
    console.log(`✓ Test Staff already exists (id=${staffId}) — password reset`);
  } else {
    const { data: createdStaff, error: staffErr } =
      await supabase.auth.admin.createUser({
        email: testStaffEmail,
        password: testStaffPassword,
        email_confirm: true,
      });
    if (staffErr) throw new Error(`Staff createUser failed: ${staffErr.message}`);
    staffId = createdStaff.user.id;
    console.log(`✓ Test Staff created (id=${staffId})`);
  }

  await prisma.user.upsert({
    where: { id: staffId },
    create: { id: staffId, email: testStaffEmail, name: 'Test Staff', role: 'STAFF', shopId: shop.id },
    update: { role: 'STAFF', shopId: shop.id },
  });
  console.log('✓ Test Staff User row upserted');

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

  // ══════════════════════════════════════════════════════════════════════════
  //  COMPREHENSIVE DEMO DATA — gives every mobile screen real, non-empty data.
  //  Idempotent: seed-range orders (PS-9xxxx) + demo customers' txns/notifs are
  //  cleared and rebuilt each run; app-created data (PS-0xxxx) is left untouched.
  // ══════════════════════════════════════════════════════════════════════════

  // Name the primary actors to match the prototype personas.
  await prisma.user.update({
    where: { id: customerId },
    data: { name: 'Rimon Hasan', phone: '+880 1700-000042' },
  });
  await prisma.user.update({
    where: { id: staffId },
    data: { name: 'Karim Uddin', phone: '+880 1712-000111' },
  });

  // Extra walk-in customers (DB-only; never log in) for staff/owner queue variety.
  const tania = await prisma.user.upsert({
    where: { email: 'tania@demo.printslot.bd' },
    create: { email: 'tania@demo.printslot.bd', name: 'Tania Akter', phone: '+880 1815-552211', role: 'CUSTOMER' },
    update: { name: 'Tania Akter', phone: '+880 1815-552211' },
  });
  const sajid = await prisma.user.upsert({
    where: { email: 'sajid@demo.printslot.bd' },
    create: { email: 'sajid@demo.printslot.bd', name: 'Sajid Rahman', phone: '+880 1999-334455', role: 'CUSTOMER' },
    update: { name: 'Sajid Rahman', phone: '+880 1999-334455' },
  });

  // Second staff member so the owner Staff screen lists more than one row.
  await prisma.user.upsert({
    where: { email: 'nadia@demo.printslot.bd' },
    create: { email: 'nadia@demo.printslot.bd', name: 'Nadia Islam', phone: '+880 1712-000222', role: 'STAFF', shopId: shop.id },
    update: { name: 'Nadia Islam', role: 'STAFF', shopId: shop.id },
  });

  // Admin approval queue + platform analytics: shops across every status.
  const demoShops: any[] = [
    { key: 'newprint',  name: 'Newprint Gulshan',  address: '5 Gulshan Ave, Dhaka',     status: 'PENDING',   rejectionReason: null },
    { key: 'speedy',    name: 'Speedy Copy Center', address: '90 Mohakhali, Dhaka',      status: 'PENDING',   rejectionReason: null },
    { key: 'oldtown',   name: 'OldTown Printers',   address: '33 Old Dhaka, Sadarghat',  status: 'SUSPENDED', rejectionReason: 'Repeated customer complaints — under review.' },
    { key: 'ghost',     name: 'Ghost Print Co.',    address: '1 Unknown St, Dhaka',      status: 'REJECTED',  rejectionReason: 'Address could not be verified.' },
    { key: 'quickcopy', name: 'QuickCopy Express',  address: '45 Green Road, Farmgate',  status: 'ACTIVE',    rejectionReason: null },
  ];
  for (const ds of demoShops) {
    const dsOwner = await prisma.user.upsert({
      where: { email: `owner-${ds.key}@demo.printslot.bd` },
      create: { email: `owner-${ds.key}@demo.printslot.bd`, name: `${ds.name} Owner`, role: 'SHOP_OWNER' },
      update: {},
    });
    await prisma.shop.upsert({
      where: { ownerId: dsOwner.id },
      create: {
        ownerId: dsOwner.id, name: ds.name, address: ds.address, phone: '+880 1900-000000',
        status: ds.status, rejectionReason: ds.rejectionReason,
        colorRate: 10, bwRate: 3, a3Surcharge: 5, duplexDiscount: 0.85,
      },
      update: { name: ds.name, address: ds.address, status: ds.status, rejectionReason: ds.rejectionReason },
    });
  }
  console.log('✓ Demo shops (PENDING ×2 / SUSPENDED / REJECTED / ACTIVE) upserted');

  // Slot templates + today's ShopSlots for the active shop (owner Slots + wizard).
  const windows: any[] = [
    { s: '09:00', e: '09:30', open: true,  max: 10, used: 3 },
    { s: '09:30', e: '10:00', open: true,  max: 10, used: 7 },
    { s: '10:00', e: '10:30', open: true,  max: 8,  used: 8 },
    { s: '10:30', e: '11:00', open: false, max: 8,  used: 0 },
    { s: '11:00', e: '11:30', open: true,  max: 12, used: 2 },
  ];
  const slotByWindow: Record<string, string> = {};
  for (const w of windows) {
    let tpl = await prisma.slotTemplate.findFirst({ where: { startTime: w.s, endTime: w.e, deletedAt: null } });
    if (!tpl) tpl = await prisma.slotTemplate.create({ data: { startTime: w.s, endTime: w.e } });
    const ss = await prisma.shopSlot.upsert({
      where: { shopId_templateId_date: { shopId: shop.id, templateId: tpl.id, date: todayDate } },
      create: { shopId: shop.id, templateId: tpl.id, date: todayDate, isOpen: w.open, maxOrders: w.max, currentCount: w.used },
      update: { isOpen: w.open, maxOrders: w.max, currentCount: w.used },
    });
    slotByWindow[w.s] = ss.id;
  }
  console.log('✓ Slot templates + today ShopSlots seeded (some full/closed)');

  // Reset seed-range demo orders / txns / notifications (idempotent rebuild).
  const seedCustomerIds = [customerId, tania.id, sajid.id];
  await prisma.notification.deleteMany({ where: { userId: { in: seedCustomerIds } } });
  await prisma.walletTransaction.deleteMany({ where: { userId: { in: seedCustomerIds } } });
  await prisma.order.deleteMany({ where: { orderNumber: { startsWith: 'PS-9' } } });

  const minsAgo = (m: number) => new Date(Date.now() - m * 60000);
  const queueSlotId = slot.id;            // today's all-day open slot (QUEUE assignment)
  const slot1000 = slotByWindow['10:00'];
  const slot1030 = slotByWindow['10:30'];

  const demoOrders: any[] = [
    { orderNumber: 'PS-90042', customerId, pickupMode: 'QUEUE', slotId: queueSlotId, status: 'QUEUED', paymentMethod: 'WALLET', createdAt: minsAgo(20),
      colorPages: 4, bwPages: 40, totalPages: 44, totalPrice: 96, files: [
        { fileUrl: 'https://res.cloudinary.com/demo/thesis.pdf', fileName: 'thesis-chapter-3.pdf', mimeType: 'application/pdf', fileSize: 240000, detectedPages: 20, colorMode: 'BW', paperSize: 'A4', orientation: 'PORTRAIT', copies: 2, duplex: true, pageRange: '1-20', resolvedPages: 20, subtotalPrice: 64 },
        { fileUrl: 'https://res.cloudinary.com/demo/cover.pdf', fileName: 'cover-page.pdf', mimeType: 'application/pdf', fileSize: 60000, detectedPages: 2, colorMode: 'COLOR', paperSize: 'A4', orientation: 'PORTRAIT', copies: 2, duplex: false, pageRange: null, resolvedPages: 2, subtotalPrice: 32 } ] },
    { orderNumber: 'PS-90039', customerId, pickupMode: 'SLOT', slotId: slot1000, status: 'PROCESSING', paymentMethod: 'CASH', createdAt: minsAgo(65), processingStartedAt: minsAgo(8),
      colorPages: 3, bwPages: 0, totalPages: 3, totalPrice: 45, files: [
        { fileUrl: 'https://res.cloudinary.com/demo/flyer.pdf', fileName: 'flyer-design.pdf', mimeType: 'application/pdf', fileSize: 300000, detectedPages: 1, colorMode: 'COLOR', paperSize: 'A3', orientation: 'LANDSCAPE', copies: 3, duplex: false, pageRange: null, resolvedPages: 1, subtotalPrice: 45 } ] },
    { orderNumber: 'PS-90036', customerId, pickupMode: 'QUEUE', slotId: queueSlotId, status: 'READY', paymentMethod: 'WALLET', createdAt: minsAgo(120), processingStartedAt: minsAgo(40), readyAt: minsAgo(10),
      colorPages: 0, bwPages: 12, totalPages: 12, totalPrice: 24, files: [
        { fileUrl: 'https://res.cloudinary.com/demo/assignment.docx', fileName: 'assignment.docx', mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', fileSize: 90000, detectedPages: 12, colorMode: 'BW', paperSize: 'A4', orientation: 'PORTRAIT', copies: 1, duplex: false, pageRange: null, resolvedPages: 12, subtotalPrice: 24 } ] },
    { orderNumber: 'PS-90031', customerId, pickupMode: 'SLOT', slotId: slot1000, status: 'COLLECTED', paymentMethod: 'CASH', createdAt: minsAgo(300), processingStartedAt: minsAgo(280), readyAt: minsAgo(255),
      colorPages: 90, bwPages: 0, totalPages: 90, totalPrice: 150, files: [
        { fileUrl: 'https://res.cloudinary.com/demo/presentation.pptx', fileName: 'presentation.pptx', mimeType: 'application/vnd.openxmlformats-officedocument.presentationml.presentation', fileSize: 500000, detectedPages: 18, colorMode: 'COLOR', paperSize: 'A4', orientation: 'LANDSCAPE', copies: 5, duplex: false, pageRange: null, resolvedPages: 18, subtotalPrice: 150 } ] },
    { orderNumber: 'PS-90030', customerId: tania.id, pickupMode: 'QUEUE', slotId: queueSlotId, status: 'COLLECTED', paymentMethod: 'WALLET', createdAt: minsAgo(420), processingStartedAt: minsAgo(400), readyAt: minsAgo(372),
      colorPages: 0, bwPages: 40, totalPages: 40, totalPrice: 80, files: [
        { fileUrl: 'https://res.cloudinary.com/demo/handout.pdf', fileName: 'handout.pdf', mimeType: 'application/pdf', fileSize: 150000, detectedPages: 40, colorMode: 'BW', paperSize: 'A4', orientation: 'PORTRAIT', copies: 1, duplex: false, pageRange: null, resolvedPages: 40, subtotalPrice: 80 } ] },
    { orderNumber: 'PS-90028', customerId, pickupMode: 'QUEUE', slotId: queueSlotId, status: 'CANCELLED', paymentMethod: 'WALLET', createdAt: minsAgo(2000), cancelledAt: minsAgo(1990),
      colorPages: 0, bwPages: 9, totalPages: 9, totalPrice: 18, files: [
        { fileUrl: 'https://res.cloudinary.com/demo/receipt.jpg', fileName: 'receipt-scan.jpg', mimeType: 'image/jpeg', fileSize: 120000, detectedPages: 3, colorMode: 'BW', paperSize: 'A4', orientation: 'PORTRAIT', copies: 3, duplex: false, pageRange: null, resolvedPages: 3, subtotalPrice: 18 } ] },
    { orderNumber: 'PS-90044', customerId: tania.id, pickupMode: 'SLOT', slotId: slot1030, status: 'SCHEDULED', paymentMethod: 'WALLET', createdAt: minsAgo(35),
      colorPages: 0, bwPages: 60, totalPages: 60, totalPrice: 72, files: [
        { fileUrl: 'https://res.cloudinary.com/demo/lecture.pdf', fileName: 'lecture-notes.pdf', mimeType: 'application/pdf', fileSize: 200000, detectedPages: 30, colorMode: 'BW', paperSize: 'A4', orientation: 'PORTRAIT', copies: 2, duplex: true, pageRange: '1-30', resolvedPages: 30, subtotalPrice: 72 } ] },
    { orderNumber: 'PS-90045', customerId: sajid.id, pickupMode: 'QUEUE', slotId: queueSlotId, status: 'QUEUED', paymentMethod: 'CASH', createdAt: minsAgo(5),
      colorPages: 0, bwPages: 15, totalPages: 15, totalPrice: 30, files: [
        { fileUrl: 'https://res.cloudinary.com/demo/appform.pdf', fileName: 'application-form.pdf', mimeType: 'application/pdf', fileSize: 80000, detectedPages: 15, colorMode: 'BW', paperSize: 'A4', orientation: 'PORTRAIT', copies: 1, duplex: false, pageRange: null, resolvedPages: 15, subtotalPrice: 30 } ] },
  ];

  const orderIdByNumber: Record<string, string> = {};
  for (const o of demoOrders) {
    const { files, ...rest } = o;
    const created = await prisma.order.create({
      data: { ...rest, shopId: shop.id, orderFiles: { create: files } },
    });
    orderIdByNumber[o.orderNumber] = created.id;
  }
  console.log(`✓ ${demoOrders.length} demo orders (all 6 statuses, 3 customers) created at the active shop`);

  // Wallet ledger for Rimon — credits + debits (balance ≈ ৳648).
  await prisma.walletTransaction.createMany({
    data: [
      { userId: customerId, type: 'CREDIT', amount: 500, reason: 'TOPUP_ADMIN',   createdAt: minsAgo(4000) },
      { userId: customerId, type: 'CREDIT', amount: 200, reason: 'TOPUP_ADMIN',   createdAt: minsAgo(180) },
      { userId: customerId, type: 'DEBIT',  amount: 96,  reason: 'ORDER_PAYMENT', orderId: orderIdByNumber['PS-90042'], createdAt: minsAgo(20) },
      { userId: customerId, type: 'DEBIT',  amount: 24,  reason: 'ORDER_PAYMENT', orderId: orderIdByNumber['PS-90036'], createdAt: minsAgo(120) },
      { userId: customerId, type: 'CREDIT', amount: 18,  reason: 'ORDER_REFUND',  orderId: orderIdByNumber['PS-90028'], createdAt: minsAgo(1985) },
      { userId: customerId, type: 'CREDIT', amount: 50,  reason: 'TOPUP_GATEWAY', createdAt: minsAgo(2880) },
    ],
  });
  console.log('✓ Wallet transactions seeded for customer');

  // Notifications for Rimon (mix of read / unread).
  await prisma.notification.createMany({
    data: [
      { userId: customerId, type: 'ORDER_READY',     title: 'Order ready for pickup', body: 'Order PS-90036 is ready at the counter.', read: false, orderId: orderIdByNumber['PS-90036'], createdAt: minsAgo(10) },
      { userId: customerId, type: 'WALLET_DEDUCTED',  title: 'Payment deducted',       body: '৳96 debited for your order.',            read: false, orderId: orderIdByNumber['PS-90042'], createdAt: minsAgo(20) },
      { userId: customerId, type: 'ORDER_PLACED',     title: 'Order placed',           body: 'Order PS-90042 is now in the queue.',     read: false, orderId: orderIdByNumber['PS-90042'], createdAt: minsAgo(20) },
      { userId: customerId, type: 'LOW_BALANCE',      title: 'Low wallet balance',     body: 'Balance dropped below the threshold.',    read: true,  createdAt: minsAgo(19) },
      { userId: customerId, type: 'ORDER_ACCEPTED',   title: 'Order accepted',         body: 'Order PS-90039 is being processed.',      read: true,  orderId: orderIdByNumber['PS-90039'], createdAt: minsAgo(64) },
    ],
  });
  console.log('✓ Notifications seeded (3 unread)');

  console.log('\n── Test Credentials ──');
  console.log(`Customer: ${testCustomerEmail} / ${testCustomerPassword}`);
  console.log(`Owner:    ${testOwnerEmail} / ${testOwnerPassword}`);
  console.log(`Staff:    ${testStaffEmail} / ${testStaffPassword}`);
  console.log(`Admin:    ${adminEmail} / ${adminPassword}`);
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
