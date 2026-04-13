(function(){
'use strict';

var P={
7:{n:'Jabón Cúrcuma x3',b:[{i:'✨',t:'Aclara Manchas',d:'La curcumina inhibe la tirosinasa reduciendo hiperpigmentación y paño facial'},{i:'🛡️',t:'Combate Acné',d:'Antiinflamatorio natural que limpia poros a profundidad sin resecar'},{i:'🌿',t:'100% Artesanal',d:'Sin parabenos ni sulfatos — ingredientes naturales colombianos'}],u:'Humedecer rostro con agua tibia. Aplicar el jabón con movimientos circulares por 2 min. Enjuagar con agua fría. Mañana y noche.',s:'Journal of Cosmetic Dermatology (2019): La curcumina reduce significativamente la hiperpigmentación en 8 semanas.',r:[{n:'Carolina R.',t:'Mis manchas del sol se aclararon en 6 semanas. Mi piel luce uniforme y radiante.',a:'Hace 2 semanas'},{n:'Andrés M.',t:'El acné se redujo muchísimo. Qué sorpresa con un jabón natural.',a:'Hace 1 mes'},{n:'María José G.',t:'Lo uso con toda mi familia. Es suave pero efectivo. Lo recomiendo.',a:'Hace 5 días'}]},
8:{n:'Melena de León x60',b:[{i:'🧠',t:'Claridad Mental',d:'Estimula el Factor de Crecimiento Nervioso (NGF) para neuronas más fuertes'},{i:'💡',t:'Memoria y Enfoque',d:'Mejora la concentración, ideal para estudio y trabajo intenso'},{i:'⚡',t:'Energía sin Cafeína',d:'Vitalidad sostenida todo el día sin nerviosismo ni crash'}],u:'Tomar 2 cápsulas al día con agua, preferiblemente en la mañana. Uso continuo por mínimo 4 semanas.',s:'Mori et al. (2009, Phytotherapy Research): Mejora significativa de función cognitiva tras 16 semanas de uso.',r:[{n:'Santiago P.',t:'Siento una claridad mental increíble. Rindo mucho más en el trabajo.',a:'Hace 3 semanas'},{n:'Valentina C.',t:'Como estudiante de medicina esto me salvó. Mejor concentración en exámenes.',a:'Hace 1 mes'},{n:'Ricardo L.',t:'Tengo 62 años y siento la mente más ágil. Excelente producto.',a:'Hace 10 días'}]},
9:{n:'x2 Sebos + x2 Jabones Cúrcuma',b:[{i:'💧',t:'Hidratación + Limpieza',d:'Combo completo: jabones limpian y aclaran, sebo hidrata y sella'},{i:'🌟',t:'Reduce Manchas',d:'Doble acción aclarante del kójico + regeneración del sebo'},{i:'🎯',t:'Rutina Completa',d:'4 productos para limpieza e hidratación facial y corporal'}],u:'Paso 1: Jabón de cúrcuma 2 min, enjuagar. Paso 2: Sebo de res en piel húmeda. Mañana y noche.',s:'Journal of Lipid Research: El sebo bovino es biomimético con los lípidos naturales de la piel humana.',r:[{n:'Paola V.',t:'Increíble combo. El jabón limpia y el sebo deja la piel divina.',a:'Hace 2 semanas'},{n:'Juan Pablo H.',t:'Mi esposa y yo lo usamos. Manchas y resequedad desaparecieron.',a:'Hace 1 mes'},{n:'Daniela F.',t:'El mejor combo que he probado. Mi piel cambió completamente.',a:'Hace 4 días'}]},
10:{n:'Cúrcuma + Kójico x6',b:[{i:'👨‍👩‍👧‍👦',t:'Pack Familiar',d:'6 jabones para toda la familia — alcanza para 3+ meses de uso diario'},{i:'💰',t:'Mejor Precio',d:'Ahorro significativo vs comprar individual'},{i:'🔄',t:'Resultados Acumulativos',d:'El uso continuo potencia los efectos semana tras semana'}],u:'Mismo uso que el individual. Humedecer, aplicar 2 min circular, enjuagar con agua fría. Mañana y noche.',s:'Dermatología clínica confirma que la consistencia en activos despigmentantes es clave para resultados en 4-8 semanas.',r:[{n:'Camila S.',t:'Compré el pack de 6 y toda la familia lo usa. Rinde muchísimo.',a:'Hace 3 semanas'},{n:'Felipe O.',t:'El mejor precio y los resultados se notan más con uso continuo.',a:'Hace 2 meses'},{n:'Laura T.',t:'Ya voy en mi segundo pack. No cambio estos jabones por nada.',a:'Hace 1 semana'}]},
11:{n:'Avena y Arroz x3',b:[{i:'🤍',t:'Piel Sensible',d:'La avena coloidal calma irritación, enrojecimiento y picazón al instante'},{i:'💧',t:'Hidratación Suave',d:'El arroz aporta vitamina E y ácido ferúlico para piel nutrida'},{i:'👶',t:'Para Toda la Familia',d:'Tan suave que es apto para pieles delicadas'}],u:'Aplicar sobre piel húmeda con movimientos suaves. Dejar actuar 1-2 min. Enjuagar con agua tibia. Ideal uso diario.',s:'Journal of Drugs in Dermatology: La avena coloidal tiene propiedades antiinflamatorias, aprobada por la FDA.',r:[{n:'Isabella M.',t:'Tengo piel muy sensible y por fin encontré un jabón que no irrita.',a:'Hace 2 semanas'},{n:'Diego R.',t:'Lo uso para mi bebé también. Súper suave y huele delicioso.',a:'Hace 3 semanas'},{n:'Natalia P.',t:'Mi dermatitis mejoró mucho. La avena es mágica para la piel.',a:'Hace 1 mes'}]},
12:{n:'Mix 3: Cúrcuma, Avena, Caléndula',b:[{i:'🎨',t:'Variedad Completa',d:'Tres fórmulas para alternar según lo que tu piel necesite cada día'},{i:'✨',t:'Cúrcuma Aclara',d:'Reduce manchas y combate acné con propiedades antiinflamatorias'},{i:'🌼',t:'Caléndula Repara',d:'Cicatrizante natural que calma piel irritada'}],u:'Alternar jabones según necesidad: Cúrcuma para manchas, Avena para calmar, Caléndula para reparar. 2 min + enjuague.',s:'Phytomedicine Journal: Los extractos de Calendula officinalis aceleran la cicatrización cutánea.',r:[{n:'Juliana A.',t:'Me encanta tener los 3 jabones. Cada día elijo el que necesito.',a:'Hace 1 semana'},{n:'Mateo G.',t:'El mix perfecto. La cúrcuma para mis manchas, la avena para días sensibles.',a:'Hace 3 semanas'},{n:'Alejandra B.',t:'Regalo perfecto. Le di uno a mi mamá y está feliz con los resultados.',a:'Hace 2 semanas'}]},
13:{n:'Caléndula + Aloe Vera x3',b:[{i:'🌼',t:'Cicatrizante Natural',d:'La caléndula acelera la regeneración celular en zonas dañadas'},{i:'💚',t:'Aloe Vera Calmante',d:'Hidrata, desinflama y protege la barrera natural de la piel'},{i:'🛡️',t:'Protección Diaria',d:'Ideal para pieles con irritación, rosácea o dermatitis'}],u:'Aplicar sobre piel húmeda con masaje suave. 2 min enfocándose en áreas irritadas. Enjuagar agua tibia. Mañana y noche.',s:'Wounds Journal (2008): Calendula officinalis promueve la epitelización y tiene efecto antimicrobiano.',r:[{n:'Sebastián V.',t:'Tenía marcas de acné y se están borrando. Increíble este jabón.',a:'Hace 2 semanas'},{n:'Carolina M.',t:'Mi rosácea mejoró notablemente. El aloe calma mucho mi piel.',a:'Hace 1 mes'},{n:'Andrés T.',t:'Lo uso después de afeitarme y la irritación desapareció por completo.',a:'Hace 5 días'}]},
14:{n:'Néctar Capilar 200g',b:[{i:'💎',t:'Brillo Intenso',d:'Cabello radiante y sedoso desde la primera aplicación sin apelmazar'},{i:'🌊',t:'Elimina el Frizz',d:'Control total del encrespamiento incluso en clima húmedo'},{i:'💪',t:'Fortalece Cabello',d:'Biotina y queratina vegetal reducen caída y quiebre'}],u:'Después de lavar el cabello, aplicar en medios y puntas húmedas. No enjuagar. Peinar como de costumbre.',s:'International Journal of Trichology: La biotina mejora grosor y resistencia del cabello en 90 días.',r:[{n:'Valentina L.',t:'Mi cabello nunca había brillado tanto. El frizz desapareció totalmente.',a:'Hace 1 semana'},{n:'Camila H.',t:'Probé mil tratamientos caros y este de $45 mil es el mejor.',a:'Hace 3 semanas'},{n:'María F.',t:'Se me caía mucho el pelo y ahora está fuerte. Súper recomendado.',a:'Hace 2 semanas'}]},
15:{n:'Colágeno Polen x90 Caps',b:[{i:'🐝',t:'Superalimento del Huila',d:'Polen multifloral colombiano, rico en 22 aminoácidos esenciales'},{i:'⚡',t:'Energía Natural',d:'Vitalidad sostenida todo el día sin cafeína ni estimulantes'},{i:'🛡️',t:'Defensas Blindadas',d:'Fortalece el sistema inmunológico con vitaminas B, zinc y antioxidantes'}],u:'Tomar 2-3 cápsulas al día con agua, preferiblemente en la mañana con el desayuno.',s:'Journal of Food Science and Technology: El polen contiene perfil completo de aminoácidos con efecto inmunomodulador.',r:[{n:'Carlos D.',t:'Mi energía cambió completamente. Ya no necesito tanto café.',a:'Hace 1 mes'},{n:'Paola R.',t:'Me enfermaba cada mes y desde que tomo polen no me he gripado.',a:'Hace 2 semanas'},{n:'Diego S.',t:'El mejor suplemento natural que he probado. Se siente la diferencia.',a:'Hace 3 semanas'}]},
16:{n:'Crema Sebo + x2 Jabones',b:[{i:'🧴',t:'Limpieza + Nutrición',d:'Jabones aclaran y limpian, la crema de sebo sella la hidratación'},{i:'✨',t:'Aclara y Regenera',d:'Doble acción: kójico despigmenta mientras sebo repara tejidos'},{i:'💧',t:'Piel Suave Todo el Día',d:'Crema de sebo crea barrera protectora sin sensación grasosa'}],u:'Mañana: Jabón cúrcuma, enjuagar, crema sebo en rostro y cuello. Noche: repetir. Crema rinde 30+ días.',s:'Dermatología colombiana: Limpieza activa + hidratación oclusiva es el estándar para hiperpigmentación.',r:[{n:'Laura G.',t:'El combo perfecto. Jabón limpia y la crema deja la piel divina.',a:'Hace 2 semanas'},{n:'Juan M.',t:'Mi esposa me lo recomendó y ahora los dos lo usamos. Funciona.',a:'Hace 1 mes'},{n:'Natalia V.',t:'La crema de sebo es increíble. Mi piel nunca estuvo tan suave.',a:'Hace 4 días'}]},
38:{n:'Secreto Japonés x2 + Sebo 10g',b:[{i:'🌸',t:'Ritual Milenario',d:'El secreto de las geishas: agua de arroz fermentada para piel perfecta'},{i:'🧴',t:'Kit de Inicio',d:'2 jabones arroz + muestra sebo para probar la rutina completa'},{i:'⏰',t:'Anti-Edad Natural',d:'Ácido ferúlico del arroz: potente antioxidante anti-arrugas'}],u:'Jabón de arroz limpieza diaria mañana y noche. Sebo de 10g como hidratante en zonas secas.',s:'Japanese Journal of Dermatology: El ácido ferúlico reduce fotoenvejecimiento y mejora luminosidad.',r:[{n:'Isabella C.',t:'Mi piel se ve más joven y luminosa. El arroz es mágico.',a:'Hace 3 semanas'},{n:'Felipe M.',t:'Excelente para empezar. El jabón de arroz es adictivo.',a:'Hace 1 semana'},{n:'Daniela R.',t:'El sebo de muestra me convenció. Ya pedí el tamaño grande.',a:'Hace 2 semanas'}]},
39:{n:'Tripack Jabones Artesanales',b:[{i:'🎁',t:'3 Fórmulas Únicas',d:'Carbón activado + Avena + Arcilla verde — una para cada necesidad'},{i:'🖤',t:'Carbón Desintoxica',d:'Absorbe toxinas de poros profundos como un imán'},{i:'💚',t:'Arcilla Purifica',d:'Arcilla verde que regula grasa y cierra poros abiertos'}],u:'Alternar los 3: Carbón (grasa/acné), Avena (sensible/seca), Arcilla verde (poros/grasa). 2 min, enjuagar.',s:'Journal of Cosmetic Science: El carbón activado tiene capacidad adsorbente 1000x su peso.',r:[{n:'Santiago A.',t:'Los tres jabones son increíbles. El de carbón me limpió los poros.',a:'Hace 2 semanas'},{n:'Juliana P.',t:'Cada jabón tiene su momento. Me encanta alternar.',a:'Hace 1 mes'},{n:'Ricardo G.',t:'El de arcilla verde controla la grasa de mi cara todo el día.',a:'Hace 3 días'}]},
40:{n:'Secreto Japonés Completo',b:[{i:'🌸',t:'Ritual Completo',d:'Jabón arroz + Crema facial — el sistema japonés completo'},{i:'💎',t:'Luminosidad Visible',d:'Piel más clara, uniforme y radiante desde la primera semana'},{i:'🧬',t:'Antioxidante Potente',d:'Gamma-oryzanol protege contra radicales libres y UV'}],u:'Jabón arroz 2 min mañana y noche. Crema facial arroz en rostro y cuello día y noche.',s:'Research in Cosmetic Science: Gamma-oryzanol y ácido ferúlico tienen efecto despigmentante comprobado.',r:[{n:'Camila V.',t:'Este combo es divino. Mi cara brilla naturalmente.',a:'Hace 2 semanas'},{n:'Mateo R.',t:'La crema de arroz es lo mejor que he usado. Textura increíble.',a:'Hace 1 mes'},{n:'Alejandra S.',t:'Mi mamá usa este ritual y le dicen que se ve 10 años más joven.',a:'Hace 1 semana'}]},
41:{n:'Melena de León x2 Cajas',b:[{i:'🧠',t:'Dosis Doble NGF',d:'120 cápsulas para 2 meses de estimulación del Factor de Crecimiento Nervioso'},{i:'📈',t:'Resultados Potenciados',d:'Los efectos nootrópicos se acumulan — el segundo mes es donde más se nota'},{i:'💰',t:'Mejor Precio',d:'Ahorro significativo comprando pack de 2 vs individual'}],u:'2 cápsulas diarias con agua en la mañana. Mantener consumo continuo durante los 2 meses completos.',s:'Nagano et al. (2010, Biomedical Research): Hericium reduce significativamente depresión y ansiedad tras 4 semanas.',r:[{n:'Juan Pablo O.',t:'El segundo mes es donde se siente todo. Mi concentración está al máximo.',a:'Hace 3 semanas'},{n:'Valentina D.',t:'Compré las 2 cajas y valió totalmente la pena. Mejor precio.',a:'Hace 1 mes'},{n:'Carlos F.',t:'Llevo 2 meses y mi productividad subió notablemente. Impresionante.',a:'Hace 5 días'}]},
42:{n:'Sebo Premium x2',b:[{i:'💧',t:'Hidratación Profunda',d:'Ácidos grasos que imitan los lípidos naturales de tu piel'},{i:'🌟',t:'Regenera la Piel',d:'Reduce cicatrices, estrías y marcas con uso constante'},{i:'👵',t:'Tradición Colombiana',d:'Remedio ancestral en fórmula premium concentrada'}],u:'Cantidad pequeña en piel limpia y húmeda. Masajear hasta absorción. Rostro, manos, codos, rodillas. Mañana y noche.',s:'Journal of Lipid Research: Ácidos palmítico y oleico biocompatibles restauran la barrera lipídica natural.',r:[{n:'Paola M.',t:'Mis estrías del embarazo se están borrando. Increíble producto.',a:'Hace 2 semanas'},{n:'Diego A.',t:'Mi abuela siempre usó sebo y tenía piel perfecta. Ahora entiendo por qué.',a:'Hace 1 mes'},{n:'Laura C.',t:'Dos envases me duran 2 meses. Mejor inversión para mi piel.',a:'Hace 1 semana'}]},
44:{n:'Polen Multifloral x90',b:[{i:'🐝',t:'Del Huila para Ti',d:'Polen recolectado de abejas del Huila — biodiversidad pura'},{i:'💪',t:'Energía + Colágeno',d:'Aminoácidos que tu cuerpo usa para producir colágeno natural'},{i:'🛡️',t:'Inmunidad Reforzada',d:'Rico en zinc, selenio y vitaminas B para defensas altas'}],u:'2-3 cápsulas/día con agua y alimentos. Mañana o mediodía para energía. Mínimo 30 días.',s:'Nutrients Journal (2020): El polen exhibe propiedades antioxidantes e inmunomoduladoras comprobadas.',r:[{n:'Andrés V.',t:'El polen del Huila es otro nivel. Energía pura sin bajones.',a:'Hace 3 semanas'},{n:'María José T.',t:'Mi sistema inmune está más fuerte. Ya no me enfermo.',a:'Hace 1 mes'},{n:'Sebastián R.',t:'Lo tomo todas las mañanas. Se nota la diferencia en energía.',a:'Hace 2 semanas'}]},
45:{n:'Tripack + Sebo 10g',b:[{i:'🎁',t:'Pack Completo',d:'3 jabones artesanales + muestra de sebo de res'},{i:'🧪',t:'Prueba Todo',d:'Conoce jabones y sebo premium en un solo combo'},{i:'✅',t:'Rutina Lista',d:'Todo para empezar tu rutina natural de cuidado de piel'}],u:'Jabones alternando según necesidad (2 min masaje). Sebo 10g como hidratante nocturno en zonas que necesiten reparación.',s:'La limpieza activa + hidratación oclusiva con sebo maximiza la regeneración cutánea nocturna.',r:[{n:'Natalia H.',t:'Perfecto para probar todo. Me enamoré de los jabones.',a:'Hace 2 semanas'},{n:'Felipe C.',t:'Regalé este pack y ahora mi novia quiere más. Éxito total.',a:'Hace 1 mes'},{n:'Isabella V.',t:'El sebo de muestra fue suficiente para convencerme. Ya pedí el grande.',a:'Hace 4 días'}]},
46:{n:'Energía + Memoria',b:[{i:'⚡',t:'Doble Potencia',d:'Melena de León para el cerebro + Polen para el cuerpo'},{i:'🧠',t:'Enfoque Láser',d:'NGF + aminoácidos = concentración sostenida para estudio y trabajo'},{i:'🔋',t:'Sin Bajones',d:'Energía natural sin nerviosismo ni crash como la cafeína'}],u:'Mañana: 2 caps Melena + 2 caps Polen con desayuno. Mínimo 30 días.',s:'La sinergia entre hongos funcionales y superalimentos potencia los efectos nootrópicos y energéticos.',r:[{n:'Alejandro B.',t:'Este combo es perfecto para mi trabajo remoto. Mente clara todo el día.',a:'Hace 3 semanas'},{n:'Juliana D.',t:'Mejor inversión para mi rendimiento académico. Se nota muchísimo.',a:'Hace 1 mes'},{n:'Mateo P.',t:'Dejé el café y ahora solo tomo Melena + Polen. Mejor energía.',a:'Hace 2 semanas'}]},
50:{n:'Piel y Bienestar',b:[{i:'🌿',t:'Cuidado Integral',d:'Jabones naturales para limpiar + productos para nutrir tu piel'},{i:'💧',t:'Hidratación Natural',d:'Ingredientes que respetan el pH y la barrera natural'},{i:'😊',t:'Bienestar Diario',d:'Rutina sencilla que cuida tu piel y mejora cómo te sientes'}],u:'Jabones naturales 2 min masaje. Aplicar hidratante después. Mañana y noche.',s:'Una rutina consistente de limpieza + hidratación natural mejora la salud cutánea en 2-4 semanas.',r:[{n:'Carolina A.',t:'Mi piel está más sana y feliz. Rutina simple pero efectiva.',a:'Hace 2 semanas'},{n:'Diego M.',t:'Nunca fui de skincare pero esto me convenció. Resultados reales.',a:'Hace 1 mes'},{n:'Valentina G.',t:'Me siento mejor conmigo misma desde que cuido mi piel así.',a:'Hace 1 semana'}]},
54:{n:'Kit Familia Piel',b:[{i:'👨‍👩‍👧‍👦',t:'Para Toda la Familia',d:'Jabones y productos para cada miembro del hogar'},{i:'🌿',t:'Todo Natural',d:'Sin químicos agresivos — seguro para pieles sensibles'},{i:'💰',t:'Ahorro Familiar',d:'Pack completo a mejor precio que individual'}],u:'Cada miembro elige jabón según su piel. Cúrcuma para manchas, Avena para sensible, Caléndula para reparar. Sebo como hidratante.',s:'La Academia Americana de Dermatología recomienda jabones sin sulfatos ni parabenos para uso familiar.',r:[{n:'Paola S.',t:'Toda mi familia lo usa. Cada uno tiene su favorito.',a:'Hace 3 semanas'},{n:'Juan M.',t:'Mi esposa, mis hijos y yo. El kit rinde mucho.',a:'Hace 1 mes'},{n:'Laura V.',t:'Lo mejor para regalar. Mis suegros quedaron encantados.',a:'Hace 2 semanas'}]},
55:{n:'Mente y Defensa',b:[{i:'🧠',t:'Cerebro Protegido',d:'Melena de León estimula NGF para neuronas fuertes y conectadas'},{i:'🛡️',t:'Inmunidad Activa',d:'Polen multifloral con antioxidantes para defensas blindadas'},{i:'🎯',t:'Combo Inteligente',d:'Mente clara + cuerpo protegido = rendimiento total'}],u:'Melena 2 caps/mañana para enfoque. Polen 2 caps/almuerzo para defensas. Mínimo 30 días.',s:'Frontiers in Aging Neuroscience (2020): Hongos funcionales tienen potencial neuroprotector significativo.',r:[{n:'Santiago L.',t:'Mi enfoque mejoró y no me he enfermado en 3 meses.',a:'Hace 2 semanas'},{n:'Daniela O.',t:'El combo perfecto para cuidar mente y salud al mismo tiempo.',a:'Hace 1 mes'},{n:'Ricardo T.',t:'Como médico recomiendo combinar suplementos. Este combo lo tiene todo.',a:'Hace 3 semanas'}]},
56:{n:'Capilar Completo',b:[{i:'💎',t:'Cabello Perfecto',d:'Melena fortalece desde adentro + Néctar nutre desde afuera'},{i:'🔄',t:'Doble Acción',d:'Suplemento oral para crecimiento + tratamiento tópico para brillo'},{i:'📈',t:'Resultados Visibles',d:'Menos caída, más brillo y volumen desde las primeras semanas'}],u:'Melena 2 caps/mañana. Néctar Capilar en medios y puntas húmedas después de cada lavada. Combinar 60 días.',s:'Int. Journal of Trichology: Suplementación oral + tratamiento tópico acelera resultados capilares.',r:[{n:'Camila D.',t:'Mi cabello dejó de caerse y ahora brilla precioso.',a:'Hace 2 semanas'},{n:'María José R.',t:'La combinación oral + tópica es clave. Mi peluquera notó la diferencia.',a:'Hace 1 mes'},{n:'Natalia S.',t:'Después de 2 meses mi cabello creció más que en todo el año.',a:'Hace 3 semanas'}]},
57:{n:'Power Mental',b:[{i:'🚀',t:'Máximo Rendimiento',d:'2 cajas Melena + Polen = la fórmula más potente del catálogo'},{i:'🧠',t:'Nootrópico Natural',d:'Triple dosis NGF + aminoácidos para performance cognitivo'},{i:'⚡',t:'Energía Imparable',d:'Vitalidad mental y física sostenida todo el día'}],u:'2 caps Melena + 2 caps Polen con desayuno. Mantener dosis diaria por los 2 meses del pack.',s:'Biomedical Research (2010): Hericium mejora ansiedad, depresión y concentración significativamente.',r:[{n:'Felipe A.',t:'El combo más potente. Mi rendimiento laboral subió un 100%.',a:'Hace 3 semanas'},{n:'Alejandro C.',t:'Como emprendedor necesitaba esto. Mente clara para tomar decisiones.',a:'Hace 1 mes'},{n:'Juliana M.',t:'Mis oposiciones las preparé con esto. Concentración nivel máximo.',a:'Hace 2 semanas'}]},
58:{n:'Ritual Regenerador',b:[{i:'🌟',t:'Regeneración Total',d:'Sebo + Jabones + Crema arroz — tu piel se renueva por completo'},{i:'💧',t:'Hidratación 360°',d:'Limpieza profunda + nutrición + hidratación sellada en cada paso'},{i:'🧴',t:'Spa en Casa',d:'Ritual completo de cuidado facial y corporal'}],u:'Paso 1: Jabón 2 min. Paso 2: Crema arroz en rostro. Paso 3: Sellar con sebo en zonas secas. Mañana y noche.',s:'Dermatología moderna: La rutina de 3 pasos es el gold standard para regeneración cutánea.',r:[{n:'Isabella G.',t:'Me siento en un spa cada noche. Mi piel se transformó.',a:'Hace 2 semanas'},{n:'Carlos R.',t:'El ritual de 3 pasos es genial. Resultados desde la primera semana.',a:'Hace 1 mes'},{n:'Valentina H.',t:'Mi piel nunca estuvo mejor. Este ritual es mi favorito.',a:'Hace 5 días'}]},
59:{n:'Kit Total SANATE',b:[{i:'👑',t:'TODO en Uno',d:'Jabones + Sebo + Melena + Polen + Néctar + Crema — paquete definitivo'},{i:'💰',t:'Máximo Ahorro',d:'Más del 30% de descuento vs comprar por separado'},{i:'✅',t:'Bienestar Completo',d:'Piel, cabello, mente, energía y defensas — todo cubierto'}],u:'Jabones: limpieza. Sebo: hidratante. Melena: 2 caps/mañana. Polen: 2 caps/almuerzo. Néctar: cabello. Crema: noche.',s:'La sinergia entre cuidado interno y externo maximiza resultados según medicina integrativa.',r:[{n:'Santiago D.',t:'El kit completo cambió mi vida. Todo lo que necesitas en una caja.',a:'Hace 3 semanas'},{n:'Paola F.',t:'Se lo regalé a mi mamá y lloró de la emoción. Producto increíble.',a:'Hace 1 mes'},{n:'Andrés C.',t:'La mejor inversión en salud y bienestar. No le falta nada.',a:'Hace 2 semanas'}]}
};

// Colors
var C={celeste:'#3dc9e8',gold:'#e8c87a',cream:'#FDF6E9',white:'#fff',dark:'#1a1a2e',text:'#334155',muted:'#64748b',border:'#e2e8f0'};

// Stars
function stars(){return '★★★★★';}

// Avatar color from name
function avatarColor(name){
  var colors=['#3dc9e8','#e8c87a','#f59e0b','#10b981','#8b5cf6','#ec4899','#06b6d4','#84cc16'];
  var i=0;for(var c=0;c<name.length;c++)i+=name.charCodeAt(c);
  return colors[i%colors.length];
}

// Inject styles
function injectCSS(){
  if(document.getElementById('snt-css'))return;
  var s=document.createElement('style');s.id='snt-css';
  s.textContent='\
.snt-landing{margin:35px -10px 20px;padding:40px 28px;background:linear-gradient(135deg,'+C.cream+' 0%,#F5EDE0 50%,'+C.cream+' 100%);border-radius:20px;position:relative;overflow:hidden;animation:sntFade .6s ease-out}\
.snt-landing::before{content:"";position:absolute;top:-60px;right:-60px;width:200px;height:200px;background:radial-gradient(circle,rgba(61,201,232,.12) 0%,transparent 70%);border-radius:50%;pointer-events:none}\
.snt-landing::after{content:"";position:absolute;bottom:-40px;left:-40px;width:160px;height:160px;background:radial-gradient(circle,rgba(232,200,122,.12) 0%,transparent 70%);border-radius:50%;pointer-events:none}\
@keyframes sntFade{from{opacity:0;transform:translateY(20px)}to{opacity:1;transform:translateY(0)}}\
@keyframes sntShimmer{0%{background-position:-200% center}100%{background-position:200% center}}\
.snt-title{font-size:26px;font-weight:900;text-align:center;margin:0 0 8px;background:linear-gradient(90deg,'+C.celeste+','+C.gold+','+C.celeste+');background-size:200% auto;-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text;animation:sntShimmer 3s linear infinite;position:relative;z-index:1}\
.snt-subtitle{text-align:center;color:'+C.muted+';font-size:14px;margin:0 0 28px;position:relative;z-index:1}\
.snt-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:16px;margin-bottom:28px;position:relative;z-index:1}\
.snt-card{background:'+C.white+';border-radius:14px;padding:22px 16px;text-align:center;box-shadow:0 2px 12px rgba(0,0,0,.06);transition:all .3s ease;border:1px solid rgba(0,0,0,.04)}\
.snt-card:hover{transform:translateY(-4px);box-shadow:0 8px 24px rgba(61,201,232,.15);border-color:'+C.celeste+'}\
.snt-card-icon{font-size:38px;display:block;margin-bottom:10px}\
.snt-card-title{font-size:15px;font-weight:800;color:'+C.dark+';margin-bottom:6px}\
.snt-card-desc{font-size:13px;color:'+C.muted+';line-height:1.5}\
.snt-usage{background:'+C.white+';border-left:4px solid '+C.gold+';border-radius:0 12px 12px 0;padding:18px 22px;margin-bottom:18px;position:relative;z-index:1}\
.snt-usage-title{font-size:17px;font-weight:800;color:'+C.dark+';margin:0 0 8px}\
.snt-usage-text{font-size:14px;color:'+C.text+';line-height:1.7;margin:0}\
.snt-study{background:'+C.white+';border-left:4px solid '+C.celeste+';border-radius:0 12px 12px 0;padding:16px 20px;margin-bottom:24px;position:relative;z-index:1}\
.snt-study-title{font-size:15px;font-weight:800;color:'+C.dark+';margin:0 0 6px}\
.snt-study-text{font-size:13px;color:'+C.muted+';line-height:1.6;font-style:italic;margin:0}\
.snt-reviews-title{font-size:20px;font-weight:800;text-align:center;color:'+C.dark+';margin:0 0 16px;position:relative;z-index:1}\
.snt-reviews{display:grid;grid-template-columns:repeat(3,1fr);gap:14px;margin-bottom:22px;position:relative;z-index:1}\
.snt-review{background:'+C.white+';border-radius:12px;padding:18px 16px;box-shadow:0 1px 8px rgba(0,0,0,.05);border:1px solid rgba(0,0,0,.03)}\
.snt-review-header{display:flex;align-items:center;gap:10px;margin-bottom:8px}\
.snt-review-avatar{width:36px;height:36px;border-radius:50%;display:flex;align-items:center;justify-content:center;color:#fff;font-weight:700;font-size:15px;flex-shrink:0}\
.snt-review-name{font-weight:700;font-size:13px;color:'+C.dark+'}\
.snt-review-stars{color:#f59e0b;font-size:13px;letter-spacing:1px}\
.snt-review-text{font-size:13px;color:'+C.text+';line-height:1.5;margin:0 0 6px}\
.snt-review-time{font-size:11px;color:'+C.muted+'}\
.snt-trust{display:flex;justify-content:center;gap:14px;flex-wrap:wrap;padding-top:16px;border-top:1px solid '+C.border+';position:relative;z-index:1}\
.snt-trust-item{font-size:12px;font-weight:600;color:'+C.muted+';background:'+C.white+';padding:6px 14px;border-radius:20px;border:1px solid '+C.border+'}\
@media(max-width:768px){\
.snt-landing{margin:25px -5px 15px;padding:28px 16px}\
.snt-grid,.snt-reviews{grid-template-columns:1fr}\
.snt-title{font-size:20px}\
.snt-card{padding:16px 14px}\
.snt-card-icon{font-size:32px}\
.snt-trust{gap:8px}\
.snt-trust-item{font-size:11px;padding:5px 10px}\
}';
  document.head.appendChild(s);
}

// Build HTML
function build(d){
  var benefits='';
  for(var i=0;i<d.b.length;i++){
    var b=d.b[i];
    benefits+='<div class="snt-card"><span class="snt-card-icon">'+b.i+'</span><div class="snt-card-title">'+b.t+'</div><div class="snt-card-desc">'+b.d+'</div></div>';
  }
  var reviews='';
  for(var j=0;j<d.r.length;j++){
    var rv=d.r[j];
    var col=avatarColor(rv.n);
    var init=rv.n.charAt(0);
    reviews+='<div class="snt-review"><div class="snt-review-header"><div class="snt-review-avatar" style="background:'+col+'">'+init+'</div><div><div class="snt-review-name">'+rv.n+'</div><div class="snt-review-stars">'+stars()+'</div></div></div><p class="snt-review-text">"'+rv.t+'"</p><div class="snt-review-time">'+rv.a+'</div></div>';
  }
  return '<div class="snt-landing">\
<div class="snt-title">✨ Beneficios Principales</div>\
<div class="snt-subtitle">Lo que hace especial a este producto</div>\
<div class="snt-grid">'+benefits+'</div>\
<div class="snt-usage"><div class="snt-usage-title">📋 Modo de Uso</div><p class="snt-usage-text">'+d.u+'</p></div>\
<div class="snt-study"><div class="snt-study-title">🔬 Respaldo Científico</div><p class="snt-study-text">'+d.s+'</p></div>\
<div class="snt-reviews-title">⭐ Lo que dicen nuestros clientes</div>\
<div class="snt-reviews">'+reviews+'</div>\
<div class="snt-trust">\
<span class="snt-trust-item">🇨🇴 Hecho en Colombia</span>\
<span class="snt-trust-item">🌿 100% Natural</span>\
<span class="snt-trust-item">🚚 Envío Nacional</span>\
<span class="snt-trust-item">⭐ +500 Clientes</span>\
</div></div>';
}

// Get product ID from URL
function getID(){
  var m=location.pathname.match(/\/producto\/(\d+)/);
  return m?parseInt(m[1],10):null;
}

// Fallback: match by title
function getByTitle(t){
  t=t.toLowerCase();
  var map={'curcuma':7,'kójico':7,'kojico':7,'melena':8,'sebo':42,'res':9,'polen':15,'colágeno':15,'colageno':15,'néctar':14,'nectar':14,'avena':11,'calendula':13,'aloe':13,'mix':12,'tripack':39,'secreto':40,'japonés':40,'japones':40,'kit total':59,'kit familia':54,'energía':46,'energia':46,'memoria':46,'mente':55,'defensa':55,'capilar':56,'power':57,'ritual':58,'regenerador':58,'bienestar':50};
  for(var k in map){if(t.indexOf(k)!==-1)return P[map[k]]||null;}
  return null;
}

// Inject
function inject(){
  var desc=document.querySelector('.detailDescription');
  var btn=document.querySelector('.btnAdd');
  if(!desc&&!btn)return;
  var existing=document.querySelector('.snt-landing');
  if(existing){
    var prev=existing.previousElementSibling;
    if(prev&&(prev.classList.contains('detailDescription')||prev.closest&&prev.closest('.deFlexGoTocart')))return;
    existing.remove();
  }
  var id=getID();
  var data=id?P[id]:null;
  if(!data){
    var title=document.querySelector('.pageDetail h2')||document.querySelector('.pageDetail h1');
    if(title)data=getByTitle(title.textContent);
  }
  if(!data)return;
  var div=document.createElement('div');
  div.innerHTML=build(data);
  var section=div.firstElementChild;
  if(desc){desc.parentNode.insertBefore(section,desc.nextSibling);}
  else if(btn){var container=btn.closest('.deFlexGoTocart')||btn.parentNode;container.parentNode.insertBefore(section,container.nextSibling);}
}

// Init
function init(){
  if(!/\/producto\//.test(location.pathname))return;
  injectCSS();inject();
  var checks=0;
  var iv=setInterval(function(){if(++checks>80){clearInterval(iv);return;}if(!document.querySelector('.snt-landing'))inject();},1500);
  var origPush=history.pushState;
  history.pushState=function(){var r=origPush.apply(this,arguments);setTimeout(function(){if(/\/producto\//.test(location.pathname)){var old=document.querySelector('.snt-landing');if(old)old.remove();inject();}},600);return r;};
  window.addEventListener('popstate',function(){setTimeout(function(){if(/\/producto\//.test(location.pathname)){var old=document.querySelector('.snt-landing');if(old)old.remove();inject();}},600);});
}

if(document.readyState==='loading'){document.addEventListener('DOMContentLoaded',init);}else{init();}
setTimeout(init,200);
})();
