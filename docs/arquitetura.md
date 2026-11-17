# Plano técnico e arquitetura

## Análise e decisões

O pacote original reúne dois frontends completos em HTML/CSS/JavaScript e comunica os painéis por localStorage/JSON. A base anterior do projeto usa Firebase, mas seu modelo contém apenas tipo, valor e dois status. A nova interface requer múltiplos materiais, solicitante, setor, prioridade, prazo e quatro etapas.

O plano implementado reaproveita as páginas e estilos do ZIP, extrai catálogo/exemplos para módulos próprios e introduz uma fachada de dados com dois transportes. O modo local permite revisar o visual no Live Server. O modo Firebase usa autenticação, permissões e assinaturas em tempo real; falhas não são tratadas como gravação local bem-sucedida.

## Camadas

1. `domain`: catálogo de materiais, ilustrações e exemplos.
2. `pages`: renderização, busca, filtros, formulários, navegação, drawers e exportação.
3. `local-store`: validação e normalização comuns, APIs de criação/importação e atualização, seleção explícita do transporte e notificações.
4. `firebase-store`: repositório de pedidos, consultas por autor e mudanças atômicas com revisão.
5. Firebase Authentication/Realtime Database: identidade, persistência e validação de permissões no servidor.

Os arquivos são JavaScript nativo. Os módulos de interface continuam carregando por `defer`, aproveitando o código original. O SDK Firebase só é importado no modo conectado; a prévia não depende dele.

## Modelo versionado

```text
acessos/{uid}                  grafica | armazem | admin
inkflow/v1/requests/{id}
  id                          IF-<identificador único>
  createdAt                   Data ISO do pedido (também preservada na importação)
  createdBy                   UID autenticado que registrou/importou
  recordedAt                  Horário do registro no servidor
  requester, department       Solicitante e setor
  priority, neededBy, notes    Prioridade, prazo e observações do solicitante
  items[]                     Material, quantidade, unidade, opções e detalhes
  status                      Pendente | Em produção | Pronto | Concluído
  version                     Revisão inteira, iniciando em 1
  updatedAt                   Horário da atualização no servidor
inkflow/v1/internal/{id}
  assignee, note              Responsável e anotação interna
  version, updatedAt          Revisão e horário da atualização correspondente
```

Por escolha explícita do usuário, o acesso atual é direto: os dois painéis compartilham pedidos e anotações, sem aprovação por dispositivo. Uma sessão anônima é criada automaticamente pelo Firebase; ela não torna o site privado, pois qualquer visitante pode obter uma sessão. O caminho de permissões legado permanece preservado, mas não controla o modelo InkFlow v1 atual.

A criação confirma a resposta do banco antes de limpar o carrinho. Alterações de status, revisão e dados internos usam uma atualização atômica em vários caminhos. As regras exigem a revisão anterior + 1: se duas pessoas salvarem a mesma revisão, a segunda gravação falha e o operador precisa reabrir o pedido. Assinaturas atualizam as listas sem recarregar a página e sem sobrescrever formulários que o operador está preenchendo.

Exemplos nunca são carregados no modo Firebase. Importações não sobrescrevem IDs já presentes nem enviam automaticamente dados locais. O caminho legado `solicitacoes/` e seus utilitários foram preservados, sem conversão silenciosa ou apagamento.

## Evolução

A separação permite acrescentar autenticação de funcionários com contas nominais, paginação por cursor, anexos, auditoria de alterações e APIs adicionais. Atualmente a lista conectada carrega todos os pedidos visíveis; os índices por autor, status e horário já estão definidos, mas paginação de grandes volumes ainda exige implementação.

Contas anônimas persistentes identificam tecnicamente o navegador e não exigem autorização de dispositivos. Se o uso exigir acesso por pessoa, deve-se acrescentar login nominal, mantendo a mesma fachada de dados e controles de acesso.

## Validação

Os testes locais cobrem o fluxo dos dois controladores, fachada e SDK simulado. Há uma suíte separada para o emulador real das regras, incluindo acesso direto, campos imutáveis e conflitos de revisão. Capturas locais do almoxarifado em 1440 px e 390 px permitem conferir a estrutura visual; diferenças de fonte instalada e renderização entre navegadores podem alterar medidas. A falta de Java neste ambiente impede executar a suíte comportamental de regras. Na publicação, o Firebase compilou e aceitou as regras após a correção das verificações de arrays para usar hasChild em vez de numChildren. A homologação de comportamento e dos dispositivos permanece necessária antes do uso operacional.
