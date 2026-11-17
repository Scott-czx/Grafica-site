/* Remove only legacy application caches. Orders and authentication stay untouched. */
(() => {
  'use strict';
  const baseURL = new URL('../../', document.currentScript.src);
  if (location.protocol === 'file:') return;
  async function migrate() {
    if ('caches' in globalThis) {
      const names = await caches.keys();
      await Promise.all(
        names.filter(name => name.startsWith('alerta-grafica-')).map(name => caches.delete(name))
      );
    }
    if ('serviceWorker' in navigator) {
      const registration = await navigator.serviceWorker.register(new URL('sw.js', baseURL), {
        updateViaCache: 'none',
      });
      await registration.update();
    }
  }
  migrate().catch(error => console.warn('Não foi possível atualizar o cache antigo:', error));
})();
