# Gráfica Aramenet — Gestão de solicitações

Aplicação web para solicitar materiais gráficos e acompanhar o atendimento em um painel de almoxarifado. Reúne os itens do pedido, o solicitante, o setor, o prazo e o andamento da produção em um único fluxo.

O projeto possui duas telas complementares: uma para **quem solicita materiais** e outra para **quem organiza e atende os pedidos**. A interface é responsiva e utiliza uma identidade visual inspirada nas cores CMYK da impressão.

## Como funciona

1. O solicitante escolhe os materiais no catálogo e informa as quantidades e especificações.
2. Preenche seus dados, setor, prioridade, prazo e observações, e envia o pedido.
3. O almoxarifado recebe a solicitação e acompanha a fila em tabela ou quadro kanban.
4. A equipe define o responsável, registra anotações e atualiza o status: **Pendente → Em produção → Pronto → Concluído**.
5. No modo Firebase, as alterações são sincronizadas entre os dispositivos conectados.

## Painéis

| Painel       | Finalidade                                                  | Arquivo               |
| ------------ | ----------------------------------------------------------- | --------------------- |
| Solicitações | Montar pedidos e consultar o histórico do solicitante       | `public/grafica.html` |
| Almoxarifado | Organizar a fila, filtrar pedidos e atualizar o atendimento | `public/armazem.html` |

A documentação original informa os seguintes endereços de publicação. A disponibilidade da hospedagem não é verificada pelos testes deste repositório:

