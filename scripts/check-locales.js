import fs from 'fs';
import path from 'path';

// Parse language files in src/locales/
const localesDir = path.resolve(process.cwd(), 'src/locales');
const files = fs.readdirSync(localesDir).filter(f => f.endsWith('.ts') && f !== 'types.ts' && f !== 'index.ts');

function extractKeys(filePath) {
  const content = fs.readFileSync(filePath, 'utf-8');
  const matches = [...content.matchAll(/['"]([a-zA-Z0-9._-]+)['"]\s*:/g)];
  return new Set(matches.map(m => m[1]));
}

const enKeys = extractKeys(path.join(localesDir, 'en.ts'));
console.log(`Found ${enKeys.size} translation keys in en.ts\n`);

let hasError = false;

for (const file of files) {
  if (file === 'en.ts') continue;
  const langKeys = extractKeys(path.join(localesDir, file));
  const missing = [...enKeys].filter(k => !langKeys.has(k));
  if (missing.length > 0) {
    console.error(`❌ ${file} is missing ${missing.length} keys:`, missing.join(', '));
    hasError = true;
  } else {
    console.log(`✅ ${file}: 100% complete (${langKeys.size}/${enKeys.size} keys)`);
  }
}

if (hasError) {
  process.exit(1);
} else {
  console.log('\nAll 16 languages verified successfully!');
}
