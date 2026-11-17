import { createServer } from 'node:http';
import { fileURLToPath } from 'node:url';
import handler from 'serve-handler';

const port = Number(process.env.PORT || 3000);
if (!Number.isInteger(port) || port < 1 || port > 65535)
  throw new Error('PORT deve estar entre 1 e 65535.');
const publicDirectory = fileURLToPath(new URL('../public/', import.meta.url));
const server = createServer((request, response) => {
  handler(request, response, {
    public: publicDirectory,
    cleanUrls: true,
    rewrites: [{ source: '/', destination: '/armazem.html' }],
    directoryListing: false,
    headers: [{ source: '**', headers: [{ key: 'Cache-Control', value: 'no-store' }] }],
  }).catch(error => {
    console.error('Falha ao servir arquivo:', error);
    if (!response.headersSent) response.writeHead(500);
    response.end('Não foi possível carregar a página.');
  });
});
server.on('error', error => {
  console.error(`Não foi possível iniciar o servidor: ${error.message}`);
  process.exitCode = 1;
});
server.listen(port, '127.0.0.1', () => {
  process.stdout.write(`Servidor local: http://localhost:${port}\n`);
});
