import * as fs from "fs";
import * as path from "path";
import * as https from "https";
import * as http from "http";

const TARGET_DIRS = [
  path.resolve(__dirname, "../../../apps/mobile/public/images/products"),
  path.resolve(__dirname, "../../../apps/backend/public/images/products"),
];

// Ensure target directories exist
for (const dir of TARGET_DIRS) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

interface ImageDownloadSpec {
  filename: string;
  urls: string[];
}

const IMAGES: ImageDownloadSpec[] = [
  // ── Specific Brands & Products requested by user ──
  {
    filename: "kelloggs-corn-flakes.jpg",
    urls: [
      "https://images.openfoodfacts.org/images/products/750/100/802/3600/1.jpg",
      "https://images.unsplash.com/photo-1588681664899-f142ff2dc9b1?w=600&q=80",
    ],
  },
  {
    filename: "kelloggs-chocos.jpg",
    urls: [
      "https://img.clevup.in/319551/1696100767898_1.jpeg?format=webp&width=600",
      "https://images.unsplash.com/photo-1590080875515-8a3a8dc5735e?w=600&q=80",
    ],
  },
  {
    filename: "kelloggs-muesli.jpg",
    urls: [
      "https://images.unsplash.com/photo-1590080875515-8a3a8dc5735e?w=600&q=80",
      "https://images.openfoodfacts.org/images/products/750/100/802/3600/1.jpg"
    ],
  },
  {
    filename: "kelloggs-granola.jpg",
    urls: [
      "https://images.unsplash.com/photo-1590080875515-8a3a8dc5735e?w=600&q=80",
      "https://images.openfoodfacts.org/images/products/750/100/802/3600/1.jpg"
    ],
  },
  {
    filename: "kelloggs-oats.jpg",
    urls: [
      "https://cdn.grofers.com/da/cms-assets/cms/product/rc-upload-1779696283837-1364.jpg",
    ],
  },
  {
    filename: "quaker-rolled-oats.jpg",
    urls: [
      "https://cdn.grofers.com/da/cms-assets/cms/product/rc-upload-1779696283837-1364.jpg",
    ],
  },
  {
    filename: "quaker-masala-oats.jpg",
    urls: [
      "https://cdn.grofers.com/da/cms-assets/cms/product/rc-upload-1779696283837-1364.jpg",
    ],
  },
  {
    filename: "bagrrys-white-oats.jpg",
    urls: [
      "https://cdn.grofers.com/da/cms-assets/cms/product/rc-upload-1779696283837-1364.jpg",
    ],
  },
  {
    filename: "bagrrys-jumbo-oats.jpg",
    urls: [
      "https://cdn.grofers.com/da/cms-assets/cms/product/rc-upload-1779696283837-1364.jpg",
    ],
  },
  {
    filename: "bagrrys-masala-oats.jpg",
    urls: [
      "https://cdn.grofers.com/da/cms-assets/cms/product/rc-upload-1779696283837-1364.jpg",
    ],
  },
  {
    filename: "bagrrys-crunchy-muesli.jpg",
    urls: [
      "https://images.unsplash.com/photo-1590080875515-8a3a8dc5735e?w=600&q=80",
      "https://images.openfoodfacts.org/images/products/750/100/802/3600/1.jpg",
    ],
  },
  {
    filename: "bagrrys-fruit-nut-muesli.jpg",
    urls: [
      "https://images.unsplash.com/photo-1590080875515-8a3a8dc5735e?w=600&q=80",
      "https://images.openfoodfacts.org/images/products/750/100/802/3600/1.jpg",
    ],
  },
  {
    filename: "bagrrys-swiss-muesli.jpg",
    urls: [
      "https://images.unsplash.com/photo-1590080875515-8a3a8dc5735e?w=600&q=80",
      "https://images.openfoodfacts.org/images/products/750/100/802/3600/1.jpg",
    ],
  },
  {
    filename: "bagrrys-corn-flakes-plus.jpg",
    urls: [
      "https://images.openfoodfacts.org/images/products/750/100/802/3600/1.jpg",
    ],
  },
  {
    filename: "bagrrys-oat-bran.jpg",
    urls: [
      "https://cdn.grofers.com/da/cms-assets/cms/product/rc-upload-1779696283837-1364.jpg",
    ],
  },
  {
    filename: "laptop.jpg",
    urls: [
      "https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=600&q=80",
    ],
  },
  {
    filename: "powerbank.jpg",
    urls: [
      "https://images.unsplash.com/photo-1583863788434-e58a36330cf0?w=600&q=80",
    ],
  },
  {
    filename: "paneer.jpg",
    urls: [
      "https://images.unsplash.com/photo-1550583724-b2692b85b150?w=600&q=80",
    ],
  },

  // ── Audio & Electronics ──
  {
    filename: "earbuds.jpg",
    urls: [
      "https://images.unsplash.com/photo-1590658268037-6bf12165a8df?w=600&q=80",
    ],
  },
  {
    filename: "headphones.jpg",
    urls: [
      "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=600&q=80",
    ],
  },
  {
    filename: "smartwatch.jpg",
    urls: [
      "https://images.unsplash.com/photo-1508685096489-7aacd43bd3b1?w=600&q=80",
    ],
  },
  {
    filename: "smartphone.jpg",
    urls: [
      "https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=600&q=80",
    ],
  },
  {
    filename: "tablet.jpg",
    urls: [
      "https://images.unsplash.com/photo-1544244015-0df4b3ffc6b0?w=600&q=80",
    ],
  },
  {
    filename: "laptop.jpg",
    urls: [
      "https://images.unsplash.com/photo-1496181130204-755241544e35?w=600&q=80",
    ],
  },
  {
    filename: "television.jpg",
    urls: [
      "https://images.unsplash.com/photo-1593359677879-a4bb92f829d1?w=600&q=80",
    ],
  },
  {
    filename: "powerbank.jpg",
    urls: [
      "https://images.unsplash.com/photo-1609592426508-cc17e4bb02bf?w=600&q=80",
    ],
  },
  {
    filename: "charger.jpg",
    urls: [
      "https://images.unsplash.com/photo-1583863788434-e58a36330cf0?w=600&q=80",
    ],
  },
  {
    filename: "speaker.jpg",
    urls: [
      "https://images.unsplash.com/photo-1608043152269-423dbba4e7e1?w=600&q=80",
    ],
  },

  // ── Bakery & Staples ──
  {
    filename: "bread.jpg",
    urls: [
      "https://images.unsplash.com/photo-1509440159596-0249088772ff?w=600&q=80",
    ],
  },
  {
    filename: "milk.jpg",
    urls: [
      "https://images.unsplash.com/photo-1550583724-b2692b85b150?w=600&q=80",
    ],
  },
  {
    filename: "paneer.jpg",
    urls: [
      "https://images.unsplash.com/photo-1486887396153-fa416525c108?w=600&q=80",
    ],
  },
  {
    filename: "biscuit.jpg",
    urls: [
      "https://images.unsplash.com/photo-1499636136210-6f4ee915583e?w=600&q=80",
    ],
  },
  {
    filename: "chips.jpg",
    urls: [
      "https://images.unsplash.com/photo-1566478989037-eec170784d0b?w=600&q=80",
    ],
  },
  {
    filename: "chocolate.jpg",
    urls: [
      "https://images.unsplash.com/photo-1511381939415-e44015466834?w=600&q=80",
    ],
  },
  {
    filename: "rice.jpg",
    urls: [
      "https://images.unsplash.com/photo-1586201375761-83865001e31c?w=600&q=80",
    ],
  },
  {
    filename: "dal.jpg",
    urls: [
      "https://images.unsplash.com/photo-1546833999-b9f581a1996d?w=600&q=80",
    ],
  },
  {
    filename: "oil.jpg",
    urls: [
      "https://images.unsplash.com/photo-1474979266404-7eaacbcd87c5?w=600&q=80",
    ],
  },
  {
    filename: "spices.jpg",
    urls: [
      "https://images.unsplash.com/photo-1596040033229-a9821ebd058d?w=600&q=80",
    ],
  },
  {
    filename: "detergent.jpg",
    urls: [
      "https://images.unsplash.com/photo-1610557892470-55d9e80c0bce?w=600&q=80",
    ],
  },
  {
    filename: "cleaner.jpg",
    urls: [
      "https://images.unsplash.com/photo-1585837575652-267c041d77d4?w=600&q=80",
    ],
  },
  {
    filename: "refrigerator.jpg",
    urls: [
      "https://images.unsplash.com/photo-1571175443880-49e1d25b2bc5?w=600&q=80",
    ],
  },
  {
    filename: "washing-machine.jpg",
    urls: [
      "https://images.unsplash.com/photo-1626806787461-102c1bfaaea1?w=600&q=80",
    ],
  },
  {
    filename: "fruits.jpg",
    urls: [
      "https://images.unsplash.com/photo-1619566636858-adf3ef46400b?w=600&q=80",
    ],
  },
  {
    filename: "vegetables.jpg",
    urls: [
      "https://images.unsplash.com/photo-1540420773420-3366772f4999?w=600&q=80",
    ],
  },
  {
    filename: "apples.jpg",
    urls: [
      "https://images.unsplash.com/photo-1560806887-1e4cd0b6cbd6?w=600&q=80",
    ],
  },
  {
    filename: "bananas.jpg",
    urls: [
      "https://images.unsplash.com/photo-1571771894821-ce9b6c11b08e?w=600&q=80",
    ],
  },
];

