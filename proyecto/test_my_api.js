// No import needed for fetch in Node 20+

async function test() {
  try {
    console.log('--- Probando GET /api/categorias ---');
    const resCat = await fetch('http://localhost:3000/api/categorias');
    const categorias = await resCat.json();
    console.log('Categorías:', JSON.stringify(categorias, null, 2));

    console.log('\n--- Probando GET /api/productos/busqueda?q=cemento ---');
    const resProd = await fetch('http://localhost:3000/api/productos/busqueda?q=cemento');
    const productos = await resProd.json();
    console.log('Productos encontrados:', productos.length);
    if (productos.length > 0) {
      console.log('Ejemplo:', JSON.stringify(productos[0], null, 2));
    }

    console.log('\n--- Probando GET /api/productos/comparacion?q=polpaico ---');
    const resComp = await fetch('http://localhost:3000/api/productos/comparacion?q=polpaico');
    const comparativa = await resComp.json();
    console.log('Productos comparados:', comparativa.length);
    comparativa.forEach(p => {
        console.log(`[${p.proveedor.nombre}] ${p.nombre} - $${p.precios[0]?.precio} (Marca: ${p.marca})`);
    });

  } catch (e) {
    console.log('Error:', e.message);
  }
}

test();
