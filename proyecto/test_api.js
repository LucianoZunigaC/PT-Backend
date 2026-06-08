import fetch from 'node-fetch'; // No need if Node 18+

(async () => {
  try {
    const res = await fetch('https://sodimac.falabella.com/s/browse/v1/search?Ntt=cemento', {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });
    const json = await res.json();
    console.log(json.data ? json.data.results.map(r => r.displayName).slice(0, 3) : json);
  } catch(e) {
    console.log('Error API:', e);
  }
})();
