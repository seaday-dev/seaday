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
      
      // Simple Turkish lowercasing
      const lower = (str) => str.toLocaleLowerCase('tr-TR');
      
      const bestTitleLower = lower(bestTitle);
      const queryLower = lower(query);
      
      // Plaj, koy vs geçiyorsa çok iyi
      const hasKeywords = /(plaj|koy|sahil|deniz|beach)/i.test(bestTitleLower);
      
      // İsimler çok benziyorsa
      const similarName = queryLower.includes(bestTitleLower) || bestTitleLower.includes(queryLower);
      
      // Ancak "Yapraklı Koyu" arandığında "Buğay, Yapraklı" çıkarsa similarName = false olur, hasKeywords = false olur. 
      // Ama "Susanoğlu" arandığında "Susanoğlu" çıkarsa similarName = true olur! Bu tehlikeli mi? 
      // Susanoğlu bir şehir/mahalle adı. Biz plaj arıyoruz. 
      
      const isGoodMatch = hasKeywords; // Eğer hasKeywords yoksa resim muhtemelen alakasız bir belde/şehir haritası olacak!
      
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
test("Ayaş Belediyesi Halk Plajı");
