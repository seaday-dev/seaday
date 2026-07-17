const axios = require('axios');
async function test() {
  try {
    const searchRes = await axios.get(`https://nominatim.openstreetmap.org/search`, {
      params: { q: 'Ayaş Belediyesi Halk Plajı', format: 'json', limit: 1 },
      headers: { 'User-Agent': 'SeadayApp/1.0' }
    });
    const place = searchRes.data[0];
    console.log("Search Result Place ID:", place.place_id, place.osm_type, place.osm_id, place.name);
    
    const detailsRes = await axios.get(`https://nominatim.openstreetmap.org/details`, {
      params: { place_id: place.place_id, format: 'json' },
      headers: { 'User-Agent': 'SeadayApp/1.0' }
    });
    console.log("Details Result Localname:", detailsRes.data.localname);
    console.log("Details full names:", detailsRes.data.names);
  } catch(e) { console.error(e.message) }
}
test();
