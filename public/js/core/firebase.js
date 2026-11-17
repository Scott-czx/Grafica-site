import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js';
import {
  getDatabase,
  connectDatabaseEmulator,
} from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-database.js';
import {
  getAuth,
  signInAnonymously,
  connectAuthEmulator,
  setPersistence,
  browserLocalPersistence,
} from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js';

let initialization;

async function initialize(settings) {
  const local = ['localhost', '127.0.0.1', '[::1]'].includes(location.hostname);
  let config = settings.firebase;
  if (settings.useEmulators && local && !config?.apiKey) {
    config = {
      apiKey: 'demo-key',
      projectId: 'demo-alerta',
      databaseURL: 'https://demo-alerta-default-rtdb.firebaseio.com',
      authDomain: 'demo-alerta.firebaseapp.com',
    };
  }
  if (!config?.apiKey || !config?.projectId || !config?.databaseURL) {
    const response = await fetch('/__/firebase/init.json', { cache: 'no-store' });
    if (!response.ok)
      throw new Error('Configure o aplicativo Web e a URL do banco em firebase-config.local.json.');
    config = await response.json();
  }
  if (!config.apiKey || !config.projectId || !config.databaseURL)
    throw new Error('Configuração do Firebase incompleta.');
  const app = initializeApp(config);
  const db = getDatabase(app);
  const auth = getAuth(app);
  if (settings.useEmulators) {
    if (!local) throw new Error('Emuladores só podem ser utilizados em localhost.');
    connectAuthEmulator(auth, `http://127.0.0.1:${settings.emulators?.authPort || 9099}`);
    connectDatabaseEmulator(db, '127.0.0.1', settings.emulators?.databasePort || 9000);
  }
  await setPersistence(auth, browserLocalPersistence);
  const { user } = await signInAnonymously(auth);

  // Anonymous sign-in is automatic and requires no account or device approval.
  return { app, db, auth, user, role: 'admin' };
}

export function initFirebase(settings) {
  if (!initialization) initialization = initialize(settings);
  return initialization;
}
