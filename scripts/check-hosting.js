import { readdir, readFile, stat } from 'node:fs/promises';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const config = JSON.parse(await readFile(resolve(root, 'firebase.json'), 'utf8'));
const publicDirectory = resolve(root, config.hosting.public);
const expected = ['armazem.html', 'grafica.html'];
async function walk(directory) {
  const files = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const path = resolve(directory, entry.name);
    if (entry.isDirectory()) files.push(...(await walk(path)));
    else files.push(path);
  }
  return files;
}
const files = await walk(publicDirectory);
const html = files.filter(path => path.endsWith('.html')).sort();
const canonical = expected.map(name => resolve(publicDirectory, name)).sort();
if (JSON.stringify(html) !== JSON.stringify(canonical))
  throw new Error('O Hosting deve conter somente armazem.html e grafica.html.');
if ((await readdir(root)).some(name => name.endsWith('.html')))
  throw new Error('Não mantenha HTMLs duplicados na raiz. Use public/.');
for (const path of html) {
  const content = await readFile(path, 'utf8');
  if (/http-equiv=["']refresh/i.test(content))
    throw new Error(`A página ${path} não deve ser um redirecionamento HTML.`);
  for (const [, reference] of content.matchAll(/(?:href|src)=["']([^"']+)["']/g)) {
    if (reference.startsWith('#') || /^[a-z][a-z\d+.-]*:/i.test(reference)) continue;
    const pathname = reference.split(/[?#]/)[0];
    const target = resolve(
      reference.startsWith('/') ? publicDirectory : dirname(path),
      pathname.replace(/^\//, '')
    );
    if (!target.startsWith(publicDirectory + '/'))
      throw new Error(`Caminho fora da pasta pública: ${reference}`);
    if (!(await stat(target).catch(() => null))?.isFile())
      throw new Error(`Arquivo ausente: ${reference} em ${path}`);
  }
}
for (const rewrite of config.hosting.rewrites || []) {
  if (!canonical.includes(resolve(publicDirectory, rewrite.destination.replace(/^\//, ''))))
    throw new Error(`Destino de rota inválido: ${rewrite.destination}`);
}
if (
  !config.hosting.rewrites.some(
    route => route.source === '/' && route.destination === '/armazem.html'
  )
)
  throw new Error('A página inicial precisa abrir o almoxarifado.');
if (!config.hosting.ignore.includes('firebase-config.local.json'))
  throw new Error('A configuração local não pode ser publicada.');
if (process.argv.includes('--production')) {
  const settings = JSON.parse(
    await readFile(resolve(publicDirectory, 'firebase-config.json'), 'utf8')
  );
  if (settings.mode !== 'firebase' || settings.useEmulators)
    throw new Error(
      'Antes de publicar, configure public/firebase-config.json com mode="firebase" e useEmulators=false. A prévia local não deve ir para produção.'
    );
  const firebase = settings.firebase || {};
  if (
    Object.keys(firebase).length &&
    ['apiKey', 'projectId', 'databaseURL'].some(
      key =>
        typeof firebase[key] !== 'string' ||
        !firebase[key].trim() ||
        /YOUR_|SEU_/i.test(firebase[key])
    )
  )
    throw new Error(
      'Configuração Firebase incompleta. Preencha a configuração Web ou deixe firebase={} para usar a configuração automática do Hosting.'
    );
}
process.stdout.write(
  'Hosting verificado: duas páginas únicas, recursos presentes e rotas válidas.\n'
);
