const axios = require('axios');
async function test() {
  const query = 'Mersin';
  
  try {
    const req1 = axios.get(`https://nominatim.openstreetmap.org/search`, {
      params: { q: query, format: 'json', countrycodes: 'tr', limit: 10 },
      headers: { 'User-Agent': 'SeadayApp/1.0' }
    });
    const req2 = axios.get(`https://nominatim.openstreetmap.org/search`, {
      params: { q: query + ' plajı', format: 'json', countrycodes: 'tr', limit: 10 },
      headers: { 'User-Agent': 'SeadayApp/1.0' }
    });
    
    const [res1, res2] = await Promise.all([req1, req2]);
    const combined = [...res1.data, ...res2.data];
    
    const unique = [];
    const ids = new Set();
    combined.forEach(p => {
       if (!ids.has(p.place_id)) {
          ids.add(p.place_id);
          unique.push(p);
       }
    });

    const regex = /\\b(plaj|plajı|koy|koyu|sahil|sahili|deniz|beach|bük|bükü)\\b/i;
    const filtered = unique.filter(p => {
      const isBeachType = (p.type === 'beach' || p.type === 'bay');
      const hasKeyword = regex.test(p.display_name);
      return isBeachType || hasKeyword;
    });
    
    console.log(filtered.map(f => f.display_name));
    
  } catch(e) { console.error(e.message) }
}
test();
