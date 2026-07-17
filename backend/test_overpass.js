const axios = require('axios');
async function test() {
  const query = 'Mersin';
  
  // Arama kelimesinde plaj/koy yoksa, şehir içi plajları aradığını varsayalım
  const overpassQuery = `
    [out:json][timeout:10];
    area["name"~"(?i)${query}"]->.a;
    (
      node["natural"="beach"](area.a);
      way["natural"="beach"](area.a);
      node["natural"="bay"](area.a);
      way["natural"="bay"](area.a);
    );
    out center 10;
  `;
  
  try {
    const res = await axios.post(`https://overpass-api.de/api/interpreter`, `data=${encodeURIComponent(overpassQuery)}`);
    console.log(res.data.elements.map(e => ({ name: e.tags?.name, id: e.id })));
  } catch(e) { console.error(e.message) }
}
test();
