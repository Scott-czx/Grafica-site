# Site de alerta — Gráfica Aramenet

Sistema de solicitações de materiais gráficos com dois painéis: **Solicitações** (`grafica.html`) e **Almoxarifado** (`armazem.html`). O HTML, as ilustrações SVG, a identidade CMYK e os estilos responsivos foram aproveitados do pacote original InkFlow.

## Abrir no Live Server

Existem somente duas páginas HTML no projeto:

- **`public/grafica.html`** — solicitações de materiais.
- **`public/armazem.html`** — painel completo do almoxarifado com o visual CMYK das referências.

Abra a pasta `public/`, clique com o botão direito na página desejada e escolha **Open with Live Server**. Não existem mais cópias/redirecionamentos na raiz, `index.html`, `alerta.html` ou página 404 própria. Os caminhos relativos permitem usar tanto a raiz do projeto quanto `public/` como raiz do Live Server.

No servidor `npm run dev` e no Firebase Hosting, o endereço `/` abre o almoxarifado. No Hosting, `/grafica` e `/armazem` abrem as páginas correspondentes; endereços antigos são redirecionados pela configuração, sem HTMLs adicionais. Recursos CSS e JavaScript têm versão na URL para evitar carregar o visual antigo do cache.

No Live Server, o arquivo ignorado `public/firebase-config.local.json` mantém a prévia em **modo local**, sem depender de Firebase, internet ou SDK externo. A configuração pública está em modo Firebase para o site hospedado. O almoxarifado exibe os seis exemplos do pacote quando ainda não existem pedidos reais; eles podem ser ocultados. Ao criar um pedido, as abas da mesma origem/navegador recebem os dados. Outro aparelho exige o modo Firebase ou transferência por JSON. Dados locais não são enviados à nuvem automaticamente.

## Funcionalidades

- Catálogo de blocos, banners, adesivos e cartões de visita, com especificações e quantidades.
- Carrinho, solicitante, setor, prioridade, prazo e observações.
- Histórico, resumo, cópia, impressão e exportação JSON.
- Visão geral, busca e filtros, tabela, kanban e concluídos.
- Status, responsável, anotações internas e alerta sonoro opcional, ativado nas configurações.
- Importação JSON e exportação CSV, com proteção contra fórmulas de planilha.
- Integração Firebase preparada com autenticação, leitura em tempo real e confirmação de gravação.

## Arquitetura

```text
public/
  grafica.html, armazem.html  Telas originais adaptadas
  css/                       Estilos e identidade CMYK
  js/domain/                 Catálogo, ilustrações e exemplos
  js/pages/                  Controladores dos dois painéis
  js/core/local-store.js     Fachada de dados: local ou Firebase
  js/core/firebase.js        Inicialização e autenticação
  js/core/firebase-store.js  Consultas, assinaturas e gravações na nuvem
  js/core/orders.js          Compatibilidade com o modelo antigo de solicitações
  js/ui/                     Áudio e efeitos existentes
firebase/                    Regras de acesso e validações
scripts/                     Servidor local e executor dos testes
tests/                       Regressões e integração com SDK simulado/emulador
docs/                        Plano técnico, modelo de dados e configuração
```

O frontend usa JavaScript nativo; não exige reescrever o projeto em um framework. O backend é o Firebase Authentication + Realtime Database, protegido por regras executadas no servidor. A fachada de dados separa o transporte dos controladores, permitindo substituir o backend ou acrescentar funcionalidades depois.

## Obter o projeto

```bash
git clone https://github.com/Scott-czx/Grafica-site.git
cd Grafica-site
npm ci
npm run dev
```

## Desenvolvimento e testes

Requisitos: Node.js 18+ e npm; Java compatível com a Firebase CLI para o emulador do banco. Use navegadores atuais com suporte a `crypto.randomUUID`, módulos dinâmicos e `AbortSignal.timeout`.

```bash
npm ci
npm run dev        # http://localhost:3000/grafica.html ou /armazem.html
npm run build      # lint sem avisos, formatação e testes locais
npm run check:hosting # verifica páginas, recursos e rotas
npm run test:rules # testes reais de regras no emulador demo-alerta
```

Os testes locais exercitam envio e recebimento, alterações de status, dados corrompidos, escape de HTML, armazenamento bloqueado, concorrência e o transporte Firebase com SDK simulado. Eles não substituem o teste das regras no emulador ou a homologação entre dispositivos reais.

## Conectar ao Firebase

Mantenha `mode: "local"` para a prévia visual. Para integração real, copie `public/firebase-config.json` para `public/firebase-config.local.json`, mude `mode` para `"firebase"` e preencha a configuração Web do projeto. Habilite Anonymous como descrito em [docs/firebase.md](docs/firebase.md).

O site foi publicado no projeto Firebase `alerta-grafica-armazem`, com Hosting, regras do banco e autenticação anônima. O acesso aos dois painéis é direto, sem login visível ou cadastro de dispositivos. A autenticação anônima ocorre automaticamente em segundo plano, e qualquer pessoa com o link pode consultar e atualizar os pedidos. Consulte também o [plano técnico e o modelo de dados](docs/arquitetura.md).

## Publicação preparada

O Hosting publica exclusivamente `public/`. O gancho de pré-publicação executa o build e verifica se o modo público é `firebase` e os emuladores estão desativados. A configuração pública está em `firebase`, e a configuração local permanece separada e ignorada pelo Git/Hosting. Isso evita publicar os exemplos como se fossem o sistema conectado. Publicação realizada em 14/11/2026.

## Se o Live Server ainda mostrar a fila antiga

Use `http://127.0.0.1:5500/public/armazem.html?ui=inkflow-r3` quando o Live Server estiver aberto na raiz do projeto. Com `public/` como raiz do servidor, use `/armazem.html?ui=inkflow-r3`. O parâmetro gera uma nova chave de navegação e permite carregar a tela atual mesmo quando a versão antiga foi guardada por um service worker. A recuperação remove somente caches com prefixo `alerta-grafica-`, atualiza o worker sem cache e preserva os pedidos e a autenticação.

A versão atual pode ser identificada no código-fonte por `<meta name="inkflow-version" content="inkflow-r3">`. Se esse marcador não aparecer na resposta após usar o endereço versionado, confirme se o Live Server está servindo esta pasta e se o arquivo aberto no editor foi salvo.

## Site publicado

- Solicitações: https://alerta-grafica-armazem.web.app/grafica
- Almoxarifado: https://alerta-grafica-armazem.web.app/armazem

O deploy confirmou sucesso para Hosting, Database e Auth. As regras foram compiladas e aceitas pelo Firebase. A suíte comportamental no emulador ainda depende de Java e não foi executada neste ambiente. Antes do uso operacional, homologue um pedido completo entre os dois painéis. A versão do Hosting é `a63011ec00619c03`.
