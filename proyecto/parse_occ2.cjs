const fs = require('fs');
const s = fs.readFileSync('imperial_script_3.txt', 'utf8');
const start = s.indexOf('decodeURI("');
if (start > -1) {
    const end = s.indexOf('")', start);
    const encoded = s.substring(start + 11, end);
    const jsonStr = decodeURIComponent(encoded);
    fs.writeFileSync('occ_state.json', jsonStr);
    console.log('Saved occ_state.json, size:', jsonStr.length);
    const data = JSON.parse(jsonStr);
    let items = [];
    if (data.clientRepository && data.clientRepository.context && data.clientRepository.context.catalog && data.clientRepository.context.catalog.products) {
        console.log("Found in context catalog");
    }
    // Search recursively for anything with 'displayName' and 'listPrice'
    function findProds(obj) {
        if (!obj) return;
        if (typeof obj === 'object') {
            if (obj.displayName && obj.listPrice) {
                items.push(obj);
            }
            Object.values(obj).forEach(findProds);
        }
    }
    findProds(data);
    console.log("Products found:", items.length);
    if (items.length > 0) {
        console.log(items[0].displayName);
        console.log(items[0].listPrice);
        console.log(items[0].route);
        console.log(items[0].primaryFullImageURL);
    }
} else {
    console.log("decodeURI not found");
}
