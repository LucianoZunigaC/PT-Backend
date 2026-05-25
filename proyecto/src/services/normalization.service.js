/**
 * normalization.service.js
 * Servicio para limpiar y estandarizar nombres de productos extraídos por scraping.
 */

const STOP_WORDS = new Set([
    'de', 'para', 'el', 'la', 'los', 'las', 'un', 'una', 'unos', 'unas',
    'con', 'sin', 'en', 'por', 'y', 'o', 'a', 'al', 'del',
    'agregar', 'carro', 'carrito', 'comprar', 'despacho', 'envio', 'gratis', 
    'online', 'chile', 'click', 'collect', 'sodimac', 'imperial', 
    'mercadolibre', 'easy', 'construmart', 'falabella'
]);

const UNIDADES_MAP = {
    'kilos': 'kg',
    'kilo': 'kg',
    'kgs': 'kg',
    'kg.': 'kg',
    'gramos': 'g',
    'gr': 'g',
    'grs': 'g',
    'litros': 'l',
    'litro': 'l',
    'lts': 'l',
    'lt': 'l',
    'mililitros': 'ml',
    'centimetros': 'cm',
    'centimetro': 'cm',
    'cms': 'cm',
    'metros': 'm',
    'metro': 'm',
    'mts': 'm',
    'milimetros': 'mm',
    'pulgadas': 'pulg',
    'pulgada': 'pulg',
    'inch': 'pulg',
    'unidades': 'un',
    'unidad': 'un',
    'und': 'un',
    'piezas': 'pz',
    'pieza': 'pz'
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

    // 3. Remover caracteres especiales y puntuación (dejamos letras y números)
    // Conservar espacios. Trataremos los guiones como espacios.
    texto = texto.replace(/[-_]/g, ' ');
    texto = texto.replace(/[^a-z0-9\s]/g, '');

    // 4. Tokenización
    let tokensCrudos = texto.split(/\s+/).filter(t => t.length > 0);

    // 5. Filtrar Stop Words y Homologar Unidades
    let tokensLimpios = [];
    for (let token of tokensCrudos) {
        if (STOP_WORDS.has(token)) continue;

        // Separar si viene pegado un numero y una letra (ej: 25kg -> 25 kg)
        // Esto ayuda a estandarizar
        const matchNumLetra = token.match(/^(\d+)([a-z]+)$/);
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

/**
 * Algoritmo más restrictivo: Verifica si la mayoría de los tokens principales de A están en B (o viceversa)
 */
export const esMatchSeguro = (tokensA, tokensB, umbral = 0.65) => {
    const similitud = calcularSimilitud(tokensA, tokensB);
    return similitud >= umbral;
};

const BANNED_TERMS = [
    'juguete', 'peluche', 'lego', 'paw patrol', 'hot wheel', 'barbie', 'muñeca', 'muñeco', 'figura accion', 
    'mascara', 'infantil', 'disfraz', 'televisor', 'smart tv', 'smartphone', 'perfume', 'mascota', 'perro', 'gato'
];

/**
 * Valida si el nombre del producto es apto para la plataforma de construcción.
 * Utiliza una blacklist estricta de términos que nunca tendrán solapamiento con construcción.
 * @param {string} nombre
 * @returns {boolean} true si es válido
 */
export const esProductoValido = (nombre) => {
    if (!nombre) return false;
    const texto = nombre.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    
    for (const palabra of BANNED_TERMS) {
        if (texto.includes(palabra.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, ""))) {
            return false;
        }
    }
    return true;
};

