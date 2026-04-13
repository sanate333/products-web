/**
 * sanate.store Product Landing Injection Hotfix v2
 * Injects landing-style content (benefits, usage, studies) INSIDE each product page
 * NO external links. NO new URLs. Content lives within /producto/{id}/{slug}
 */
(function() {
  'use strict';

  // ========== ALL 25 PRODUCTS BY ID ==========
  const productData = {
    7: {
      name: 'Jabón Cúrcuma + Ácido Kójico x3',
      benefits: [
        { icon: '✨', title: 'Aclara Manchas', desc: 'La cúrcumina inhibe la tirosinasa reduciendo hiperpigmentación y paño facial' },
        { icon: '🔥', title: 'Combate el Acné', desc: 'Antiinflamatorio natural que limpia poros a profundidad sin resecar' },
        { icon: '🌿', title: '100% Artesanal', desc: 'Sin parabenos ni sulfatos — ingredientes naturales colombianos' }
      ],
      usage: 'Humedece el rostro con agua tibia. Aplica el jabón con movimientos circulares por 2 minutos. Enjuaga con agua fría para cerrar poros. Usa mañana y noche para mejores resultados.',
      study: 'Journal of Cosmetic Dermatology (2019): La curcumina reduce significativamente la hiperpigmentación en 8 semanas de uso tópico.'
    },
    8: {
      name: 'Melena de León x60 Cápsulas',
      benefits: [
        { icon: '🧠', title: 'Claridad Mental', desc: 'Estimula el Factor de Crecimiento Nervioso (NGF) para neuronas más fuertes' },
        { icon: '💡', title: 'Memoria y Enfoque', desc: 'Mejora la concentración, ideal para estudio y trabajo intenso' },
        { icon: '⚡', title: 'Energía sin Cafeína', desc: 'Vitalidad sostenida todo el día sin nerviosismo ni crash' }
      ],
      usage: 'Tomar 2 cápsulas al día con un vaso de agua, preferiblemente en la mañana o antes de actividades que requieran concentración. Uso continuo por mínimo 4 semanas.',
      study: 'Mori et al. (2009, Phytotherapy Research): Mejora significativa de función cognitiva en adultos tras 16 semanas de suplementación con Hericium erinaceus.'
    },
    9: {
      name: 'x2 Sebos de Res + x2 Jabones Cúrcuma',
      benefits: [
        { icon: '💧', title: 'Hidratación + Limpieza', desc: 'Combo completo: los jabones limpian y aclaran, el sebo hidrata y sella' },
        { icon: '🌟', title: 'Reduce Manchas y Cicatrices', desc: 'Doble acción aclarante del kójico + regeneración del sebo de res' },
        { icon: '🎯', title: 'Rutina Completa', desc: '4 productos para cubrir limpieza e hidratación facial y corporal' }
      ],
      usage: 'Paso 1: Limpia con jabón de cúrcuma 2 min, enjuaga. Paso 2: Aplica sebo de res en piel húmeda, masajea suavemente. Mañana con jabón + sebo. Noche igual.',
      study: 'Journal of Lipid Research: El perfil de ácidos grasos del sebo bovino es biomimético con los lípidos naturales de la piel humana, facilitando absorción profunda.'
    },
    10: {
      name: 'Cúrcuma + Ácido Kójico x6 Jabones',
      benefits: [
        { icon: '✨', title: 'Pack Familiar', desc: '6 jabones para toda la familia — alcanza para 3+ meses de uso diario' },
        { icon: '💰', title: 'Mejor Precio por Unidad', desc: 'Ahorro significativo vs comprar individual — el favorito de nuestros clientes' },
        { icon: '🔄', title: 'Resultados Acumulativos', desc: 'El uso continuo potencia los efectos aclarantes semana tras semana' }
      ],
      usage: 'Mismo uso que el jabón individual. Humedece, aplica 2 min con masaje circular, enjuaga con agua fría. Al tener 6 unidades, mantienes tu rutina sin interrupciones.',
      study: 'Dermatología clínica confirma que la consistencia en el uso de activos despigmentantes es clave para resultados visibles en 4-8 semanas.'
    },
    11: {
      name: 'Jabón Avena y Arroz x3',
      benefits: [
        { icon: '🤍', title: 'Piel Sensible', desc: 'La avena coloidal calma irritación, enrojecimiento y picazón al instante' },
        { icon: '💧', title: 'Hidratación Suave', desc: 'El arroz aporta vitamina E y ácido ferúlico para piel nutrida y suave' },
        { icon: '👶', title: 'Para Toda la Familia', desc: 'Tan suave que es apto para pieles delicadas, incluyendo niños' }
      ],
      usage: 'Aplica sobre piel húmeda con movimientos suaves. Deja actuar 1-2 minutos para que la avena calme la piel. Enjuaga con agua tibia. Ideal para uso diario.',
      study: 'Journal of Drugs in Dermatology: La avena coloidal tiene propiedades antiinflamatorias comprobadas, aprobada por la FDA como protector de piel.'
    },
    12: {
      name: 'Mix 3 Jabones: Cúrcuma, Avena, Caléndula',
      benefits: [
        { icon: '🎨', title: 'Variedad Completa', desc: 'Tres fórmulas diferentes para alternar según lo que tu piel necesite cada día' },
        { icon: '✨', title: 'Cúrcuma Aclara', desc: 'Reduce manchas y combate el acné con propiedades antiinflamatorias' },
        { icon: '🌼', title: 'Caléndula Repara', desc: 'Cicatrizante natural que calma piel irritada y sensible' }
      ],
      usage: 'Alterna los jabones según necesidad: Cúrcuma para manchas/acné, Avena para calmar, Caléndula para reparar. Aplica 2 min con masaje, enjuaga con agua tibia.',
      study: 'Phytomedicine Journal: Los extractos de Calendula officinalis aceleran la cicatrización y reducen inflamación cutánea.'
    },
    13: {
      name: 'Jabón Caléndula + Aloe Vera x3',
      benefits: [
        { icon: '🌼', title: 'Cicatrizante Natural', desc: 'La caléndula acelera la regeneración celular en zonas dañadas' },
        { icon: '💚', title: 'Aloe Vera Calmante', desc: 'Hidrata, desinflama y protege la barrera natural de la piel' },
        { icon: '🛡️', title: 'Protección Diaria', desc: 'Ideal para pieles que sufren de irritación, rosácea o dermatitis' }
      ],
      usage: 'Aplica sobre piel húmeda con movimientos suaves. Masajea por 2 minutos enfocándote en áreas irritadas. Enjuaga con agua tibia. Uso diario mañana y noche.',
      study: 'Wounds Journal (2008): Calendula officinalis promueve la epitelización y tiene efecto antimicrobiano en heridas cutáneas.'
    },
    14: {
      name: 'Néctar Capilar 200g',
      benefits: [
        { icon: '💎', title: 'Brillo Intenso', desc: 'Cabello radiante y sedoso desde la primera aplicación sin apelmazar' },
        { icon: '🌊', title: 'Elimina el Frizz', desc: 'Control total del encrespamiento incluso en clima húmedo' },
        { icon: '💪', title: 'Fortalece el Cabello', desc: 'Biotina y queratina vegetal que reducen la caída y quiebre' }
      ],
      usage: 'Después de lavar el cabello, aplica una cantidad generosa en medios y puntas húmedas. No enjuagues. Peina como de costumbre. Úsalo cada vez que laves tu cabello.',
      study: 'International Journal of Trichology: La biotina mejora significativamente el grosor y la resistencia del cabello en 90 días de uso constante.'
    },
    15: {
      name: 'Colágeno Polen Multifloral x90 Cápsulas',
      benefits: [
        { icon: '🐝', title: 'Superalimento del Huila', desc: 'Polen multifloral 100% colombiano, rico en 22 aminoácidos esenciales' },
        { icon: '⚡', title: 'Energía Pura y Natural', desc: 'Vitalidad sostenida todo el día sin cafeína ni estimulantes artificiales' },
        { icon: '🛡️', title: 'Defensas Blindadas', desc: 'Fortalece el sistema inmunológico con vitaminas B, zinc y antioxidantes' }
      ],
      usage: 'Tomar 2-3 cápsulas al día con un vaso de agua, preferiblemente en la mañana con el desayuno. Consumo continuo para mejores resultados.',
      study: 'Journal of Food Science and Technology: El polen de abeja contiene un perfil completo de aminoácidos y compuestos bioactivos con efecto inmunomodulador.'
    },
    16: {
      name: 'Crema Sebo de Res + x2 Jabones Cúrcuma',
      benefits: [
        { icon: '🧴', title: 'Limpieza + Nutrición', desc: 'Los jabones aclaran y limpian, la crema de sebo sella la hidratación' },
        { icon: '✨', title: 'Aclara y Regenera', desc: 'Doble acción: el kójico despigmenta mientras el sebo repara tejidos' },
        { icon: '💧', title: 'Piel Suave Todo el Día', desc: 'La crema de sebo crea una barrera protectora sin sensación grasosa' }
      ],
      usage: 'Mañana: Lava con jabón de cúrcuma, enjuaga, aplica crema de sebo en rostro y cuello. Noche: Repite la rutina. La crema rinde para 30+ días de uso.',
      study: 'Dermatología colombiana: La combinación de limpieza activa + hidratación oclusiva es el estándar para tratamiento de hiperpigmentación.'
    },
    38: {
      name: 'Secreto Japonés x2 Jabones + Sebo 10g',
      benefits: [
        { icon: '🌸', title: 'Ritual Milenario', desc: 'El secreto de las geishas: agua de arroz fermentada para piel perfecta' },
        { icon: '🧴', title: 'Kit de Inicio', desc: '2 jabones de arroz + muestra de sebo para probar la rutina completa' },
        { icon: '⏰', title: 'Anti-Edad Natural', desc: 'El ácido ferúlico del arroz es un potente antioxidante anti-arrugas' }
      ],
      usage: 'Paso 1: Jabón de arroz como limpieza diaria mañana y noche. Paso 2: Aplica el sebo de 10g como hidratante en zonas secas. Ideal para conocer el ritual japonés.',
      study: 'Japanese Journal of Dermatology: El ácido ferúlico del salvado de arroz reduce el fotoenvejecimiento y mejora la luminosidad en pieles asiáticas y latinas.'
    },
    39: {
      name: 'Tripack Jabones Artesanales',
      benefits: [
        { icon: '🎁', title: '3 Fórmulas Únicas', desc: 'Carbón activado + Avena + Arcilla verde — una para cada necesidad' },
        { icon: '🖤', title: 'Carbón Desintoxica', desc: 'Absorbe toxinas e impurezas de poros profundos como un imán' },
        { icon: '💚', title: 'Arcilla Purifica', desc: 'Arcilla verde francesa que regula la grasa y cierra poros abiertos' }
      ],
      usage: 'Alterna los 3 jabones: Carbón (piel grasa/acné), Avena (piel sensible/seca), Arcilla verde (poros abiertos/grasa). Aplica 2 min, enjuaga. Cada jabón dura ~1 mes.',
      study: 'Journal of Cosmetic Science: El carbón activado tiene capacidad adsorbente 1000x su peso, efectivo en limpieza profunda de poros.'
    },
    40: {
      name: 'Secreto Japonés Completo',
      benefits: [
        { icon: '🌸', title: 'Ritual Completo', desc: 'Jabón de arroz + Crema facial de arroz — el sistema japonés completo' },
        { icon: '💎', title: 'Luminosidad Visible', desc: 'Tu piel se ve más clara, uniforme y radiante desde la primera semana' },
        { icon: '🧬', title: 'Antioxidante Potente', desc: 'El gamma-oryzanol del arroz protege contra radicales libres y UV' }
      ],
      usage: 'Paso 1: Limpia mañana y noche con jabón de arroz por 2 min. Paso 2: Aplica la crema facial de arroz en rostro y cuello. La crema funciona de día y de noche.',
      study: 'Research in Cosmetic Science: El gamma-oryzanol y el ácido ferúlico del arroz tienen efecto despigmentante y fotoprotector comprobado.'
    },
    41: {
      name: 'Melena de León x2 Cajas',
      benefits: [
        { icon: '🧠', title: 'Dosis Doble de NGF', desc: '120 cápsulas para 2 meses de estimulación del Factor de Crecimiento Nervioso' },
        { icon: '📈', title: 'Resultados Potenciados', desc: 'Los efectos nootrópicos se acumulan — el segundo mes es donde más se nota' },
        { icon: '💰', title: 'Mejor Precio', desc: 'Ahorro significativo comprando el pack de 2 vs individual' }
      ],
      usage: 'Tomar 2 cápsulas diarias con agua en la mañana. Para resultados óptimos, mantener el consumo continuo durante los 2 meses completos sin interrupciones.',
      study: 'Nagano et al. (2010, Biomedical Research): El Hericium erinaceus reduce significativamente los síntomas de depresión y ansiedad tras 4 semanas.'
    },
    42: {
      name: 'Sebo de Res Premium x2',
      benefits: [
        { icon: '💧', title: 'Hidratación Profunda', desc: 'Ácidos grasos que imitan los lípidos naturales de tu piel para absorción total' },
        { icon: '🌟', title: 'Regenera la Piel', desc: 'Reduce visiblemente cicatrices, estrías y marcas con uso constante' },
        { icon: '👵', title: 'Tradición Colombiana', desc: 'Remedio ancestral usado por generaciones — ahora en fórmula premium concentrada' }
      ],
      usage: 'Aplica una pequeña cantidad en piel limpia y húmeda. Masajea suavemente hasta absorción. Úsalo en rostro, manos, codos, rodillas. Mañana y noche. Cada envase rinde 30+ días.',
      study: 'Journal of Lipid Research: Los ácidos palmítico y oleico del sebo bovino son biocompatibles con la piel humana, restaurando la barrera lipídica natural.'
    },
    44: {
      name: 'Polen Multifloral x90 Caps',
      benefits: [
        { icon: '🐝', title: 'Del Huila para Ti', desc: 'Polen recolectado de abejas del Huila colombiano — biodiversidad pura' },
        { icon: '💪', title: 'Energía + Colágeno', desc: 'Aminoácidos que tu cuerpo usa para producir colágeno y mantener la vitalidad' },
        { icon: '🛡️', title: 'Inmunidad Reforzada', desc: 'Rico en zinc, selenio y vitaminas del complejo B para defensas altas' }
      ],
      usage: 'Tomar 2-3 cápsulas al día con agua y alimentos. Mañana o mediodía para energía. Consumo mínimo 30 días para notar beneficios completos.',
      study: 'Nutrients Journal (2020): El polen de abeja exhibe propiedades antioxidantes, antiinflamatorias e inmunomoduladoras comprobadas clínicamente.'
    },
    45: {
      name: 'Tripack Jabones + Sebo 10g',
      benefits: [
        { icon: '🎁', title: 'Pack Completo', desc: '3 jabones artesanales + muestra de sebo de res — limpieza + hidratación' },
        { icon: '🧪', title: 'Prueba Todo', desc: 'Conoce los jabones artesanales y el sebo premium en un solo combo' },
        { icon: '✅', title: 'Rutina Lista', desc: 'Todo lo que necesitas para empezar tu rutina natural de cuidado de piel' }
      ],
      usage: 'Usa los jabones alternando según tu necesidad diaria (2 min de masaje + enjuague). Aplica el sebo de 10g como hidratante nocturno en zonas que necesiten reparación.',
      study: 'La combinación de limpieza activa con jabones naturales + hidratación oclusiva con sebo maximiza la regeneración cutánea nocturna.'
    },
    46: {
      name: 'Energía + Memoria',
      benefits: [
        { icon: '⚡', title: 'Doble Potencia', desc: 'Melena de León para el cerebro + Polen para el cuerpo — energía integral' },
        { icon: '🧠', title: 'Enfoque Láser', desc: 'NGF + aminoácidos = concentración sostenida para estudio y trabajo' },
        { icon: '🔋', title: 'Sin Bajones', desc: 'Energía natural que no causa nerviosismo ni crash como la cafeína' }
      ],
      usage: 'Mañana: 2 caps Melena de León + 2 caps Polen con el desayuno. La Melena potencia tu mente, el Polen tu energía física. Consumo diario por mínimo 30 días.',
      study: 'La sinergia entre hongos funcionales (Hericium erinaceus) y superalimentos (polen) potencia los efectos nootrópicos y energéticos.'
    },
    50: {
      name: 'Piel y Bienestar',
      benefits: [
        { icon: '🌿', title: 'Cuidado Integral', desc: 'Jabones naturales para limpiar + productos para nutrir tu piel' },
        { icon: '💧', title: 'Hidratación Natural', desc: 'Ingredientes que respetan el pH y la barrera natural de tu piel' },
        { icon: '😊', title: 'Bienestar Diario', desc: 'Rutina sencilla que cuida tu piel y mejora cómo te sientes cada día' }
      ],
      usage: 'Limpia tu piel con los jabones naturales (2 min de masaje). Aplica el hidratante después. Rutina mañana y noche para resultados óptimos.',
      study: 'Una rutina consistente de limpieza + hidratación con ingredientes naturales mejora la salud cutánea en 2-4 semanas según estudios dermatológicos.'
    },
    54: {
      name: 'Kit Familia Piel',
      benefits: [
        { icon: '👨‍👩‍👧‍👦', title: 'Para Toda la Familia', desc: 'Jabones y productos de cuidado para cada miembro del hogar' },
        { icon: '🌿', title: 'Todo Natural', desc: 'Sin químicos agresivos — seguro para pieles sensibles y delicadas' },
        { icon: '💰', title: 'Ahorro Familiar', desc: 'Pack completo a mejor precio que comprando productos individuales' }
      ],
      usage: 'Cada miembro elige el jabón según su tipo de piel. Cúrcuma para manchas, Avena para sensible, Caléndula para reparar. Complementar con sebo como hidratante.',
      study: 'La Academia Americana de Dermatología recomienda jabones sin sulfatos ni parabenos para el cuidado diario de toda la familia.'
    },
    55: {
      name: 'Mente y Defensa',
      benefits: [
        { icon: '🧠', title: 'Cerebro Protegido', desc: 'Melena de León estimula NGF para neuronas más fuertes y conectadas' },
        { icon: '🛡️', title: 'Inmunidad Activa', desc: 'Polen multifloral cargado de antioxidantes para defensas blindadas' },
        { icon: '🎯', title: 'Combo Inteligente', desc: 'Mente clara + cuerpo protegido = rendimiento total sin estimulantes' }
      ],
      usage: 'Melena de León: 2 caps/día en la mañana para enfoque. Polen: 2 caps/día con almuerzo para defensas. Mantener mínimo 30 días para resultados completos.',
      study: 'Frontiers in Aging Neuroscience (2020): Los hongos funcionales tienen potencial neuroprotector y los superalimentos refuerzan la inmunidad adaptativa.'
    },
    56: {
      name: 'Capilar Completo',
      benefits: [
        { icon: '💎', title: 'Cabello Perfecto', desc: 'Melena de León fortalece desde adentro + Néctar Capilar nutre desde afuera' },
        { icon: '🔄', title: 'Doble Acción', desc: 'Suplemento oral para crecimiento + tratamiento tópico para brillo' },
        { icon: '📈', title: 'Resultados Visibles', desc: 'Menos caída, más brillo y volumen desde las primeras semanas' }
      ],
      usage: 'Melena de León: 2 caps/día por la mañana. Néctar Capilar: Aplica en medios y puntas húmedas después de cada lavada, no enjuagues. Combina ambos por mínimo 60 días.',
      study: 'International Journal of Trichology: La combinación de suplementación oral (biotina, aminoácidos) + tratamiento tópico acelera los resultados capilares.'
    },
    57: {
      name: 'Power Mental',
      benefits: [
        { icon: '🚀', title: 'Máximo Rendimiento', desc: '2 cajas de Melena de León + Polen = la fórmula más potente del catálogo' },
        { icon: '🧠', title: 'Nootrópico Natural', desc: 'Triple dosis de NGF + aminoácidos esenciales para performance cognitivo' },
        { icon: '⚡', title: 'Energía Imparable', desc: 'Vitalidad mental y física sostenida durante todo el día' }
      ],
      usage: 'Mañana: 2 caps Melena de León + 2 caps Polen con desayuno. Mantener la dosis diaria por los 2 meses que dura el pack para máximos resultados.',
      study: 'Biomedical Research (2010): Hericium erinaceus mejora ansiedad, depresión y concentración. El polen complementa con energía celular.'
    },
    58: {
      name: 'Ritual Regenerador',
      benefits: [
        { icon: '🌟', title: 'Regeneración Total', desc: 'Sebo de res + Jabones + Crema de arroz — tu piel se renueva por completo' },
        { icon: '💧', title: 'Hidratación 360°', desc: 'Limpieza profunda + nutrición + hidratación sellada en cada paso' },
        { icon: '🧴', title: 'Spa en Casa', desc: 'Ritual completo de cuidado facial y corporal sin salir de tu baño' }
      ],
      usage: 'Paso 1: Limpia con jabón (2 min). Paso 2: Aplica crema de arroz en rostro. Paso 3: Sella con sebo de res en zonas secas. Ritual completo mañana y noche.',
      study: 'Dermatología moderna confirma que la rutina de 3 pasos (limpieza-tratamiento-hidratación) es el gold standard para regeneración cutánea.'
    },
    59: {
      name: 'Kit Total SANATE',
      benefits: [
        { icon: '👑', title: 'TODO en Uno', desc: 'Jabones + Sebo + Melena + Polen + Néctar + Crema — el paquete definitivo' },
        { icon: '💰', title: 'Máximo Ahorro', desc: 'Más del 30% de descuento vs comprar cada producto por separado' },
        { icon: '✅', title: 'Bienestar Completo', desc: 'Piel, cabello, mente, energía y defensas — todo cubierto en un kit' }
      ],
      usage: 'Jabones: limpieza diaria. Sebo: hidratante facial. Melena: 2 caps/mañana. Polen: 2 caps/almuerzo. Néctar: en cabello húmedo. Crema de arroz: noche. ¡Rutina total!',
      study: 'La sinergia entre cuidado interno (suplementos) y externo (tópicos naturales) maximiza los resultados según estudios de medicina integrativa.'
    }
  };

  // Brand colors
  const colors = {
    celeste: '#3dc9e8',
    celesteLight: 'rgba(61, 201, 232, 0.08)',
    gold: '#e8c87a',
    goldLight: 'rgba(232, 200, 122, 0.1)',
    dark: '#0a1628',
    white: '#ffffff',
    lightBg: '#f8fafc',
    border: '#e2e8f0'
  };

  // ========== CSS STYLES ==========
  function injectStyles() {
    if (document.getElementById('pli-styles-v2')) return;
    const s = document.createElement('style');
    s.id = 'pli-styles-v2';
    s.textContent = `
      .pli-section {
        margin: 30px 0 20px;
        padding: 0;
        animation: pliFadeIn 0.5s ease-out;
      }
      @keyframes pliFadeIn {
        from { opacity: 0; transform: translateY(15px); }
        to { opacity: 1; transform: translateY(0); }
      }
      @keyframes pliShimmer {
        0% { background-position: -200% center; }
        100% { background-position: 200% center; }
      }

      /* Section Title */
      .pli-title {
        font-size: 22px;
        font-weight: 800;
        color: ${colors.dark};
        text-align: center;
        margin: 0 0 20px;
        padding-bottom: 12px;
        border-bottom: 3px solid ${colors.celeste};
        background: linear-gradient(90deg, ${colors.celeste}, ${colors.gold}, ${colors.celeste});
        background-size: 200% auto;
        -webkit-background-clip: text;
        -webkit-text-fill-color: transparent;
        background-clip: text;
        animation: pliShimmer 3s linear infinite;
      }

      /* Benefits Grid */
      .pli-benefits {
        display: grid;
        grid-template-columns: repeat(3, 1fr);
        gap: 14px;
        margin-bottom: 20px;
      }
      .pli-benefit {
        background: ${colors.white};
        border: 1px solid ${colors.border};
        border-radius: 10px;
        padding: 18px 14px;
        text-align: center;
        transition: all 0.3s ease;
        box-shadow: 0 1px 4px rgba(0,0,0,0.04);
      }
      .pli-benefit:hover {
        transform: translateY(-3px);
        box-shadow: 0 6px 16px rgba(61,201,232,0.15);
        border-color: ${colors.celeste};
      }
      .pli-benefit-icon {
        font-size: 30px;
        display: block;
        margin-bottom: 8px;
      }
      .pli-benefit-title {
        font-size: 14px;
        font-weight: 700;
        color: ${colors.dark};
        margin-bottom: 6px;
      }
      .pli-benefit-desc {
        font-size: 12px;
        color: #64748b;
        line-height: 1.5;
      }

      /* Usage Box */
      .pli-usage {
        background: linear-gradient(135deg, ${colors.goldLight}, ${colors.celesteLight});
        border: 2px solid ${colors.gold};
        border-radius: 10px;
        padding: 18px 20px;
        margin-bottom: 16px;
      }
      .pli-usage-title {
        font-size: 16px;
        font-weight: 700;
        color: ${colors.dark};
        margin: 0 0 10px;
      }
      .pli-usage-text {
        font-size: 14px;
        color: #334155;
        line-height: 1.7;
        margin: 0;
      }

      /* Study Box */
      .pli-study {
        background: ${colors.lightBg};
        border-left: 4px solid ${colors.celeste};
        border-radius: 0 8px 8px 0;
        padding: 14px 18px;
        margin-bottom: 10px;
      }
      .pli-study-title {
        font-size: 14px;
        font-weight: 700;
        color: ${colors.dark};
        margin: 0 0 8px;
      }
      .pli-study-text {
        font-size: 13px;
        color: #475569;
        line-height: 1.6;
        font-style: italic;
        margin: 0;
      }

      /* Trust Badge */
      .pli-trust {
        display: flex;
        justify-content: center;
        gap: 20px;
        margin-top: 16px;
        padding-top: 12px;
        border-top: 1px solid ${colors.border};
      }
      .pli-trust-item {
        font-size: 11px;
        color: #94a3b8;
        display: flex;
        align-items: center;
        gap: 4px;
      }

      /* Mobile */
      @media (max-width: 768px) {
        .pli-benefits {
          grid-template-columns: 1fr;
          gap: 10px;
        }
        .pli-title {
          font-size: 18px;
        }
        .pli-benefit {
          padding: 14px 12px;
        }
        .pli-benefit-icon { font-size: 26px; }
        .pli-benefit-title { font-size: 13px; }
        .pli-benefit-desc { font-size: 11px; }
        .pli-usage { padding: 14px 16px; }
        .pli-usage-text { font-size: 13px; }
        .pli-study { padding: 12px 14px; }
        .pli-trust { flex-direction: column; align-items: center; gap: 8px; }
      }
      @media (max-width: 480px) {
        .pli-section { margin: 20px 0 10px; }
        .pli-title { font-size: 16px; margin-bottom: 14px; }
      }
    `;
    document.head.appendChild(s);
  }

  // ========== EXTRACT PRODUCT ID FROM URL ==========
  function getProductIdFromURL() {
    const m = window.location.pathname.match(/\/producto\/(\d+)/);
    return m ? parseInt(m[1], 10) : null;
  }

  // ========== FALLBACK: MATCH BY TITLE KEYWORDS ==========
  function getProductByTitle(title) {
    const t = title.toLowerCase();
    const keywordMap = {
      'curcuma': 7, 'kójico': 7, 'kojico': 7,
      'melena': 8,
      'sebo': 42, 'res': 42,
      'polen': 15, 'colágeno': 15, 'colageno': 15,
      'néctar': 14, 'nectar': 14,
      'avena': 11, 'arroz': 11,
      'calendula': 13, 'aloe': 13,
      'mix': 12,
      'tripack': 39,
      'secreto': 40, 'japonés': 40, 'japones': 40,
      'kit total': 59, 'kit definitivo': 59,
      'kit familia': 54,
      'energía': 46, 'energia': 46, 'memoria': 46,
      'mente': 55, 'defensa': 55,
      'capilar': 56,
      'power': 57,
      'ritual': 58, 'regenerador': 58,
      'piel y bienestar': 50, 'bienestar': 50
    };
    for (const [kw, id] of Object.entries(keywordMap)) {
      if (t.includes(kw)) return productData[id] || null;
    }
    return null;
  }

  // ========== BUILD HTML ==========
  function buildSection(data) {
    const benefits = data.benefits.map(b => `
      <div class="pli-benefit">
        <span class="pli-benefit-icon">${b.icon}</span>
        <div class="pli-benefit-title">${b.title}</div>
        <div class="pli-benefit-desc">${b.desc}</div>
      </div>
    `).join('');

    return `
      <div class="pli-section">
        <div class="pli-title">✨ Beneficios Principales</div>
        <div class="pli-benefits">${benefits}</div>
        <div class="pli-usage">
          <div class="pli-usage-title">📋 Modo de Uso</div>
          <p class="pli-usage-text">${data.usage}</p>
        </div>
        <div class="pli-study">
          <div class="pli-study-title">🔬 Respaldo Científico</div>
          <p class="pli-study-text">${data.study}</p>
        </div>
        <div class="pli-trust">
          <span class="pli-trust-item">🇨🇴 Hecho en Colombia</span>
          <span class="pli-trust-item">🌿 100% Natural</span>
          <span class="pli-trust-item">🚚 Envío Nacional</span>
          <span class="pli-trust-item">⭐ +500 Clientes</span>
        </div>
      </div>
    `;
  }

  // ========== INJECT ==========
  function inject() {
    if (document.querySelector('.pli-section')) return;
    const pageDetail = document.querySelector('.pageDetail');
    if (!pageDetail) return;

    // Try to get product by ID from URL first (most reliable)
    const productId = getProductIdFromURL();
    let data = productId ? productData[productId] : null;

    // Fallback: match by page title
    if (!data) {
      const titleEl = pageDetail.querySelector('h1') || pageDetail.querySelector('h2');
      if (titleEl) {
        data = getProductByTitle(titleEl.textContent);
      }
    }

    if (!data) return;

    // Find best injection point
    const descEl = pageDetail.querySelector('.detailDescription');
    const btnEl = pageDetail.querySelector('.btnAdd');
    const insertAfter = descEl || btnEl;

    const container = document.createElement('div');
    container.innerHTML = buildSection(data);
    const section = container.firstElementChild;

    if (insertAfter && insertAfter.parentNode) {
      insertAfter.parentNode.insertBefore(section, insertAfter.nextSibling);
    } else {
      pageDetail.appendChild(section);
    }
  }

  // ========== INIT ==========
  function init() {
    if (!/\/producto\//.test(window.location.pathname)) return;
    injectStyles();
    inject();

    // Poll for React re-renders
    let checks = 0;
    const iv = setInterval(() => {
      if (++checks > 80) { clearInterval(iv); return; }
      if (!document.querySelector('.pli-section')) inject();
    }, 1500);

    // SPA navigation hook
    const origPush = history.pushState;
    history.pushState = function() {
      const r = origPush.apply(this, arguments);
      setTimeout(() => {
        if (/\/producto\//.test(location.pathname)) {
          // Remove old section on navigation
          const old = document.querySelector('.pli-section');
          if (old) old.remove();
          inject();
        }
      }, 600);
      return r;
    };
    window.addEventListener('popstate', () => {
      setTimeout(() => {
        if (/\/producto\//.test(location.pathname)) {
          const old = document.querySelector('.pli-section');
          if (old) old.remove();
          inject();
        }
      }, 600);
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
  setTimeout(init, 200);
})();
