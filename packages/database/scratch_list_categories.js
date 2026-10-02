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
const lines = fs.readFileSync(csvPath, 'utf8').split(/\r?\n/).filter(l => l.trim().length > 0);
const headers = parseCSVLine(lines[0]);
const catIdx = headers.indexOf('category');
const subcatIdx = headers.indexOf('subcategory');

const catMap = {};
for (let i = 1; i < lines.length; i++) {
  const cols = parseCSVLine(lines[i]);
  const cat = cols[catIdx] || 'Other';
  const sub = cols[subcatIdx] || 'General';
  if (!catMap[cat]) catMap[cat] = new Set();
  catMap[cat].add(sub);
}

const sorted = Object.entries(catMap).sort((a,b) => a[0].localeCompare(b[0]));
console.log('Total Categories:', sorted.length);
sorted.forEach(([cat, subs]) => {
  console.log(`- ${cat} (${subs.size} subcats): ${Array.from(subs).slice(0, 5).join(', ')}`);
});
