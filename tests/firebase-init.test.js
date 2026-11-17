import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';

test('inicialização dá acesso direto sem consultar lista de dispositivos autorizados', async () => {
  const calls = [];
  const context = vm.createContext({ location: { hostname: 'alerta-grafica-armazem.web.app' } });
  const dependencies = {
    initializeApp: () => ({}),
    getDatabase: () => ({}),
    connectDatabaseEmulator() {},
    getAuth: () => ({}),
    connectAuthEmulator() {},
    browserLocalPersistence: 'local',
    setPersistence: async () => {},
    signInAnonymously: async () => {
      calls.push('anonymous');
      return { user: { uid: 'new-browser' } };
    },
  };
  const module = new vm.SourceTextModule(
    await readFile(new URL('../public/js/core/firebase.js', import.meta.url), 'utf8'),
    { context }
  );
  await module.link(
    () =>
      new vm.SyntheticModule(
        Object.keys(dependencies),
        function () {
          for (const [key, value] of Object.entries(dependencies)) this.setExport(key, value);
        },
        { context }
      )
  );
  await module.evaluate();
  const result = await module.namespace.initFirebase({
    firebase: {
      apiKey: 'demo',
      projectId: 'demo',
      databaseURL: 'https://demo.firebaseio.com',
    },
  });
  assert.equal(result.user.uid, 'new-browser');
  assert.equal(result.role, 'admin');
  assert.deepEqual(calls, ['anonymous']);
});
