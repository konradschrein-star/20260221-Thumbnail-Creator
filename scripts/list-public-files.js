const fs = require('fs');
const path = require('path');

const dir = path.join(process.cwd(), 'public', 'archetypes');

if (!fs.existsSync(dir)) {
  console.log(`❌ Directory not found: ${dir}`);
  process.exit(1);
}

const files = fs.readdirSync(dir);
console.log(`📂 Files in ${dir}:`);
files.forEach(file => {
  console.log(`- ${file}`);
});
