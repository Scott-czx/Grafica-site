import test from 'node:test';
import assert from 'node:assert/strict';
import { browser } from './helpers/browser.js';

const request = {
  id: 'IF-test-1',
  createdAt: '2026-11-14T12:00:00.000Z',
  requester: 'Ana',
  department: 'Marketing',
  priority: 'Alta',
  neededBy: '',
  notes: '',
  items: [{ id: 'banner', name: 'Banner', quantity: 2, unit: 'banner(s)', options: [], note: '' }],
};

test('prévia inicial preserva seis exemplos e estatísticas da referência', async () => {
  const app = await browser('armazem');
  const counts = app.run('counts()');
  assert.equal(counts.total, 6);
  assert.equal(counts.pending, 2);
  assert.equal(counts.production, 2);
  assert.equal(counts.ready, 1);
  assert.equal(counts.complete, 1);
  assert.equal(app.elements.get('progressPercent').textContent, '17%');
  assert.equal(app.elements.get('demoAlert').hidden, false);
});

test('pedido real substitui exemplos e almoxarifado atualiza status, responsável e nota', async () => {
  const storage = new Map([['inkflow.requests.v1', JSON.stringify([request])]]);
  const app = await browser('armazem', storage);
  assert.equal(app.run('counts().total'), 1);
  assert.equal(app.elements.get('demoAlert').hidden, true);
  app.run("openDrawer('IF-test-1')");
  app.elements.get('editStatus').value = 'Em produção';
  app.elements.get('editAssignee').value = 'Equipe A';
  app.elements.get('editNote').value = 'Conferir cores';
  await app.run('saveStatus()');
  assert.equal(app.run('counts().production'), 1);
  const meta = JSON.parse(storage.get('inkflow.admin.meta.v1'))['IF-test-1'];
  assert.equal(meta.assignee, 'Equipe A');
  assert.equal(meta.note, 'Conferir cores');
  assert.equal(meta.version, 1);
  await assert.rejects(
    app.run("InkFlowStore.saveMetadata('IF-test-1', {status:'Concluído'}, 0)"),
    /outra aba/
  );
});

test('conteúdo importado não injeta HTML e alterações externas atualizam a fila', async () => {
  const app = await browser('armazem');
  app.storage.set(
    'inkflow.requests.v1',
    JSON.stringify([{ ...request, requester: '<script>alert(1)</script>' }])
  );
  await app.storageChanged('inkflow.requests.v1');
  assert.equal(app.run('counts().total'), 1);
  assert.match(app.elements.get('recentList').innerHTML, /&lt;script&gt;/);
  assert.doesNotMatch(app.elements.get('recentList').innerHTML, /<script>/);
});

test('solicitante cria pedido que chega ao painel e mantém carrinho se armazenamento falhar', async () => {
  for (const blocked of [false, true]) {
    const storage = new Map();
    const sender = await browser('grafica', storage, blocked);
    const receiver = await browser('armazem', storage);
    sender.run("configureProduct('banner')");
    sender.elements.get('itemQty').value = '3';
    sender.run('addConfiguredProduct({preventDefault(){}})');
    sender.elements.get('requesterName').value = 'Lara';
    sender.elements.get('department').value = 'Marketing';
    await sender.run('registerOrder({preventDefault(){}})');
    if (blocked) {
      assert.equal(sender.run('cart.length'), 1);
      assert.match(sender.elements.get('toast').textContent, /Não foi possível/);
    } else {
      const saved = JSON.parse(storage.get('inkflow.requests.v1'));
      assert.equal(saved.length, 1);
      assert.equal(saved[0].items[0].quantity, 3);
      assert.equal(sender.run('cart.length'), 0);
      await receiver.storageChanged('inkflow.requests.v1');
      assert.equal(receiver.run('counts().total'), 1);
      assert.match(receiver.elements.get('recentList').innerHTML, /Lara/);
    }
  }
});

test('validação rejeita IDs perigosos, itens incompletos e arquivos sem formato válido', async () => {
  const app = await browser('armazem');
  app.run(`globalThis.payload = ${JSON.stringify(request)}`);
  assert.equal(app.run('InkFlowStore.sanitizeOrder({...payload, id:"__proto__"})'), null);
  assert.equal(app.run('InkFlowStore.sanitizeOrder({...payload, items:[null]})'), null);
  await assert.rejects(app.run('InkFlowStore.importOrders([{...payload, items:[]}])'), /inválidos/);
});

test('Outros exige descrição e envia o material personalizado para o almoxarifado', async () => {
  const storage = new Map();
  const sender = await browser('grafica', storage);
  assert.equal(sender.run('PRODUCTS.length'), 5);
  assert.match(sender.elements.get('productGrid').innerHTML, /product-card-outros/);
  sender.run("configureProduct('outros')");
  sender.run('addConfiguredProduct({preventDefault(){}})');
  assert.equal(sender.run('cart.length'), 0);
  sender.elements.get('otherMaterialName').value = 'Envelope personalizado';
  sender.elements.get('itemQty').value = '25';
  sender.elements.get('itemNote').value = 'Papel kraft, impressão em azul';
  sender.run('addConfiguredProduct({preventDefault(){}})');
  sender.elements.get('requesterName').value = 'Ana';
  sender.elements.get('department').value = 'Administrativo';
  await sender.run('registerOrder({preventDefault(){}})');
  const receiver = await browser('armazem', storage);
  assert.match(receiver.elements.get('recentList').innerHTML, /Envelope personalizado/);
  const item = JSON.parse(storage.get('inkflow.requests.v1'))[0].items[0];
  assert.equal(item.id, 'outros');
  assert.equal(item.quantity, 25);
  assert.equal(item.note, 'Papel kraft, impressão em azul');
});

test('pedidos finalizados do solicitante acompanham o status definido pelo almoxarifado', async () => {
  const storage = new Map([['inkflow.requests.v1', JSON.stringify([request])]]);
  const sender = await browser('grafica', storage);
  const receiver = await browser('armazem', storage);
  assert.equal(sender.elements.get('finishedCount').textContent, '0');
  await receiver.run("InkFlowStore.saveMetadata('IF-test-1', {status:'Pronto'}, 0)");
  await sender.storageChanged('inkflow.admin.meta.v1');
  assert.equal(sender.elements.get('finishedCount').textContent, '0');
  await receiver.run("InkFlowStore.saveMetadata('IF-test-1', {status:'Concluído'}, 1)");
  await sender.storageChanged('inkflow.admin.meta.v1');
  assert.equal(sender.elements.get('finishedCount').textContent, '1');
  assert.match(sender.elements.get('finishedList').innerHTML, /✓ Finalizado/);
  assert.match(sender.elements.get('historyList').innerHTML, /✓ Finalizado/);
  sender.run("switchView('finalizados')");
  assert.equal(sender.elements.get('finalizadosView').hidden, false);
  assert.equal(sender.elements.get('catalogoView').hidden, true);
});
