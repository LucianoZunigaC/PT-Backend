async function testApis() {
    try {
        console.log('[Easy API] probando VTEX API...');
        const resEasy = await fetch('https://www.easy.cl/api/catalog_system/pub/products/search/cemento');
        if (resEasy.ok) {
            const data = await resEasy.json();
            console.log(`Easy API funcionó! Productos: ${data.length}. Ejemplo:`, data[0]?.productName);
        } else {
            console.log('Easy API falló:', resEasy.status);
        }
    } catch(e) {
        console.log('Easy error:', e.message);
    }

    try {
        console.log('[Sodimac API] probando Falabella API...');
        const resSodi = await fetch('https://www.falabella.com/s/browse/v1/search?Ntt=cemento&page=1', {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
                'Accept': 'application/json'
            }
        });
        if (resSodi.ok) {
            const data = await resSodi.json();
            console.log(`Sodimac API funcionó! Productos: ${data.data?.results?.length}. Ejemplo:`, data.data?.results[0]?.displayName);
        } else {
            console.log('Sodimac API falló:', resSodi.status);
        }
    } catch(e) {
        console.log('Sodimac error:', e.message);
    }
}

testApis();
