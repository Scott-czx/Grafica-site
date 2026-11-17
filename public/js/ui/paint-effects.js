/**
 * Paint Effects Module
 * Adiciona efeitos visuais de tinta/paint splatter nas interações do usuário
 * Sem alterar o visual estático do site
 */

// Configuração das cores de tinta por tipo de serviço (grafica.html)
const PAINT_COLORS = {
  BANNER: ['rgba(37, 99, 235, 0.6)', 'rgba(59, 130, 246, 0.5)', 'rgba(96, 165, 250, 0.4)'],
  ADESIVO: ['rgba(22, 163, 74, 0.6)', 'rgba(34, 197, 94, 0.5)', 'rgba(74, 222, 128, 0.4)'],
  FOLHETO: ['rgba(245, 158, 11, 0.6)', 'rgba(251, 191, 36, 0.5)', 'rgba(253, 224, 71, 0.4)'],
  BLOCO: ['rgba(124, 58, 237, 0.6)', 'rgba(168, 85, 247, 0.5)', 'rgba(196, 181, 253, 0.4)'],
  CARTÃO: ['rgba(219, 39, 119, 0.6)', 'rgba(244, 63, 94, 0.5)', 'rgba(252, 165, 165, 0.4)'],
  CONVITE: ['rgba(8, 145, 178, 0.6)', 'rgba(14, 165, 233, 0.5)', 'rgba(125, 211, 252, 0.4)'],
  OUTROS: ['rgba(220, 38, 38, 0.6)', 'rgba(248, 113, 113, 0.5)', 'rgba(254, 178, 178, 0.4)'],
  DEFAULT: ['rgba(100, 116, 139, 0.6)', 'rgba(148, 163, 184, 0.5)', 'rgba(203, 213, 225, 0.4)'],
};

// Cores para armazem.html (tema escuro)
const PAINT_COLORS_DARK = [
  'rgba(37, 99, 235, 0.7)',
  'rgba(8, 145, 178, 0.7)',
  'rgba(34, 197, 94, 0.6)',
  'rgba(245, 158, 11, 0.6)',
  'rgba(124, 58, 237, 0.6)',
  'rgba(239, 68, 68, 0.6)',
];

// Estado para controle de performance
let paintEffectsEnabled = true;
let splatterCount = 0;
const MAX_SPLATTERS = 30;

/**
 * Verifica se o usuário prefere movimento reduzido
 */
