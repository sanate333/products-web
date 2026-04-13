/* SANATE Product Landing v5.1 themed deploy fix */
(function(){
'use strict';

// ===== PRODUCT DATA WITH THEMES =====
// t: theme {bg: gradient, ac: accent, ac2: secondary, glow: glow color, deco: floating decorations}
var P={
7:{n:'Jabón Cúrcuma x3',t:{bg:'linear-gradient(135deg,#FFF7ED 0%,#FFEDD5 40%,#FFF7ED 100%)',ac:'#ea580c',ac2:'#f97316',glow:'rgba(249,115,22,.12)',deco:['✨','🌿','💛','✨','🌿'],cls:'curcuma'},b:[{i:'✨',t:'Aclara Manchas Visiblemente',d:'La curcumina inhibe la tirosinasa — tu piel se ve uniforme y radiante en semanas'},{i:'🛡️',t:'Elimina el Acné de Raíz',d:'Antiinflamatorio natural que limpia poros a profundidad sin resecar tu piel'},{i:'🌿',t:'100% Artesanal Colombiano',d:'Sin parabenos ni sulfatos — ingredientes puros que tu piel merece'}],u:'Humedecer rostro con agua tibia. Frotar el jabón con movimientos circulares por 2 minutos. Enjuagar con agua fría para cerrar poros. Usar mañana y noche para resultados visibles en 2 semanas.',s:'Journal of Cosmetic Dermatology (2019): La curcumina reduce significativamente la hiperpigmentación en 8 semanas de uso continuo.',r:[{n:'Carolina R.',t:'Mis manchas del sol se aclararon en 6 semanas. Mi piel luce uniforme y radiante — ojalá lo hubiera encontrado antes.',a:'Hace 2 semanas'},{n:'Andrés M.',t:'El acné se redujo muchísimo. Qué sorpresa con un jabón natural. Ya llevo 3 meses y no lo cambio.',a:'Hace 1 mes'},{n:'María José G.',t:'Lo usa toda mi familia. Es suave pero efectivo. Lo recomiendo al 1000%.',a:'Hace 5 días'}]},

8:{n:'Melena de León x60',t:{bg:'linear-gradient(135deg,#F5F3FF 0%,#EDE9FE 40%,#F5F3FF 100%)',ac:'#7c3aed',ac2:'#8b5cf6',glow:'rgba(139,92,246,.12)',deco:['🧠','🍄','💜','🧠','🍄'],cls:'melena'},b:[{i:'🧠',t:'Claridad Mental Inmediata',d:'Estimula el Factor de Crecimiento Nervioso (NGF) — tus neuronas se fortalecen cada día'},{i:'💡',t:'Memoria y Enfoque Láser',d:'Mejora la concentración para estudio y trabajo — rinde al máximo sin esfuerzo'},{i:'⚡',t:'Energía Sin Cafeína',d:'Vitalidad sostenida todo el día sin nerviosismo ni crash'}],u:'Tomar 2 cápsulas al día con un vaso de agua, preferiblemente en la mañana con el desayuno. Uso continuo por mínimo 4 semanas para resultados óptimos.',s:'Mori et al. (2009, Phytotherapy Research): Mejora significativa de función cognitiva tras 16 semanas de uso de Hericium erinaceus.',r:[{n:'Santiago P.',t:'Siento una claridad mental increíble. Rindo el doble en el trabajo. Mi jefe notó la diferencia.',a:'Hace 3 semanas'},{n:'Valentina C.',t:'Como estudiante de medicina esto me salvó la vida. Mejor concentración en exámenes finales.',a:'Hace 1 mes'},{n:'Ricardo L.',t:'Tengo 62 años y siento la mente más ágil que hace 10 años. Producto extraordinario.',a:'Hace 10 días'}]},

9:{n:'x2 Sebos + x2 Jabones Cúrcuma',t:{bg:'linear-gradient(135deg,#FFFBEB 0%,#FEF3C7 40%,#FFFBEB 100%)',ac:'#b45309',ac2:'#d97706',glow:'rgba(217,119,6,.12)',deco:['💧','🧴','🌟','💧','🧴'],cls:'combo-sebo'},b:[{i:'💧',t:'Hidratación + Limpieza Total',d:'Jabones que aclaran y limpian profundo + sebo que hidrata y sella la nutrición'},{i:'🌟',t:'Reduce Manchas al Doble',d:'Doble acción aclarante del kójico + regeneración profunda del sebo'},{i:'🎯',t:'Tu Rutina Completa',d:'4 productos para transformar tu piel — limpieza e hidratación facial y corporal'}],u:'Paso 1: Jabón de cúrcuma masaje circular 2 min, enjuagar. Paso 2: Sebo de res en piel húmeda masajeando suavemente. Mañana y noche para resultados máximos.',s:'Journal of Lipid Research: El sebo bovino es biomimético con los lípidos naturales de la piel humana, restaurando la barrera cutánea.',r:[{n:'Paola V.',t:'Increíble combo. El jabón limpia a fondo y el sebo deja la piel como seda. ¡Divino!',a:'Hace 2 semanas'},{n:'Juan Pablo H.',t:'Mi esposa y yo lo usamos. Manchas y resequedad desaparecieron en un mes.',a:'Hace 1 mes'},{n:'Daniela F.',t:'El mejor combo que he probado en mi vida. Mi piel cambió completamente.',a:'Hace 4 días'}]},

10:{n:'Cúrcuma + Kójico x6',t:{bg:'linear-gradient(135deg,#FFF7ED 0%,#FFEDD5 40%,#FEF3C7 100%)',ac:'#c2410c',ac2:'#ea580c',glow:'rgba(234,88,12,.12)',deco:['💛','✨','🌿','💛','✨'],cls:'curcuma-pack'},b:[{i:'👨‍👩‍👧‍👦',t:'Pack Familiar Completo',d:'6 jabones para toda la familia — alcanza para 3+ meses de transformación'},{i:'💰',t:'El Mejor Precio del Mercado',d:'Ahorro significativo vs comprar individual — tu piel te lo agradece'},{i:'🔄',t:'Resultados que se Multiplican',d:'El uso continuo potencia los efectos — cada semana tu piel luce mejor'}],u:'Mismo uso que el individual. Humedecer, aplicar 2 min circular, enjuagar con agua fría. Mañana y noche. Con 6 jabones tienes para 3+ meses.',s:'Dermatología clínica confirma que la consistencia en activos despigmentantes es clave para resultados visibles en 4-8 semanas.',r:[{n:'Camila S.',t:'Compré el pack de 6 y toda la familia lo usa. Rinde muchísimo y los resultados son increíbles.',a:'Hace 3 semanas'},{n:'Felipe O.',t:'El mejor precio y los resultados se notan más con uso continuo. Ya voy por el segundo pack.',a:'Hace 2 meses'},{n:'Laura T.',t:'Ya voy en mi segundo pack. No cambio estos jabones por nada del mundo.',a:'Hace 1 semana'}]},

11:{n:'Avena y Arroz x3',t:{bg:'linear-gradient(135deg,#FEFCE8 0%,#FEF9C3 40%,#FEFCE8 100%)',ac:'#a16207',ac2:'#ca8a04',glow:'rgba(202,138,4,.10)',deco:['🌾','🤍','💧','🌾','🤍'],cls:'avena'},b:[{i:'🤍',t:'Ideal para Piel Sensible',d:'La avena coloidal calma irritación, enrojecimiento y picazón al instante'},{i:'💧',t:'Hidratación Ultra-Suave',d:'El arroz aporta vitamina E y ácido ferúlico para piel nutrida y protegida'},{i:'👶',t:'Seguro para Toda la Familia',d:'Tan suave que es apto para las pieles más delicadas — desde bebés'}],u:'Aplicar sobre piel húmeda con movimientos suaves. Dejar actuar 1-2 min. Enjuagar con agua tibia. Ideal uso diario para toda la familia.',s:'Journal of Drugs in Dermatology: La avena coloidal tiene propiedades antiinflamatorias comprobadas, aprobada por la FDA como protector cutáneo.',r:[{n:'Isabella M.',t:'Tengo piel muy sensible y por fin encontré un jabón que no irrita. ¡Es mi santo grial!',a:'Hace 2 semanas'},{n:'Diego R.',t:'Lo uso para mi bebé también. Súper suave y huele delicioso. Toda la familia lo ama.',a:'Hace 3 semanas'},{n:'Natalia P.',t:'Mi dermatitis mejoró mucho. La avena es mágica para la piel irritada.',a:'Hace 1 mes'}]},

12:{n:'Mix 3: Cúrcuma, Avena, Caléndula',t:{bg:'linear-gradient(135deg,#F0FDF4 0%,#DCFCE7 40%,#F0FDF4 100%)',ac:'#15803d',ac2:'#22c55e',glow:'rgba(34,197,94,.12)',deco:['🌼','🌿','✨','🌼','🌿'],cls:'mix-herbs'},b:[{i:'🎨',t:'Variedad para Cada Día',d:'Tres fórmulas para alternar según lo que tu piel necesite — personaliza tu rutina'},{i:'✨',t:'Cúrcuma que Aclara',d:'Reduce manchas y combate acné con poder antiinflamatorio natural'},{i:'🌼',t:'Caléndula que Repara',d:'Cicatrizante natural que calma y regenera piel irritada'}],u:'Alternar jabones según necesidad: Cúrcuma para manchas, Avena para calmar, Caléndula para reparar. 2 min masaje + enjuague con agua fría.',s:'Phytomedicine Journal: Los extractos de Calendula officinalis aceleran la cicatrización cutánea significativamente.',r:[{n:'Juliana A.',t:'Me encanta tener los 3 jabones. Cada día elijo el que mi piel necesita. ¡Genial!',a:'Hace 1 semana'},{n:'Mateo G.',t:'El mix perfecto. La cúrcuma para manchas, la avena para días sensibles. Divino.',a:'Hace 3 semanas'},{n:'Alejandra B.',t:'Regalo perfecto. Le di uno a mi mamá y está feliz con los resultados.',a:'Hace 2 semanas'}]},

13:{n:'Caléndula + Aloe Vera x3',t:{bg:'linear-gradient(135deg,#F0FDF4 0%,#D1FAE5 40%,#F0FDF4 100%)',ac:'#047857',ac2:'#10b981',glow:'rgba(16,185,129,.12)',deco:['🌼','💚','🌿','🌼','💚'],cls:'calendula'},b:[{i:'🌼',t:'Cicatrizante Natural Poderoso',d:'La caléndula acelera la regeneración celular — marcas y cicatrices se desvanecen'},{i:'💚',t:'Aloe Vera Ultra-Calmante',d:'Hidrata, desinflama y protege la barrera natural de tu piel'},{i:'🛡️',t:'Protección Diaria Total',d:'Ideal para pieles con irritación, rosácea o dermatitis — adiós molestias'}],u:'Aplicar sobre piel húmeda con masaje suave. 2 min enfocándose en áreas irritadas. Enjuagar con agua tibia. Mañana y noche.',s:'Wounds Journal (2008): Calendula officinalis promueve la epitelización y tiene efecto antimicrobiano comprobado.',r:[{n:'Sebastián V.',t:'Tenía marcas de acné y se están borrando rápido. Increíble este jabón natural.',a:'Hace 2 semanas'},{n:'Carolina M.',t:'Mi rosácea mejoró notablemente. El aloe calma mucho mi piel sensible.',a:'Hace 1 mes'},{n:'Andrés T.',t:'Lo uso después de afeitarme y la irritación desapareció por completo. 10/10.',a:'Hace 5 días'}]},

14:{n:'Néctar Capilar 200g',t:{bg:'linear-gradient(135deg,#F0FDFA 0%,#CCFBF1 40%,#F0FDFA 100%)',ac:'#0d9488',ac2:'#14b8a6',glow:'rgba(20,184,166,.12)',deco:['💎','🌊','💧','💎','🌊'],cls:'nectar'},b:[{i:'💎',t:'Brillo de Salón en Casa',d:'Cabello radiante y sedoso desde la primera aplicación — sin apelmazar'},{i:'🌊',t:'Adiós Frizz Para Siempre',d:'Control total del encrespamiento incluso en el clima más húmedo'},{i:'💪',t:'Cabello Fuerte y Sano',d:'Biotina y queratina vegetal reducen caída y quiebre — pelo que crece fuerte'}],u:'Después de lavar el cabello, aplicar generosamente en medios y puntas húmedas. No enjuagar. Peinar como de costumbre. Usar después de cada lavada.',s:'International Journal of Trichology: La biotina mejora grosor y resistencia del cabello visiblemente en 90 días de uso.',r:[{n:'Valentina L.',t:'Mi cabello nunca había brillado tanto. El frizz desapareció totalmente. ¡Estoy obsesionada!',a:'Hace 1 semana'},{n:'Camila H.',t:'Probé mil tratamientos caros y este de $45 mil es el mejor de todos. Increíble.',a:'Hace 3 semanas'},{n:'María F.',t:'Se me caía mucho el pelo y ahora está fuerte y brillante. Súper recomendado.',a:'Hace 2 semanas'}]},

15:{n:'Colágeno Polen x90 Caps',t:{bg:'linear-gradient(135deg,#FFFBEB 0%,#FEF3C7 40%,#FFFBEB 100%)',ac:'#d97706',ac2:'#f59e0b',glow:'rgba(245,158,11,.15)',deco:['🐝','🌻','💛','🐝','🌻'],cls:'polen'},b:[{i:'🐝',t:'Superalimento del Huila',d:'Polen multifloral colombiano — rico en 22 aminoácidos esenciales para tu cuerpo'},{i:'⚡',t:'Energía que Transforma tu Día',d:'Vitalidad sostenida desde la mañana sin cafeína ni estimulantes artificiales'},{i:'🛡️',t:'Defensas Inquebrantables',d:'Fortalece tu sistema inmunológico con vitaminas B, zinc y antioxidantes potentes'}],u:'Tomar 2-3 cápsulas al día con agua, preferiblemente en la mañana con el desayuno. Sentirás la diferencia desde la primera semana.',s:'Journal of Food Science and Technology: El polen contiene perfil completo de aminoácidos con efecto inmunomodulador comprobado.',r:[{n:'Carlos D.',t:'Mi energía cambió completamente. Ya no necesito tanto café. Me siento vivo de nuevo.',a:'Hace 1 mes'},{n:'Paola R.',t:'Me enfermaba cada mes y desde que tomo polen no me he gripado. ¡3 meses sin gripa!',a:'Hace 2 semanas'},{n:'Diego S.',t:'El mejor suplemento natural que he probado. Se siente la diferencia desde el día 3.',a:'Hace 3 semanas'}]},

16:{n:'Crema Sebo + x2 Jabones',t:{bg:'linear-gradient(135deg,#FFFBEB 0%,#FDE68A40 40%,#FFFBEB 100%)',ac:'#92400e',ac2:'#b45309',glow:'rgba(180,83,9,.10)',deco:['🧴','✨','💧','🧴','✨'],cls:'crema-sebo'},b:[{i:'🧴',t:'Limpieza + Nutrición Profunda',d:'Jabones aclaran y limpian a fondo — la crema de sebo sella la hidratación todo el día'},{i:'✨',t:'Aclara y Regenera tu Piel',d:'Doble acción: kójico despigmenta mientras sebo repara y nutre tejidos'},{i:'💧',t:'Piel de Terciopelo Todo el Día',d:'Crema de sebo crea barrera protectora sin sensación grasosa — piel perfecta'}],u:'Mañana: Jabón cúrcuma 2 min, enjuagar, crema sebo en rostro y cuello. Noche: repetir rutina. La crema rinde 30+ días con uso diario.',s:'Dermatología colombiana: Limpieza activa + hidratación oclusiva es el gold standard para tratar hiperpigmentación.',r:[{n:'Laura G.',t:'El combo perfecto. Jabón limpia a profundidad y la crema deja la piel divina.',a:'Hace 2 semanas'},{n:'Juan M.',t:'Mi esposa me lo recomendó y ahora los dos lo usamos cada día. Funciona de verdad.',a:'Hace 1 mes'},{n:'Natalia V.',t:'La crema de sebo es increíble. Mi piel nunca estuvo tan suave y luminosa.',a:'Hace 4 días'}]},

38:{n:'Secreto Japonés x2 + Sebo 10g',t:{bg:'linear-gradient(135deg,#FFF1F2 0%,#FFE4E6 40%,#FFF1F2 100%)',ac:'#be185d',ac2:'#ec4899',glow:'rgba(236,72,153,.12)',deco:['🌸','🎌','💮','🌸','🎌'],cls:'japones'},b:[{i:'🌸',t:'Ritual Milenario Japonés',d:'El secreto de las geishas: agua de arroz fermentada para piel perfecta y luminosa'},{i:'🧴',t:'Kit de Inicio Perfecto',d:'2 jabones arroz + muestra sebo para experimentar la rutina completa'},{i:'⏰',t:'Anti-Edad Desde Hoy',d:'Ácido ferúlico del arroz: potente antioxidante que combate arrugas y líneas'}],u:'Jabón de arroz limpieza diaria mañana y noche — 2 min masaje circular. Sebo de 10g como hidratante nocturno en zonas secas.',s:'Japanese Journal of Dermatology: El ácido ferúlico reduce fotoenvejecimiento y mejora luminosidad cutánea significativamente.',r:[{n:'Isabella C.',t:'Mi piel se ve más joven y luminosa. El arroz es mágico. ¡Parece de mentiras!',a:'Hace 3 semanas'},{n:'Felipe M.',t:'Excelente para empezar. El jabón de arroz es adictivo — no puedo dejar de usarlo.',a:'Hace 1 semana'},{n:'Daniela R.',t:'El sebo de muestra me convenció totalmente. Ya pedí el tamaño grande.',a:'Hace 2 semanas'}]},

39:{n:'Tripack Jabones Artesanales',t:{bg:'linear-gradient(135deg,#F8FAFC 0%,#E2E8F0 40%,#F8FAFC 100%)',ac:'#334155',ac2:'#64748b',glow:'rgba(51,65,85,.10)',deco:['🖤','💚','🤍','🖤','💚'],cls:'tripack'},b:[{i:'🎁',t:'3 Fórmulas Únicas',d:'Carbón activado + Avena + Arcilla verde — una para cada necesidad de tu piel'},{i:'🖤',t:'Carbón que Desintoxica',d:'Absorbe toxinas de poros profundos como un imán — piel limpia y fresca'},{i:'💚',t:'Arcilla que Purifica',d:'Arcilla verde que regula grasa y cierra poros abiertos — rostro perfecto'}],u:'Alternar los 3 según tu piel: Carbón (grasa/acné), Avena (sensible/seca), Arcilla verde (poros/grasa). 2 min masaje, enjuagar con agua fría.',s:'Journal of Cosmetic Science: El carbón activado tiene capacidad adsorbente 1000x su peso para purificación profunda.',r:[{n:'Santiago A.',t:'Los tres jabones son increíbles. El de carbón me limpió los poros como nada antes.',a:'Hace 2 semanas'},{n:'Juliana P.',t:'Cada jabón tiene su momento perfecto. Me encanta alternar según mi piel.',a:'Hace 1 mes'},{n:'Ricardo G.',t:'El de arcilla verde controla la grasa de mi cara todo el día. Adiós brillo.',a:'Hace 3 días'}]},

40:{n:'Secreto Japonés Completo',t:{bg:'linear-gradient(135deg,#FFF1F2 0%,#FCE7F3 40%,#FFF1F2 100%)',ac:'#9d174d',ac2:'#ec4899',glow:'rgba(236,72,153,.15)',deco:['🌸','💎','🎌','🌸','💮'],cls:'japones-full'},b:[{i:'🌸',t:'Ritual Japonés Completo',d:'Jabón arroz + Crema facial — el sistema ancestral japonés para piel perfecta'},{i:'💎',t:'Luminosidad que se Ve',d:'Piel más clara, uniforme y radiante — resultados desde la primera semana'},{i:'🧬',t:'Antioxidante de Elite',d:'Gamma-oryzanol protege contra radicales libres y daño solar'}],u:'Jabón arroz masaje 2 min mañana y noche. Crema facial de arroz en rostro y cuello — día y noche para máxima luminosidad.',s:'Research in Cosmetic Science: Gamma-oryzanol y ácido ferúlico tienen efecto despigmentante y anti-edad comprobado.',r:[{n:'Camila V.',t:'Este combo es divino. Mi cara brilla naturalmente. Me dicen que parezco otra.',a:'Hace 2 semanas'},{n:'Mateo R.',t:'La crema de arroz es lo mejor que he usado. Textura increíble, resultados reales.',a:'Hace 1 mes'},{n:'Alejandra S.',t:'Mi mamá usa este ritual y le dicen que se ve 10 años más joven. ¡Comprobado!',a:'Hace 1 semana'}]},

41:{n:'Melena de León x2 Cajas',t:{bg:'linear-gradient(135deg,#F5F3FF 0%,#E8E0FE 40%,#F5F3FF 100%)',ac:'#6d28d9',ac2:'#7c3aed',glow:'rgba(124,58,237,.12)',deco:['🧠','🍄','⚡','🧠','🍄'],cls:'melena-x2'},b:[{i:'🧠',t:'Dosis Doble de Poder Mental',d:'120 cápsulas para 2 meses — estimulación sostenida del Factor de Crecimiento Nervioso'},{i:'📈',t:'El Segundo Mes Explota',d:'Los efectos nootrópicos se acumulan — el mes 2 es donde tu mente despega'},{i:'💰',t:'Ahorro que Vale la Pena',d:'Descuento significativo vs individual — invierte en tu cerebro'}],u:'2 cápsulas diarias con agua en la mañana. Mantener consumo continuo durante los 2 meses completos para resultados máximos.',s:'Nagano et al. (2010, Biomedical Research): Hericium reduce significativamente depresión y ansiedad tras 4 semanas de uso.',r:[{n:'Juan Pablo O.',t:'El segundo mes es donde se siente todo. Mi concentración está al máximo nivel.',a:'Hace 3 semanas'},{n:'Valentina D.',t:'Compré las 2 cajas y valió totalmente la pena. Mejor precio, mejores resultados.',a:'Hace 1 mes'},{n:'Carlos F.',t:'Llevo 2 meses y mi productividad subió notablemente. Mi cerebro funciona mejor.',a:'Hace 5 días'}]},

42:{n:'Sebo Premium x2',t:{bg:'linear-gradient(135deg,#FEFCE8 0%,#FEF9C3 40%,#FEF3C7 100%)',ac:'#78350f',ac2:'#a16207',glow:'rgba(120,53,15,.10)',deco:['💧','🌿','🍃','💧','🌿'],cls:'sebo'},b:[{i:'💧',t:'Hidratación que Transforma',d:'Ácidos grasos que imitan los lípidos naturales de tu piel — absorción perfecta'},{i:'🌟',t:'Regenera y Repara',d:'Reduce cicatrices, estrías y marcas con uso constante — piel nueva'},{i:'👵',t:'Tradición Ancestral Colombiana',d:'Remedio de nuestras abuelas en fórmula premium concentrada — sabiduría natural'}],u:'Aplicar cantidad pequeña en piel limpia y húmeda. Masajear hasta absorción completa. Rostro, manos, codos, rodillas. Mañana y noche.',s:'Journal of Lipid Research: Ácidos palmítico y oleico biocompatibles restauran la barrera lipídica natural de la piel.',r:[{n:'Paola M.',t:'Mis estrías del embarazo se están borrando. No lo puedo creer. Producto increíble.',a:'Hace 2 semanas'},{n:'Diego A.',t:'Mi abuela siempre usó sebo y tenía piel perfecta a los 80. Ahora entiendo por qué.',a:'Hace 1 mes'},{n:'Laura C.',t:'Dos envases me duran 2 meses. La mejor inversión para mi piel en años.',a:'Hace 1 semana'}]},

44:{n:'Polen Multifloral x90',t:{bg:'linear-gradient(135deg,#FFFBEB 0%,#FDE68A50 40%,#FFFBEB 100%)',ac:'#b45309',ac2:'#f59e0b',glow:'rgba(245,158,11,.15)',deco:['🐝','🌻','🍯','🐝','🌻'],cls:'polen-multi'},b:[{i:'🐝',t:'Directo del Huila para Ti',d:'Polen recolectado de abejas del Huila colombiano — biodiversidad pura en cada cápsula'},{i:'💪',t:'Energía + Colágeno Natural',d:'Aminoácidos que tu cuerpo convierte en colágeno — juventud desde adentro'},{i:'🛡️',t:'Inmunidad de Acero',d:'Rico en zinc, selenio y vitaminas B — tus defensas siempre altas'}],u:'2-3 cápsulas al día con agua y alimentos. Mañana o mediodía para máxima energía. Mínimo 30 días para resultados completos.',s:'Nutrients Journal (2020): El polen exhibe propiedades antioxidantes e inmunomoduladoras significativas en estudios clínicos.',r:[{n:'Andrés V.',t:'El polen del Huila es otro nivel. Energía pura sin bajones ni nervios. Increíble.',a:'Hace 3 semanas'},{n:'María José T.',t:'Mi sistema inmune está más fuerte que nunca. 3 meses sin enfermarme.',a:'Hace 1 mes'},{n:'Sebastián R.',t:'Lo tomo todas las mañanas y la diferencia en energía es abismal.',a:'Hace 2 semanas'}]},

45:{n:'Tripack + Sebo 10g',t:{bg:'linear-gradient(135deg,#F8FAFC 0%,#F1F5F9 40%,#F8FAFC 100%)',ac:'#475569',ac2:'#64748b',glow:'rgba(71,85,105,.10)',deco:['🎁','🧴','✨','🎁','🧴'],cls:'tripack-sebo'},b:[{i:'🎁',t:'El Pack que lo Tiene Todo',d:'3 jabones artesanales + muestra de sebo premium — tu rutina completa'},{i:'🧪',t:'Prueba y Enamórate',d:'Conoce jabones y sebo premium en un solo combo — vas a querer más'},{i:'✅',t:'Rutina Lista para Hoy',d:'Todo para empezar tu transformación natural de cuidado de piel'}],u:'Jabones alternando según necesidad (2 min masaje). Sebo 10g como hidratante nocturno en zonas que necesiten reparación y nutrición.',s:'La limpieza activa + hidratación oclusiva con sebo maximiza la regeneración cutánea durante el sueño.',r:[{n:'Natalia H.',t:'Perfecto para probar todo. Me enamoré de los jabones y del sebo. Ya pedí más.',a:'Hace 2 semanas'},{n:'Felipe C.',t:'Regalé este pack y ahora mi novia quiere más. Éxito total garantizado.',a:'Hace 1 mes'},{n:'Isabella V.',t:'El sebo de muestra fue suficiente para convencerme. Ya pedí el tamaño grande.',a:'Hace 4 días'}]},

46:{n:'Energía + Memoria',t:{bg:'linear-gradient(135deg,#EFF6FF 0%,#DBEAFE 40%,#EFF6FF 100%)',ac:'#1d4ed8',ac2:'#3b82f6',glow:'rgba(59,130,246,.12)',deco:['⚡','🧠','💙','⚡','🧠'],cls:'energia'},b:[{i:'⚡',t:'Doble Potencia Diaria',d:'Melena de León para el cerebro + Polen para el cuerpo — combo imbatible'},{i:'🧠',t:'Enfoque Láser Total',d:'NGF + aminoácidos = concentración sostenida para estudio y trabajo al máximo'},{i:'🔋',t:'Adiós Bajones de Energía',d:'Energía natural sin nerviosismo ni crash — rinde todo el día'}],u:'Mañana: 2 cáps Melena + 2 cáps Polen con desayuno. Mantener rutina mínimo 30 días para resultados transformadores.',s:'La sinergia entre hongos funcionales y superalimentos potencia exponencialmente los efectos nootrópicos y energéticos.',r:[{n:'Alejandro B.',t:'Este combo es perfecto para mi trabajo remoto. Mente clara y energía todo el día.',a:'Hace 3 semanas'},{n:'Juliana D.',t:'Mejor inversión para mi rendimiento académico. La diferencia se nota muchísimo.',a:'Hace 1 mes'},{n:'Mateo P.',t:'Dejé el café y ahora solo tomo Melena + Polen. Mejor energía de mi vida.',a:'Hace 2 semanas'}]},

50:{n:'Piel y Bienestar',t:{bg:'linear-gradient(135deg,#F0FDF4 0%,#DCFCE7 40%,#F0FDF4 100%)',ac:'#16a34a',ac2:'#22c55e',glow:'rgba(34,197,94,.10)',deco:['🌿','😊','💧','🌿','😊'],cls:'bienestar'},b:[{i:'🌿',t:'Cuidado Integral Natural',d:'Jabones naturales para limpiar profundo + productos que nutren tu piel cada día'},{i:'💧',t:'Hidratación que se Siente',d:'Ingredientes que respetan el pH y la barrera natural — piel feliz'},{i:'😊',t:'Bienestar que se Ve',d:'Rutina sencilla que cuida tu piel y transforma cómo te sientes contigo mismo'}],u:'Jabones naturales 2 min masaje circular. Aplicar hidratante después en piel húmeda. Mañana y noche para resultados visibles.',s:'Una rutina consistente de limpieza + hidratación natural mejora visiblemente la salud cutánea en 2-4 semanas.',r:[{n:'Carolina A.',t:'Mi piel está más sana y feliz que nunca. Rutina simple pero increíblemente efectiva.',a:'Hace 2 semanas'},{n:'Diego M.',t:'Nunca fui de skincare pero esto me convenció. Resultados reales desde la semana 1.',a:'Hace 1 mes'},{n:'Valentina G.',t:'Me siento mejor conmigo misma desde que cuido mi piel así. Cambió mi autoestima.',a:'Hace 1 semana'}]},

54:{n:'Kit Familia Piel',t:{bg:'linear-gradient(135deg,#FFFBEB 0%,#FEF3C7 40%,#FFFBEB 100%)',ac:'#b45309',ac2:'#d97706',glow:'rgba(217,119,6,.10)',deco:['👨‍👩‍👧‍👦','🌿','💛','👨‍👩‍👧‍👦','🌿'],cls:'familia'},b:[{i:'👨‍👩‍👧‍👦',t:'Para Toda Tu Familia',d:'Jabones y productos para cada miembro del hogar — todos protegidos'},{i:'🌿',t:'Todo 100% Natural',d:'Sin químicos agresivos — seguro para pieles sensibles de todas las edades'},{i:'💰',t:'Ahorro Familiar Real',d:'Pack completo a mejor precio que individual — cuida tu familia y tu bolsillo'}],u:'Cada miembro elige jabón según su piel. Cúrcuma para manchas, Avena para sensible, Caléndula para reparar. Sebo como hidratante compartido.',s:'La Academia Americana de Dermatología recomienda jabones sin sulfatos ni parabenos para uso familiar seguro.',r:[{n:'Paola S.',t:'Toda mi familia lo usa. Cada uno tiene su jabón favorito. Es perfecto.',a:'Hace 3 semanas'},{n:'Juan M.',t:'Mi esposa, mis hijos y yo. El kit rinde muchísimo y todos estamos felices.',a:'Hace 1 mes'},{n:'Laura V.',t:'Lo mejor para regalar en familia. Mis suegros quedaron encantados. Ya repitieron.',a:'Hace 2 semanas'}]},

55:{n:'Mente y Defensa',t:{bg:'linear-gradient(135deg,#EEF2FF 0%,#E0E7FF 40%,#EEF2FF 100%)',ac:'#4338ca',ac2:'#6366f1',glow:'rgba(99,102,241,.12)',deco:['🧠','🛡️','💜','🧠','🛡️'],cls:'mente-defensa'},b:[{i:'🧠',t:'Cerebro Blindado',d:'Melena de León estimula NGF para neuronas fuertes y conexiones cerebrales óptimas'},{i:'🛡️',t:'Inmunidad Activa 24/7',d:'Polen multifloral con antioxidantes potentes para defensas inquebrantables'},{i:'🎯',t:'Rendimiento Total',d:'Mente clara + cuerpo protegido = la versión más potente de ti mismo'}],u:'Melena 2 cáps en la mañana para enfoque mental. Polen 2 cáps con almuerzo para defensas. Mínimo 30 días continuos.',s:'Frontiers in Aging Neuroscience (2020): Hongos funcionales tienen potencial neuroprotector significativo en estudios clínicos.',r:[{n:'Santiago L.',t:'Mi enfoque mejoró dramáticamente y no me he enfermado en 3 meses. Combo ganador.',a:'Hace 2 semanas'},{n:'Daniela O.',t:'El combo perfecto para cuidar mente y salud al mismo tiempo. No le falta nada.',a:'Hace 1 mes'},{n:'Ricardo T.',t:'Como profesional de salud recomiendo este combo. Tiene todo lo que necesitas.',a:'Hace 3 semanas'}]},

56:{n:'Capilar Completo',t:{bg:'linear-gradient(135deg,#F0FDFA 0%,#CCFBF1 40%,#F0FDFA 100%)',ac:'#0f766e',ac2:'#14b8a6',glow:'rgba(20,184,166,.12)',deco:['💎','💇‍♀️','✨','💎','💇‍♀️'],cls:'capilar'},b:[{i:'💎',t:'Cabello de Revista',d:'Melena fortalece desde adentro + Néctar nutre desde afuera — doble poder'},{i:'🔄',t:'Doble Acción Capilar',d:'Suplemento oral para crecimiento + tratamiento tópico para brillo espectacular'},{i:'📈',t:'Resultados que se Ven',d:'Menos caída, más brillo y volumen — tu peluquero va a notar la diferencia'}],u:'Melena 2 cáps con desayuno. Néctar Capilar en medios y puntas húmedas después de cada lavada. Combinar 60 días mínimo.',s:'Int. Journal of Trichology: Suplementación oral + tratamiento tópico acelera resultados capilares significativamente.',r:[{n:'Camila D.',t:'Mi cabello dejó de caerse y ahora brilla precioso. No lo puedo creer.',a:'Hace 2 semanas'},{n:'María José R.',t:'La combinación oral + tópica es clave. Mi peluquera me preguntó qué me hice.',a:'Hace 1 mes'},{n:'Natalia S.',t:'Después de 2 meses mi cabello creció más que en todo el año anterior.',a:'Hace 3 semanas'}]},

57:{n:'Power Mental',t:{bg:'linear-gradient(135deg,#EFF6FF 0%,#DBEAFE 40%,#EFF6FF 100%)',ac:'#1e40af',ac2:'#3b82f6',glow:'rgba(59,130,246,.15)',deco:['🚀','🧠','⚡','🚀','🧠'],cls:'power'},b:[{i:'🚀',t:'Máximo Rendimiento Cerebral',d:'2 cajas Melena + Polen = la fórmula más potente para tu mente en todo el catálogo'},{i:'🧠',t:'Nootrópico Natural #1',d:'Triple dosis NGF + aminoácidos para performance cognitivo de élite'},{i:'⚡',t:'Energía que No Para',d:'Vitalidad mental y física sostenida todo el día — rinde al 200%'}],u:'2 cáps Melena + 2 cáps Polen con desayuno cada mañana. Mantener dosis diaria por los 2 meses completos del pack.',s:'Biomedical Research (2010): Hericium erinaceus mejora significativamente ansiedad, depresión y concentración.',r:[{n:'Felipe A.',t:'El combo más potente. Mi rendimiento laboral subió al máximo nivel.',a:'Hace 3 semanas'},{n:'Alejandro C.',t:'Como emprendedor necesitaba esto. Mente clara para tomar las mejores decisiones.',a:'Hace 1 mes'},{n:'Juliana M.',t:'Preparé mis exámenes con esto. Concentración nivel máximo — aprobé todo.',a:'Hace 2 semanas'}]},

58:{n:'Ritual Regenerador',t:{bg:'linear-gradient(135deg,#FFF1F2 0%,#FFE4E6 40%,#FFF7ED 100%)',ac:'#be123c',ac2:'#f43f5e',glow:'rgba(244,63,94,.10)',deco:['🌟','🧴','💫','🌟','🧴'],cls:'ritual'},b:[{i:'🌟',t:'Regeneración Total de tu Piel',d:'Sebo + Jabones + Crema arroz — tu piel se renueva completamente desde la raíz'},{i:'💧',t:'Hidratación 360° Completa',d:'Limpieza profunda + nutrición + hidratación sellada en cada paso — piel perfecta'},{i:'🧴',t:'Tu Spa Personal en Casa',d:'Ritual completo de cuidado facial y corporal — resultados de spa profesional'}],u:'Paso 1: Jabón 2 min masaje. Paso 2: Crema arroz en rostro húmedo. Paso 3: Sellar con sebo en zonas secas. Mañana y noche.',s:'Dermatología moderna: La rutina de 3 pasos (limpiar-nutrir-sellar) es el gold standard para regeneración cutánea.',r:[{n:'Isabella G.',t:'Me siento en un spa cada noche. Mi piel se transformó completamente en 3 semanas.',a:'Hace 2 semanas'},{n:'Carlos R.',t:'El ritual de 3 pasos es genial. Resultados visibles desde la primera semana.',a:'Hace 1 mes'},{n:'Valentina H.',t:'Mi piel nunca estuvo tan bonita. Este ritual es mi favorito del catálogo.',a:'Hace 5 días'}]},

59:{n:'Kit Total SANATE',t:{bg:'linear-gradient(135deg,#FFFBEB 0%,#FEF3C7 30%,#F5F3FF 70%,#FFFBEB 100%)',ac:'#b45309',ac2:'#d97706',glow:'rgba(217,119,6,.15)',deco:['👑','⭐','💎','👑','⭐'],cls:'kit-total'},b:[{i:'👑',t:'TODO lo que Necesitas en Uno',d:'Jabones + Sebo + Melena + Polen + Néctar + Crema — el paquete definitivo de bienestar'},{i:'💰',t:'Ahorro Máximo +30%',d:'Más del 30% de descuento vs comprar por separado — la mejor inversión en salud'},{i:'✅',t:'Bienestar Completo Garantizado',d:'Piel, cabello, mente, energía y defensas — todo cubierto en una sola compra'}],u:'Jabones: limpieza facial. Sebo: hidratante. Melena: 2 cáps/mañana. Polen: 2 cáps/almuerzo. Néctar: cabello. Crema: noche.',s:'La sinergia entre cuidado interno (suplementos) y externo (tópicos) maximiza resultados según medicina integrativa.',r:[{n:'Santiago D.',t:'El kit completo cambió mi vida. Todo lo que necesitas en una sola caja.',a:'Hace 3 semanas'},{n:'Paola F.',t:'Se lo regalé a mi mamá y lloró de la emoción. Producto increíble.',a:'Hace 1 mes'},{n:'Andrés C.',t:'La mejor inversión en salud y bienestar de mi vida. No le falta absolutamente nada.',a:'Hace 2 semanas'}]}
};

// Stars
function stars(){return '★★★★★';}

// Avatar color from name
function avatarColor(name){
  var colors=['#3dc9e8','#e8c87a','#f59e0b','#10b981','#8b5cf6','#ec4899','#06b6d4','#84cc16'];
  var i=0;for(var c=0;c<name.length;c++)i+=name.charCodeAt(c);
  return colors[i%colors.length];
}

// Inject styles (base + per-product themes via CSS vars)
function injectCSS(){
  if(document.getElementById('snt-css'))return;
  var s=document.createElement('style');s.id='snt-css';
  s.textContent='\
@keyframes sntFade{from{opacity:0;transform:translateY(30px)}to{opacity:1;transform:translateY(0)}}\
@keyframes sntShimmer{0%{background-position:-200% center}100%{background-position:200% center}}\
@keyframes sntFloat1{0%,100%{transform:translate(0,0) rotate(0deg);opacity:.18}25%{transform:translate(15px,-20px) rotate(10deg);opacity:.25}50%{transform:translate(-10px,-35px) rotate(-5deg);opacity:.15}75%{transform:translate(20px,-15px) rotate(8deg);opacity:.22}}\
@keyframes sntFloat2{0%,100%{transform:translate(0,0) rotate(0deg);opacity:.15}33%{transform:translate(-20px,-25px) rotate(-12deg);opacity:.22}66%{transform:translate(15px,-40px) rotate(8deg);opacity:.12}}\
@keyframes sntFloat3{0%,100%{transform:translate(0,0) scale(1);opacity:.2}50%{transform:translate(10px,-30px) scale(1.2);opacity:.1}}\
@keyframes sntPulseGlow{0%,100%{opacity:.4}50%{opacity:.7}}\
@keyframes sntCloudDrift{0%{transform:translateX(-10px);opacity:.06}50%{transform:translateX(10px);opacity:.1}100%{transform:translateX(-10px);opacity:.06}}\
@keyframes sntCardPop{from{opacity:0;transform:translateY(15px) scale(.95)}to{opacity:1;transform:translateY(0) scale(1)}}\
.snt-landing{margin:35px -10px 20px;padding:50px 28px 40px;border-radius:24px;position:relative;overflow:hidden;animation:sntFade .7s ease-out}\
.snt-deco{position:absolute;font-size:28px;pointer-events:none;z-index:0;filter:blur(.5px)}\
.snt-deco-0{top:8%;left:5%;animation:sntFloat1 8s ease-in-out infinite}\
.snt-deco-1{top:15%;right:8%;animation:sntFloat2 10s ease-in-out infinite}\
.snt-deco-2{bottom:20%;left:10%;animation:sntFloat3 7s ease-in-out infinite}\
.snt-deco-3{bottom:10%;right:5%;animation:sntFloat1 9s ease-in-out infinite .5s}\
.snt-deco-4{top:50%;left:50%;animation:sntFloat2 11s ease-in-out infinite 1s}\
.snt-cloud{position:absolute;border-radius:50%;pointer-events:none;z-index:0}\
.snt-cloud-1{width:180px;height:180px;top:-50px;right:-40px;animation:sntCloudDrift 12s ease-in-out infinite}\
.snt-cloud-2{width:140px;height:140px;bottom:-30px;left:-30px;animation:sntCloudDrift 15s ease-in-out infinite 3s}\
.snt-cloud-3{width:100px;height:100px;top:40%;right:10%;animation:sntCloudDrift 10s ease-in-out infinite 6s}\
.snt-glow{position:absolute;border-radius:50%;pointer-events:none;z-index:0;animation:sntPulseGlow 4s ease-in-out infinite}\
.snt-glow-1{width:200px;height:200px;top:-60px;right:-60px}\
.snt-glow-2{width:160px;height:160px;bottom:-40px;left:-40px}\
.snt-badge{display:inline-block;padding:6px 16px;border-radius:20px;font-size:12px;font-weight:700;letter-spacing:.5px;text-transform:uppercase;margin:0 auto 16px;position:relative;z-index:1}\
.snt-title{font-size:28px;font-weight:900;text-align:center;margin:0 0 6px;position:relative;z-index:1;line-height:1.3}\
.snt-subtitle{text-align:center;font-size:14px;margin:0 0 32px;position:relative;z-index:1;line-height:1.5}\
.snt-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:16px;margin-bottom:32px;position:relative;z-index:1}\
.snt-card{border-radius:16px;padding:24px 16px;text-align:center;transition:all .3s ease;border:1px solid rgba(0,0,0,.04);animation:sntCardPop .5s ease-out backwards}\
.snt-card:nth-child(1){animation-delay:.1s}.snt-card:nth-child(2){animation-delay:.2s}.snt-card:nth-child(3){animation-delay:.3s}\
.snt-card:hover{transform:translateY(-6px) scale(1.02)}\
.snt-card-icon{font-size:42px;display:block;margin-bottom:12px}\
.snt-card-title{font-size:15px;font-weight:800;margin-bottom:8px}\
.snt-card-desc{font-size:13px;line-height:1.6}\
.snt-divider{height:2px;border-radius:1px;margin:0 auto 28px;width:60px;position:relative;z-index:1}\
.snt-usage{background:rgba(255,255,255,.85);backdrop-filter:blur(6px);border-radius:16px;padding:22px 24px;margin-bottom:18px;position:relative;z-index:1;border-left:4px solid}\
.snt-usage-title{font-size:17px;font-weight:800;margin:0 0 10px}\
.snt-usage-text{font-size:14px;line-height:1.7;margin:0}\
.snt-study{background:rgba(255,255,255,.75);backdrop-filter:blur(6px);border-radius:16px;padding:18px 22px;margin-bottom:28px;position:relative;z-index:1;border-left:4px solid}\
.snt-study-title{font-size:15px;font-weight:800;margin:0 0 8px}\
.snt-study-text{font-size:13px;line-height:1.6;font-style:italic;margin:0}\
.snt-reviews-title{font-size:21px;font-weight:800;text-align:center;margin:0 0 18px;position:relative;z-index:1}\
.snt-reviews{display:grid;grid-template-columns:repeat(3,1fr);gap:14px;margin-bottom:28px;position:relative;z-index:1}\
.snt-review{background:rgba(255,255,255,.9);backdrop-filter:blur(4px);border-radius:14px;padding:20px 16px;border:1px solid rgba(0,0,0,.04);animation:sntCardPop .5s ease-out backwards}\
.snt-review:nth-child(1){animation-delay:.15s}.snt-review:nth-child(2){animation-delay:.25s}.snt-review:nth-child(3){animation-delay:.35s}\
.snt-review-header{display:flex;align-items:center;gap:10px;margin-bottom:10px}\
.snt-review-avatar{width:38px;height:38px;border-radius:50%;display:flex;align-items:center;justify-content:center;color:#fff;font-weight:700;font-size:15px;flex-shrink:0}\
.snt-review-name{font-weight:700;font-size:13px;color:#1a1a2e}\
.snt-review-stars{color:#f59e0b;font-size:13px;letter-spacing:1px}\
.snt-review-text{font-size:13px;color:#334155;line-height:1.6;margin:0 0 8px}\
.snt-review-time{font-size:11px;color:#94a3b8}\
.snt-cta{text-align:center;padding:24px 20px;border-radius:16px;margin-bottom:24px;position:relative;z-index:1}\
.snt-cta-text{font-size:18px;font-weight:800;margin:0 0 6px}\
.snt-cta-sub{font-size:13px;margin:0}\
.snt-trust{display:flex;justify-content:center;gap:12px;flex-wrap:wrap;padding-top:20px;border-top:1px solid rgba(0,0,0,.06);position:relative;z-index:1}\
.snt-trust-item{font-size:12px;font-weight:600;background:rgba(255,255,255,.8);padding:7px 14px;border-radius:20px;border:1px solid rgba(0,0,0,.06)}\
@media(max-width:768px){\
.snt-landing{margin:20px -5px 15px;padding:36px 16px 30px}\
.snt-grid,.snt-reviews{grid-template-columns:1fr}\
.snt-title{font-size:22px}\
.snt-card{padding:18px 14px}\
.snt-card-icon{font-size:34px}\
.snt-trust{gap:8px}\
.snt-trust-item{font-size:11px;padding:5px 10px}\
.snt-deco{font-size:22px}\
.snt-cloud-1{width:120px;height:120px}\
.snt-cloud-2{width:90px;height:90px}\
.snt-cloud-3{width:70px;height:70px}\
}';
  document.head.appendChild(s);
}

// Build themed HTML
function build(d){
  var th=d.t;
  // Floating decorations
  var decos='';
  for(var di=0;di<th.deco.length;di++){
    decos+='<span class="snt-deco snt-deco-'+di+'">'+th.deco[di]+'</span>';
  }
  // Cloud/glow overlays
  var clouds='<div class="snt-cloud snt-cloud-1" style="background:radial-gradient(circle,'+th.glow+' 0%,transparent 70%)"></div>';
  clouds+='<div class="snt-cloud snt-cloud-2" style="background:radial-gradient(circle,'+th.glow+' 0%,transparent 70%)"></div>';
  clouds+='<div class="snt-cloud snt-cloud-3" style="background:radial-gradient(circle,rgba(255,255,255,.25) 0%,transparent 70%)"></div>';
  var glows='<div class="snt-glow snt-glow-1" style="background:radial-gradient(circle,'+th.glow+' 0%,transparent 60%)"></div>';
  glows+='<div class="snt-glow snt-glow-2" style="background:radial-gradient(circle,'+th.glow+' 0%,transparent 60%)"></div>';

  // Benefits cards
  var benefits='';
  for(var i=0;i<d.b.length;i++){
    var b=d.b[i];
    benefits+='<div class="snt-card" style="background:rgba(255,255,255,.88);box-shadow:0 4px 16px '+th.glow+'"><span class="snt-card-icon">'+b.i+'</span><div class="snt-card-title" style="color:'+th.ac+'">'+b.t+'</div><div class="snt-card-desc" style="color:#475569">'+b.d+'</div></div>';
  }
  // Reviews
  var reviews='';
  for(var j=0;j<d.r.length;j++){
    var rv=d.r[j];
    var col=avatarColor(rv.n);
    var init=rv.n.charAt(0);
    reviews+='<div class="snt-review"><div class="snt-review-header"><div class="snt-review-avatar" style="background:'+col+'">'+init+'</div><div><div class="snt-review-name">'+rv.n+'</div><div class="snt-review-stars">'+stars()+'</div></div></div><p class="snt-review-text">"'+rv.t+'"</p><div class="snt-review-time">'+rv.a+'</div></div>';
  }

  return '<div class="snt-landing" style="background:'+th.bg+'">\
'+decos+clouds+glows+'\
<div style="text-align:center;position:relative;z-index:1"><span class="snt-badge" style="background:'+th.ac+'15;color:'+th.ac+'">✦ Producto Verificado SANATE ✦</span></div>\
<div class="snt-title" style="background:linear-gradient(90deg,'+th.ac+','+th.ac2+','+th.ac+');background-size:200% auto;-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text;animation:sntShimmer 3s linear infinite">¿Por Qué '+d.n+' Transforma Tu Vida?</div>\
<div class="snt-subtitle" style="color:#64748b">Miles de colombianos ya lo comprobaron — ahora es tu turno</div>\
<div class="snt-grid">'+benefits+'</div>\
<div class="snt-divider" style="background:linear-gradient(90deg,transparent,'+th.ac+',transparent)"></div>\
<div class="snt-usage" style="border-left-color:'+th.ac+'"><div class="snt-usage-title" style="color:'+th.ac+'">📋 Modo de Uso Recomendado</div><p class="snt-usage-text" style="color:#334155">'+d.u+'</p></div>\
<div class="snt-study" style="border-left-color:'+th.ac2+'"><div class="snt-study-title" style="color:'+th.ac+'">🔬 Respaldado por la Ciencia</div><p class="snt-study-text" style="color:#64748b">'+d.s+'</p></div>\
<div class="snt-divider" style="background:linear-gradient(90deg,transparent,'+th.ac2+',transparent)"></div>\
<div class="snt-reviews-title" style="color:#1a1a2e">⭐ Clientes Reales, Resultados Reales</div>\
<div class="snt-reviews">'+reviews+'</div>\
<div class="snt-cta" style="background:linear-gradient(135deg,'+th.ac+'10,'+th.ac2+'15)">\
<div class="snt-cta-text" style="color:'+th.ac+'">🔥 ¡No esperes más para transformar tu vida!</div>\
<div class="snt-cta-sub" style="color:#64748b">Agrega al carrito ahora y empieza tu cambio hoy</div>\
</div>\
<div class="snt-trust">\
<span class="snt-trust-item" style="color:'+th.ac+'">🇨🇴 Hecho en Colombia</span>\
<span class="snt-trust-item" style="color:'+th.ac+'">🌿 100% Natural</span>\
<span class="snt-trust-item" style="color:'+th.ac+'">🚚 Envío Nacional</span>\
<span class="snt-trust-item" style="color:'+th.ac+'">⭐ +500 Clientes Felices</span>\
<span class="snt-trust-item" style="color:'+th.ac+'">✅ Garantía de Calidad</span>\
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
