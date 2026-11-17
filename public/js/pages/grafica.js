'use strict';

// InkFlow: prévia local com sincronização entre abas da mesma origem.
const { PRODUCTS, ART } = InkFlowCatalog;

const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => Array.from(root.querySelectorAll(selector));
const safe = value =>
  String(value ?? '').replace(
    /[&<>"']/g,
    character =>
      ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character]
  );
let cart = [];
let history = [];
let submitting = false;
let activeCategory = 'todos';
let currentProduct = null;
let selectedHistoryOrder = null;
let nextLineId = 1;
let returnFocusTo = null;
let toastTimeout;

function loadHistory() {
  return InkFlowStore.readOrders();
}

function showToast(message) {
  const element = $('#toast');
  clearTimeout(toastTimeout);
  element.textContent = message;
  element.hidden = false;
  toastTimeout = setTimeout(() => {
    element.hidden = true;
  }, 4200);
}

function renderCatalog() {
  const search = $('#searchInput').value.trim().toLocaleLowerCase('pt-BR');
  const filtered = PRODUCTS.filter(
    p =>
      (activeCategory === 'todos' || p.category === activeCategory) &&
      `${p.name} ${p.description} ${p.type}`.toLocaleLowerCase('pt-BR').includes(search)
  );
  $('#productGrid').innerHTML = filtered.length
    ? filtered
        .map(
          p => `
    <article class="product-card${p.id === 'outros' ? ' product-card-outros' : ''}">
      <div class="product-art art-${p.id}"><span class="art-label">${safe(p.label)}</span>${ART[p.id]}</div>
      <div class="product-details"><div class="product-header"><h3>${safe(p.name)}</h3><span class="product-symbol" aria-hidden="true">✳</span></div>
      <p>${safe(p.description)}</p><div class="product-bottom"><span class="product-kind">${safe(p.type)}</span><button type="button" class="add-button" data-product="${p.id}" aria-label="Configurar ${safe(p.name)}">Configurar <span>+</span></button></div></div>
    </article>`
        )
        .join('')
    : '<div class="no-results"><strong>Nenhum material encontrado.</strong>Tente outra busca ou selecione “Todos”.</div>';
}

function renderCart() {
  $('#cartCount').textContent = String(cart.length);
  $('#cartItems').innerHTML = cart.length
    ? cart
        .map(
          item => `
    <article class="cart-line"><button class="remove-item" data-remove="${safe(item.lineId)}" aria-label="Remover ${safe(item.name)}" title="Remover item">×</button>
      <div class="cart-line-top"><div><h3>${safe(item.name)}</h3><p>${item.options.map(opt => safe(opt.value)).join(' · ')}</p>${item.note ? `<p>Obs.: ${safe(item.note)}</p>` : ''}</div><span class="cart-quantity">${item.quantity}×</span></div>
    </article>`
        )
        .join('')
    : '<div class="empty-cart"><span class="empty-cart-art" aria-hidden="true">▣</span><strong>Seu pedido começa aqui</strong><p>Adicione os materiais que precisa.</p></div>';
}

function openModal(element) {
  returnFocusTo = document.activeElement;
  element.hidden = false;
  document.body.style.overflow = 'hidden';
  $('.close-modal', element)?.focus();
}
function closeModal(element) {
  element.hidden = true;
  if ($$('.modal-backdrop').every(modal => modal.hidden)) document.body.style.overflow = '';
  returnFocusTo?.focus?.();
}

function configureProduct(id) {
  const product = PRODUCTS.find(p => p.id === id);
  if (!product) return;
  currentProduct = product;
  $('#modalTitle').textContent = product.name;
  $('#modalPreview').className = `modal-preview art-${product.id}`;
  $('#modalPreview').innerHTML = ART[product.id];
  $('#optionFields').innerHTML =
    '<div class="modal-options">' +
    product.options
      .map(
        (option, index) =>
          `<div><label for="option${index}" class="field-label">${safe(option.label)}</label><select class="form-input select-input" id="option${index}" name="option${index}">${option.values.map(value => `<option value="${safe(value)}">${safe(value)}</option>`).join('')}</select></div>`
      )
      .join('') +
    '</div>';
  if (product.id === 'outros') {
    $('#optionFields').innerHTML =
      '<label for="otherMaterialName" class="field-label">Qual material você precisa? <span>*</span></label><input id="otherMaterialName" class="form-input" maxlength="100" placeholder="Ex.: convite, folheto, envelope personalizado..." required />';
  }
  $('#itemNote').placeholder =
    product.id === 'outros'
      ? 'Descreva medidas, tipo de papel, cores, acabamento e outras orientações...'
      : 'Cores, arte, medidas ou informações de produção...';
  $('#itemQty').value = '1';
  $('#qtyUnit').textContent = product.unit;
  $('#itemNote').value = '';
  openModal($('#configModal'));
}

