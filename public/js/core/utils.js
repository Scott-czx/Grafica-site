/**
 * Utilitários compartilhados entre grafica.html e armazem.html
 * Evita duplicação de código e centraliza funções de segurança
 */

// ============================================================
// SANITIZAÇÃO E SEGURANÇA
// ============================================================

/**
 * Escapa HTML para prevenir XSS
 * @param {string} texto - Texto a ser escapado
 * @returns {string} Texto seguro para inserir no DOM
 */
export function escaparHTML(texto) {
  if (typeof texto !== 'string') return '';
  return texto.replace(
    /[&<>"']/g,
    char =>
      ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;',
      })[char]
  );
}

/**
 * Sanitiza entrada do usuário para uso seguro
 * @param {string} input - Entrada do usuário
 * @param {number} maxLength - Tamanho máximo permitido
 * @returns {string} Entrada sanitizada
 */
export function sanitizarEntrada(input, maxLength = 100) {
  if (typeof input !== 'string') return '';
  return input
    .trim()
    .slice(0, maxLength)
    .replace(/[\u0000-\u001F\u007F]/gu, ''); // eslint-disable-line no-control-regex -- Remove caracteres de controle
}

/**
 * Valida se um valor é um número válido e positivo
 * @param {number} valor - Valor a validar
 * @returns {boolean}
 */
export function ehValorValido(valor) {
  return typeof valor === 'number' && Number.isFinite(valor) && valor >= 0 && valor <= 999999999.99;
}

// ============================================================
// FORMATAÇÃO
// ============================================================

/**
 * Formata valor monetário para BRL
 * @param {number} valor - Valor numérico
 * @returns {string} Valor formatado
 */
export function formatarValor(valor) {
  if (!ehValorValido(valor)) {
    return 'Valor não informado';
  }

  return valor.toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  });
}

/**
 * Converte string de valor para número
 * Aceita formatos: 150, 150,00, 150.00, 1.500,00, R$ 1.500,00
 * @param {string} valorTexto - Texto do valor
 * @returns {number|null} Valor numérico ou null se inválido
 */
export function converterValor(valorTexto) {
  if (typeof valorTexto !== 'string') return null;

  let valor = valorTexto.trim().replace(/R\$/gi, '').replace(/\s/g, '');

  if (!valor) return null;

  if (!/^(?:\d+|\d{1,3}(?:\.\d{3})+)(?:,\d{1,2})?$/.test(valor) && !/^\d+\.\d{1,2}$/.test(valor))
    return null;
  if (valor.includes(',')) valor = valor.replace(/\./g, '').replace(',', '.');
  else if (/^\d{1,3}(?:\.\d{3})+$/.test(valor)) valor = valor.replace(/\./g, '');

  const numero = Number(valor);

  if (!Number.isFinite(numero) || numero < 0 || numero > 999999999.99) {
    return null;
  }

  return numero;
}

/**
 * Formata timestamp para hora (HH:MM)
 * @param {number} timestamp - Timestamp em ms
 * @returns {string} Hora formatada
 */
export function formatarHora(timestamp) {
  if (!timestamp || typeof timestamp !== 'number') return '--:--';

  const data = new Date(timestamp);
  if (Number.isNaN(data.getTime())) return '--:--';

  return data.toLocaleTimeString('pt-BR', {
    hour: '2-digit',
    minute: '2-digit',
  });
}

// ============================================================
// TOAST / NOTIFICAÇÕES
// ============================================================

let toastTimeout = null;

/**
 * Mostra toast de notificação
 * @param {HTMLElement} toastEl - Elemento do toast
 * @param {string} mensagem - Mensagem a exibir
 * @param {number} duracao - Duração em ms (padrão 2200)
 */
export function mostrarToast(toastEl, mensagem, duracao = 2200) {
  if (!toastEl) return;

  toastEl.hidden = false;
  toastEl.textContent = mensagem;
  toastEl.classList.add('show');

  clearTimeout(toastTimeout);
  toastTimeout = setTimeout(() => {
    toastEl.classList.remove('show');
    toastEl.hidden = true;
  }, duracao);
}

// ============================================================
// MODAIS
// ============================================================

/**
 * Abre modal adicionando classe 'ativo'
 * @param {HTMLElement} modal - Elemento do modal overlay
 * @param {Function} onOpen - Callback opcional ao abrir
 */
