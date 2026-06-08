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
    'amperio': 'a'
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

/**
 * Algoritmo más restrictivo: Verifica si la mayoría de los tokens principales de A están en B (o viceversa)
 */
export const esMatchSeguro = (tokensA, tokensB, umbral = 0.55) => {
    // 1. Validar que tengan los mismos números (medidas/cantidades) para evitar falsos positivos
    if (!tienenMismosNumeros(tokensA, tokensB)) {
        return false;
    }

    // 2. Calcular la similitud de Jaccard
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

