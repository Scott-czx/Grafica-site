import { readdir } from 'node:fs/promises';
const directory = new URL('../tests/', import.meta.url);
for (const name of (await readdir(directory)).filter(name => name.endsWith('.test.js')).sort()) {
  await import(new URL(name, directory));
}
