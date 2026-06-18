import { normalizarProducto, calcularSimilitud, esMatchSeguro } from '../src/services/normalization.service.js';

const prodA = "Cemento Polpaico saco 25kg";
const prodB = "CEMENTO POLPAICO 25 kilos  Agregar al Carro";

const normA = normalizarProducto(prodA);
const normB = normalizarProducto(prodB);

console.log('--- TEST NORMALIZACION Y SIMILITUD JACCARD ---');
console.log(`Producto A: "${prodA}"`);
console.log('Tokens A:', normA.tokens);
console.log(`Producto B: "${prodB}"`);
console.log('Tokens B:', normB.tokens);

const sim = calcularSimilitud(normA.tokens, normB.tokens);
const match = esMatchSeguro(normA.tokens, normB.tokens, 0.65);

console.log('Similitud Jaccard:', sim);
console.log('¿Es Match Seguro (0.65)?:', match);
console.log('¿Es Match Seguro (0.50)?:', esMatchSeguro(normA.tokens, normB.tokens, 0.50));
