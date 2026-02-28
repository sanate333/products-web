type FaqItem = { q: string; a: string };
type BannerCopy = { titles: string[]; subtitles: string[] };

const safe = (value: unknown): string => String(value || '').trim();
const lower = (value: unknown): string => safe(value).toLowerCase();

const categoryHint = (category: string): string => {
  const c = lower(category);
  if (c.includes('cabello')) return 'rutina de cabello';
  if (c.includes('piel') || c.includes('acne')) return 'rutina de piel';
  if (c.includes('suplement')) return 'rutina diaria';
  return 'rutina diaria';
};

export const suggestHighlights = (productName: string, category = ''): string[] => {
  const name = safe(productName) || 'este producto';
  const hint = categoryHint(category);
  return [
    `Si vas con afan, ${name} entra facil en tu ${hint}.`,
    `Ayuda a mejorar constancia sin enredos ni pasos largos.`,
    'Compra segura, entrega rapida y acompanamiento por WhatsApp.',
  ];
};

export const suggestFAQs = (productName: string, category = ''): FaqItem[] => {
  const name = safe(productName) || 'este producto';
  const hint = categoryHint(category);
  return [
    { q: `Como empiezo con ${name}?`, a: `Arranca con uso diario y constante dentro de tu ${hint}.` },
    { q: 'En cuanto tiempo se notan cambios?', a: 'Depende de cada persona, pero la constancia suele marcar diferencia.' },
    { q: 'Sirve para hombres y mujeres?', a: 'Si, se puede usar en ambos casos.' },
    { q: 'Tiene una rutina complicada?', a: 'No. La idea es que sea facil de mantener todos los dias.' },
    { q: 'Puedo pagar contraentrega?', a: 'Si hay cobertura en tu zona, se habilita al finalizar compra.' },
    { q: 'Hacen envios rapidos?', a: 'Si, normalmente entre 2 y 3 dias habiles segun ciudad.' },
  ];
};

export const suggestComparisonRows = (productName: string, category = ''): string[][] => {
  const name = safe(productName) || 'Nuestra marca';
  const hint = categoryHint(category);
  return [
    ['Facilidad de uso', `${name} se integra facil a tu ${hint}`, 'Suele requerir mas pasos'],
    ['Acompanamiento', 'Soporte por WhatsApp', 'Atencion limitada'],
    ['Entrega', 'Rapida segun cobertura', 'Sin tiempos claros'],
    ['Confianza de compra', 'Informacion clara antes de pagar', 'Informacion incompleta'],
    ['Constancia', 'Formato pensado para uso diario', 'Menos practico para mantener rutina'],
  ];
};

export const suggestTestimonialsText = (productName: string, category = ''): string[] => {
  const name = safe(productName) || 'el producto';
  const c = lower(category);
  const flavor = c.includes('cabello')
    ? 'ya se me ve mas ordenado'
    : c.includes('piel') || c.includes('acne')
      ? 'me siento mas tranquila con mi piel'
      : 'me senti comoda con la rutina';

  return [
    `Lo empece hace poco y ${flavor}.`,
    `Con ${name} me fue bien, sin complicarme.`,
    'Llego rapido y bien empacado, todo claro.',
    'Me gusto que no se siente pesado.',
    'La asesoria por WhatsApp ayuda full.',
    'Por fin una rutina que si pude sostener.',
    'Se nota cuando uno es juicioso.',
    'Volvi a pedir porque me funciono bien.',
    'Buena relacion precio y tranquilidad al comprar.',
  ];
};

export const suggestBannersCopy = (productName: string, category = ''): BannerCopy => {
  const name = safe(productName) || 'tu producto';
  const hint = categoryHint(category);
  return {
    titles: [
      `${name}: resultados con constancia`,
      'Compra con respaldo y entrega rapida',
    ],
    subtitles: [
      `Pensado para que mantengas tu ${hint} sin enredos.`,
      'Pago seguro y acompanamiento cercano por WhatsApp.',
    ],
  };
};

