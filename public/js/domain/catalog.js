(() => {
  'use strict';
  const PRODUCTS = [
    {
      id: 'bloco',
      name: 'Bloco',
      label: 'PAPELARIA',
      category: 'papelaria',
      description: 'Blocos de anotações e papelaria para deixar suas ideias no papel.',
      type: 'Blocos personalizados',
      unit: 'bloco(s)',
      options: [
        {
          label: 'Formato',
          values: ['A5 (14,8 × 21 cm)', 'A4 (21 × 29,7 cm)', 'A6 (10,5 × 14,8 cm)'],
        },
        { label: 'Folhas', values: ['50 folhas', '100 folhas'] },
      ],
    },
    {
      id: 'banner',
      name: 'Banner',
      label: 'COMUNICAÇÃO VISUAL',
      category: 'comunicacao',
      description: 'Banners para eventos, sinalização, ações e divulgação.',
      type: 'Impressão em grande formato',
      unit: 'banner(s)',
      options: [
        {
          label: 'Dimensões',
          values: [
            '60 × 90 cm',
            '80 × 120 cm',
            '100 × 150 cm',
            'Tamanho personalizado (descrever)',
          ],
        },
        { label: 'Acabamento', values: ['Ilhós', 'Bastão e corda', 'A definir'] },
      ],
    },
    {
      id: 'adesivo',
      name: 'Adesivo',
      label: 'COMUNICAÇÃO VISUAL',
      category: 'comunicacao',
      description: 'Adesivos para identificação, brindes, embalagens e campanhas.',
      type: 'Adesivos personalizados',
      unit: 'unidade(s)',
      options: [
        { label: 'Tipo', values: ['Vinil branco', 'Vinil transparente', 'Papel adesivo'] },
        {
          label: 'Tamanho',
          values: ['5 × 5 cm', '10 × 10 cm', 'Folha A4', 'Personalizado (descrever)'],
        },
      ],
    },
    {
      id: 'cartao',
      name: 'Cartão de visita',
      label: 'PAPELARIA',
      category: 'papelaria',
      description: 'Cartões profissionais para apresentar sua marca com estilo.',
      type: 'Identidade profissional',
      unit: 'lote(s)',
      options: [
        { label: 'Formato', values: ['9 × 5 cm', '8,5 × 5,5 cm'] },
        { label: 'Unidades por lote', values: ['100 cartões', '250 cartões', '500 cartões'] },
      ],
    },
    {
      id: 'outros',
      name: 'Outros',
      label: 'DO SEU JEITO',
      category: 'outros',
      description:
        'Não encontrou o que precisa? Descreva seu material e deixe os detalhes com a gente.',
      type: 'Materiais sob medida',
      unit: 'unidade(s)',
      options: [],
    },
  ];

  const ART = {
    outros: `<svg viewBox="0 0 290 170" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <g transform="translate(62 19) rotate(-9 84 65)">
        <rect x="4" y="24" width="163" height="112" rx="12" fill="#a7dbea"/>
        <path d="M4 36V21a10 10 0 0 1 10-10h48l15 15h80a10 10 0 0 1 10 10v83H4Z" fill="#57c9e6"/>
        <g transform="translate(24 0) rotate(17 57 62)">
          <rect width="108" height="119" rx="8" fill="#fff" stroke="#dce7ef" stroke-width="1.5"/>
          <rect x="15" y="17" width="48" height="6" rx="3" fill="#27364f"/>
          <rect x="15" y="32" width="76" height="3" rx="1.5" fill="#d5dfeb"/>
          <rect x="15" y="42" width="61" height="3" rx="1.5" fill="#d5dfeb"/>
          <circle cx="35" cy="76" r="17" fill="#10bee6"/><circle cx="59" cy="76" r="17" fill="#ee71ba" opacity=".9"/>
          <circle cx="47" cy="94" r="17" fill="#ffcf47" opacity=".85"/>
        </g>
        <path d="M0 65a10 10 0 0 1 10-10h56l12 11h84a10 10 0 0 1 10 10l-8 53a10 10 0 0 1-10 9H15a10 10 0 0 1-10-9Z" fill="#8d7ee5"/>
        <rect x="22" y="82" width="51" height="6" rx="3" fill="#e9e3ff"/>
        <rect x="22" y="96" width="34" height="3" rx="1.5" fill="#d1c7ff"/>
        <circle cx="134" cy="107" r="18" fill="#fff"/><path d="M126 107h16m-8-8v16" stroke="#8d7ee5" stroke-width="3" stroke-linecap="round"/>
      </g>
      <circle cx="39" cy="54" r="5" fill="#ffcd47"/><circle cx="251" cy="123" r="4" fill="#65cfe9"/>
      <path d="m239 35 7 7-7 7-7-7Z" fill="#ee84c7"/>
    </svg>`,

    bloco: `<svg viewBox="0 0 290 170" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
    <g transform="translate(78 10) rotate(14 76 72)"><rect x="7" y="10" width="134" height="142" rx="10" fill="#c5bde9"/><rect x="0" y="0" width="134" height="142" rx="10" fill="#fff"/><rect x="4" y="4" width="126" height="134" rx="7" fill="#faf9ff" stroke="#ddd8f5" stroke-width="1.5"/><rect x="0" y="0" width="23" height="142" rx="7" fill="#8d75e9"/><rect x="20" y="0" width="3" height="142" fill="#cfc4fc"/><g fill="#e9e1ff"><circle cx="11" cy="19" r="4"/><circle cx="11" cy="39" r="4"/><circle cx="11" cy="59" r="4"/><circle cx="11" cy="79" r="4"/><circle cx="11" cy="99" r="4"/><circle cx="11" cy="119" r="4"/></g><rect x="37" y="26" width="69" height="8" rx="4" fill="#8173c9"/><rect x="37" y="46" width="73" height="3" rx="1.5" fill="#d8d2ec"/><rect x="37" y="59" width="66" height="3" rx="1.5" fill="#d8d2ec"/><rect x="37" y="72" width="69" height="3" rx="1.5" fill="#d8d2ec"/><rect x="37" y="85" width="49" height="3" rx="1.5" fill="#d8d2ec"/><circle cx="106" cy="112" r="11" fill="#e1dcff"/><path d="M101 112h10m-5-5v10" stroke="#907fe3" stroke-width="2" stroke-linecap="round"/></g><g fill="#ad9dec"><circle cx="46" cy="49" r="5"/><circle cx="248" cy="123" r="3"/></g><path d="M42 120l9-9 9 9-9 9z" fill="#f4bde4"/></svg>`,
    banner: `<svg viewBox="0 0 290 170" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
    <defs><linearGradient id="bannerInk" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#2fcbf4"/><stop offset=".55" stop-color="#17a8e5"/><stop offset="1" stop-color="#116bbf"/></linearGradient></defs><path d="M89 19h117" stroke="#596f85" stroke-width="4" stroke-linecap="round"/><path d="M90 21v134m115-134v134" stroke="#71859a" stroke-width="3"/><rect x="92" y="25" width="112" height="125" fill="url(#bannerInk)" rx="2"/><path d="M92 115c30-50 62-28 112-69v104H92z" fill="#fc5daf" opacity=".95"/><path d="M92 150v-36c39-7 66-10 112 18v18z" fill="#ffcf39" opacity=".93"/><circle cx="158" cy="67" r="24" fill="#fff" opacity=".17"/><text x="148" y="72" font-size="25" font-weight="900" text-anchor="middle" fill="#fff" font-family="Arial">GO!</text><rect x="89" y="149" width="118" height="6" rx="2" fill="#56677b"/><path d="M149 155v7m-45 0h90" stroke="#66788c" stroke-width="4" stroke-linecap="round"/><g fill="#7fdff0"><circle cx="62" cy="43" r="4"/><circle cx="231" cy="117" r="5"/></g><path d="M231 43l8 8-8 8-8-8z" fill="#ff91d0"/></svg>`,
    adesivo: `<svg viewBox="0 0 290 170" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
    <g transform="translate(60 15) rotate(-12 85 70)"><rect x="0" y="0" width="170" height="135" rx="14" fill="#fff" stroke="#fae2ac" stroke-width="2"/><circle cx="53" cy="47" r="30" fill="#ffc62f"/><path d="M41 38l7 15 7-16 7 17 7-16" stroke="#242944" stroke-width="5" fill="none" stroke-linecap="round" stroke-linejoin="round"/><circle cx="119" cy="43" r="26" fill="#f66fba"/><text x="119" y="49" text-anchor="middle" font-size="15" font-weight="900" fill="#fff" font-family="Arial">HEY!</text><path d="M42 91l6-16 6 16 17 1-14 10 4 17-13-10-13 10 4-17-14-10z" fill="#42c5eb"/><rect x="91" y="83" width="54" height="33" rx="16.5" fill="#9181ec"/><path d="M103 99h30" stroke="white" stroke-width="3" stroke-linecap="round"/><circle cx="17" cy="18" r="4" fill="#e8e6e0"/><circle cx="151" cy="117" r="4" fill="#e8e6e0"/></g><path d="m33 40 9-9" stroke="#ffc448" stroke-width="3" stroke-linecap="round"/><path d="m254 121 9-9" stroke="#f89ccc" stroke-width="3" stroke-linecap="round"/></svg>`,
    cartao: `<svg viewBox="0 0 290 170" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
    <g transform="translate(38 17)"><g transform="translate(22 26) rotate(-16 95 55)"><rect width="168" height="101" rx="9" fill="#f8b6d3"/><rect x="0" y="0" width="168" height="101" rx="9" fill="#f7c7df"/><circle cx="132" cy="76" r="37" fill="#fa94c5"/></g><g transform="translate(35 9) rotate(10 89 56)"><rect width="168" height="103" rx="8" fill="#fff"/><rect width="168" height="103" rx="8" fill="#17233e"/><path d="M112 0h56v103H62z" fill="#06bce2"/><path d="M143 0h25v103H94z" fill="#f7bd35"/><circle cx="143" cy="82" r="24" fill="#f25cae"/><text x="18" y="47" font-family="Arial" font-weight="900" font-size="22" fill="#fff">hello.</text><text x="18" y="62" font-family="Arial" font-size="7" letter-spacing="2" fill="#d7e1ee">CREATIVE STUDIO</text><rect x="18" y="75" width="36" height="3" rx="1.5" fill="#687991"/></g></g></svg>`,
  };

  globalThis.InkFlowCatalog = Object.freeze({ PRODUCTS, ART });
})();
