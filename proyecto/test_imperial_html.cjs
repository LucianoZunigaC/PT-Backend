const fs = require('fs');
const html = fs.readFileSync('imperial.html', 'utf8');
console.log('HTML size:', html.length);
console.log('Contains product?:', html.includes('product'));
console.log('Contains __NEXT_DATA__?:', html.includes('__NEXT_DATA__'));
console.log('Contains window.__STATE__?:', html.includes('window.__STATE__'));
console.log('Contains window.__PRELOADED_STATE__?:', html.includes('window.__PRELOADED_STATE__'));
const matchNext = html.match(/<script id="__NEXT_DATA__" type="application\/json">([^<]+)<\/script>/);
if (matchNext) console.log("Next data len: ", matchNext[1].length);

const stateMatch = html.match(/window\.__STATE__\s*=\s*(\{.*?\});/);
if (stateMatch) console.log("State len: ", stateMatch[1].length);

const vtexMatch = html.match(/vtex\.renderRuntime\s*=\s*(\{.*?\});/);
if (vtexMatch) {
    console.log("Vtex len: ", vtexMatch[1].length);
    fs.writeFileSync('imperial_vtex.json', vtexMatch[1]);
}
