import { initFirebase } from './firebase.js?v=aramenet-r6';
import {
  ref,
  get,
  onValue,
  update,
  serverTimestamp,
} from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-database.js';

const BASE = 'inkflow/v1';
export async function createFirebaseStore(settings, notify) {
  const { db, user, role } = await initFirebase(settings);
  let orders = {},
    internal = {},
    connected = false,
    lastError = null;
  const requests = ref(db, `${BASE}/requests`);
  const visible = requests;
  const initial = await get(visible);
  orders = initial.val() || {};
  internal = (await get(ref(db, `${BASE}/internal`))).val() || {};
  const subscriptions = [];
  function fail(error) {
    lastError = error;
    notify();
  }
  subscriptions.push(
    onValue(
      visible,
      snapshot => {
        orders = snapshot.val() || {};
        notify();
      },
      fail
    )
  );
  subscriptions.push(
    onValue(
      ref(db, `${BASE}/internal`),
      snapshot => {
        internal = snapshot.val() || {};
        notify();
      },
      fail
    )
  );
  subscriptions.push(
    onValue(ref(db, '.info/connected'), snapshot => {
      connected = snapshot.val() === true;
      notify();
    })
  );
  function requireConnection() {
    if (lastError) throw new Error('Não foi possível sincronizar os pedidos. Recarregue a página.');
    if (!connected) throw new Error('Sem conexão com o Firebase. Reconecte antes de salvar.');
  }
  function record(order) {
    return {
      ...order,
      createdBy: user.uid,
      recordedAt: serverTimestamp(),
      status: 'Pendente',
      version: 1,
      updatedAt: serverTimestamp(),
    };
  }
  async function importOrders(incoming) {
    requireConnection();
    const changes = {};
    for (const order of incoming) {
      if (orders[order.id]) continue; // Imports never overwrite existing requests or their status.
      changes[`requests/${order.id}`] = record(order);
    }
    if (Object.keys(changes).length) await update(ref(db, BASE), changes);
  }
  return {
    get connected() {
      return connected;
    },
    get error() {
      return lastError;
    },
    role,
    uid: user.uid,
    getOrders() {
      return Object.values(orders);
    },
    getMetadata() {
      return Object.fromEntries(
        Object.entries(orders).map(([id, order]) => [
          id,
          {
            ...internal[id],
            status: order.status,
            version: internal[id] && internal[id].version !== order.version ? -1 : order.version,
          },
        ])
      );
    },
    async createOrder(order) {
      requireConnection();
      await update(ref(db, BASE), { [`requests/${order.id}`]: record(order) });
    },
    async saveMetadata(id, changes, expectedVersion) {
      requireConnection();
      if (!orders[id]) throw new Error('Pedido indisponível para atualização.');
      if (orders[id].version !== expectedVersion)
        throw new Error(
          'O pedido foi atualizado por outra pessoa. Feche e abra os detalhes novamente.'
        );
      const version = expectedVersion + 1;
      try {
        await update(ref(db, BASE), {
          [`requests/${id}/status`]: changes.status,
          [`requests/${id}/version`]: version,
          [`requests/${id}/updatedAt`]: serverTimestamp(),
          [`internal/${id}`]: {
            assignee: changes.assignee,
            note: changes.note,
            version,
            updatedAt: serverTimestamp(),
          },
        });
      } catch (error) {
        if (error.code === 'PERMISSION_DENIED' || error.code === 'database/permission-denied') {
          throw new Error(
            'Não foi possível salvar: pedido alterado por outra pessoa ou falha nas regras do banco. Reabra os detalhes.'
          );
        }
        throw error;
      }
    },
    importOrders,
    dispose() {
      subscriptions.forEach(unsubscribe => unsubscribe());
    },
  };
}
