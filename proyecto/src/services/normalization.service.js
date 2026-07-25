/**
 * normalization.service.js
 * Servicio para limpiar y estandarizar nombres de productos extraídos por scraping.
 */
import * as fuzzball from 'fuzzball';

const STOP_WORDS = new Set([
    'de', 'para', 'el', 'la', 'los', 'las', 'un', 'una', 'unos', 'unas',
    'con', 'sin', 'en', 'por', 'y', 'o', 'a', 'al', 'del',
    'agregar', 'carro', 'carrito', 'comprar', 'despacho', 'envio', 'gratis', 
    'online', 'chile', 'click', 'collect', 'sodimac', 'imperial', 
    'mercadolibre', 'easy', 'construmart', 'falabella'
]);

const UNIDADES_MAP = {
    // Kilos
    'kilos': 'kg',
    'kilo': 'kg',
    'kgs': 'kg',
    'kg.': 'kg',
    'kg': 'kg',
    // Gramos
    'gramos': 'g',
    'gr': 'g',
    'grs': 'g',
    'g': 'g',
    // Litros
    'litros': 'l',
    'litro': 'l',
    'lts': 'l',
    'lt': 'l',
    'l': 'l',
    // Mililitros
    'mililitros': 'ml',
    'ml': 'ml',
    // Centímetros
    'centimetros': 'cm',
    'centimetro': 'cm',
    'cms': 'cm',
    'cm': 'cm',
    // Metros
    'metros': 'm',
    'metro': 'm',
    'mts': 'm',
    'mt': 'm',
    'm': 'm',
    // Milímetros
    'milimetros': 'mm',
    'mm': 'mm',
    // Pulgadas
    'pulgadas': 'pulg',
    'pulgada': 'pulg',
    'inch': 'pulg',
    'pul': 'pulg',
    'plg': 'pulg',
    'pulg': 'pulg',
    // Unidades
    'unidades': 'un',
    'unidad': 'un',
    'und': 'un',
    'un': 'un',
    // Piezas
    'piezas': 'pz',
    'pieza': 'pz',
    'pz': 'pz',
    // Galones
    'galon': 'gal',
    'galones': 'gal',
    'gal': 'gal',
    // Watts
    'w': 'w',
    'watts': 'w',
    'watt': 'w',
    'wats': 'w',
    'wat': 'w',
    // Volts
    'v': 'v',
    'volts': 'v',
    'voltios': 'v',
    'voltio': 'v',
    'volt': 'v',
    // Amperes
    'a': 'a',
    'amp': 'a',
    'amperes': 'a',
    'ampere': 'a',
    'amperios': 'a',
    'amperio': 'a',
    // Onzas
    'oz': 'oz',
    'onza': 'oz',
    'onzas': 'oz'
};

/**
 * Normaliza el nombre de un producto para facilitar el matching
 * @param {string} nombre - Nombre crudo del producto
 * @returns {object} - Objeto con el string normalizado y un arreglo de tokens (palabras clave)
 */
