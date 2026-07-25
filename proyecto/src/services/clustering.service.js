/**
 * clustering.service.js
 * Servicio de agrupación semántica de productos.
 * 
 * Agrupa productos que son "el mismo artículo" sin importar la marca ni el proveedor.
 * Ejemplo: todos los "Cemento 25 kg" quedan en un solo cluster, mostrando la comparativa
 * de precios de Melón, Polpaico, Bío-Bío, etc.
 */

import { normalizarProducto } from './normalization.service.js';

// Tokens de tipo de producto (definen la IDENTIDAD del cluster)
const PRODUCT_TYPE_TOKENS = new Set([
  'cemento', 'hormigon', 'concreto', 'mortero', 'yeso', 'estuco', 'cal',
  'ladrillo', 'bloque', 'adoquin', 'baldosa', 'ceramica', 'porcelanato',
  'madera', 'terciado', 'melamina', 'mdf', 'osb', 'volcanita', 'tabique',
  'martillo', 'taladro', 'atornillador', 'destornillador', 'sierra', 'serrucho',
  'amoladora', 'esmeril', 'rotomartillo', 'demoledor', 'lijadora', 'compresor',
  'tornillo', 'clavo', 'perno', 'tuerca', 'arandela', 'bisagra', 'cerradura',
  'pintura', 'latex', 'esmalte', 'barniz', 'imprimante', 'anticorrosivo',
  'cable', 'interruptor', 'enchufe', 'ampolleta', 'foco', 'luminaria',
  'tubo', 'caneria', 'fitting', 'copla', 'codo', 'valvula', 'grifo', 'griferia',
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
  'arena', 'grava', 'gravilla', 'ripio',
  'adhesivo', 'pegamento', 'aditivo',
  'plancha', 'placa',
]);

// Unidades conocidas
const KNOWN_UNITS = new Set([
  'kg', 'g', 'l', 'ml', 'cm', 'm', 'mm', 'pulg', 'un', 'pz', 'gal', 'w', 'v', 'a', 'oz',
]);

/**
 * Genera la clave de cluster para un producto.
 * La clave se construye con: tokens_tipo + medidas (sin marca).
 * 
 * Ejemplos:
 *   "Cemento Melón Especial 25 kg"    → "cemento|25kg"
 *   "Cemento Polpaico Extra 25 kg"    → "cemento|25kg"
 *   "Taladro Bosch GSB 13RE 650W"     → "taladro|650w"
 *   "Taladro Makita HP1640 650W"      → "taladro|650w"
 *   "Pintura Látex Interior Blanco 4L" → "latex+pintura|4l"
 */
export const generarClusterKey = (nombre) => {
  if (!nombre) return '_sin_cluster';

  const { tokens } = normalizarProducto(nombre);

  // 1. Extraer tokens de tipo (identidad del producto)
  const tipos = tokens.filter(t => PRODUCT_TYPE_TOKENS.has(t)).sort();

  // 2. Extraer pares número+unidad
  const medidas = [];
  for (let i = 0; i < tokens.length; i++) {
    const isNum = /^\d+(?:\.\d+)?$/.test(tokens[i]) || /^\d+\/\d+$/.test(tokens[i]);
    if (isNum && tokens[i + 1] && KNOWN_UNITS.has(tokens[i + 1])) {
      medidas.push(`${tokens[i]}${tokens[i + 1]}`);
    }
  }
  medidas.sort();

  // 3. Construir la clave
  const partes = [];
  if (tipos.length > 0) partes.push(tipos.join('+'));
  if (medidas.length > 0) partes.push(medidas.join('+'));

  // Fallback: si no se detectó tipo ni medida, usar los primeros 2 tokens descriptivos
  if (partes.length === 0) {
    const descriptivos = tokens.filter(t => t.length > 2 && !/^\d+$/.test(t)).slice(0, 2).sort();
    if (descriptivos.length > 0) return descriptivos.join('+');
    return '_sin_cluster';
  }

  return partes.join('|');
};

/**
 * Genera un nombre amigable para el cluster.
 * 
 * Ejemplos:
 *   "cemento|25kg"          → "Cemento 25 kg"
 *   "taladro|650w"          → "Taladro 650 W"
 *   "latex+pintura|4l"      → "Látex Pintura 4 L"
 */
export const generarNombreCluster = (clusterKey) => {
  if (!clusterKey || clusterKey === '_sin_cluster') return 'Otros productos';

  return clusterKey
    .replace(/\|/g, ' ')
    .replace(/\+/g, ' ')
    .replace(/(\d+)(kg|g|l|ml|cm|m|mm|pulg|un|pz|gal|w|v|a|oz)/gi, '$1 $2')
    .split(' ')
    .map(w => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
};

/**
 * Agrupa una lista plana de productos en clusters semánticos.
 * 
 * @param {Array} productos - Lista de productos con precios incluidos
 * @returns {Array} Lista de clusters, cada uno con:
 *   - clusterKey: identificador del cluster
 *   - nombre: nombre amigable del cluster  
 *   - mejorPrecio: menor precio en el cluster
 *   - peorPrecio: mayor precio en el cluster
 *   - cantidadProductos: cuántos productos tiene
 *   - cantidadProveedores: proveedores únicos
 *   - productos: array de productos del cluster (ordenados por precio asc)
 */
export const agruparEnClusters = (productos) => {
  const clusterMap = new Map();

  for (const p of productos) {
    const key = generarClusterKey(p.nombre);

    if (!clusterMap.has(key)) {
      clusterMap.set(key, {
        clusterKey: key,
        nombre: generarNombreCluster(key),
        productos: [],
      });
    }
    clusterMap.get(key).productos.push(p);
  }

  // Enriquecer cada cluster con estadísticas
  const clusters = Array.from(clusterMap.values()).map(cluster => {
    const todosPrecios = [];
    const proveedoresSet = new Set();
    const marcasSet = new Set();

    for (const p of cluster.productos) {
      if (p.marca) marcasSet.add(p.marca);
      for (const pr of (p.precios || [])) {
        const precio = Number(pr.precio);
        if (precio > 0) todosPrecios.push(precio);
        if (pr.proveedor?.nombre) proveedoresSet.add(pr.proveedor.nombre);
      }
    }

    // Ordenar productos dentro del cluster por su menor precio
    cluster.productos.sort((a, b) => {
      const minA = a.precios?.length > 0 ? Number(a.precios[0].precio) : Infinity;
      const minB = b.precios?.length > 0 ? Number(b.precios[0].precio) : Infinity;
      return minA - minB;
    });

    return {
      ...cluster,
      mejorPrecio: todosPrecios.length > 0 ? Math.min(...todosPrecios) : null,
      peorPrecio: todosPrecios.length > 0 ? Math.max(...todosPrecios) : null,
      cantidadProductos: cluster.productos.length,
      cantidadProveedores: proveedoresSet.size,
      marcas: Array.from(marcasSet),
      proveedores: Array.from(proveedoresSet),
    };
  });

  // Ordenar clusters: primero los que tienen más proveedores (más comparación), luego por mejor precio
  clusters.sort((a, b) => {
    if (b.cantidadProveedores !== a.cantidadProveedores) return b.cantidadProveedores - a.cantidadProveedores;
    if (b.cantidadProductos !== a.cantidadProductos) return b.cantidadProductos - a.cantidadProductos;
    return (a.mejorPrecio || Infinity) - (b.mejorPrecio || Infinity);
  });

  return clusters;
};