const previousFocus = new WeakMap();

export function abrirModal(modal, onOpen) {
  if (!modal) return;
  previousFocus.set(modal, document.activeElement);
  modal.classList.add('ativo');
  if (onOpen)
    setTimeout(() => {
      if (!modal.hidden) onOpen();
    }, 100);
  else modal.querySelector('button, input')?.focus();
}

/**
 * Fecha modal removendo classe 'ativo'
 * @param {HTMLElement} modal - Elemento do modal overlay
 * @param {Function} onClose - Callback opcional ao fechar
 */
export function fecharModal(modal, onClose) {
  if (!modal) return;
  modal.classList.remove('ativo');
  if (onClose) onClose();
  previousFocus.get(modal)?.focus();
  previousFocus.delete(modal);
}

/**
 * Configura fechamento de modal ao clicar fora
 * @param {HTMLElement} modal - Elemento do modal overlay
 * @param {Function} onClose - Callback ao fechar
 */
export function configurarFecharFora(modal, onClose) {
  if (!modal) return;
  modal.addEventListener('click', evento => {
    if (evento.target === modal) {
      onClose?.();
    }
  });
}

/**
 * Configura tecla Escape para fechar modais
 * @param {HTMLElement[]} modais - Array de modais
 * @param {Function} getFecharFn - Função que retorna a função de fechar para cada modal
 */
export function configurarEscape(modais, getFecharFn) {
  document.addEventListener('keydown', evento => {
    if (evento.key === 'Tab') {
      const modal = modais.find(item => item.classList.contains('ativo'));
      if (!modal) return;
      const controls = [
        ...modal.querySelectorAll('button:not(:disabled), input:not(:disabled), [tabindex="0"]'),
      ];
      const first = controls[0];
      const last = controls.at(-1);
      if (first && evento.shiftKey && document.activeElement === first) {
        evento.preventDefault();
        last.focus();
      } else if (last && !evento.shiftKey && document.activeElement === last) {
        evento.preventDefault();
        first.focus();
      }
    }
    if (evento.key !== 'Escape') return;

    modais.forEach((modal, index) => {
      if (modal.classList.contains('ativo')) {
        const fechar = getFecharFn(index);
        fechar?.();
      }
    });
  });
}

// ============================================================
// FIREBASE HELPERS
// ============================================================

/**
 * Verifica se usuário está autenticado
 * @param {User|null} usuario - Usuário do Firebase Auth
 * @returns {boolean}
 */
export function usuarioConectado(usuario) {
  return Boolean(usuario?.uid);
}

// ============================================================
// VALIDAÇÃO DE DADOS
// ============================================================

/**
 * Valida dados de solicitação antes de enviar ao Firebase
 * @param {Object} dados - Dados da solicitação
 * @returns {Object} { valido: boolean, erros: string[] }
 */
export function validarSolicitacao(dados) {
  const erros = [];

  if (!dados.tipo || typeof dados.tipo !== 'string') {
    erros.push('Tipo é obrigatório');
  } else if (dados.tipo.trim().length === 0) {
    erros.push('Tipo não pode ser vazio');
  } else if (dados.tipo.length > 50) {
    erros.push('Tipo muito longo (máx. 50 caracteres)');
  }

  if (!ehValorValido(dados.valor)) {
    erros.push('Valor inválido');
  }

  return {
    valido: erros.length === 0,
    erros,
  };
}

/**
 * Valida novo nome para renomear
 * @param {string} nome - Novo nome
 * @param {string} nomeAtual - Nome atual
 * @returns {Object} { valido: boolean, erro: string|null }
 */
export function validarNovoNome(nome, nomeAtual) {
  if (!nome || typeof nome !== 'string') {
    return { valido: false, erro: 'Nome é obrigatório' };
  }

  const nomeLimpo = nome.trim().toUpperCase();

  if (nomeLimpo.length === 0) {
    return { valido: false, erro: 'Digite um nome válido' };
  }

  if (nomeLimpo.length > 50) {
    return { valido: false, erro: 'Nome muito longo (máx. 50 caracteres)' };
  }

  if (nomeLimpo === nomeAtual?.toUpperCase()) {
    return { valido: false, erro: 'Nome igual ao atual' };
  }

  return { valido: true, erro: null, nomeLimpo };
}
