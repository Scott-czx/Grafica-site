# Firebase: configuração e integração

Hosting, regras do Realtime Database e autenticação anônima foram publicados em 14/11/2026 no projeto `alerta-grafica-armazem`. A configuração pública utiliza Firebase, e o arquivo local ignorado mantém a prévia do Live Server em modo local. Os dois painéis têm acesso direto, sem autorização administrativa por dispositivo.

## Ativar o modo conectado

1. No Firebase Console, registre um aplicativo Web, crie o Realtime Database e habilite **Authentication → Anonymous**.
2. Copie `public/firebase-config.json` para `public/firebase-config.local.json`.
3. Preencha o arquivo local e selecione `"mode": "firebase"`:

```json
{
  "mode": "firebase",
  "firebase": {
    "apiKey": "CONFIGURACAO_WEB_DO_PROJETO",
    "authDomain": "SEU_PROJETO.firebaseapp.com",
    "projectId": "SEU_PROJETO",
    "appId": "SEU_APP_ID",
    "databaseURL": "URL_EXATA_DO_REALTIME_DATABASE"
  },
  "useEmulators": false,
  "emulators": { "authPort": 9099, "databasePort": 9000 }
}
```

O arquivo local é ignorado pelo Git e pelo Hosting e só é consultado em localhost/127.0.0.1. Os caminhos funcionam tanto com `public/` como raiz do servidor quanto com o Live Server aberto na raiz do repositório. Para hospedar, configure `public/firebase-config.json` com `mode: "firebase"`; no Firebase Hosting, o objeto `firebase` pode ficar vazio para carregar `/__/firebase/init.json` automaticamente. A [documentação oficial](https://firebase.google.com/docs/hosting/reserved-urls) descreve essa URL.

A configuração Web é pública. Nunca coloque chaves de conta de serviço ou credenciais administrativas em `public/`.

## Acesso direto, sem cadastro de dispositivos

O acesso atual foi escolhido como direto, sem tela de login e sem aprovação de UID. O Firebase cria uma sessão anônima automaticamente e os dois painéis podem consultar e atualizar todos os pedidos. Não é necessário criar registros em `acessos` para utilizar o modelo `inkflow/v1`.

Qualquer pessoa com o link pode consultar e alterar os pedidos, inclusive as anotações. Essa sessão técnica não é uma restrição a visitantes. As validações de estrutura, tamanho, campos imutáveis, horário e revisão continuam no servidor.

## Persistência e permissões

Os pedidos completos ficam em `inkflow/v1/requests` e as anotações ficam em `inkflow/v1/internal`. Visitantes com sessão anônima automática têm acesso a ambas as áreas, conforme a escolha de acesso direto. O caminho legado `solicitacoes/` continua com suas permissões anteriores.

As regras validam formato, campos conhecidos, comprimentos, quantidades, autor e horário do servidor. Conteúdo do pedido é imutável depois de criado. Atualizações de produção usam revisão incremental, com status e metadados salvos atomicamente, evitando sobreposição silenciosa de alterações concorrentes. A semântica das validações segue a [documentação do Realtime Database](https://firebase.google.com/docs/database/security/rules-conditions).

O modo Firebase nunca usa o armazenamento local como confirmação alternativa em caso de falha. Se a rede cair, o sistema informa o problema; o carrinho e os campos de edição são preservados. Uma gravação já iniciada pode aguardar reconexão; o botão permanece bloqueado para evitar reenvio.

Os pedidos locais do ZIP só são enviados à nuvem mediante exportação/importação explícita pelo almoxarifado. Duplicatas não sobrescrevem o pedido conectado. Importações mantêm a data original e recebem horário de registro no servidor.

O caminho antigo `solicitacoes/` permanece intacto, com suas regras e utilitários de compatibilidade. Ele não é misturado automaticamente ao novo modelo, pois faltam dados como solicitante, setor e materiais estruturados. Nenhuma migração ou exclusão foi executada.

## Emuladores

Requisitos: Firebase CLI e Java compatível com essa CLI.

```bash
npm run emulators
npm run dev
```

No arquivo local use `mode: "firebase"`, `useEmulators: true` e `firebase: {}` para o projeto demonstrativo `demo-alerta`. Auth usa a porta 9099, Database 9000 e o servidor estático 3000. Não é necessário autorizar UIDs no modelo atual. O SDK do navegador ainda é carregado de gstatic; emulação não significa funcionamento totalmente offline.

```bash
npm run build
npm run test:rules
```

A suíte de regras utiliza exclusivamente `127.0.0.1:9000` e o namespace `demo-alerta-default-rtdb`. Ela substitui os dados de demonstração nesse namespace. Não aponte esse ambiente para dados importantes. Os testes cobrem permissões do modelo antigo e do InkFlow v1: leitura pública negada, acesso direto ao modelo atual, proteção dos campos imutáveis e conflito de revisões; o modelo legado continua testando seus perfis.

## Antes de publicar

O Hosting publica apenas `public/grafica.html`, `public/armazem.html` e seus recursos. Não é necessário `index.html`: a rota `/` é reescrita para `/armazem.html`. Os endereços antigos `/alerta`, `/alerta.html`, `/index.html` e `/public/*.html` conhecidos usam redirecionamentos de configuração.

Antes de publicar, altere o arquivo **público** `public/firebase-config.json` para `mode: "firebase"` e mantenha `useEmulators: false`. Alterar somente o arquivo local não altera produção. O gancho `hosting.predeploy` executa build e verificação de produção e impede publicar o modo local por engano.

Confirme o projeto em `.firebaserc`, faça backup do banco e execute as verificações locais e do emulador. Homologue o fluxo em dois dispositivos. Só então publique Hosting e regras juntos com `npm run deploy`, quando a publicação for autorizada.

O Hosting publica somente `public/`; documentação, testes e configurações administrativas permanecem fora dele. As regras novas precisam estar publicadas para que o modo conectado funcione. O modo local serve para prévia, não envia dados entre aparelhos.
