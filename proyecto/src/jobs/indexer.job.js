/**
 * indexer.job.js
 * Job de indexación proactiva de productos de construcción.
 * 
 * Problema resuelto: antes, el catálogo sólo crecía cuando un usuario buscaba algo.
 * Si nadie buscaba "varilla corrugada 10mm", no había datos y el primer usuario recibía
 * una respuesta vacía (o esperaba el scraping en vivo).
 * 
 * Solución: Este job ejecuta scraping en background de forma periódica para un conjunto
 * predefinido de términos clave del rubro de la construcción, llenando el catálogo
 * sin depender de las búsquedas de usuarios.
 * 
 * Uso:
 *   import { iniciarIndexadorProactivo } from './jobs/indexer.job.js';
 *   iniciarIndexadorProactivo(); // Llamar al iniciar el servidor
 */

import { ejecutarScrapingDinamico } from '../services/scraping.service.js';

// Términos de construcción a indexar proactivamente
// Organizados por prioridad: los primeros se ejecutan antes
const TERMINOS_INDEXACION = [
  // Materiales básicos de alta rotación
  'cemento',
  'varilla corrugada',
  'ladrillo',
  'arena gruesa',
  'fierro',
  'yeso',
  // Herramientas esenciales
  'martillo',
  'taladro',
  'amoladora',
  'atornillador',
  'sierra circular',
  // Pinturas
  'pintura latex',
  'esmalte',
  'barniz madera',
  // Gasfitería
  'tubo pvc',
  'codo pvc',
  'valvula paso',
  // Electricidad
  'cable electrico',
  'interruptor',
  'ampolleta led',
  // Madera
  'terciado estructural',
  'mdf',
  // Pegamentos / selladores
  'sika',
  'silicona',
  'masilla',
];

// ── Control de estado del indexador ──────────────────────────────────────────
let indexadorActivo = false;
let intervalHandle = null;

/**
 * Ejecuta la indexación de un término, con reintentos si falla.
 */
const indexarTermino = async (termino) => {
  try {
    console.log(`[Indexador] Indexando: "${termino}"...`);
    const guardados = await ejecutarScrapingDinamico(termino);
    console.log(`[Indexador] "${termino}" completado → ${guardados} productos guardados/actualizados.`);
  } catch (err) {
    console.error(`[Indexador] Error indexando "${termino}":`, err.message);
  }
};

/**
 * Ejecuta UN ciclo completo de indexación de todos los términos,
 * con una pausa de 30 segundos entre cada uno para no saturar el servidor.
 */
const cicloIndexacion = async () => {
  if (indexadorActivo) {
    console.log('[Indexador] Ya hay un ciclo en curso, saltando...');
    return;
  }
  indexadorActivo = true;
  console.log(`[Indexador] ══ Iniciando ciclo de indexación proactiva (${TERMINOS_INDEXACION.length} términos) ══`);

  for (const termino of TERMINOS_INDEXACION) {
    await indexarTermino(termino);
    // Pausa entre términos para no asfixiar Playwright con demasiadas instancias
    await new Promise(resolve => setTimeout(resolve, 30_000));
  }

  console.log('[Indexador] ══ Ciclo completo finalizado ══');
  indexadorActivo = false;
};

/**
 * Inicia el indexador proactivo.
 * - Primer ciclo: se lanza con un delay inicial para no interferir con el arranque del servidor.
 * - Ciclos subsiguientes: cada 6 horas automáticamente.
 * 
 * @param {object} opciones
 * @param {number} opciones.delayInicialMs - Milisegundos antes del primer ciclo (default: 2 minutos)
 * @param {number} opciones.intervalHoras - Cada cuántas horas se repite (default: 6 horas)
 */
export const iniciarIndexadorProactivo = ({ delayInicialMs = 2 * 60_000, intervalHoras = 6 } = {}) => {
  const intervalMs = intervalHoras * 60 * 60 * 1000;

  console.log(`[Indexador] Programado: primer ciclo en ${delayInicialMs / 60000} minutos, luego cada ${intervalHoras} horas.`);

  // Primer ciclo con delay para no interferir con el arranque del servidor
  setTimeout(async () => {
    await cicloIndexacion();
    // Ciclos recurrentes
    intervalHandle = setInterval(cicloIndexacion, intervalMs);
  }, delayInicialMs);
};

/**
 * Detiene el indexador (útil para tests o shutdown graceful).
 */
export const detenerIndexador = () => {
  if (intervalHandle) {
    clearInterval(intervalHandle);
    intervalHandle = null;
    console.log('[Indexador] Detenido.');
  }
};