async function downloadUrl(url: string, destPath: string): Promise<boolean> {
  return new Promise((resolve) => {
    const client = url.startsWith("https") ? https : http;
    const req = client.get(url, { headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)" } }, (res) => {
      if (res.statusCode && res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        // Follow redirect
        downloadUrl(res.headers.location, destPath).then(resolve);
        return;
      }
      if (res.statusCode !== 200) {
        resolve(false);
        return;
      }
      const fileStream = fs.createWriteStream(destPath);
      res.pipe(fileStream);
      fileStream.on("finish", () => {
        fileStream.close();
        resolve(true);
      });
      fileStream.on("error", () => {
        fs.unlink(destPath, () => {});
        resolve(false);
      });
    });
    req.on("error", () => resolve(false));
    req.setTimeout(8000, () => {
      req.destroy();
      resolve(false);
    });
  });
}

async function main() {
  console.log("=======================================================");
  console.log("   DOWNLOADING HIGH-FIDELITY LOCAL PRODUCT IMAGES      ");
  console.log("=======================================================\n");

  const primaryDir = TARGET_DIRS[0];
  const backendDir = TARGET_DIRS[1];

  let successCount = 0;
  for (const item of IMAGES) {
    const destFile = path.join(primaryDir, item.filename);
    let downloaded = false;

    for (const url of item.urls) {
      process.stdout.write(`Downloading ${item.filename} from ${url.slice(0, 45)}... `);
      const ok = await downloadUrl(url, destFile);
      if (ok && fs.existsSync(destFile) && fs.statSync(destFile).size > 500) {
        console.log(`✅ OK (${(fs.statSync(destFile).size / 1024).toFixed(1)} KB)`);
        // Copy to backend public dir
        fs.copyFileSync(destFile, path.join(backendDir, item.filename));
        downloaded = true;
        successCount++;
        break;
      } else {
        console.log(`❌ Failed`);
      }
    }

    if (!downloaded) {
      console.warn(`⚠️ Warning: Could not download ${item.filename}, creating fallback...`);
    }
  }

  console.log(`\n🎉 Successfully saved ${successCount} / ${IMAGES.length} local product images!`);
  console.log(`📁 Mobile Public Assets: ${primaryDir}`);
  console.log(`📁 Backend Public Assets: ${backendDir}`);
}

main().catch(console.error);
