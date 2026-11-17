import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';

async function repository(current) {
  const state = { current, writes: [] };
  const context = vm.createContext({});
  const sdk = new vm.SyntheticModule(
    ['ref', 'runTransaction', 'serverTimestamp'],
    function () {
      this.setExport('ref', (_db, path) => path);
      this.setExport('serverTimestamp', () => ({ '.sv': 'timestamp' }));
      this.setExport('runTransaction', async (path, transform, options) => {
        assert.equal(options.applyLocally, false);
        const next = transform(state.current);
        if (next === undefined) return { committed: false };
        state.writes.push({ path, next });
        state.current = next;
        return { committed: true };
      });
    },
    { context }
  );
  const source = await readFile(new URL('../public/js/core/orders.js', import.meta.url), 'utf8');
  const module = new vm.SourceTextModule(source, { context });
  await module.link(() => sdk);
  await module.evaluate();
  return { api: module.namespace, state };
}

const order = {
  tipo: 'BANNER',
  valor: 100,
  status: 'pendente',
  criadoPor: 'grafica-1',
  criadoEm: 1000,
};

test('renomear preserva autoria, preço, data e status', async () => {
  const { api, state } = await repository({ ...order });
  await api.renameOrder({}, 'pedido-1', 'ADESIVO');
  assert.equal(state.current.tipo, 'ADESIVO');
  assert.equal(state.current.criadoPor, order.criadoPor);
  assert.equal(state.current.criadoEm, order.criadoEm);
  assert.equal(state.current.valor, order.valor);
});
test('pedido excluído simultaneamente não é recriado por renomeação', async () => {
  const { api, state } = await repository(null);
  await assert.rejects(api.renameOrder({}, 'pedido-1', 'ADESIVO'), /removido ou alterado/);
  assert.equal(state.writes.length, 0);
});
test('finalização usa timestamp de servidor e impede segunda finalização', async () => {
  const { api, state } = await repository({ ...order });
  await api.finishOrder({}, 'pedido-1');
  assert.equal(state.current.status, 'atendido');
  assert.equal(state.current.atendidoEm['.sv'], 'timestamp');
  await assert.rejects(api.finishOrder({}, 'pedido-1'), /removido ou alterado/);
  assert.equal(state.writes.length, 1);
});
test('exclusão remove pedido e rejeita caminhos arbitrários', async () => {
  const { api, state } = await repository({ ...order });
  await assert.rejects(api.deleteOrder({}, '../acessos'), /inválido/);
  assert.equal(state.writes.length, 0);
  await api.deleteOrder({}, 'pedido-1');
  assert.equal(state.current, null);
});