function addConfiguredProduct(event) {
  event.preventDefault();
  if (!currentProduct || submitting) return;
  const quantity = Number($('#itemQty').value);
  if (!Number.isSafeInteger(quantity) || quantity < 1 || quantity > 9999) {
    showToast('Informe uma quantidade de 1 a 9999.');
    $('#itemQty').focus();
    return;
  }
  const customName = currentProduct.id === 'outros' ? $('#otherMaterialName').value.trim() : '';
  if (currentProduct.id === 'outros' && !customName) {
    showToast('Descreva qual material você precisa.');
    $('#otherMaterialName').focus();
    return;
  }
  const options = currentProduct.options.map((option, index) => ({
    label: option.label,
    value: $(`#option${index}`).value,
  }));
  cart.push({
    lineId: String(nextLineId++),
    id: currentProduct.id,
    name: customName.slice(0, 100) || currentProduct.name,
    unit: currentProduct.unit,
    quantity,
    options,
    note: $('#itemNote').value.trim().slice(0, 350),
  });
  renderCart();
  closeModal($('#configModal'));
  showToast(`${currentProduct.name} adicionado ao pedido.`);
  currentProduct = null;
}

function historyMarkup(orders, emptyMessage) {
  const metadata = InkFlowStore.readMetadata();
  return orders.length
    ? orders
        .map(order => {
          const date = new Date(order.createdAt);
          const dateLabel = Number.isNaN(date.getTime())
            ? 'Data desconhecida'
            : date.toLocaleString('pt-BR');
          const status = metadata[order.id]?.status || 'Pendente';
          const finished = status === 'Concluído';
          return `<article class="history-item"><div class="history-top"><div><h3>Pedido ${safe(order.id)}</h3><span class="history-meta">${safe(order.requester)} · ${safe(order.department)} · ${safe(dateLabel)}</span></div><span class="history-badge${finished ? ' history-badge-finished' : ''}">${finished ? '✓ Finalizado' : safe(status)}</span></div>
      <div class="history-items">${order.items.map(item => `• ${safe(item.name)} — ${safe(item.quantity)} ${safe(item.unit)}`).join('<br>')}</div>
      <div class="history-actions"><button type="button" class="history-action" data-history="${safe(order.id)}" data-action="summary">Ver e copiar resumo</button><button type="button" class="history-action" data-history="${safe(order.id)}" data-action="print">Imprimir</button></div></article>`;
        })
        .join('')
    : `<div class="history-empty"><strong>${emptyMessage}</strong>Os status são atualizados pelo almoxarifado.</div>`;
}
function renderHistory() {
  const metadata = InkFlowStore.readMetadata();
  const finished = history.filter(order => metadata[order.id]?.status === 'Concluído');
  $('#historyCount').textContent = String(history.length);
  $('#finishedCount').textContent = String(finished.length);
  $('#historyList').innerHTML = historyMarkup(history, 'Nenhum pedido registrado.');
  $('#finishedList').innerHTML = historyMarkup(finished, 'Nenhum pedido finalizado ainda.');
}

