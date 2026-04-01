import { execSync } from 'child_process';
import { readFileSync, writeFileSync } from 'fs';
import { dirname, resolve } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const pkgPath = resolve(__dirname, '../package.json');

const releaseType = process.argv[2];

if (!['patch', 'minor', 'major'].includes(releaseType)) {
  console.error('Usage: node scripts/release.js [patch|minor|major]');
  console.error('');
  console.error('  patch  - bug fixes (1.0.0 -> 1.0.1)');
  console.error('  minor  - new features (1.0.0 -> 1.1.0)');
  console.error('  major  - breaking changes (1.0.0 -> 2.0.0)');
  process.exit(1);
}

try {
  const status = execSync('git status --porcelain').toString().trim();

  if (status) {
    console.error('Error: You have uncommitted changes. Please commit or stash them first.');
    console.error(status);
    process.exit(1);
  }
} catch {
  console.error('Error: Not a git repository or git not available.');
  process.exit(1);
}

const pkg = JSON.parse(readFileSync(pkgPath, 'utf-8'));
const currentVersion = pkg.version;

const parts = currentVersion.split('.').map(Number);

if (releaseType === 'major') {
  parts[0] += 1;
  parts[1] = 0;
  parts[2] = 0;
} else if (releaseType === 'minor') {
  parts[1] += 1;
  parts[2] = 0;
} else {
  parts[2] += 1;
}

const newVersion = parts.join('.');

console.log('\nHometeam MCP Server - Release');
console.log(`   ${currentVersion} -> ${newVersion} (${releaseType})\n`);

pkg.version = newVersion;
writeFileSync(pkgPath, `${JSON.stringify(pkg, null, 2)}\n`);
console.log(`Updated package.json to ${newVersion}`);

try {
  execSync('git add package.json', { stdio: 'inherit' });
  execSync(`git commit -m "chore: release v${newVersion}"`, { stdio: 'inherit' });
  console.log('Created release commit');

  execSync(`git tag -a v${newVersion} -m "Release v${newVersion}"`, { stdio: 'inherit' });
  console.log(`Created tag v${newVersion}`);

  execSync('git push', { stdio: 'inherit' });
  execSync('git push --tags', { stdio: 'inherit' });
  console.log('Pushed to remote with tags');

  console.log(`\nReleased v${newVersion} successfully!`);
  console.log('Heroku will auto-deploy from this push.\n');
} catch {
  console.error('\nGit operation failed. The version in package.json was updated but not pushed.');
  console.error('Revert with: git checkout -- package.json\n');
  process.exit(1);
}
