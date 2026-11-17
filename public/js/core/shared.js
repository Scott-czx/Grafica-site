/**
 * Shared Module - Common functionality for grafica.html and armazem.html
 * Handles Firebase initialization, authentication, connection status, and paint effects
 */

import { ref, onValue } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-database.js';
import { initPaintEffects } from '../ui/paint-effects.js';
export { initFirebase } from './firebase.js';

// ============================================================
// CONNECTION STATUS
// ============================================================

/**
 * Set up connection status listener
 * @param {Database} database - Firebase database instance
 * @param {HTMLElement} statusElement - DOM element to update
 * @param {Object} options - Custom online/offline text and classes
 */
export function setupConnectionStatus(database, statusElement, options = {}) {
  const {
    onlineText = '🟢 Conectado',
    offlineText = '🔴 Sem conexão',
    onlineClass = 'online',
    offlineClass = 'offline',
    onChange = () => {},
  } = options;

  const connectedRef = ref(database, '.info/connected');

  return onValue(connectedRef, snapshot => {
    onChange(snapshot.val() === true);
    if (!statusElement) return;

    if (snapshot.val() === true) {
      statusElement.textContent = onlineText;
      statusElement.className = `status ${onlineClass}`;
    } else {
      statusElement.textContent = offlineText;
      statusElement.className = `status ${offlineClass}`;
    }
  });
}

// ============================================================
// PAINT EFFECTS INITIALIZATION
// ============================================================

/**
 * Initialize paint effects with standard options
 * @returns {Object} Paint effects controller
 */
export function initSharedPaintEffects() {
  return initPaintEffects({ autoDisableOnLowPerformance: true });
}

// ============================================================
// SERVICE WORKER REGISTRATION
// ============================================================

/**
 * Register service worker for PWA support
 */
export function registerServiceWorker() {
  if (!('serviceWorker' in navigator)) return;
  const register = () =>
    navigator.serviceWorker.register('/sw.js').catch(error => {
      console.warn('Não foi possível atualizar o service worker:', error);
    });
  if (document.readyState === 'complete') register();
  else window.addEventListener('load', register, { once: true });
}

// ============================================================
// UTILITY FUNCTIONS
// ============================================================

/**
 * Debounce function
 * @param {Function} fn - Function to debounce
 * @param {number} delay - Delay in ms
 * @returns {Function} Debounced function
 */
export function debounce(fn, delay) {
  let timeoutId;
  return (...args) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => fn(...args), delay);
  };
}

/**
 * Throttle function
 * @param {Function} fn - Function to throttle
 * @param {number} limit - Time limit in ms
 * @returns {Function} Throttled function
 */
export function throttle(fn, limit) {
  let inThrottle;
  return (...args) => {
    if (!inThrottle) {
      fn(...args);
      inThrottle = true;
      setTimeout(() => (inThrottle = false), limit);
    }
  };
}

/**
 * Generate unique ID
 * @returns {string} Unique ID
 */
export function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
}
