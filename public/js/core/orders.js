import {
  ref,
  runTransaction,
  serverTimestamp,
} from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-database.js';

async function changeOrder(db, id, transform) {
  if (typeof id !== 'string' || !/^[A-Za-z0-9_-]+$/.test(id)) {
    throw new Error('Identificador de pedido inválido.');
  }
  const result = await runTransaction(
    ref(db, `solicitacoes/${id}`),
    current => {
      if (!current) return undefined;
      return transform(current);
    },
    { applyLocally: false }
  );
  if (!result.committed) throw new Error('O pedido foi removido ou alterado. Atualize a lista.');
}

export function renameOrder(db, id, name) {
  return changeOrder(db, id, current => ({ ...current, tipo: name }));
}

export function deleteOrder(db, id) {
  return changeOrder(db, id, () => null);
}

export function finishOrder(db, id) {
  return changeOrder(db, id, current =>
    current.status === 'pendente'
      ? { ...current, status: 'atendido', atendidoEm: serverTimestamp() }
      : undefined
  );
}