- [Abrir Solicitações](https://alerta-grafica-armazem.web.app/grafica)
- [Abrir Almoxarifado](https://alerta-grafica-armazem.web.app/armazem)

**Acesso no modo conectado:** a configuração atual utiliza autenticação anônima automática, sem tela de login ou separação de permissões entre os painéis. Qualquer visitante que obtenha uma sessão anônima pode consultar os pedidos e atualizar o atendimento, incluindo as anotações. Para explorar o projeto sem alterar dados compartilhados, siga o modo local abaixo.

## Funcionalidades

| Área           | Recursos                                                                                                                                               |
| -------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Solicitações   | Catálogo de blocos, banners, adesivos e cartões de visita; carrinho; quantidades e especificações; solicitante, setor, prioridade, prazo e observações |
| Acompanhamento | Histórico, resumo do pedido, cópia, impressão e exportação JSON                                                                                        |
| Almoxarifado   | Visão geral, busca, filtros, tabela, kanban e consulta de concluídos                                                                                   |
| Atendimento    | Alteração de status, responsável, anotações e alerta sonoro opcional                                                                                   |
| Dados          | Importação JSON, exportação CSV e sincronização em tempo real no modo Firebase                                                                         |

## Tecnologias e organização

- **HTML5 e CSS3:** páginas responsivas, estilos e identidade visual.
- **JavaScript com módulos ES:** lógica das telas, catálogo, validações e acesso aos dados.
- **Firebase Authentication:** criação automática de sessões anônimas.
- **Firebase Realtime Database:** persistência e sincronização dos pedidos.
- **Firebase Hosting:** configuração de publicação, rotas e cabeçalhos HTTP.
- **Node.js e npm:** servidor de desenvolvimento, scripts e testes.
- **ESLint e Prettier:** análise estática e padronização do código.

O frontend utiliza JavaScript nativo. O Node.js é usado nas ferramentas de desenvolvimento; os dados do modo conectado são atendidos pelo Firebase.

## Executar no computador

### 1. Requisitos e instalação

Tenha **Git, Node.js 18 ou superior e npm** instalados. Utilize um navegador atualizado e execute os comandos no terminal:

```bash
git clone https://github.com/Scott-czx/Grafica-site.git
cd Grafica-site
npm ci
```

### 2. Configurar uma demonstração local

Antes de abrir a aplicação, crie o arquivo `public/firebase-config.local.json` com este conteúdo:

```json
{
  "mode": "local",
  "firebase": {},
  "useEmulators": false,
  "emulators": {
    "authPort": 9099,
    "databasePort": 9000
  }
}
```

Esse arquivo é ignorado pelo Git, por isso precisa ser criado após clonar o repositório. Em `localhost` ou `127.0.0.1`, ele tem preferência sobre a configuração pública. Sem ele, a aplicação utiliza `public/firebase-config.json`, atualmente configurado para o Firebase do projeto.

### 3. Iniciar e abrir os painéis

```bash
npm run dev
```

| Endereço local                                          | Tela                         |
| ------------------------------------------------------- | ---------------------------- |
| [localhost:3000](http://localhost:3000)                 | Almoxarifado, página inicial |
| [localhost:3000/grafica](http://localhost:3000/grafica) | Solicitações                 |
| [localhost:3000/armazem](http://localhost:3000/armazem) | Almoxarifado                 |

Para encerrar o servidor, pressione `Ctrl+C` no terminal.

### 4. Experimentar o fluxo

Abra os dois painéis em abas do **mesmo navegador e mesmo endereço de origem**. Crie um pedido em Solicitações e acompanhe sua chegada ao Almoxarifado. Depois, altere o status e consulte o histórico do solicitante.

Quando ainda não há pedidos reais, o almoxarifado pode mostrar seis pedidos de exemplo. Eles podem ser ocultados e são substituídos na visualização quando um pedido real é criado.

Também é possível usar a extensão Live Server do VS Code: abra `public/grafica.html` ou `public/armazem.html` com **Open with Live Server**. Mantenha as duas abas na mesma origem para compartilhar os dados locais. Evite abrir os arquivos diretamente com `file://`.

## Modo local e modo Firebase

| Comportamento              | Local                            | Firebase                                                 |
| -------------------------- | -------------------------------- | -------------------------------------------------------- |
| Armazenamento              | No navegador                     | No Realtime Database                                     |
| Compartilhamento           | Abas da mesma origem e navegador | Dispositivos conectados ao mesmo projeto                 |
| Dependência do Firebase    | Não exige configuração de nuvem  | Exige projeto configurado e conexão                      |
| Autenticação               | Não utiliza Firebase Auth        | Sessão anônima automática                                |
| Migração de pedidos locais | Exportação/importação JSON       | Recebe a importação explícita; não migra automaticamente |

No modo local, limpar os dados do navegador pode apagar os pedidos. No modo conectado, uma falha de gravação não é apresentada como sucesso nem substituída silenciosamente por armazenamento local.

Para configurar **seu próprio Firebase**, consulte [Configuração e integração Firebase](docs/firebase.md). Em resumo:

1. Crie um aplicativo Web, habilite o Realtime Database e a autenticação anônima.
2. Preencha `public/firebase-config.local.json` com sua configuração Web e `"mode": "firebase"` para testar no computador.
3. Publique as regras de `firebase/database.rules.json` no seu banco.
4. Para hospedar, ajuste também `public/firebase-config.json`, `.firebaserc` e os identificadores de Hosting e Database em `firebase.json` para seu projeto.

O arquivo local não é publicado no Hosting. Configurações Web do Firebase são públicas; credenciais administrativas e chaves de conta de serviço não devem ser colocadas no frontend.

## Estrutura do repositório

| Caminho                                       | Responsabilidade                                                   |
| --------------------------------------------- | ------------------------------------------------------------------ |
| `public/grafica.html` e `public/armazem.html` | Estrutura das duas telas                                           |
| `public/css/` e `public/assets/`              | Estilos, efeitos e recursos visuais                                |
| `public/js/pages/`                            | Comportamento específico de cada painel                            |
| `public/js/domain/`                           | Catálogo de materiais e pedidos de exemplo                         |
| `public/js/core/`                             | Validações, utilitários, armazenamento local e integração Firebase |
| `public/js/ui/`                               | Alertas sonoros e efeitos da interface                             |
| `firebase/database.rules.json`                | Permissões e validações executadas pelo banco                      |
| `scripts/`                                    | Servidor local, verificações de hospedagem e execução dos testes   |
| `tests/`                                      | Testes de comportamento e integração                               |
| `docs/`                                       | Documentação técnica e configuração                                |
| `firebase.json`                               | Rotas, cabeçalhos, emuladores e publicação                         |

A camada de dados separa o armazenamento dos controladores das telas. Isso permite utilizar o modo local ou Firebase sem duplicar a lógica dos painéis. Veja o [plano técnico e modelo de dados](docs/arquitetura.md) para mais detalhes.

## Qualidade e testes

```bash
npm run build
```

O comando executa análise estática, verificação de formatação, checagem dos recursos e rotas de hospedagem e testes automatizados. Também é possível executar cada etapa separadamente:

| Comando                 | O que verifica                                                |
| ----------------------- | ------------------------------------------------------------- |
| `npm run lint`          | JavaScript com ESLint, sem avisos permitidos                  |
| `npm run format:check`  | Formatação com Prettier                                       |
| `npm run check:hosting` | Páginas, arquivos referenciados e rotas                       |
| `npm test`              | Comportamento da aplicação e integração com Firebase simulado |
| `npm run test:rules`    | Regras do banco em um emulador Firebase                       |

Na revisão desta documentação, **21 testes locais passaram**, além das verificações de lint, formatação e hospedagem. A suíte cobre criação e acompanhamento de pedidos, alterações de status, validações, escape de HTML, falhas de armazenamento, concorrência e o transporte Firebase com SDK simulado.

Os testes de regras exigem **Firebase CLI e Java compatível com o emulador** e não foram executados nesta revisão. Os testes locais não substituem a validação das regras no emulador nem um teste completo entre dispositivos reais.

## Publicação

Com a Firebase CLI instalada e autenticada, e os arquivos apontando para o seu projeto:

```bash
npm run deploy
```

O Hosting publica somente a pasta `public/`. Antes da publicação, os scripts executam o build e exigem que a configuração pública esteja em modo Firebase, com emuladores desativados.

| Comando                  | Destino                                |
| ------------------------ | -------------------------------------- |
| `npm run deploy:hosting` | Somente o site                         |
| `npm run deploy:rules`   | Somente as regras do Realtime Database |

## Decisões, limitações e uso de IA

Este projeto reúne desenvolvimento assistido por IA, organização modular, validações e testes automatizados. O código e os testes disponíveis permitem examinar o resultado desse processo; o repositório não registra uma divisão detalhada de autoria por ferramenta ou por trecho.

A base visual — HTML, ilustrações SVG, identidade CMYK e estilos responsivos — foi adaptada do pacote original **InkFlow**, conforme a documentação do projeto.

Alguns pontos devem ser considerados ao avaliar ou evoluir a aplicação:

- **Permissões:** o modelo atual permite acesso compartilhado aos pedidos; separar as telas não cria uma restrição de acesso por função.
- **Validações:** o código inclui escape de HTML, proteção contra fórmulas na exportação CSV e regras de estrutura e revisão no banco. Esses mecanismos não substituem o controle de acesso por usuário.
- **Concorrência:** atualizações de atendimento utilizam revisões para detectar alterações simultâneas.
- **Evolução:** controle de acesso por função e validação das regras no emulador são próximos passos úteis antes de ampliar o uso operacional.

## Problemas comuns

| Situação                                | Como resolver                                                                                                                                    |
| --------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| `npm` não encontra `package.json`       | Entre na pasta `Grafica-site` antes de executar os comandos                                                                                      |
| A demonstração tenta acessar o Firebase | Confira o nome, o JSON e o `"mode": "local"` do arquivo `public/firebase-config.local.json`; use `localhost` ou `127.0.0.1`                      |
| O pedido não aparece na outra aba       | Use a mesma origem nas duas abas; `localhost` e `127.0.0.1`, portas diferentes ou navegadores diferentes não compartilham os mesmos dados locais |
| A tela parece ser de uma versão antiga  | Tente `/armazem.html?ui=inkflow-r3` na raiz pública do servidor e confirme que está servindo a pasta correta                                     |
| O pedido não aparece em outro aparelho  | Use o modo Firebase ou transfira os dados por JSON; o modo local não sincroniza entre aparelhos                                                  |
