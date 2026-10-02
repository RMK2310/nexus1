require('dotenv').config({ path: require('path').join(__dirname, '../../.env') });
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const categories = [
    'Flakes',
    'Oats',
    'Chocolate Cereals',
    'Muesli',
    'Bakery',
    'Audio Equipment',
    'Smartwatches',
    'Mobile Phones',
    'Rice',
    'Pulses',
    'Beverages',
    'Snacks'
  ];

  const results = [];
  for (const catName of categories) {
    const prod = await prisma.product.findFirst({
      where: {
        OR: [
          { category: { name: { contains: catName } } },
          { title: { contains: catName } }
        ]
      },
      include: { brand: true, category: true }
    });
    if (prod) {
      results.push({
        title: prod.title,
        brand: prod.brand ? prod.brand.name : 'Generic',
        category: prod.category ? prod.category.name : catName
      });
    }
  }

  console.log(JSON.stringify(results, null, 2));
}

main().finally(() => prisma.$disconnect());
