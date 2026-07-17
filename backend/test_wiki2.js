const axios = require('axios');

async function test(query) {
  try {
    const searchRes = await axios.get(`https://tr.wikipedia.org/w/api.php`, {
      params: { action: 'query', list: 'search', srsearch: query, format: 'json' },
      headers: { 'User-Agent': 'SeadayApp/1.0 (sarpd@example.com)' }
    });
    
    if (searchRes.data.query.search.length > 0) {
      const bestTitle = searchRes.data.query.search[0].title;
      console.log(`[${query}] -> Best Match: ${bestTitle}`);
      
      const bestTitleLower = bestTitle.toLowerCase();
      const queryLower = query.toLowerCase();
      const isGoodMatch = bestTitleLower.includes('plaj') || 
                          bestTitleLower.includes('koy') || 
                          bestTitleLower.includes('sahil');
      
      if (!isGoodMatch) {
        console.log(`[${query}] -> REJECTED (Too Generic)`);
      } else {
        console.log(`[${query}] -> ACCEPTED`);
      }
    } else {
      console.log(`[${query}] -> No results`);
    }
  } catch(e) {}
}

test("Yapraklı Koyu");
test("Kaputaş Plajı");
test("Ölüdeniz");
