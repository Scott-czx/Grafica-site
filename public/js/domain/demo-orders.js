(() => {
  'use strict';
  const isoDaysAgo = (days, hours = 0) =>
    new Date(Date.now() - (days * 24 + hours) * 3600000).toISOString();
  const isoDaysLater = days => {
    const d = new Date();
    d.setDate(d.getDate() + days);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  };
  const demoItem = (id, name, quantity, unit, option) => ({
    id,
    name,
    quantity,
    unit: unit || 'unidade(s)',
    options: [{ label: 'Formato', value: option || 'Personalizado' }],
    note: '',
  });
  const DEMO_ORDERS = [
    {
      id: 'IF-DEMO-1042',
      createdAt: isoDaysAgo(0, 1),
      requester: 'Lara Mendes',
      department: 'Marketing',
      priority: 'Alta',
      neededBy: isoDaysLater(3),
      notes: 'Material para a campanha de lançamento.',
      items: [
        demoItem('banner', 'Banner', 2, 'unidade(s)', '80 × 120 cm'),
        demoItem('adesivo', 'Adesivo', 50, 'unidade(s)', 'Redondo'),
      ],
      demo: true,
      initialStatus: 'Pendente',
    },
    {
      id: 'IF-DEMO-1041',
      createdAt: isoDaysAgo(0, 3),
      requester: 'Paulo Ribeiro',
      department: 'Eventos',
      priority: 'Normal',
      neededBy: isoDaysLater(5),
      notes: 'Preferência por acabamento fosco.',
      items: [demoItem('bloco', 'Bloco', 30, 'unidade(s)', 'A5')],
      demo: true,
      initialStatus: 'Em produção',
    },
    {
      id: 'IF-DEMO-1040',
      createdAt: isoDaysAgo(1, 1),
      requester: 'Bia Santos',
      department: 'Comercial',
      priority: 'Normal',
      neededBy: isoDaysLater(2),
      notes: '',
      items: [demoItem('cartao', 'Cartão de visita', 150, 'unidade(s)', '9 × 5 cm')],
      demo: true,
      initialStatus: 'Pronto',
    },
    {
      id: 'IF-DEMO-1039',
      createdAt: isoDaysAgo(1, 5),
      requester: 'Carlos Silva',
      department: 'Recepção',
      priority: 'Alta',
      neededBy: isoDaysLater(4),
      notes: '',
      items: [demoItem('adesivo', 'Adesivo', 100, 'unidade(s)', '5 × 5 cm')],
      demo: true,
      initialStatus: 'Pendente',
    },
    {
      id: 'IF-DEMO-1038',
      createdAt: isoDaysAgo(2, 2),
      requester: 'Ana Costa',
      department: 'Administrativo',
      priority: 'Normal',
      neededBy: isoDaysLater(1),
      notes: '',
      items: [demoItem('bloco', 'Bloco', 10, 'unidade(s)', 'A6')],
      demo: true,
      initialStatus: 'Concluído',
    },
    {
      id: 'IF-DEMO-1037',
      createdAt: isoDaysAgo(2, 6),
      requester: 'Rita Gomes',
      department: 'Comunicação',
      priority: 'Normal',
      neededBy: isoDaysLater(7),
      notes: '',
      items: [
        demoItem('banner', 'Banner', 3, 'unidade(s)', 'Lona 440g'),
        demoItem('cartao', 'Cartão de visita', 200, 'unidade(s)', 'Couchê'),
      ],
      demo: true,
      initialStatus: 'Em produção',
    },
  ];
  globalThis.InkFlowDemo = Object.freeze({ DEMO_ORDERS });
})();
