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
    
    // Deduplicate by place_id
    const unique = [];
    const ids = new Set();
    combined.forEach(p => {
       if (!ids.has(p.place_id)) {
          ids.add(p.place_id);
          unique.push(p);
       }
    });

    const validKeywords = ['plaj', 'koy', 'sahil', 'deniz', 'beach', 'bük'];
    const filtered = unique.filter(p => {
      if (p.type === 'beach' || p.type === 'bay' || p.class === 'natural' || p.class === 'tourism') return true;
      const lowerName = p.display_name.toLowerCase();
      return validKeywords.some(kw => lowerName.includes(kw));
    });
    
    console.log(filtered.map(f => f.display_name));
    
  } catch(e) { console.error(e.message) }
}
test();
