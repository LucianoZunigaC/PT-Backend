const fs = require('fs');
const s = fs.readFileSync('imperial_script_3.txt', 'utf8');
const match = s.match(/window\.state\s*=\s*JSON\.parse\(decodeURI\(['"](.*?)['"]\)\);/);
if (match) {
    try {
        const jsonStr = decodeURIComponent(match[1]);
        const data = JSON.parse(jsonStr);
        if (data.catalogRepository && data.catalogRepository.products) {
            const products = Object.values(data.catalogRepository.products);
            console.log('Products found:', products.length);
            if (products.length > 0) {
                console.log(products[0].displayName);
                console.log(products[0].route);
                console.log(products[0].listPrice);
                console.log(products[0].primaryFullImageURL);
            }
        } else {
            console.log('No catalogRepository.products found');
        }
    } catch(e) {
        console.log(e);
    }
}
