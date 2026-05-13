const fs = require('fs');
const s = fs.readFileSync('imperial_script_3.txt', 'utf8');
const match = s.match(/window\.state\s*=\s*JSON\.parse\(decodeURI\(['"](.*?)['"]\)/);
if (match) {
    const jsonStr = decodeURIComponent(match[1]);
    fs.writeFileSync('imperial_state.json', jsonStr);
    console.log('Saved imperial_state.json, length:', jsonStr.length);
} else {
    console.log('Match failed');
}
