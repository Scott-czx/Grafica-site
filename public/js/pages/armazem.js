'use strict';
const IMPORTS_KEY = 'inkflow.admin.imported.v1';
const DEMO_HIDDEN_KEY = 'inkflow.admin.hideDemo.v1';
const $ = (selector, parent = document) => parent.querySelector(selector);
const $$ = (selector, parent = document) => Array.from(parent.querySelectorAll(selector));
const escapeHTML = v =>
  String(v ?? '').replace(
    /[&<>"']/g,
    c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]
  );
const { DEMO_ORDERS } = InkFlowDemo;
const STATUSES = ['Pendente', 'Em produção', 'Pronto', 'Concluído'];
const META_NAME = {
  Pendente: 'Pendente',
  'Em produção': 'Em produção',
  Pronto: 'Pronto',
  Concluído: 'Concluído',
};
const STATUS_CLASS = {
  Pendente: 'badge-pendente',
  'Em produção': 'badge-producao',
  Pronto: 'badge-pronto',
  Concluído: 'badge-concluido',
};
const STATUS_COLORS = {
  Pendente: '#e3ad32',
  'Em produção': '#00b4e5',
  Pronto: '#9579dd',
  Concluído: '#39bb88',
};
const TILE_ICONS = { bloco: '▤', banner: '▣', adesivo: '✳', cartao: '▰', misto: '✦' };
let orders = [],
  metadata = {},
  hiddenDemos = false,
  activeTab = 'Todos',
  selectedId = null,
  toastTimer,
  previousFocus = null,
  selectedVersion = 0,
  saving = false;
const parseLocal = (key, fallback) => {
  try {
    const value = localStorage.getItem(key);
    return value ? JSON.parse(value) : fallback;
  } catch {
    return fallback;
  }
};
const saveLocal = (key, value) => {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch {
    toast('Não foi possível salvar no armazenamento local.');
    return false;
  }
};
const shortID = id => String(id || '').replace(/^IF-/, '#');
const dateString = value => {
  const d = new Date(value);
  return Number.isNaN(d.getTime())
    ? 'Sem data'
    : d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' });
};
const dateTime = value => {
  const d = new Date(value);
  return Number.isNaN(d.getTime())
    ? 'Sem data'
    : d.toLocaleString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
};
const dueDate = value =>
  /^[0-9]{4}-[0-9]{2}-[0-9]{2}$/.test(String(value || ''))
    ? String(value).split('-').reverse().join('/')
    : 'Não informada';
const itemNames = order =>
  order.items
    .map(item => item.name)
    .filter(Boolean)
    .join(', ') || 'Nenhum item';
const itemQty = order => order.items.reduce((sum, item) => sum + (Number(item.quantity) || 0), 0);
const statusFor = order =>
  STATUSES.includes(metadata[order.id]?.status)
    ? metadata[order.id].status
    : order.initialStatus || 'Pendente';
const classFor = order => STATUS_CLASS[statusFor(order)] || STATUS_CLASS.Pendente;
const badge = order =>
  `<span class="status-badge ${classFor(order)}">${escapeHTML(META_NAME[statusFor(order)])}</span>`;
