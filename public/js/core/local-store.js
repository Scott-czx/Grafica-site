/* Data facade: isolated local preview or authenticated Firebase transport. */
(() => {
  'use strict';
  const baseURL = new URL('../../', document.currentScript.src);
  const listeners = new Set();
  let backend = null,
    mode = 'loading',
    failure = null;
  const notify = () => {
    listeners.forEach(listener => listener());
    updateConnectionNotice();
  };
  const keys = Object.freeze({
    requests: 'inkflow.requests.v1',
    imports: 'inkflow.admin.imported.v1',
    metadata: 'inkflow.admin.meta.v1',
    hideDemo: 'inkflow.admin.hideDemo.v1',
  });
  const statuses = Object.freeze(['Pendente', 'Em produção', 'Pronto', 'Concluído']);
  const clip = (value, max) => (typeof value === 'string' ? value.trim().slice(0, max) : '');
  function sanitizeOrder(raw) {
    if (
      !raw ||
      typeof raw !== 'object' ||
      !/^IF-[A-Za-z0-9_-]{1,76}$/.test(raw.id) ||
      !Array.isArray(raw.items) ||
      !raw.items.length ||
      raw.items.length > 80
    )
      return null;
    const items = Array.from(raw.items).map(item => {
      if (
        !item ||
        typeof item !== 'object' ||
        !Number.isInteger(item.quantity) ||
        item.quantity < 1 ||
        item.quantity > 10000000
      )
        return null;
      return {
        id: clip(item.id, 30),
        name: clip(item.name, 100) || 'Material',
        quantity: item.quantity,
        unit: clip(item.unit, 50) || 'unidade(s)',
        options: Array.isArray(item.options)
          ? item.options
              .slice(0, 15)
              .filter(option => option && typeof option === 'object')
              .map(option => ({ label: clip(option.label, 70), value: clip(option.value, 140) }))
          : [],
        note: clip(item.note, 350),
      };
    });
    // Reject partial orders instead of silently dropping invalid material lines.
    if (items.some(item => !item)) return null;
    const date = new Date(raw.createdAt);
    if (!raw.createdAt || Number.isNaN(date.getTime())) return null;
    return {
      id: raw.id,
      createdAt: date.toISOString(),
      requester: clip(raw.requester, 90) || 'Não informado',
      department: clip(raw.department, 90) || 'Não informado',
      priority: raw.priority === 'Alta' ? 'Alta' : 'Normal',
      neededBy: /^\d{4}-\d{2}-\d{2}$/.test(raw.neededBy || '') ? raw.neededBy : '',
      notes: clip(raw.notes, 500),
      items,
    };
  }
  function read(key, fallback) {
    try {
      const value = localStorage.getItem(key);
      return value === null ? fallback : JSON.parse(value);
    } catch {
      return fallback;
    }
  }
  function localReadOrders(key = keys.requests) {
    const saved = read(key, []);
    return Array.isArray(saved) ? saved.map(sanitizeOrder).filter(Boolean) : [];
  }
  function localReadMetadata() {
    const raw = read(keys.metadata, {});
    const clean = Object.create(null);
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return clean;
    for (const [id, meta] of Object.entries(raw)) {
      if (
        !/^IF-[A-Za-z0-9_-]{1,76}$/.test(id) ||
        !meta ||
        typeof meta !== 'object' ||
        !statuses.includes(meta.status)
      )
        continue;
      clean[id] = {
        status: meta.status,
        assignee: clip(meta.assignee, 80),
        note: clip(meta.note, 600),
        updatedAt: clip(meta.updatedAt, 40),
        version: Number.isInteger(meta.version) ? meta.version : 0,
      };
    }
    return clean;
  }
  function write(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
      window.dispatchEvent(new CustomEvent('inkflow:storage', { detail: { key } }));
      return true;
    } catch {
      return false;
    }
  }
  function mergeOrders(incoming, key = keys.requests) {
    const byId = new Map(localReadOrders(key).map(order => [order.id, order]));
    for (const raw of incoming) {
      const order = sanitizeOrder(raw);
      if (!order) return false;
      byId.set(order.id, order);
    }
    return write(
      key,
      [...byId.values()].sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    );
  }
  function trapFocus(event, container) {
    if (event.key !== 'Tab' || !container) return;
    const controls = [
      ...container.querySelectorAll(
        'button:not(:disabled), input:not(:disabled), select:not(:disabled), textarea:not(:disabled), a[href]'
      ),
    ].filter(element => element.getClientRects().length);
    const first = controls[0],
      last = controls.at(-1);
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last?.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first?.focus();
    }
  }

  function readOrders(key = keys.requests) {
    if (mode === 'local') return localReadOrders(key);
    if (key === keys.imports) return [];
    return backend ? backend.getOrders().map(sanitizeOrder).filter(Boolean) : [];
  }
  function readMetadata() {
    return mode === 'local' ? localReadMetadata() : backend?.getMetadata() || {};
  }
  function requireReady() {
    if (failure) throw new Error(failure.message);
    if (!['local', 'firebase'].includes(mode)) throw new Error('Aguarde a conexão com o sistema.');
  }
  async function createOrder(raw) {
    await ready;
    requireReady();
    const order = sanitizeOrder(raw);
    if (!order) throw new Error('Pedido inválido. Confira os materiais e os dados do solicitante.');
    if (backend) await backend.createOrder(order);
    else if (!mergeOrders([order]))
      throw new Error('Não foi possível salvar no armazenamento do navegador.');
    notify();
  }
  async function saveMetadata(id, changes, expectedVersion = 0) {
    await ready;
    requireReady();
    if (!statuses.includes(changes.status)) throw new Error('Status inválido.');
    const clean = {
      status: changes.status,
      assignee: clip(changes.assignee, 80),
      note: clip(changes.note, 600),
    };
    if (backend) await backend.saveMetadata(id, clean, expectedVersion);
    else {
      const latest = localReadMetadata();
      if ((latest[id]?.version || 0) !== expectedVersion)
        throw new Error('O pedido foi alterado em outra aba. Feche e abra os detalhes novamente.');
      latest[id] = { ...clean, version: expectedVersion + 1, updatedAt: new Date().toISOString() };
      if (!write(keys.metadata, latest)) throw new Error('Não foi possível salvar as alterações.');
    }
    notify();
  }
  async function importOrders(incoming) {
    await ready;
    requireReady();
    const valid = incoming.map(sanitizeOrder);
    if (valid.some(order => !order)) throw new Error('Arquivo contém pedidos inválidos.');
    if (backend) await backend.importOrders(valid);
    else if (!mergeOrders(valid, keys.imports))
      throw new Error('Não foi possível salvar os pedidos importados.');
    notify();
  }
  async function configuration() {
    if (location.protocol === 'file:') return { mode: 'local' };
    const local = ['localhost', '127.0.0.1', '[::1]'].includes(location.hostname);
    const load = async (path, optional = false) => {
      const response = await fetch(new URL(path, baseURL), {
        cache: 'no-store',
        signal: AbortSignal.timeout(10000),
      });
      if (optional && response.status === 404) return null;
      if (!response.ok) throw new Error('Não foi possível carregar a configuração do sistema.');
      return response.json();
    };
    return (
      (local && (await load('firebase-config.local.json', true))) ||
      (await load('firebase-config.json'))
    );
  }
  function updateConnectionNotice() {
    const error = failure || backend?.error;
    const disconnected = mode === 'firebase' && backend && !backend.connected;
    const label = error
      ? 'Falha na conexão'
      : mode === 'local'
        ? 'Sistema local'
        : disconnected
          ? 'Reconectando…'
          : mode === 'firebase'
            ? 'Firebase conectado'
            : 'Conectando…';
    document.querySelectorAll('[data-sync-label]').forEach(element => {
      element.textContent = label;
    });
    const notice = document.getElementById('connectionNotice');
    if (notice) {
      notice.hidden = !error && !disconnected;
      notice.textContent = error
        ? error.message
        : 'Sem conexão. Reconecte para salvar pedidos e alterações.';
    }
  }
  const ready = configuration()
    .then(async settings => {
      if (!['local', 'firebase'].includes(settings.mode))
        throw new Error('Defina mode como local ou firebase na configuração.');
      mode = settings.mode;
      if (mode === 'firebase') {
        const { createFirebaseStore } = await import('./firebase-store.js?v=aramenet-r6');
        backend = await createFirebaseStore(settings, notify);
      }
    })
    .catch(error => {
      failure = error;
      if (mode === 'loading') mode = 'error';
    })
    .finally(notify);
  window.addEventListener('storage', event => {
    if (event.key === null || Object.values(keys).includes(event.key)) notify();
  });
  window.addEventListener('pagehide', event => {
    if (!event.persisted) backend?.dispose();
  });
  globalThis.InkFlowStore = Object.freeze({
    keys,
    statuses,
    sanitizeOrder,
    read,
    readOrders,
    readMetadata,
    write,
    mergeOrders,
    trapFocus,
    ready,
    createOrder,
    saveMetadata,
    importOrders,
    get state() {
      return {
        mode,
        error: failure || backend?.error,
        connected: mode === 'local' || Boolean(backend?.connected),
        role: backend?.role,
        uid: backend?.uid,
      };
    },
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
  });
})();
