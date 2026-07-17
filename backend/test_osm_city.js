const axios = require('axios');
async function test() {
  try {
    const res = await axios.get(`https://nominatim.openstreetmap.org/search`, {
      params: { q: 'mersin plaj', format: 'json', countrycodes: 'tr', limit: 10 },
      headers: { 'User-Agent': 'SeadayApp/1.0' }
    });
    console.log("Mersin plaj:", res.data.map(d => d.display_name));
    
    const res2 = await axios.get(`https://nominatim.openstreetmap.org/search`, {
      params: { q: 'antalya plaj', format: 'json', countrycodes: 'tr', limit: 10 },
      headers: { 'User-Agent': 'SeadayApp/1.0' }
    });
    console.log("Antalya plaj:", res2.data.map(d => d.display_name));
  } catch(e) { console.error(e.message) }
}
test();
