import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

// Runs exclusively against the local emulator, never production.
const base = 'http://127.0.0.1:9000';
const namespace = 'demo-alerta-default-rtdb';
async function request(path, method = 'GET', body, uid) {
  const headers = { 'Content-Type': 'application/json' };
  if (uid === 'owner') headers.Authorization = 'Bearer owner';
  const auth =
    uid && uid !== 'owner'
      ? `&auth=${encodeURIComponent(JSON.stringify({ uid, token: { sub: uid, firebase: { sign_in_provider: 'anonymous' } } }))}`
      : '';
  return fetch(`${base}/${path}.json?ns=${namespace}${auth}`, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
  });
}

// The emulator accepts mock auth via the auth_variable_override query parameter
// when using its owner credential.
async function asUser(uid, path, method = 'GET', body) {
  const auth = encodeURIComponent(JSON.stringify({ uid, token: { sub: uid } }));
  return fetch(`${base}/${path}.json?ns=${namespace}&auth_variable_override=${auth}`, {
    method,
    headers: { Authorization: 'Bearer owner', 'Content-Type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
}

test('regras: acesso, fluxo entre dispositivos, pedidos antigos e campos imutáveis', async () => {
  const rules = await readFile(new URL('../firebase/database.rules.json', import.meta.url), 'utf8');
  const setup = await fetch(`${base}/.settings/rules.json?ns=${namespace}`, {
    method: 'PUT',
    headers: { Authorization: 'Bearer owner' },
    body: rules,
  });
  assert.equal(setup.status, 200, await setup.text());
  assert.equal(
    (await request('', 'PUT', { acessos: { grafica1: 'grafica', armazem1: 'armazem' } }, 'owner'))
      .status,
    200
  );
  assert.equal((await request('solicitacoes')).status, 401);
  assert.equal((await asUser('intruso', 'solicitacoes')).status, 401);
  assert.equal((await asUser('grafica1', 'acessos/grafica1', 'PUT', 'admin')).status, 401);
  const order = {
    tipo: 'BANNER',
    valor: 150,
    criadoPor: 'grafica1',
    criadoEm: { '.sv': 'timestamp' },
    status: 'pendente',
  };
  assert.equal((await asUser('grafica1', 'solicitacoes/pedido1', 'PUT', order)).status, 200);
  assert.equal(
    (await asUser('armazem1', 'solicitacoes/pedido1', 'PATCH', { valor: 0 })).status,
    401
  );
  assert.equal(
    (await asUser('grafica1', 'solicitacoes/pedido1', 'PATCH', { criadoPor: 'armazem1' })).status,
    401
  );
  assert.equal(
    (await asUser('grafica1', 'solicitacoes/pedido1', 'PATCH', { extra: true })).status,
    401
  );
  await request('solicitacoes/pedido1/criadoEm', 'PUT', Date.now() - 3 * 86400000, 'owner');
  assert.equal(
    (await asUser('grafica1', 'solicitacoes/pedido1', 'PATCH', { tipo: 'ADESIVO' })).status,
    200
  );
  assert.equal(
    (
      await asUser('armazem1', 'solicitacoes/pedido1', 'PATCH', {
        status: 'atendido',
        atendidoEm: { '.sv': 'timestamp' },
      })
    ).status,
    200
  );
  assert.equal((await asUser('armazem1', 'solicitacoes/pedido1', 'DELETE')).status, 401);
  assert.equal((await asUser('grafica1', 'solicitacoes/pedido1', 'DELETE')).status, 200);
});

test('InkFlow v1: acesso direto, materiais imutáveis e revisão concorrente', async () => {
  await request(
    'acessos',
    'PATCH',
    { sender1: 'grafica', sender2: 'grafica', receiver1: 'armazem' },
    'owner'
  );
  const path = 'inkflow/v1/requests/IF-test-cloud';
  const order = {
    id: 'IF-test-cloud',
    createdAt: '2026-11-14T12:00:00.000Z',
    requester: 'Lara',
    department: 'Marketing',
    priority: 'Normal',
    neededBy: '',
    notes: '',
    items: [
      {
        id: 'banner',
        name: 'Banner',
        quantity: 2,
        unit: 'banner(s)',
        note: '',
        options: [{ label: 'Formato', value: '80 × 120 cm' }],
      },
    ],
    createdBy: 'sender1',
    recordedAt: { '.sv': 'timestamp' },
    status: 'Pendente',
    version: 1,
    updatedAt: { '.sv': 'timestamp' },
  };
  assert.equal((await asUser('sender1', path, 'PUT', order)).status, 200);
  assert.equal((await asUser('sender2', path)).status, 200);
  assert.equal((await asUser('receiver1', path)).status, 200);
  assert.equal(
    (
      await asUser('sender1', path, 'PATCH', {
        status: 'Concluído',
        version: 99,
        updatedAt: { '.sv': 'timestamp' },
      })
    ).status,
    401
  );
  assert.equal(
    (
      await asUser('receiver1', path, 'PATCH', {
        'items/0/quantity': 99,
        version: 2,
        updatedAt: { '.sv': 'timestamp' },
      })
    ).status,
    401
  );
  const change = {
    'requests/IF-test-cloud/status': 'Em produção',
    'requests/IF-test-cloud/version': 2,
    'requests/IF-test-cloud/updatedAt': { '.sv': 'timestamp' },
    'internal/IF-test-cloud': {
      assignee: 'Equipe A',
      note: 'Conferir cores',
      version: 2,
      updatedAt: { '.sv': 'timestamp' },
    },
  };
  assert.equal((await asUser('receiver1', 'inkflow/v1', 'PATCH', change)).status, 200);
  assert.equal((await asUser('sender1', 'inkflow/v1/internal/IF-test-cloud')).status, 200);
  assert.equal((await asUser('receiver1', 'inkflow/v1', 'PATCH', change)).status, 401);
  assert.equal((await asUser('sender1', path)).status, 200);
});