function prefersReducedMotion() {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/**
 * Cria um elemento de respingo de tinta (splatter)
 */
function createSplatter(x, y, colors, container = document.body) {
  if (!paintEffectsEnabled || prefersReducedMotion() || splatterCount >= MAX_SPLATTERS) {
    return null;
  }

  const splatter = document.createElement('div');
  splatter.className = 'paint-splatter';

  // Tamanho aleatório entre 8-35px
  const size = Math.random() * 27 + 8;

  // Posição com pequeno offset aleatório
  const offsetX = (Math.random() - 0.5) * 40;
  const offsetY = (Math.random() - 0.5) * 40;

  // Cor aleatória do array
  const color = colors[Math.floor(Math.random() * colors.length)];

  // Forma orgânica aleatória
  const borderRadius = `${Math.random() * 40 + 30}% ${Math.random() * 40 + 30}% ${Math.random() * 40 + 30}% ${Math.random() * 40 + 30}% /
                        ${Math.random() * 40 + 30}% ${Math.random() * 40 + 30}% ${Math.random() * 40 + 30}% ${Math.random() * 40 + 30}%`;

  splatter.style.cssText = `
    position: fixed;
    left: ${x + offsetX}px;
    top: ${y + offsetY}px;
    width: ${size}px;
    height: ${size}px;
    background: ${color};
    border-radius: ${borderRadius};
    pointer-events: none;
    z-index: 9999;
    transform-origin: center center;
    will-change: transform, opacity;
  `;

  container.appendChild(splatter);
  splatterCount++;

  // Remove após animação
  splatter.addEventListener('animationend', () => {
    splatter.remove();
    splatterCount = Math.max(0, splatterCount - 1);
  });

  return splatter;
}

/**
 * Cria múltiplos respingos em explosão (burst)
 */
function createSplatterBurst(x, y, colors, count = 8, container = document.body) {
  if (!paintEffectsEnabled || prefersReducedMotion()) return;

  for (let i = 0; i < count; i++) {
    // Delay escalonado para efeito mais natural
    setTimeout(() => {
      const angle = (i / count) * Math.PI * 2;
      const distance = Math.random() * 30 + 10;
      const burstX = x + Math.cos(angle) * distance;
      const burstY = y + Math.sin(angle) * distance;
      createSplatter(burstX, burstY, colors, container);
    }, i * 30);
  }
}

/**
 * Cria efeito de gota de tinta caindo (drip)
 */
function createPaintDrip(x, color, container = document.body) {
  if (!paintEffectsEnabled || prefersReducedMotion()) return;

  const drip = document.createElement('div');
  drip.className = 'paint-drop';

  const width = Math.random() * 12 + 6;
  const height = Math.random() * 30 + 20;

  drip.style.cssText = `
    position: fixed;
    left: ${x}px;
    top: -50px;
    width: ${width}px;
    height: ${height}px;
    background: ${color};
    border-radius: 50% 50% 50% 50% / 60% 60% 40% 40%;
    pointer-events: none;
    z-index: 9998;
    will-change: transform, opacity;
    animation: paintDrip ${Math.random() * 3 + 5}s linear forwards;
  `;

  container.appendChild(drip);

  drip.addEventListener('animationend', () => {
    drip.remove();
  });

  return drip;
}

/**
 * Efeito de tinta no clique de botão
 */
function onButtonClick(event, colors = PAINT_COLORS_DARK) {
  const rect = event.currentTarget.getBoundingClientRect();
  const x = rect.left + rect.width / 2;
  const y = rect.top + rect.height / 2;
  createSplatterBurst(x, y, colors, 6);
}

/**
 * Efeito de tinta no hover de card/item
 */
function onCardHover(event, colors = PAINT_COLORS_DARK) {
  if (prefersReducedMotion()) return;

  const rect = event.currentTarget.getBoundingClientRect();
  const x = rect.left + Math.random() * rect.width;

  // Cria um pequeno drip
  if (Math.random() < 0.3) {
    createPaintDrip(x, colors[Math.floor(Math.random() * colors.length)]);
  }
}

/**
 * Efeito de tinta ao carregar novo item na fila (armazem.html)
 */
function onNewItemAdded(element, color = 'rgba(37, 99, 235, 0.6)') {
  if (!element || prefersReducedMotion()) return;

  element.classList.add('novo');

  const rect = element.getBoundingClientRect();
  const centerX = rect.left + rect.width / 2;

  // Múltiplos drips no topo do card
  for (let i = 0; i < 3; i++) {
    setTimeout(() => {
      const x = centerX + (Math.random() - 0.5) * rect.width * 0.6;
      createPaintDrip(x, color);
    }, i * 150);
  }

  // Remove classe após animação
  setTimeout(() => {
    element.classList.remove('novo');
  }, 1000);
}

/**
 * Efeito de tinta ao finalizar item (armazem.html)
 */
function onItemFinalized(element) {
  if (!element || prefersReducedMotion()) return;

  const rect = element.getBoundingClientRect();
  const x = rect.left + rect.width / 2;
  const y = rect.top + rect.height / 2;

  // Explosão verde (cor de sucesso)
  const successColors = [
    'rgba(34, 197, 94, 0.7)',
    'rgba(74, 222, 128, 0.6)',
    'rgba(134, 239, 172, 0.5)',
  ];
  createSplatterBurst(x, y, successColors, 10);
}

/**
 * Efeito de tinta no input focus (grafica.html)
 */
function onInputFocus(input, colors = PAINT_COLORS_DARK) {
  if (prefersReducedMotion()) return;

  const rect = input.getBoundingClientRect();
  const x = rect.left + rect.width / 2;

  // Pequeno drip vindo do topo do input
  createPaintDrip(x, colors[Math.floor(Math.random() * colors.length)]);
}

/**
 * Efeito de tinta no toast/notification
 */
function onToastShow(toastElement, colors = PAINT_COLORS_DARK) {
  if (!toastElement || prefersReducedMotion()) return;

  const rect = toastElement.getBoundingClientRect();
  const x = rect.left + rect.width / 2;
  const y = rect.top + rect.height / 2;

  createSplatterBurst(x, y, colors, 5);
}

/**
 * Inicializa efeitos globais
 */
function initPaintEffects(options = {}) {
  paintEffectsEnabled = options.enabled !== false;

  // Desabilita em dispositivos de baixa performance se solicitado
  if (options.autoDisableOnLowPerformance) {
    const connection =
      navigator.connection || navigator.mozConnection || navigator.webkitConnection;
    if (
      connection &&
      (connection.effectiveType === 'slow-2g' ||
        connection.effectiveType === '2g' ||
        connection.saveData)
    ) {
      paintEffectsEnabled = false;
    }
  }

  // Respeita prefers-reduced-motion
  const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
  mediaQuery.addEventListener('change', () => {
    if (mediaQuery.matches) {
      paintEffectsEnabled = false;
    }
  });

  return {
    enable: () => {
      paintEffectsEnabled = true;
    },
    disable: () => {
      paintEffectsEnabled = false;
    },
    isEnabled: () => paintEffectsEnabled,
  };
}

/**
 * Auto-bind para elementos com data-paint-effect
 */
function autoBindPaintEffects() {
  // Botões com data-paint-color
  document.querySelectorAll('[data-paint-color]').forEach(btn => {
    const color = btn.dataset.paintColor;
    const colors = color ? [color] : PAINT_COLORS_DARK;
    btn.addEventListener('click', e => onButtonClick(e, colors));
  });

  // Cards com data-paint-hover
  document.querySelectorAll('[data-paint-hover]').forEach(card => {
    const color = card.dataset.paintHover;
    const colors = color ? [color] : PAINT_COLORS_DARK;
    card.addEventListener('mouseenter', e => onCardHover(e, colors), { passive: true });
  });

  // Inputs com data-paint-focus
  document.querySelectorAll('[data-paint-focus]').forEach(input => {
    const color = input.dataset.paintFocus;
    const colors = color ? [color] : PAINT_COLORS_DARK;
    input.addEventListener('focus', () => onInputFocus(input, colors), {
      once: true,
      passive: true,
    });
  });
}

// Exporta para uso como módulo ES6
export {
  createSplatter,
  createSplatterBurst,
  createPaintDrip,
  onButtonClick,
  onCardHover,
  onNewItemAdded,
  onItemFinalized,
  onInputFocus,
  onToastShow,
  initPaintEffects,
  autoBindPaintEffects,
  PAINT_COLORS,
  PAINT_COLORS_DARK,
  prefersReducedMotion,
};
