const axios = require('axios');
async function test() {
  try {
    const response = await axios.get(`https://nominatim.openstreetmap.org/search`, {
      params: { q: 'kaputaş plajı', format: 'json', countrycodes: 'tr', extratags: 1, namedetails: 1, limit: 1 },
      headers: { 'User-Agent': 'SeadayApp/1.0' }
    });
    console.log(JSON.stringify(response.data[0].extratags, null, 2));
  } catch(e) { console.error(e.message) }
}
test();
