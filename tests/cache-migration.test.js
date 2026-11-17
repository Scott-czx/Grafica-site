import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';

const source = await readFile(
  new URL('../public/js/core/cache-migration.js', import.meta.url),
  'utf8'
);

test('recuperação remove apenas cache antigo e atualiza o worker da pasta correta', async () => {
  const deleted = [],
    registered = [];
  let updated = false;
  const context = vm.createContext({
    URL,
    console,
    location: { protocol: 'http:' },
    document: {
      currentScript: {
        src: 'http://127.0.0.1:5500/public/js/core/cache-migration.js?v=inkflow-r3',
      },
    },
    caches: {
      keys: async () => ['alerta-grafica-v1', 'outro-aplicativo-v1'],
      delete: async key => deleted.push(key),
    },
    navigator: {
      serviceWorker: {
        async register(url, options) {
          registered.push({ url: url.href, options });
          return {
            async update() {
              updated = true;
            },
          };
        },
      },
    },
    // Orders and user identity must never be cleared to repair the visual.
    get localStorage() {
      throw new Error('Armazenamento de pedidos não deve ser acessado.');
    },
  });
  vm.runInContext(source, context);
  await new Promise(resolve => setImmediate(resolve));
  assert.deepEqual(deleted, ['alerta-grafica-v1']);
  assert.equal(registered[0].url, 'http://127.0.0.1:5500/public/sw.js');
  assert.equal(registered[0].options.updateViaCache, 'none');
  assert.equal(updated, true);
});

test('abrir arquivo diretamente não tenta registrar worker ou apagar dados', () => {
  const context = vm.createContext({
    URL,
    console,
    location: { protocol: 'file:' },
    document: { currentScript: { src: 'file:///project/public/js/core/cache-migration.js' } },
    get caches() {
      throw new Error('Cache não deve ser acessado no modo file.');
    },
  });
  assert.doesNotThrow(() => vm.runInContext(source, context));
});
