const fs = require('fs');
const path = require('path');

function parseCSVLine(line) {
  const result = [];
  let current = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      result.push(current.trim());
      current = "";
    } else {
      current += char;
    }
  }
  result.push(current.trim());
  return result;
}

const csvPath = path.join(__dirname, 'NEXUS_MASTER_PRODUCT_CATALOG_COMBINED.csv');
const content = fs.readFileSync(csvPath, 'utf8');
const lines = content.split(/\r?\n/).filter(l => l.trim().length > 0);

const headers = parseCSVLine(lines[0]);
console.log('Headers:', headers);

const imgIdx = headers.indexOf('image_url');
const nameIdx = headers.indexOf('base_product_name');
const catIdx = headers.indexOf('category');
const subcatIdx = headers.indexOf('subcategory');

let withImg = 0;
let withoutImg = 0;
const sampleWith = [];
const categoryStats = {};

for (let i = 1; i < lines.length; i++) {
  const cols = parseCSVLine(lines[i]);
  const cat = cols[catIdx] || 'Unknown';
  if (!categoryStats[cat]) categoryStats[cat] = { total: 0, withImg: 0 };
  categoryStats[cat].total++;

  if (cols[imgIdx] && cols[imgIdx].startsWith('http')) {
    withImg++;
    categoryStats[cat].withImg++;
    if (sampleWith.length < 15) {
      sampleWith.push({ name: cols[nameIdx], cat: cols[catIdx], sub: cols[subcatIdx], url: cols[imgIdx] });
    }
  } else {
    withoutImg++;
  }
}

console.log('Total with http image_url:', withImg);
console.log('Total without image_url:', withoutImg);
console.log('Sample with images:', sampleWith);
console.log('Top Categories:', Object.entries(categoryStats).sort((a,b) => b[1].total - a[1].total).slice(0, 20));
