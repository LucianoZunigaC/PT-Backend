import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  normalizarProducto,
  calcularSimilitud,
  esMatchSeguro,
  tienenMismosNumeros,
  extraerNumeros,
  esProductoValido,
  generarFingerprint
} from '../src/services/normalization.service.js';

describe('Normalization Service Tests', () => {

  describe('1. normalizarProducto', () => {
    it('debe convertir a minúsculas y quitar acentos', () => {
      const res = normalizarProducto('CEMENTO Melón ÁÉÍÓÚ');
      assert.equal(res.normalizado, 'cemento melon aeiou');
    });

    it('debe estandarizar unidades (kg, lts, cm, etc)', () => {
      const res1 = normalizarProducto('Cemento 25 kilos');
      assert.deepEqual(res1.tokens, ['cemento', '25', 'kg']);
      
      const res2 = normalizarProducto('Pintura 4 litros');
      assert.deepEqual(res2.tokens, ['pintura', '4', 'l']);
      
      const res3 = normalizarProducto('Tubo 100 centimetros');
      assert.deepEqual(res3.tokens, ['tubo', '100', 'cm']);
    });

    it('debe parsear dimensiones compactas', () => {
      const res = normalizarProducto('Madera 2x4');
      assert.deepEqual(res.tokens, ['madera', '2', 'x', '4']);
    });

    it('debe convertir coma decimal a punto', () => {
      const res = normalizarProducto('Clavo 2,5 pulgadas');
      assert.deepEqual(res.tokens, ['clavo', '2.5', 'pulg']);
    });

    it('debe convertir comillas a pulgadas', () => {
      const res = normalizarProducto('Tornillo 6"');
      assert.deepEqual(res.tokens, ['tornillo', '6', 'pulg']);
    });

    it('debe remover stop words', () => {
      const res = normalizarProducto('Sodimac Cemento para construccion con envio gratis');
      assert.deepEqual(res.tokens, ['cemento', 'construccion']);
    });

    it('debe separar numeros y unidades juntos', () => {
      const res = normalizarProducto('Cemento 25kg');
      assert.deepEqual(res.tokens, ['cemento', '25', 'kg']);
    });

    it('debe manejar duplicados y eliminarlos', () => {
      const res = normalizarProducto('Cemento Cemento 25 kg 25 kg');
      assert.deepEqual(res.tokens, ['cemento', '25', 'kg']);
    });

    it('debe manejar strings vacios o null', () => {
      const res1 = normalizarProducto(null);
      assert.deepEqual(res1.tokens, []);
      const res2 = normalizarProducto('');
      assert.deepEqual(res2.tokens, []);
    });
  });

  describe('2. calcularSimilitud', () => {
    it('debe devolver 1 para arrays identicos', () => {
      assert.equal(calcularSimilitud(['a', 'b'], ['a', 'b']), 1);
    });

    it('debe devolver 0 para arrays completamente distintos', () => {
      assert.equal(calcularSimilitud(['a', 'b'], ['c', 'd']), 0);
    });

    it('debe calcular correctamente interseccion/union', () => {
      // union = a,b,c (3), inter = a,b (2) -> 2/3 = 0.666...
      assert.ok(Math.abs(calcularSimilitud(['a', 'b'], ['a', 'b', 'c']) - 0.666) < 0.01);
    });

    it('debe devolver 0 para arrays vacios', () => {
      assert.equal(calcularSimilitud([], []), 0);
      assert.equal(calcularSimilitud(['a'], []), 0);
    });
  });

  describe('3. esMatchSeguro', () => {
    it('debe hacer match de mismo producto con diferente orden/stop words', () => {
      const t1 = normalizarProducto('Cemento Melon Especial Saco 25kg').tokens;
      const t2 = normalizarProducto('Cemento Melón Especial Saco 25 Kg').tokens;
      assert.equal(esMatchSeguro(t1, t2), true);
    });

    it('NO debe hacer match si la cantidad/medida es distinta', () => {
      const t1 = normalizarProducto('Cemento Melon 25kg').tokens;
      const t2 = normalizarProducto('Cemento Melon 42.5kg').tokens;
      assert.equal(esMatchSeguro(t1, t2), false);
    });

    it('NO debe hacer match si el tipo de producto difiere', () => {
      const t1 = normalizarProducto('Cemento Melon 25kg').tokens;
      const t2 = normalizarProducto('Yeso Melon 25kg').tokens;
      assert.equal(esMatchSeguro(t1, t2), false);
    });

    it('NO debe hacer match para productos sin relacion', () => {
      const t1 = normalizarProducto('Taladro inalambrico 18v').tokens;
      const t2 = normalizarProducto('Martillo carpintero').tokens;
      assert.equal(esMatchSeguro(t1, t2), false);
    });
    
    it('NO debe hacer match si unidades difieren pero el numero es igual', () => {
      const t1 = normalizarProducto('Pintura 25 l').tokens;
      const t2 = normalizarProducto('Pintura 25 kg').tokens;
      assert.equal(esMatchSeguro(t1, t2), false);
    });
  });

  describe('4. extraerNumeros y tienenMismosNumeros', () => {
    // Ya que tienenMismosNumeros no es el que usa esMatchSeguro (usa tienenMismasMedidas internamente)
    // Pero la función sigue existiendo por ahora en export, así que testeamos.
    it('deben retornar extraerNumeros ok', () => {
      assert.deepEqual(extraerNumeros(['a', '25', 'kg', '2.5']), ['25', '2.5']);
    });
  });

  describe('5. esProductoValido', () => {
    it('debe aceptar productos validos', () => {
      assert.equal(esProductoValido('Taladro inalambrico Bosch'), true);
      assert.equal(esProductoValido('Cemento Melon 25kg'), true);
    });

    it('debe rechazar juguetes y terminos prohibidos', () => {
      assert.equal(esProductoValido('Lego constructor'), false);
      assert.equal(esProductoValido('Hot Wheels pista'), false);
      assert.equal(esProductoValido('Televisor Samsung 50"'), false);
      assert.equal(esProductoValido('Alimento mascota Perro'), false);
    });

    it('modo estricto: debe aceptar si tiene keyword de construccion', () => {
      assert.equal(esProductoValido('Taladro percutor', { estricto: true }), true);
      assert.equal(esProductoValido('Cemento 25kg', { estricto: true }), true);
    });

    it('modo estricto: debe rechazar si NO tiene keyword de construccion', () => {
      assert.equal(esProductoValido('Caja misteriosa', { estricto: true }), false);
    });

    it('debe manejar null o vacio', () => {
      assert.equal(esProductoValido(''), false);
      assert.equal(esProductoValido(null), false);
    });
  });

  describe('6. generarFingerprint', () => {
    it('mismo producto distinto texto -> mismo fingerprint', () => {
      const f1 = generarFingerprint('Cemento Melon Especial 25kg', 'Melón');
      const f2 = generarFingerprint('Saco Cemento Melón Especial 25 kg', 'Melon');
      assert.equal(f1, f2);
    });

    it('mismo producto distinta marca -> distinto fingerprint', () => {
      const f1 = generarFingerprint('Cemento Especial 25kg', 'Melón');
      const f2 = generarFingerprint('Cemento Especial 25kg', 'Polpaico');
      assert.notEqual(f1, f2);
    });

    it('mismo producto distinto peso -> distinto fingerprint', () => {
      const f1 = generarFingerprint('Cemento Melon Especial 25kg');
      const f2 = generarFingerprint('Cemento Melon Especial 42.5kg');
      assert.notEqual(f1, f2);
    });

    it('debe ser deterministico al llamarse dos veces', () => {
      const p = 'Taladro inalambrico Bosch 18V 2 baterias';
      const f1 = generarFingerprint(p, 'Bosch');
      const f2 = generarFingerprint(p, 'Bosch');
      assert.equal(f1, f2);
    });
    
    it('debe fallar silenciosamente con input nulo', () => {
      assert.equal(generarFingerprint(null), '');
    });
  });

});
