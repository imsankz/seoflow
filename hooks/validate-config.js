import { fileURLToPath } from 'url';
import path from 'path';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const LIB_DIR = path.join(__dirname, '..', 'lib');

async function validateConfigFile(filePath) {
  try {
    // Check if the file is seoflow.config.json
    if (path.basename(filePath) !== 'seoflow.config.json') {
      process.exit(0);
    }

    // Load the config file
    const rawConfig = fs.readFileSync(filePath, 'utf8');
    const config = JSON.parse(rawConfig);

    // Load the validator
    const { validateConfig } = await import(path.join(LIB_DIR, 'validator.js'));

    // Validate the config
    const result = validateConfig(config);

    if (!result.valid) {
      console.error('❌ Invalid seoflow.config.json');
      for (const check of result.checks) {
        if (check.status === 'error') {
          console.error(`  ${check.field}: ${check.message}`);
        } else if (check.status === 'warn') {
          console.warn(`  ⚠️ ${check.field}: ${check.message}`);
        }
      }
      process.exit(1);
    } else {
      console.log('✅ seoflow.config.json is valid');
    }
  } catch (error) {
    console.error('❌ Error validating seoflow.config.json:', error.message);
    process.exit(1);
  }
}

// Get the file path from arguments
const filePath = process.argv[2];
if (!filePath) {
  console.error('❌ No file path provided');
  process.exit(1);
}

validateConfigFile(filePath);