function iconType(order) {
  const names = order.items.map(x => x.id || '').filter(Boolean);
  return names.length === 1 && Object.hasOwn(TILE_ICONS, names[0]) ? names[0] : 'misto';
}
function tile(order) {
  const type = iconType(order);
  return `<span class="item-icon ${type}" aria-hidden="true">${TILE_ICONS[type]}</span>`;
}
function toast(message) {
  const el = $('#toast');
  el.textContent = message;
  el.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => (el.hidden = true), 3800);
}
const sanitizeOrder = InkFlowStore.sanitizeOrder;
function rebuild() {
  const requestData = InkFlowStore.readOrders();
  const imported = InkFlowStore.readOrders(IMPORTS_KEY);
  metadata = InkFlowStore.readMetadata();
  hiddenDemos = parseLocal(DEMO_HIDDEN_KEY, false) === true;
  const real = [
    ...(Array.isArray(requestData) ? requestData : []),
    ...(Array.isArray(imported) ? imported : []),
  ]
    .map(sanitizeOrder)
    .filter(Boolean);
  const unique = new Map();
  real.forEach(o => unique.set(o.id, o));
  const actual = [...unique.values()];
  orders = (
    actual.length ? actual : InkFlowStore.state.mode === 'local' && !hiddenDemos ? DEMO_ORDERS : []
  ).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  const isDemo = orders.length > 0 && orders.every(o => o.demo);
  $('#demoAlert').hidden = !isDemo;
  $('#toggleDemo').textContent = hiddenDemos ? 'Mostrar exemplos' : 'Ocultar exemplos';
  render();
}
function counts() {
  return {
    total: orders.length,
    pending: orders.filter(o => statusFor(o) === 'Pendente').length,
    production: orders.filter(o => statusFor(o) === 'Em produção').length,
    ready: orders.filter(o => statusFor(o) === 'Pronto').length,
    complete: orders.filter(o => statusFor(o) === 'Concluído').length,
  };
}
function renderStats() {
  const c = counts();
  const data = [
    {
      n: c.total,
      label: 'Total de pedidos',
      foot: 'Solicitações registradas',
      color: 'cyan',
      icon: 'i-inbox',
    },
    {
      n: c.pending,
      label: 'Aguardando início',
      foot: 'Na fila para produção',
      color: 'yellow',
      icon: 'i-clock',
    },
    {
      n: c.production,
      label: 'Em produção',
      foot: 'Sendo preparados agora',
      color: 'pink',
      icon: 'i-layers',
    },
    {
      n: c.complete,
      label: 'Concluídos',
      foot: 'Pedidos finalizados',
      color: 'green',
      icon: 'i-check',
    },
  ];
  $('#statsGrid').innerHTML = data
    .map(
      s =>
        `<article class="stat-card stat-${s.color}"><div class="stat-top"><span class="stat-label">${s.label}</span><span class="stat-icon"><svg class="icon"><use href="#${s.icon}"/></svg></span></div><div class="stat-number">${s.n.toString().padStart(2, '0')}</div><div class="stat-foot">${s.foot}</div></article>`
    )
    .join('');
  $('#navOrdersCount').textContent = String(c.total);
  $('#navProductionCount').textContent = String(c.production);
}
function renderRecent() {
  $('#recentList').innerHTML = orders.length
    ? orders
        .slice(0, 5)
        .map(
          o =>
            `<button type="button" class="recent-item" data-order="${escapeHTML(o.id)}">${tile(o)}<span class="recent-info"><b>${escapeHTML(itemNames(o))}</b><small>${escapeHTML(o.requester)} · ${escapeHTML(o.department)} · ${itemQty(o)} unidade(s)</small></span><span class="recent-end">${badge(o)}<time>${escapeHTML(dateString(o.createdAt))}</time></span></button>`
        )
        .join('')
    : `<div class="empty-message"><strong>Nenhum pedido recebido.</strong>Crie um pedido no site do solicitante ou importe um arquivo JSON.</div>`;
}
function renderFlow() {
  const c = counts();
  const pct = c.total ? Math.round((c.complete / c.total) * 100) : 0;
  $('#progressPercent').textContent = `${pct}%`;
  $('#progressFill').style.width = `${pct}%`;
  const lines = [
    ['Pendente', c.pending],
    ['Em produção', c.production],
    ['Pronto', c.ready],
    ['Concluído', c.complete],
  ];
  $('#flowList').innerHTML = lines
    .map(
      ([name, n]) =>
        `<div class="flow-line"><span class="flow-name"><i class="flow-dot" style="background:${STATUS_COLORS[name]}"></i>${name}</span><b>${String(n).padStart(2, '0')}</b></div>`
    )
    .join('');
}
function filteredOrders() {
  const query = $('#orderSearch').value.trim().toLocaleLowerCase('pt-BR');
  const priority = $('#priorityFilter').value;
  return orders.filter(
    o =>
      (activeTab === 'Todos' || statusFor(o) === activeTab) &&
      (priority === 'Todas' || o.priority === priority) &&
      (!query ||
        [o.id, o.requester, o.department, itemNames(o), o.notes]
          .join(' ')
          .toLocaleLowerCase('pt-BR')
          .includes(query))
  );
}
function renderTable() {
  const filtered = filteredOrders();
  $('#tableCount').textContent = `${filtered.length} pedido${filtered.length === 1 ? '' : 's'}`;
  $('#ordersTableBody').innerHTML = filtered.length
    ? filtered
        .map(
          o =>
            `<tr><td><span class="order-id">${escapeHTML(shortID(o.id))}</span><span class="order-date">${escapeHTML(dateString(o.createdAt))}</span></td><td><span class="person-name">${escapeHTML(o.requester)}</span><span class="person-dept">${escapeHTML(o.department)}</span></td><td><span class="table-materials" title="${escapeHTML(itemNames(o))}">${escapeHTML(itemNames(o))}</span></td><td><span class="priority-chip ${o.priority === 'Alta' ? 'high' : ''}">${o.priority}</span></td><td>${badge(o)}</td><td><button type="button" class="table-view" data-order="${escapeHTML(o.id)}">Ver detalhes ↗</button></td></tr>`
        )
        .join('')
    : `<tr><td colspan="6" class="empty-message"><strong>Nenhum pedido encontrado.</strong>Tente mudar os filtros ou importe uma solicitação.</td></tr>`;
}
function renderKanban() {
  const columns = ['Pendente', 'Em produção', 'Pronto'];
  $('#kanbanBoard').innerHTML = columns
    .map(s => {
      const set = orders.filter(o => statusFor(o) === s);
      return `<section class="kanban-col"><div class="kanban-heading"><i class="flow-dot" style="background:${STATUS_COLORS[s]}"></i><h2>${s === 'Pronto' ? 'Pronto para retirada' : s}</h2><small>${set.length}</small></div>${set.length ? set.map(o => `<button type="button" data-order="${escapeHTML(o.id)}" class="kanban-card"><span class="kanban-card-top"><span>${escapeHTML(shortID(o.id))}</span><span class="priority-chip ${o.priority === 'Alta' ? 'high' : ''}">${o.priority}</span></span><div class="card-date">Solicitado ${escapeHTML(dateString(o.createdAt))}</div><h3>${escapeHTML(itemNames(o))}</h3><p>${escapeHTML(o.requester)} · ${escapeHTML(o.department)}</p><span class="kanban-card-bottom"><span>${itemQty(o)} unidade(s)</span><span>Ver pedido ↗</span></span></button>`).join('') : '<div class="kanban-empty">Nenhum pedido<br>nesta etapa.</div>'}</section>`;
    })
    .join('');
}
function renderCompleted() {
  const filtered = orders.filter(o => statusFor(o) === 'Concluído');
  $('#completedList').innerHTML = filtered.length
    ? filtered
        .map(
          o =>
            `<article class="completed-card"><div><h3>${escapeHTML(shortID(o.id))} — ${escapeHTML(itemNames(o))}</h3><p>${escapeHTML(o.requester)} · ${escapeHTML(o.department)} · Solicitado ${escapeHTML(dateString(o.createdAt))}</p></div><div class="completed-card-actions">${badge(o)}<button class="table-view" data-order="${escapeHTML(o.id)}" type="button">Ver detalhes ↗</button></div></article>`
        )
        .join('')
    : '<div class="empty-panel"><strong>Nenhum pedido concluído ainda.</strong>Quando os pedidos forem finalizados, eles aparecerão aqui.</div>';
}
function render() {
  renderStats();
  renderRecent();
  renderFlow();
  renderTable();
  renderKanban();
  renderCompleted();
}
function setView(view) {
  if (!['overview', 'orders', 'production', 'completed', 'settings'].includes(view)) return;
  $$('.view').forEach(el => (el.hidden = el.id !== `${view}View`));
  $$('[data-view]').forEach(btn => {
    const active = btn.dataset.view === view;
    btn.classList.toggle('active', active);
    if (active) btn.setAttribute('aria-current', 'page');
    else btn.removeAttribute('aria-current');
  });
  window.scrollTo({ top: 0, behavior: 'smooth' });
}
function drawerMarkup(o) {
  const items = o.items
    .map(
      i =>
        `<div class="drawer-material"><b>${escapeHTML(i.name)} · ${Number(i.quantity)} ${escapeHTML(i.unit)}</b>${i.options.map(opt => `<p>${escapeHTML(opt.label)}: ${escapeHTML(opt.value)}</p>`).join('')}${i.note ? `<p><b>Detalhes:</b> ${escapeHTML(i.note)}</p>` : ''}</div>`
    )
    .join('');
  return `<div class="drawer-summary">${tile(o)}<div><span class="name">${escapeHTML(itemNames(o))}</span><span class="description">${escapeHTML(o.requester)} · ${escapeHTML(o.department)}</span></div></div><div class="detail-grid"><div class="detail-field"><small>Status atual</small>${badge(o)}</div><div class="detail-field"><small>Prioridade</small><span class="priority-chip ${o.priority === 'Alta' ? 'high' : ''}">${o.priority}</span></div><div class="detail-field"><small>Data do pedido</small><span>${escapeHTML(dateTime(o.createdAt))}</span></div><div class="detail-field"><small>Necessário até</small><span>${escapeHTML(dueDate(o.neededBy))}</span></div></div><div class="drawer-section"><h3>Materiais solicitados (${o.items.length})</h3><div class="drawer-items">${items}</div></div><div class="drawer-section"><h3>Observações do solicitante</h3><p>${escapeHTML(o.notes || 'Nenhuma observação informada.')}</p></div>`;
}
function openDrawer(id) {
  const order = orders.find(o => o.id === id);
  if (!order || saving) return;
  selectedId = id;
  selectedVersion = metadata[id]?.version || 0;
  if ($('#orderDrawer').hidden) previousFocus = document.activeElement;
  $('#drawerTitle').textContent = `Pedido ${shortID(order.id)}`;
  $('#drawerContent').innerHTML = drawerMarkup(order);
  $('#editStatus').value = statusFor(order);
  $('#editAssignee').value = metadata[id]?.assignee || '';
  $('#editNote').value = metadata[id]?.note || '';
  $('#drawerBackdrop').hidden = false;
  $('#orderDrawer').hidden = false;
  document.body.style.overflow = 'hidden';
  $('#closeDrawer').focus();
}
function closeDrawer() {
  if (saving) return;
  selectedId = null;
  $('#drawerBackdrop').hidden = true;
  $('#orderDrawer').hidden = true;
  document.body.style.overflow = '';
  previousFocus?.focus?.();
}
async function saveStatus() {
  if (!selectedId || saving) return;
  const id = selectedId;
  saving = true;
  $('#saveOrder').disabled = true;
  try {
    await InkFlowStore.saveMetadata(
      id,
      {
        status: $('#editStatus').value,
        assignee: $('#editAssignee').value,
        note: $('#editNote').value,
      },
      selectedVersion
    );
    saving = false;
    closeDrawer();
    rebuild();
    toast(`Pedido ${shortID(id)} atualizado.`);
  } catch (error) {
    toast(error.message || 'Não foi possível salvar o pedido.');
  } finally {
    saving = false;
    $('#saveOrder').disabled = false;
  }
}
function orderText(o) {
  const meta = metadata[o.id] || {};
  return `GRÁFICA ARAMENET | RECEBIMENTO DO ALMOXARIFADO\nPedido: ${o.id}${o.demo ? ' (EXEMPLO FICTÍCIO)' : ''}\nData: ${dateTime(o.createdAt)}\nSolicitante: ${o.requester}\nSetor: ${o.department}\nPrioridade: ${o.priority}\nNecessário até: ${dueDate(o.neededBy)}\nStatus: ${statusFor(o)}\nResponsável: ${meta.assignee || 'Não definido'}\n\nMATERIAIS:\n${o.items.map((i, n) => `${n + 1}. ${i.name} — ${i.quantity} ${i.unit}\n${i.options.map(opt => `  ${opt.label}: ${opt.value}`).join('\n')}${i.note ? `\n  Observações: ${i.note}` : ''}`).join('\n\n')}\n\nObservações do solicitante: ${o.notes || 'Nenhuma'}\nObservações internas: ${meta.note || 'Nenhuma'}`;
}
async function copyOrder() {
  const o = orders.find(x => x.id === selectedId);
  if (!o) return;
  const value = orderText(o);
  try {
    if (navigator.clipboard && window.isSecureContext) await navigator.clipboard.writeText(value);
    else {
      const field = document.createElement('textarea');
      field.value = value;
      field.style.cssText = 'position:fixed;opacity:0;';
      document.body.appendChild(field);
      field.select();
      if (!document.execCommand('copy')) throw Error('copy');
      field.remove();
    }
    toast('Resumo do pedido copiado.');
  } catch {
    toast('Não foi possível copiar neste navegador.');
  }
}
function printOrder() {
  const o = orders.find(x => x.id === selectedId);
  if (!o) return;
  $('#printSheet').innerHTML =
    `<h1>Gráfica Aramenet — ${escapeHTML(o.id)}</h1><pre>${escapeHTML(orderText(o))}</pre>`;
  $('#printSheet').hidden = false;
  window.print();
}
function download(name, content, type) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
const csvCell = value => {
  let str = String(value ?? '');
  if (/^[\s]*[=+\-@]/.test(str)) str = "'" + str;
  return '"' + str.replace(/"/g, '""') + '"';
};
function exportCSV() {
  if (!orders.length) {
    toast('Não há pedidos para exportar.');
    return;
  }
  const columns = [
    'ID',
    'Data',
    'Solicitante',
    'Setor',
    'Materiais',
    'Quantidade',
    'Prioridade',
    'Prazo',
    'Status',
    'Responsável',
    'Demo',
  ];
  const rows = orders.map(o => [
    o.id,
    dateTime(o.createdAt),
    o.requester,
    o.department,
    itemNames(o),
    itemQty(o),
    o.priority,
    dueDate(o.neededBy),
    statusFor(o),
    metadata[o.id]?.assignee || '',
    o.demo ? 'Sim' : 'Não',
  ]);
  download(
    'aramenet-relatorio-pedidos.csv',
    '\ufeff' + [columns, ...rows].map(row => row.map(csvCell).join(';')).join('\r\n'),
    'text/csv;charset=utf-8'
  );
  toast('Relatório CSV gerado.');
}
function exportJSON() {
  const real = orders.filter(o => !o.demo);
  download(
    'aramenet-pedidos.json',
    JSON.stringify(
      { source: 'inkflow-almoxarifado', exportedAt: new Date().toISOString(), orders: real },
      null,
      2
    ),
    'application/json'
  );
  toast(
    real.length
      ? `${real.length} pedido(s) exportado(s).`
      : 'Arquivo JSON vazio exportado. Os exemplos não são pedidos reais.'
  );
}
async function importFile(file) {
  if (!file) return;
  if (file.size > 2_000_000) {
    toast('O arquivo JSON deve ter até 2 MB.');
    return;
  }
  try {
    const raw = JSON.parse(await file.text());
    const data = Array.isArray(raw)
      ? raw
      : Array.isArray(raw.orders)
        ? raw.orders
        : Array.isArray(raw.requests)
          ? raw.requests
          : null;
    if (!data) throw new Error('Formato inválido');
    if (data.length > 1000) throw new Error('Muitos pedidos');
    const valid = data.map(sanitizeOrder);
    if (valid.some(order => !order)) throw new Error('Pedidos inválidos');
    if (!valid.length) {
      toast('Nenhum pedido válido foi encontrado no arquivo.');
      return;
    }
    await InkFlowStore.importOrders(valid);
    rebuild();
    setView('orders');
    toast(`${valid.length} pedido(s) importado(s).`);
  } catch {
    toast('Não foi possível importar. Confira o formato do JSON.');
  }
}
function toggleDemo(forceHide) {
  const next = typeof forceHide === 'boolean' ? forceHide : !hiddenDemos;
  if (!saveLocal(DEMO_HIDDEN_KEY, next)) return;
  rebuild();
  toast(next ? 'Exemplos ocultados.' : 'Exemplos de demonstração ativados.');
}
$('#todayLabel').textContent = new Date().toLocaleDateString('pt-BR', {
  weekday: 'long',
  day: '2-digit',
  month: 'long',
});
document.addEventListener('click', event => {
  const brand = event.target.closest('[data-view-link]');
  if (brand) {
    event.preventDefault();
    setView(brand.dataset.viewLink);
    return;
  }
  const nav = event.target.closest('button[data-view]');
  if (nav) {
    setView(nav.dataset.view);
    return;
  }
  const jump = event.target.closest('button[data-goto]');
  if (jump) {
    setView(jump.dataset.goto);
    return;
  }
  const open = event.target.closest('[data-order]');
  if (open) {
    openDrawer(open.dataset.order);
    return;
  }
  const importer = event.target.closest('[data-import]');
  if (importer) {
    $('#importFile').click();
    return;
  }
  const exporter = event.target.closest('[data-export]');
  if (exporter) {
    if (exporter.dataset.export === 'csv') exportCSV();
    else exportJSON();
    return;
  }
});
$$('.status-tab').forEach(btn =>
  btn.addEventListener('click', () => {
    activeTab = btn.dataset.tab;
    $$('.status-tab').forEach(b => b.classList.toggle('active', b === btn));
    renderTable();
  })
);
$('#orderSearch').addEventListener('input', renderTable);
$('#priorityFilter').addEventListener('change', renderTable);
$('#topRefresh').addEventListener('click', () => {
  rebuild();
  toast('Pedidos atualizados.');
});
$('#hideDemo').addEventListener('click', () => toggleDemo(true));
$('#toggleDemo').addEventListener('click', () => toggleDemo());
$('#drawerBackdrop').addEventListener('click', closeDrawer);
$('#closeDrawer').addEventListener('click', closeDrawer);
$('#saveOrder').addEventListener('click', saveStatus);
$('#copyOrder').addEventListener('click', copyOrder);
$('#printOrder').addEventListener('click', printOrder);
$('#importFile').addEventListener('change', async event => {
  await importFile(event.target.files?.[0]);
  event.target.value = '';
});
document.addEventListener('keydown', event => {
  InkFlowStore.trapFocus(event, $('#orderDrawer').hidden ? null : $('#orderDrawer'));
  if (event.key === 'Escape' && !$('#orderDrawer').hidden) closeDrawer();
});
window.addEventListener('afterprint', () => {
  $('#printSheet').hidden = true;
});
let soundEnabled = false;
$('#enableSound').addEventListener('click', async () => {
  try {
    if (!soundEnabled) await InkFlowAudio.enable();
    soundEnabled = !soundEnabled;
    $('#enableSound').setAttribute('aria-pressed', String(soundEnabled));
    $('#enableSound').textContent = soundEnabled
      ? 'Desativar alerta sonoro'
      : 'Ativar alerta sonoro';
  } catch (error) {
    toast(error.message);
  }
});
InkFlowStore.ready.then(() => {
  rebuild();
  let known = new Set(orders.filter(order => !order.demo).map(order => order.id));
  InkFlowStore.subscribe(() => {
    rebuild();
    const real = orders.filter(order => !order.demo);
    if (soundEnabled && real.some(order => !known.has(order.id))) InkFlowAudio.play();
    known = new Set(real.map(order => order.id));
    if (selectedId && !orders.some(order => order.id === selectedId)) closeDrawer();
  });
  if (InkFlowStore.state.mode === 'firebase') {
    $('#toggleDemo').disabled = true;
    $('#toggleDemo').textContent = 'Exemplos disponíveis somente no modo local';
  }
});
