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

async function main() {
  for (const s of SHOPS) {
    await prisma.user.upsert({
      where: { id: s.ownerId },
      create: { id: s.ownerId, email: s.ownerEmail, name: s.ownerName, role: 'SHOP_OWNER' },
      update: { role: 'SHOP_OWNER' },
    });

    await prisma.shop.upsert({
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
    console.log(`✓ ${s.name} (ACTIVE)`);
  }
  console.log(`\nSeeded ${SHOPS.length} ACTIVE shops.`);
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
