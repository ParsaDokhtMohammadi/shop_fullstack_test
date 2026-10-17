// `typeorm migration:create` takes ONE positional whose last segment is the
// migration *name*, not a directory — so passing `src/migrations/` on its own
// writes a migration called "migrations" into `src/`. The folder and the name
// have to arrive joined, and a package.json script can only append the name
// with a space in between, so the join happens here.
const { spawnSync } = require('node:child_process');

const name = process.argv[2];

if (!name) {
  console.error('Usage: pnpm migration:create <Name>   e.g. pnpm migration:create InitialSchema');
  process.exit(1);
}

// A name with a path separator would move the file back out of src/migrations,
// which is the whole thing this script exists to prevent.
if (/[\/]/.test(name)) {
  console.error(`Migration name must not contain a path separator: "${name}"`);
  process.exit(1);
}

const result = spawnSync(
  'typeorm-ts-node-commonjs',
  ['migration:create', `src/migrations/${name}`],
  // shell: true so Windows resolves the .CMD shim in node_modules/.bin.
  { stdio: 'inherit', shell: true },
);

process.exit(result.status ?? 1);