function switchView(view) {
  if (!['catalogo', 'historico', 'finalizados', 'ajuda'].includes(view)) return;
  $$('.view').forEach(element => (element.hidden = element.id !== `${view}View`));
  $$('.nav-link[data-view],.mobile-nav-link[data-view]').forEach(button => {
    const isActive = button.dataset.view === view;
    button.classList.toggle('active', isActive);
    if (isActive) button.setAttribute('aria-current', 'page');
    else button.removeAttribute('aria-current');
  });
  if (view === 'historico' || view === 'finalizados') renderHistory();
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function formatDate(value) {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return 'Não informada';
  const [year, month, day] = value.split('-');
  return `${day}/${month}/${year}`;
}

function formatOrder(order) {
  const date = new Date(order.createdAt);
  const dateLabel = Number.isNaN(date.getTime()) ? 'Não informada' : date.toLocaleString('pt-BR');
  const products = order.items
    .map((item, index) =>
      [
        `${index + 1}. ${item.name} — ${item.quantity} ${item.unit}`,
        ...item.options.map(option => `   ${option.label}: ${option.value}`),
        ...(item.note ? [`   Detalhes: ${item.note}`] : []),
      ].join('\n')
    )
    .join('\n\n');
  return `GRÁFICA ARAMENET | SOLICITAÇÃO AO ALMOXARIFADO\nPedido: ${order.id}\nRegistrado: ${dateLabel}\n\nSolicitante: ${order.requester}\nSetor: ${order.department}\nPrioridade: ${order.priority}\nPreciso até: ${formatDate(order.neededBy)}\n\nMATERIAIS\n${products}\n\nObservações gerais: ${order.notes || 'Nenhuma'}\n\n---\n${InkFlowStore.state.mode === 'firebase' ? 'Pedido enviado ao almoxarifado e salvo no Firebase.' : 'Registro local: encaminhar este resumo ao almoxarifado.\nNenhum envio automático foi realizado.'}`;
}

function showSummary(order) {
  selectedHistoryOrder = order;
  $('#summaryText').textContent = formatOrder(order);
  openModal($('#summaryModal'));
}

async function registerOrder(event) {
  event.preventDefault();
  if (submitting) return;
  if (!cart.length) {
    showToast('Adicione pelo menos um material ao pedido.');
    return;
  }
  const requester = $('#requesterName').value.trim();
  const department = $('#department').value.trim();
  if (!requester) {
    showToast('Preencha o nome do solicitante.');
    $('#requesterName').focus();
    return;
  }
  if (!department) {
    showToast('Preencha o setor ou departamento.');
    $('#department').focus();
    return;
  }
  const neededBy = $('#neededBy').value;
  if (neededBy) {
    const date = new Date(`${neededBy}T23:59:59`);
    if (Number.isNaN(date.getTime()) || date.getTime() < Date.now()) {
      showToast('Escolha uma data de necessidade válida.');
      $('#neededBy').focus();
      return;
    }
  }
  const order = {
    id: `IF-${crypto.randomUUID?.() || `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`}`,
    createdAt: new Date().toISOString(),
    requester: requester.slice(0, 90),
    department: department.slice(0, 90),
    priority: $('#priority').value === 'Alta' ? 'Alta' : 'Normal',
    neededBy,
    notes: $('#generalNotes').value.trim().slice(0, 500),
    items: cart.map(item => ({ ...item, options: item.options.map(option => ({ ...option })) })),
  };
  submitting = true;
  $('#registerButton').disabled = true;
  try {
    await InkFlowStore.createOrder(order);
    history = loadHistory();
    cart = [];
    renderCart();
    renderHistory();
    $('#requestForm').reset();
    showSummary(order);
  } catch (error) {
    showToast(error.message || 'Não foi possível registrar o pedido.');
  } finally {
    submitting = false;
    $('#registerButton').disabled = false;
  }
}

async function copyText(value) {
  try {
    if (navigator.clipboard && window.isSecureContext) await navigator.clipboard.writeText(value);
    else {
      const textarea = document.createElement('textarea');
      textarea.value = value;
      textarea.style.position = 'fixed';
      textarea.style.opacity = '0';
      document.body.appendChild(textarea);
      textarea.select();
      const copied = document.execCommand('copy');
      textarea.remove();
      if (!copied) throw new Error('Não foi possível copiar');
    }
    showToast('Resumo copiado! Agora você pode encaminhá-lo ao almoxarifado.');
  } catch {
    showToast(
      'Não foi possível copiar automaticamente. Selecione o texto do resumo e copie manualmente.'
    );
  }
}

function printOrder(order) {
  if (!order) return;
  const sheet = $('#printSheet');
  sheet.replaceChildren();
  const title = document.createElement('h1');
  title.textContent = `Solicitação ${order.id}`;
  const body = document.createElement('pre');
  body.textContent = formatOrder(order);
  sheet.append(title, body);
  window.print();
}

$('#productGrid').addEventListener('click', event => {
  const button = event.target.closest('[data-product]');
  if (button) configureProduct(button.dataset.product);
});
$('#cartItems').addEventListener('click', event => {
  const button = event.target.closest('[data-remove]');
  if (!button || submitting) return;
  cart = cart.filter(item => item.lineId !== button.dataset.remove);
  renderCart();
  showToast('Material removido do pedido.');
});
$$('.filter-chip').forEach(button =>
  button.addEventListener('click', () => {
    activeCategory = button.dataset.category;
    $$('.filter-chip').forEach(chip => {
      const active = chip === button;
      chip.classList.toggle('active', active);
      chip.setAttribute('aria-pressed', String(active));
    });
    renderCatalog();
  })
);
$('#searchInput').addEventListener('input', renderCatalog);
$$('[data-view]').forEach(button =>
  button.addEventListener('click', () => switchView(button.dataset.view))
);
$('#exploreButton').addEventListener('click', () =>
  $('#materiais').scrollIntoView({ behavior: 'smooth', block: 'start' })
);
$('#itemForm').addEventListener('submit', addConfiguredProduct);
$('#requestForm').addEventListener('submit', registerOrder);
$('#decreaseQty').addEventListener('click', () => {
  $('#itemQty').value = String(Math.max(1, Number($('#itemQty').value) || 1) - 1);
  if ($('#itemQty').value === '0') $('#itemQty').value = '1';
});
$('#increaseQty').addEventListener('click', () => {
  $('#itemQty').value = String(Math.min(9999, Math.max(0, Number($('#itemQty').value) || 0) + 1));
});
$('#closeModal').addEventListener('click', () => closeModal($('#configModal')));
$('#closeSummaryModal').addEventListener('click', () => closeModal($('#summaryModal')));
$$('.modal-backdrop').forEach(element =>
  element.addEventListener('click', event => {
    if (event.target === element) closeModal(element);
  })
);
document.addEventListener('keydown', event => {
  InkFlowStore.trapFocus(
    event,
    $$('.modal-backdrop').find(element => !element.hidden)
  );
  if (event.key === 'Escape') {
    $$('.modal-backdrop')
      .filter(element => !element.hidden)
      .forEach(closeModal);
  }
});
$('#copySummary').addEventListener('click', () => {
  if (selectedHistoryOrder) copyText(formatOrder(selectedHistoryOrder));
});
$('#printSummary').addEventListener('click', () => printOrder(selectedHistoryOrder));
['historyList', 'finishedList'].forEach(id =>
  $('#' + id).addEventListener('click', event => {
    const button = event.target.closest('[data-history]');
    if (!button) return;
    const order = history.find(item => item.id === button.dataset.history);
    if (!order) return;
    if (button.dataset.action === 'print') printOrder(order);
    else showSummary(order);
  })
);

const today = new Date();
const localToday = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
$('#neededBy').min = localToday;
renderCatalog();
renderCart();
renderHistory();

// Exportação de pedidos para o painel do almoxarifado em outro navegador/dispositivo.
$('#exportSenderJSON').addEventListener('click', () => {
  if (!history.length) {
    showToast('Não há pedidos para exportar.');
    return;
  }
  const contents = JSON.stringify(
    { source: 'inkflow-solicitante', exportedAt: new Date().toISOString(), orders: history },
    null,
    2
  );
  const blob = new Blob([contents], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = 'aramenet-meus-pedidos.json';
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  showToast('Arquivo JSON preparado. Importe-o no painel do almoxarifado.');
});

InkFlowStore.ready.then(() => {
  history = loadHistory();
  renderHistory();
  if (InkFlowStore.state.mode === 'firebase') {
    $('.form-disclaimer').lastChild.textContent =
      ' Pedido enviado ao almoxarifado com confirmação do servidor.';
    $('.modal-eyebrow', $('#summaryModal')).textContent = 'PEDIDO ENVIADO AO ALMOXARIFADO';
    $('.local-explanation p').textContent =
      'No modo conectado, os pedidos são enviados ao almoxarifado e os status aparecem em Meus pedidos. Arquivos JSON permitem exportar ou importar solicitações quando necessário.';
    $('.success-top p').textContent =
      'Seu pedido foi confirmado pelo servidor. Acompanhe o andamento em Meus pedidos.';
  }
  InkFlowStore.subscribe(() => {
    history = loadHistory();
    renderHistory();
  });
});

$('.brand').addEventListener('click', event => {
  event.preventDefault();
  switchView('catalogo');
});
