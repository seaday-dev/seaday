const axios = require('axios');
async function test() {
  try {
    const response = await axios.get(`https://nominatim.openstreetmap.org/search`, {
      params: { q: 'kaputaş plajı', format: 'json', countrycodes: 'tr', limit: 5 },
      headers: { 'User-Agent': 'SeadayApp/1.0' }
    });
    console.log("Kaputas:", response.data.map(d => d.display_name));
    
    const res2 = await axios.get(`https://nominatim.openstreetmap.org/search`, {
      params: { q: 'ölüdeniz', format: 'json', countrycodes: 'tr', limit: 5 },
      headers: { 'User-Agent': 'SeadayApp/1.0' }
    });
    console.log("Oludeniz:", res2.data.map(d => d.display_name));
  } catch(e) { console.error(e.message) }
}
test();
