import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';

async function transportFixture() {
  const requests = {},
    internal = {},
    listeners = [],
    writes = [];
  let rejectWrites = false;
  const read = target => {
    if (target.path === '.info/connected') return true;
    const data = target.path.endsWith('/internal') ? internal : requests;
    const selected = target.uid
      ? Object.fromEntries(
          Object.entries(data).filter(([, order]) => order.createdBy === target.uid)
        )
      : data;
    return structuredClone(selected);
  };
  const snapshot = target => ({ val: () => read(target) });
  const context = vm.createContext({ location: { pathname: '/armazem.html' } });
  const values = {
    ref: (_db, path) => ({ path }),
    orderByChild: child => child,
    equalTo: uid => uid,
    query: (target, child, uid) => {
      assert.equal(child, 'createdBy');
      return { ...target, uid };
    },
    get: async target => snapshot(target),
    onValue(target, callback) {
      listeners.push({ target, callback });
      callback(snapshot(target));
      return () => {};
    },
    serverTimestamp: () => 1234567890,
    async update(_target, changes) {
      if (rejectWrites)
        throw Object.assign(new Error('Permission denied'), { code: 'PERMISSION_DENIED' });
      writes.push(changes);
      for (const [path, value] of Object.entries(changes)) {
        const [collection, id, field] = path.split('/');
        const table = collection === 'internal' ? internal : requests;
        if (field) table[id][field] = value;
        else table[id] = structuredClone(value);
      }
      for (const { target, callback } of listeners) callback(snapshot(target));
    },
  };
  function synthetic(exports) {
    return new vm.SyntheticModule(
      Object.keys(exports),
      function () {
        for (const [name, value] of Object.entries(exports)) this.setExport(name, value);
      },
      { context }
    );
  }
  const module = new vm.SourceTextModule(
    await readFile(new URL('../public/js/core/firebase-store.js', import.meta.url), 'utf8'),
    { context }
  );
  await module.link(specifier =>
    synthetic(
      specifier.split('?')[0] === './firebase.js'
        ? {
            initFirebase: async settings => ({
              db: {},
              user: { uid: settings.uid },
              role: settings.role,
            }),
          }
        : values
    )
  );
  await module.evaluate();
  return {
    requests,
    internal,
    writes,
    set rejectWrites(value) {
      rejectWrites = value;
    },
    async open(role, uid, page) {
      context.location.pathname = `/${page}.html`;
      return module.namespace.createFirebaseStore({ role, uid }, () => {});
    },
  };
}

const request = {
  id: 'IF-cloud-1',
  requester: 'Lara',
  department: 'Marketing',
  createdAt: '2026-11-14T12:00:00.000Z',
  priority: 'Normal',
  neededBy: '',
  notes: '',
  items: [{ id: 'banner', name: 'Banner', unit: 'banner(s)', quantity: 2, options: [], note: '' }],
};

test('transporte Firebase envia pedido e sincroniza status entre solicitante e almoxarifado', async () => {
  const db = await transportFixture();
  const sender = await db.open('grafica', 'user-1', 'grafica');
  const receiver = await db.open('armazem', 'staff-1', 'armazem');
  await sender.createOrder(request);
  assert.equal(receiver.getOrders().length, 1);
  assert.equal(db.requests[request.id].createdBy, 'user-1');
  assert.equal(db.requests[request.id].version, 1);
  await receiver.saveMetadata(
    request.id,
    { status: 'Em produção', assignee: 'Equipe A', note: 'Conferir cores' },
    1
  );
  assert.equal(sender.getMetadata()[request.id].status, 'Em produção');
  assert.equal(sender.getMetadata()[request.id].note, 'Conferir cores');
  assert.equal(receiver.getMetadata()[request.id].note, 'Conferir cores');
  assert.equal(db.writes[1][`requests/${request.id}/version`], 2);
  assert.ok(db.writes[1][`internal/${request.id}`]);
  await assert.rejects(receiver.saveMetadata(request.id, { status: 'Pronto' }, 1), /outra pessoa/);
});

test('acesso direto compartilha os pedidos e permite atualizar sem aprovar dispositivos', async () => {
  const db = await transportFixture();
  const sender = await db.open('admin', 'user-1', 'grafica');
  await sender.createOrder(request);
  const other = await db.open('admin', 'user-2', 'grafica');
  assert.equal(other.getOrders().length, 1);
  await other.saveMetadata(request.id, { status: 'Concluído', assignee: 'Equipe', note: '' }, 1);
  assert.equal(sender.getMetadata()[request.id].status, 'Concluído');
});

test('falha de gravação não é confirmada e importação não sobrescreve pedido existente', async () => {
  const db = await transportFixture();
  const sender = await db.open('grafica', 'user-1', 'grafica');
  db.rejectWrites = true;
  await assert.rejects(sender.createOrder(request), /Permission denied/);
  assert.equal(sender.getOrders().length, 0);
  db.rejectWrites = false;
  await sender.createOrder(request);
  const receiver = await db.open('armazem', 'staff-1', 'armazem');
  const writes = db.writes.length;
  await receiver.importOrders([{ ...request, requester: 'Não sobrescrever' }]);
  assert.equal(db.writes.length, writes);
  assert.equal(db.requests[request.id].requester, 'Lara');
  const direct = await db.open('admin', 'user-1', 'armazem');
  assert.equal(direct.getOrders().length, 1);
});
