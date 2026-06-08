const fs = require('fs');
const html = fs.readFileSync('sodimac.html', 'utf8');

console.log("Searching for product links in HTML...");
const linkRegex = /<a[^>]+href=["']([^"']+)["'][^>]*>/g;
let m;
let c = 0;
while ((m = linkRegex.exec(html)) !== null) {
  if (m[1].includes('product')) {
    console.log(m[1]);
    c++;
  }
}
console.log("Total product links found: " + c);

// Also look for common product identifiers if it's dynamic
console.log("Searching for NEXT_DATA...");
if (html.includes('__NEXT_DATA__')) {
    const nextDataMatch = html.match(/<script id="__NEXT_DATA__" type="application\/json">([^<]+)<\/script>/);
    if (nextDataMatch) {
        console.log("Found NEXT_DATA. Length: " + nextDataMatch[1].length);
        fs.writeFileSync('sodimac_data.json', nextDataMatch[1]);
    }
}