export const normalizarProducto = (nombre) => {
    if (!nombre) return { normalizado: '', tokens: [] };

    // 1. A minúsculas
    let texto = nombre.toLowerCase();

    // 2. Remover acentos/diacríticos
    texto = texto.normalize("NFD").replace(/[\u0300-\u036f]/g, "");

    // 3. Conversión de comillas dobles (pulgadas) a la palabra 'pulg' cuando sigue a un número
    texto = texto.replace(/(\d+)"/g, '$1 pulg');

    // 4. Estandarizar comas decimales entre dígitos a puntos
    texto = texto.replace(/(\d+),(\d+)/g, '$1.$2');

    // 5. Estandarizar formatos compactos de dimensiones (ej: 2x4 -> 2 x 4, 1.2x2.4 -> 1.2 x 2.4)
    texto = texto.replace(/(\d+(?:\.\d+)?)x(\d+(?:\.\d+)?)/g, '$1 x $2');

    // 5.5 Separar letras y números pegados (ej: gsr185 -> gsr 185, 18v -> 18 v)
    texto = texto.replace(/([a-z]+)(\d+)/g, '$1 $2');
    texto = texto.replace(/(\d+)([a-z]+)/g, '$1 $2');

    // 6. Trataremos los guiones como espacios
    texto = texto.replace(/[-_]/g, ' ');

    // 7. Eliminar puntos y diagonales que no están entre dígitos (puntuación/abreviaturas)
    texto = texto.replace(/(?<!\d)\.|\.(?!\d)/g, ' ');
    texto = texto.replace(/(?<!\d)\/|\/(?!\d)/g, ' ');

    // 8. Remover caracteres especiales restantes (permitimos letras, números, espacios, puntos y diagonales)
    texto = texto.replace(/[^a-z0-9\s\.\/]/g, '');

    // 9. Tokenización
    let tokensCrudos = texto.split(/\s+/).filter(t => t.length > 0);

    // 10. Filtrar Stop Words y Homologar Unidades
    let tokensLimpios = [];
    for (let token of tokensCrudos) {
        if (STOP_WORDS.has(token)) continue;

        // Separar si viene pegado un número (entero, decimal o fracción) y una unidad de texto
        // Ejemplos: 25kg -> 25 kg, 2.5kg -> 2.5 kg, 1/2pulg -> 1/2 pulg
        const matchNumLetra = token.match(/^(\d+(?:\.\d+)?|\d+\/\d+)([a-z]+)$/);
        if (matchNumLetra) {
            const num = matchNumLetra[1];
            let unidad = matchNumLetra[2];
            if (UNIDADES_MAP[unidad]) unidad = UNIDADES_MAP[unidad];
            tokensLimpios.push(num);
            tokensLimpios.push(unidad);
            continue;
        }

        // Homologar unidad si es una palabra sola
        if (UNIDADES_MAP[token]) {
            tokensLimpios.push(UNIDADES_MAP[token]);
        } else {
            tokensLimpios.push(token);
        }
    }

    // Remover tokens duplicados
    tokensLimpios = [...new Set(tokensLimpios)];

    return {
        normalizado: tokensLimpios.join(' '),
        tokens: tokensLimpios
    };
};

/**
 * Extrae todas las cantidades numéricas (enteros, decimales y fracciones) de un conjunto de tokens.
 * @param {Array<string>} tokens 
 * @returns {Array<string>} Arreglo con los números encontrados
 */
export const extraerNumeros = (tokens) => {
    if (!tokens) return [];
    return tokens.filter(t => /^\d+(?:\.\d+)?$/.test(t) || /^\d+\/\d+$/.test(t));
};

/**
 * Compara si dos conjuntos de tokens tienen exactamente las mismas medidas/cantidades numéricas.
 * @param {Array<string>} tokensA 
 * @param {Array<string>} tokensB 
 * @returns {boolean} true si tienen las mismas cantidades numéricas
 */
export const tienenMismosNumeros = (tokensA, tokensB) => {
    const numsA = extraerNumeros(tokensA).sort();
    const numsB = extraerNumeros(tokensB).sort();

    if (numsA.length !== numsB.length) return false;
    for (let i = 0; i < numsA.length; i++) {
        if (numsA[i] !== numsB[i]) return false;
    }
    return true;
};

/**
 * Calcula la similitud de Jaccard entre dos conjuntos de tokens
 * Útil para determinar si dos productos son el mismo
 * @param {Array<string>} tokensA
 * @param {Array<string>} tokensB
 * @returns {number} Score entre 0 y 1
 */
export const calcularSimilitud = (tokensA, tokensB) => {
    if (!tokensA || !tokensB || tokensA.length === 0 || tokensB.length === 0) return 0;
    
    const setA = new Set(tokensA);
    const setB = new Set(tokensB);
    
    const interseccion = new Set([...setA].filter(x => setB.has(x)));
    const union = new Set([...setA, ...setB]);
    
    return interseccion.size / union.size;
};

// ── TOKENS DE TIPO DE PRODUCTO ──────────────────────────────────────────────
// Son los tokens que definen la IDENTIDAD del producto. Si difieren, nunca es match.
const PRODUCT_TYPE_TOKENS = new Set([
    'cemento', 'hormigon', 'concreto', 'mortero', 'yeso', 'estuco', 'cal',
    'ladrillo', 'bloque', 'adoquin', 'baldosa', 'ceramica', 'porcelanato',
    'madera', 'terciado', 'melamina', 'mdf', 'osb', 'volcanita', 'tabique',
    'martillo', 'taladro', 'atornillador', 'destornillador', 'sierra', 'serrucho',
    'amoladora', 'esmeril', 'rotomartillo', 'demoledor', 'lijadora', 'compresor',
    'tornillo', 'clavo', 'perno', 'tuerca', 'arandela', 'bisagra', 'cerradura',
    'pintura', 'latex', 'esmalte', 'barniz', 'imprimante', 'anticorrosivo',
    'cable', 'interruptor', 'enchufe', 'ampolleta', 'foco', 'luminaria',
    'tubo', 'cañeria', 'fitting', 'copla', 'codo', 'valvula', 'grifo', 'griferia',
    'varilla', 'fierro', 'acero', 'malla', 'perfil', 'angulo',
    'broca', 'disco', 'lija', 'llave', 'alicate', 'nivel', 'flexometro', 'huincha',
    'pala', 'picota', 'carretilla', 'combo', 'cincel',
    'rodillo', 'brocha', 'espatula', 'llana',
    'casco', 'guante', 'antiparras', 'arnes',
    'generador', 'soldadora', 'betonera', 'andamio', 'escalera',
    'sellador', 'sellante', 'silicona', 'teflon', 'masilla',
    'impermeabilizante', 'aislante', 'membrana',
    'teja', 'canalon', 'policarbonato',
    'manguera', 'bomba',
]);

// Unidades reconocidas (para verificar contexto numérico)
const KNOWN_UNITS = new Set([
    'kg', 'g', 'l', 'ml', 'cm', 'm', 'mm', 'pulg', 'un', 'pz', 'gal', 'w', 'v', 'a', 'oz'
]);

/**
 * Extrae pares [número, unidad] del arreglo de tokens. Solo incluye números que tengan una unidad conocida.
 * Ej: ['cemento', '25', 'kg'] → [{ num: '25', unit: 'kg' }]
 * Ej: ['taladro', '185'] → [] (185 no tiene unidad conocida)
 */
const extraerParesNumeroUnidad = (tokens) => {
    const pares = [];
    for (let i = 0; i < tokens.length; i++) {
        if (/^\d+(?:\.\d+)?$/.test(tokens[i]) || /^\d+\/\d+$/.test(tokens[i])) {
            const nextToken = tokens[i + 1];
            if (nextToken && KNOWN_UNITS.has(nextToken)) {
                pares.push({ num: tokens[i], unit: nextToken });
            }
        }
    }
    return pares;
};

/**
 * Verifica que dos conjuntos de tokens tengan las mismas medidas completas (número + unidad).
 * Es más estricto que tienenMismosNumeros porque distingue "25 kg" de "25 l".
 */
const tienenMismasMedidas = (tokensA, tokensB) => {
    const paresA = extraerParesNumeroUnidad(tokensA);
    const paresB = extraerParesNumeroUnidad(tokensB);

    if (paresA.length !== paresB.length) return false;

    // Crear representaciones serializadas y comparar como conjuntos ordenados
    const strA = paresA.map(p => `${p.num}|${p.unit || ''}`).sort();
    const strB = paresB.map(p => `${p.num}|${p.unit || ''}`).sort();

    for (let i = 0; i < strA.length; i++) {
        if (strA[i] !== strB[i]) return false;
    }
    return true;
};

/**
 * Algoritmo mejorado de coincidencia de productos.
 * Utiliza un sistema de puntuación ponderada y fuzzball para similitud de strings:
 * - Las medidas deben coincidir exactamente (número + unidad)
 * - Los tokens de TIPO DE PRODUCTO deben tener intersección
 * - No deben existir adjetivos contradictorios (ej. blanco vs gris)
 */
export const esMatchSeguro = (tokensA, tokensB, umbral = 80) => {
    // 1. Validar medidas completas (número + unidad, no solo número)
    if (!tienenMismasMedidas(tokensA, tokensB)) {
        return false;
    }

    // 2. Verificar que comparten al menos un token de tipo de producto
    const tipoA = tokensA.filter(t => PRODUCT_TYPE_TOKENS.has(t));
    const tipoB = tokensB.filter(t => PRODUCT_TYPE_TOKENS.has(t));
    
    if (tipoA.length > 0 && tipoB.length > 0) {
        const setTipoA = new Set(tipoA);
        const setTipoB = new Set(tipoB);
        const tipoComun = tipoA.some(t => setTipoB.has(t));
        if (!tipoComun) return false; // Tipos completamente distintos → no match
    }

    // 3. Chequeo de adjetivos contradictorios (muy común en materiales)
    const adjetivosExcluyentes = [
        ['blanco', 'gris', 'transparente', 'negro'],
        ['interior', 'exterior'],
        ['madera', 'concreto', 'metal', 'acero', 'fierro'],
        ['manual', 'electrico', 'inalambrico']
    ];

    const setA = new Set(tokensA);
    const setB = new Set(tokensB);

    for (const grupo of adjetivosExcluyentes) {
        const enA = grupo.filter(adj => setA.has(adj));
        const enB = grupo.filter(adj => setB.has(adj));
        // Si ambos especifican una característica de este grupo, pero son diferentes
        if (enA.length > 0 && enB.length > 0) {
            const interseccion = enA.some(adj => enB.includes(adj));
            if (!interseccion) {
                return false; // Contradicción directa (ej. uno es blanco y otro gris)
            }
        }
    }

    // 4. Calcular similitud difusa usando token_set_ratio de fuzzball
    // token_set_ratio es muy robusto ante el orden de las palabras y palabras extra de la marca
    const strA = tokensA.join(' ');
    const strB = tokensB.join(' ');
    const ratio = fuzzball.token_set_ratio(strA, strB);

    return ratio >= umbral;
};

/**
 * Genera un fingerprint determinista para agrupar el mismo producto entre tiendas.
 * El fingerprint se construye a partir de los tokens de tipo de producto, la marca,
 * y las medidas numéricas, todo ordenado alfabéticamente para garantizar determinismo.
 * 
 * Ejemplo:
 *   "Cemento Melón Especial Saco 25kg" → "cemento|melon|25kg"
 *   "Cemento Melon Especial 25 Kg"     → "cemento|melon|25kg"
 * 
 * @param {string} nombre - Nombre del producto
 * @param {string} [marca] - Marca del producto (opcional)
 * @returns {string} Fingerprint determinista
 */
export const generarFingerprint = (nombre, marca) => {
    if (!nombre) return '';
    
    const { tokens } = normalizarProducto(nombre);
    
    // 1. Extraer tokens de tipo de producto (la identidad core)
    const tiposEncontrados = tokens.filter(t => PRODUCT_TYPE_TOKENS.has(t)).sort();
    
    // 2. Extraer medidas (número + unidad pegados)
    const pares = extraerParesNumeroUnidad(tokens);
    const medidasStr = pares
        .map(p => p.unit ? `${p.num}${p.unit}` : p.num)
        .sort();
    
    // 3. Normalizar marca
    let marcaNorm = '';
    if (marca) {
        marcaNorm = marca.toLowerCase()
            .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
            .replace(/[^a-z0-9]/g, '')
            .trim();
    }
    
    // 4. Construir fingerprint: tipo|marca|medidas
    const partes = [];
    if (tiposEncontrados.length > 0) partes.push(tiposEncontrados.join('+'));
    if (marcaNorm) partes.push(marcaNorm);
    if (medidasStr.length > 0) partes.push(medidasStr.join('+'));
    
    return partes.join('|') || tokens.slice(0, 3).sort().join('|');
};


// ── BLACKLIST: Productos que JAMÁS pertenecen a construcción ─────────────────
const BANNED_TERMS = [
    // Juguetes y niños
    'juguete', 'peluche', 'lego', 'paw patrol', 'hot wheel', 'hot wheels', 'barbie',
    'muñeca', 'muñeco', 'figura accion', 'funko', 'playmobil', 'nerf', 'puzzle',
    'rompecabeza', 'didactico', 'infantil para bebe',
    // Electrónica de consumo
    'televisor', 'smart tv', 'smartphone', 'celular', 'notebook', 'laptop', 'tablet',
    'audifonos', 'parlante bluetooth', 'consola', 'playstation', 'xbox', 'nintendo',
    'videojuego', 'control remoto', 'smartwatch', 'reloj inteligente',
    // Moda, belleza y hogar decorativo
    'perfume', 'colonia', 'maquillaje', 'cosmetico', 'crema facial', 'shampoo',
    'zapatilla running', 'polera', 'camiseta', 'pantalon jeans', 'vestido',
    'cartera', 'bolso', 'reloj pulsera', 'reloj de arena', 'reloj de pared', 'reloj ', 'joya', 'anillo', 'collar',
    'plumon', 'edredon', 'sabana', 'almohada', 'cubrecama', 'cojin', 'cortina', 'toalla',
    'adorno', 'decorativo', 'cuadro decorativo', 'florero', 'vela aromatica',
    // Mascotas
    'mascota', 'perro', 'gato', 'alimento mascota', 'rascador', 'pecera',
    'sanitaria silica', 'arena sanitaria', 'arena para gato', 'arena de gato',
    // Alimentos y cocina doméstica
    'alimento', 'comida', 'snack', 'chocolate', 'cafe', 'bebida',
    // Deportes no herramienta
    'bicicleta', 'pelota futbol', 'raqueta', 'patines',
    // Disfraces
    'mascara', 'disfraz', 'cosplay',
    // Automotriz no industrial
    'llanta auto', 'neumatico auto', 'accesorios auto',
];

// ── WHITELIST: Palabras clave que CONFIRMAN relevancia de construcción ───────
const CONSTRUCTION_KEYWORDS = [
    // Materiales básicos
    'cemento', 'hormigon', 'concreto', 'mortero', 'arena', 'grava', 'gravilla',
    'arido', 'ladrillo', 'bloque', 'adoquin', 'baldosa', 'ceramica', 'porcelanato',
    'yeso', 'estuco', 'cal', 'impermeabilizante', 'sellador', 'sellante', 'sika',
    'aditivo', 'fibrocemento', 'volcanita', 'placa', 'plancha', 'tabique',
    // Maderas y derivados
    'madera', 'terciado', 'melamina', 'mdf', 'osb', 'aglomerado', 'tablon',
    'viga', 'pilar', 'poste', 'liston', 'moldura', 'rodapie', 'barniz',
    // Metales y estructura
    'acero', 'fierro', 'varilla', 'alambre', 'malla', 'angulo', 'perfil',
    'canal', 'zinc', 'galvanizado', 'soldadura', 'electrodo', 'clavo',
    'tornillo', 'perno', 'tuerca', 'arandela', 'anclaje', 'taco', 'remache',
    'bisagra', 'cerradura', 'picaporte', 'tirador', 'manilla',
    // Herramientas
    'martillo', 'taladro', 'atornillador', 'destornillador', 'sierra', 'serrucho',
    'amoladora', 'esmeril', 'rotomartillo', 'demoledor', 'lijadora', 'cepillo',
    'fresadora', 'torno', 'compresor', 'pistola calor', 'decapador',
    'nivel', 'plomada', 'escuadra', 'flexometro', 'huincha', 'cinta metrica',
    'llave', 'alicate', 'pinza', 'tenaza', 'prensa', 'sargento', 'morsa',
    'pala', 'picota', 'chuzo', 'carretilla', 'combo', 'cincel', 'formon',
    'broca', 'disco corte', 'disco diamante', 'hoja sierra', 'lija',
    'espatula', 'llana', 'platacho', 'fratas', 'badilejo',
    // Electricidad
    'cable', 'interruptor', 'enchufe', 'tablero electrico', 'termomagnetico',
    'diferencial', 'canaleta', 'conduit', 'tubo electrico', 'cinta aisladora',
    'ampolleta', 'foco', 'led', 'luminaria', 'reflector', 'lampara',
    // Gasfitería y plomería
    'cañeria', 'tuberia', 'tubo pvc', 'tubo cobre', 'fitting', 'copla',
    'codo', 'tee', 'union', 'valvula', 'llave paso', 'grifo', 'griferia',
    'lavaplatos', 'lavamanos', 'wc', 'inodoro', 'estanque', 'sifon',
    'flexible', 'teflon', 'silicona',
    // Pinturas y terminaciones
    'pintura', 'latex', 'esmalte', 'anticorrosivo', 'primer', 'imprimante',
    'rodillo', 'brocha', 'bandeja pintura', 'thinner', 'aguarras', 'diluyente',
    'masilla', 'pasta muro',
    // Techumbre
    'teja', 'techo', 'canalon', 'bajada agua', 'cumbrera', 'policarbonato',
    // Seguridad industrial
    'casco', 'guante', 'antiparras', 'arnes', 'chaleco reflectante',
    'zapato seguridad', 'botin seguridad', 'protector auditivo',
    // Equipos
    'generador', 'soldadora', 'betonera', 'vibrador', 'andamio', 'escalera',
    'tecle', 'polipasto', 'gata hidraulica',
    // Aislación
    'aislante', 'poliestireno', 'lana vidrio', 'lana mineral', 'espuma',
    'membrana', 'barrera vapor',
    // Jardín / exterior construcción
    'manguera', 'aspersor', 'bomba agua', 'piso flotante', 'deck',
    'cerco', 'reja', 'malla', 'geotextil',
];

/**
 * Valida si el nombre del producto es apto para la plataforma de construcción.
 * Usa un sistema de doble filtro:
 * 1. Blacklist estricta: rechaza productos obviamente fuera de rubro.
 * 2. Whitelist flexible: si el producto contiene al menos una keyword de construcción, se acepta.
 *    Si NO contiene ninguna keyword conocida, se rechaza como medida de seguridad.
 * @param {string} nombre
 * @param {object} [opciones]
 * @param {boolean} [opciones.estricto=false] - Si es true, exige que el producto contenga una keyword de construcción.
 * @returns {boolean} true si es válido
 */
export const esProductoValido = (nombre, opciones = {}) => {
    if (!nombre) return false;
    const texto = nombre.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    
    // 1. Blacklist: rechazar si contiene un término prohibido
    for (const palabra of BANNED_TERMS) {
        const norm = palabra.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
        if (texto.includes(norm)) {
            return false;
        }
    }

    // 2. Whitelist (modo estricto): verificar que contenga al menos un término de construcción
    if (opciones.estricto) {
        for (const keyword of CONSTRUCTION_KEYWORDS) {
            const norm = keyword.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
            if (texto.includes(norm)) {
                return true;
            }
        }
        // No contiene ninguna keyword conocida → rechazar
        return false;
    }

    return true;
};


