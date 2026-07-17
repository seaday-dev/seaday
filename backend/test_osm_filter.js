const axios = require('axios');
async function test() {
  try {
    const res = await axios.get(`https://nominatim.openstreetmap.org/search`, {
      params: { q: 'kaputaş', format: 'json', countrycodes: 'tr', limit: 10, extratags: 1, namedetails: 1 },
      headers: { 'User-Agent': 'SeadayApp/1.0' }
    });
    console.log("Kaputas:", res.data.map(d => ({ name: d.display_name, class: d.class, type: d.type })));
    
    const res2 = await axios.get(`https://nominatim.openstreetmap.org/search`, {
      params: { q: 'fethiye', format: 'json', countrycodes: 'tr', limit: 10, extratags: 1, namedetails: 1 },
      headers: { 'User-Agent': 'SeadayApp/1.0' }
    });
    console.log("Fethiye:", res2.data.map(d => ({ name: d.display_name, class: d.class, type: d.type })));
  } catch(e) { console.error(e.message) }
}
test();
