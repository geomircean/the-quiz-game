/**
 * Post-build guard: the production bundle must not contain the emulator-only
 * test hook. If it does, an env file leaked NEXT_PUBLIC_FIREBASE_USE_EMULATORS
 * into the build (it belongs in .env.development.local only).
 */
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

const walk = (dir, files = []) => {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) walk(full, files);
    else if (full.endsWith('.js')) files.push(full);
  }
  return files;
};

const offenders = walk('out').filter((file) => readFileSync(file, 'utf8').includes('__QUIZ_DEV__'));

if (offenders.length > 0) {
  console.error('✖ Emulator test hook (__QUIZ_DEV__) found in the production bundle:');
  for (const file of offenders) console.error('  ' + file);
  console.error('Move NEXT_PUBLIC_FIREBASE_USE_EMULATORS=true into .env.development.local.');
  process.exit(1);
}
console.log('✓ Production bundle is clean (no emulator test hook).');
