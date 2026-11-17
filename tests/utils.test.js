import test from 'node:test';
import assert from 'node:assert/strict';
import {
  converterValor,
  escaparHTML,
  validarSolicitacao,
  validarNovoNome,
  sanitizarEntrada,
  usuarioConectado,
} from '../public/js/core/utils.js';

test('converte valores brasileiros e decimais sem perder milhares', () => {
  for (const [input, value] of [
    ['R$ 1.500,25', 1500.25],
    ['1.500', 1500],
    ['150.50', 150.5],
    ['0', 0],
    ['1.234.567,89', 1234567.89],
  ]) {
    assert.equal(converterValor(input), value, input);
  }
});
test('rejeita valores ambíguos, negativos, infinitos e sintaxe não monetária', () => {
  for (const input of [
    '',
    '-1',
    'Infinity',
    '0x10',
    '1e3',
    '1,2,3',
    '1.234,567',
    '1000000000',
    'abc',
    null,
  ]) {
    assert.equal(converterValor(input), null, String(input));
  }
});
test('escapa aspas em atributos e HTML em nomes de pedidos', () => {
  assert.equal(
    escaparHTML('" onmouseover="alert(1)<img>&\''),
    '&quot; onmouseover=&quot;alert(1)&lt;img&gt;&amp;&#39;'
  );
  assert.equal(escaparHTML(null), '');
});
test('valida limites dos pedidos e nomes', () => {
  assert.equal(validarSolicitacao({ tipo: 'BANNER', valor: 0 }).valido, true);
  for (const dados of [
    { tipo: '', valor: 10 },
    { tipo: 'A'.repeat(51), valor: 10 },
    { tipo: 'A', valor: NaN },
    { tipo: 'A', valor: 1e12 },
  ]) {
    assert.equal(validarSolicitacao(dados).valido, false);
  }
  assert.equal(validarNovoNome(' banner ', 'BANNER').valido, false);
  assert.equal(validarNovoNome(' adesivo ', 'BANNER').nomeLimpo, 'ADESIVO');
  assert.equal(sanitizarEntrada(' A\u0000B ', 50), 'AB');
  assert.equal(usuarioConectado(undefined), false);
});
