import 'dotenv/config';
import { PrismaClient, Prisma } from '@prisma/client';

const prisma = new PrismaClient();

// Stable ids so re-running this script is idempotent (upsert, never duplicates).
interface DevShopSeed {
  ownerId: string;
  ownerEmail: string;
  ownerName: string;
  name: string;
  address: string;
  phone: string | null;
  colorRate: number;
  bwRate: number;
  a3Surcharge: number;
  duplexDiscount: number; // multiplier: 0.8 = 20% off
  defaultProcessingMins: number;
}

const SHOPS: DevShopSeed[] = [
  {
    ownerId: '00000000-0000-4000-8000-0000000d0001',
    ownerEmail: 'owner.library@printslot.dev',
    ownerName: 'Library Print Owner',
    name: 'Campus Library Print',
    address: 'Central Library, Ground Floor, University Campus',
    phone: '+8801711000001',
    colorRate: 10,
    bwRate: 3,
    a3Surcharge: 5,
    duplexDiscount: 0.8,
    defaultProcessingMins: 15,
  },
  {
    ownerId: '00000000-0000-4000-8000-0000000d0002',
    ownerEmail: 'owner.gate@printslot.dev',
    ownerName: 'Gate Copy Owner',
    name: 'Main Gate Copy Center',
    address: 'Shop 4, Main Gate Market',
    phone: '+8801711000002',
    colorRate: 12,
    bwRate: 2,
    a3Surcharge: 6,
    duplexDiscount: 0.9,
    defaultProcessingMins: 20,
  },
  {
    ownerId: '00000000-0000-4000-8000-0000000d0003',
    ownerEmail: 'owner.hall@printslot.dev',
    ownerName: 'Hall Print Owner',
    name: 'North Hall Quick Print',
    address: 'North Residential Hall, Block C',
    phone: null,
    colorRate: 8,
    bwRate: 2.5,
    a3Surcharge: 4,
    duplexDiscount: 0.85,
    defaultProcessingMins: 10,
  },
  {
    ownerId: '00000000-0000-4000-8000-0000000d0004',
    ownerEmail: 'owner.science@printslot.dev',
    ownerName: 'Science Print Owner',
    name: 'Science Faculty Print Hub',
    address: 'Science Building, Room 12',
    phone: '+8801711000004',
    colorRate: 15,
    bwRate: 4,
    a3Surcharge: 7,
    duplexDiscount: 0.75,
    defaultProcessingMins: 25,
  },
];

const SLOT_WINDOWS = [
  { startTime: '09:00', endTime: '12:00' },
  { startTime: '12:00', endTime: '15:00' },
  { startTime: '15:00', endTime: '18:00' },
  { startTime: '18:00', endTime: '23:59' },
] as const;

function todayBstDateString(): string {
  const bstOffsetMs = 6 * 60 * 60 * 1000;
  const bstNow = new Date(Date.now() + bstOffsetMs);
  return bstNow.toISOString().slice(0, 10);
}

function addDays(dateValue: string, days: number): Date {
  const date = new Date(`${dateValue}T00:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date;
}

async function main() {
  const slotTemplates = [];

  for (const window of SLOT_WINDOWS) {
    let template = await prisma.slotTemplate.findFirst({
      where: {
        startTime: window.startTime,
        endTime: window.endTime,
        deletedAt: null,
      },
    });

    if (!template) {
      template = await prisma.slotTemplate.create({ data: window });
    }

    slotTemplates.push(template);
  }

  console.log(`Seeded ${slotTemplates.length} active SlotTemplates.`);

  const firstDate = todayBstDateString();
  const slotDates = [0, 1, 2, 3].map((offset) => addDays(firstDate, offset));

  for (const s of SHOPS) {
    await prisma.user.upsert({
      where: { id: s.ownerId },
      create: { id: s.ownerId, email: s.ownerEmail, name: s.ownerName, role: 'SHOP_OWNER' },
      update: { role: 'SHOP_OWNER' },
    });

    const shop = await prisma.shop.upsert({
      where: { ownerId: s.ownerId },
      create: {
        ownerId: s.ownerId,
        name: s.name,
        address: s.address,
        phone: s.phone,
        status: 'ACTIVE',
        colorRate: new Prisma.Decimal(s.colorRate),
        bwRate: new Prisma.Decimal(s.bwRate),
        a3Surcharge: new Prisma.Decimal(s.a3Surcharge),
        duplexDiscount: new Prisma.Decimal(s.duplexDiscount),
        defaultProcessingMins: s.defaultProcessingMins,
      },
      update: {
        name: s.name,
        address: s.address,
        phone: s.phone,
        status: 'ACTIVE',
        colorRate: new Prisma.Decimal(s.colorRate),
        bwRate: new Prisma.Decimal(s.bwRate),
        a3Surcharge: new Prisma.Decimal(s.a3Surcharge),
        duplexDiscount: new Prisma.Decimal(s.duplexDiscount),
        defaultProcessingMins: s.defaultProcessingMins,
      },
    });

    let shopSlotCount = 0;

    for (const date of slotDates) {
      for (const template of slotTemplates) {
        await prisma.shopSlot.upsert({
          where: {
            shopId_templateId_date: {
              shopId: shop.id,
              templateId: template.id,
              date,
            },
          },
          create: {
            shopId: shop.id,
            templateId: template.id,
            date,
            isOpen: true,
            maxOrders: 50,
          },
          update: {
            isOpen: true,
            maxOrders: 50,
          },
        });
        shopSlotCount += 1;
      }
    }

    console.log(`Seeded ${s.name} (ACTIVE) with ${shopSlotCount} open ShopSlots.`);
  }

  console.log(`\nSeeded ${SHOPS.length} ACTIVE shops and open ShopSlots for ${slotDates.length} dates.`);
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
