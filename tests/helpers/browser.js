import { readFile } from 'node:fs/promises';
import { webcrypto } from 'node:crypto';
import vm from 'node:vm';

// Minimal deterministic DOM for controller integration; visual rendering is checked separately.
export async function browser(page, storage = new Map(), blocked = false) {
  const elements = new Map(),
    windowEvents = new Map();
  const html = await readFile(new URL(`../../public/${page}.html`, import.meta.url), 'utf8');
  const makeElement = () => ({
    className: '',
    value: '',
    innerHTML: '',
    textContent: '',
    hidden: false,
    disabled: false,
    style: {},
    dataset: {},
    lastChild: { textContent: '' },
    listeners: new Map(),
    classList: { add() {}, remove() {}, toggle() {} },
    addEventListener(name, callback) {
      this.listeners.set(name, callback);
    },
    setAttribute() {},
    removeAttribute() {},
    getClientRects: () => [1],
    focus() {},
    reset() {},
    append() {},
    appendChild() {},
    remove() {},
    click() {},
    select() {},
    querySelector() {
      return makeElement();
    },
    querySelectorAll: () => [],
  });
  for (const tag of html.match(/<[^>]+\bid="[^"]+"[^>]*>/g) || []) {
    const id = /\bid="([^"]+)"/.exec(tag)[1];
    const element = makeElement();
    element.id = id;
    element.hidden = /\bhidden\b/.test(tag);
    element.className = /class="([^"]*)"/.exec(tag)?.[1] || '';
    element.value = /\bvalue="([^"]*)"/.exec(tag)?.[1] || '';
    elements.set(id, element);
  }
  const get = id => {
    if (!elements.has(id)) elements.set(id, makeElement());
    return elements.get(id);
  };
  get('priorityFilter').value = 'Todas';
  get('priority').value = 'Normal';
  const document = {
    currentScript: { src: 'http://localhost:5500/public/js/core/local-store.js' },
    activeElement: makeElement(),
    body: makeElement(),
    getElementById: get,
    querySelector(selector) {
      return selector.startsWith('#') ? get(selector.slice(1)) : makeElement();
    },
    querySelectorAll(selector) {
      if (selector.startsWith('.'))
        return [...elements.values()].filter(element =>
          element.className.split(' ').includes(selector.slice(1))
        );
      return [];
    },
    addEventListener() {},
    createElement: makeElement,
  };
  const window = {
    addEventListener(name, callback) {
      if (!windowEvents.has(name)) windowEvents.set(name, []);
      windowEvents.get(name).push(callback);
    },
    dispatchEvent() {},
    scrollTo() {},
    print() {},
  };
  const context = vm.createContext({
    document,
    window,
    console,
    URL,
    crypto: webcrypto,
    navigator: {},
    location: { protocol: 'file:', hostname: '', pathname: `/public/${page}.html` },
    CustomEvent: class {
      constructor(name, options) {
        this.type = name;
        this.detail = options?.detail;
      }
    },
    setTimeout: () => 1,
    clearTimeout() {},
    localStorage: {
      getItem: key => storage.get(key) ?? null,
      setItem(key, value) {
        if (blocked) throw new Error('Storage blocked');
        storage.set(key, value);
      },
    },
  });
  const run = code => vm.runInContext(code, context);
  for (const path of [
    `domain/${page === 'grafica' ? 'catalog' : 'demo-orders'}.js`,
    'core/local-store.js',
    ...(page === 'armazem' ? ['ui/order-alert.js'] : []),
    `pages/${page}.js`,
  ]) {
    run(await readFile(new URL(`../../public/js/${path}`, import.meta.url), 'utf8'));
  }
  await run('InkFlowStore.ready');
  await new Promise(resolve => setImmediate(resolve));
  return {
    elements,
    storage,
    run,
    async storageChanged(key) {
      for (const callback of windowEvents.get('storage') || []) await callback({ key });
    },
  };
}
