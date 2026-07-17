const axios = require('axios');

async function testWiki(query) {
  try {
    const searchRes = await axios.get(`https://tr.wikipedia.org/w/api.php`, {
      params: { action: 'query', list: 'search', srsearch: query, format: 'json' },
      headers: { 'User-Agent': 'SeadayApp/1.0 (sarpd@example.com)' }
    });
    
    if (searchRes.data.query.search.length > 0) {
      const bestTitle = searchRes.data.query.search[0].title;
      console.log(`\n[${query}] -> Best Match: ${bestTitle}`);
      
      const imgRes = await axios.get(`https://tr.wikipedia.org/w/api.php`, {
        params: { action: 'query', prop: 'pageimages', format: 'json', piprop: 'original', titles: bestTitle },
        headers: { 'User-Agent': 'SeadayApp/1.0 (sarpd@example.com)' }
      });
      const pages = imgRes.data.query.pages;
      const firstPageId = Object.keys(pages)[0];
      if (pages[firstPageId] && pages[firstPageId].original) {
        const source = pages[firstPageId].original.source;
        console.log(`Image: ${source}`);
        
        // Check if image is a map/svg
        const isMap = source.toLowerCase().endsWith('.svg') || source.toLowerCase().includes('map') || source.toLowerCase().includes('locator');
        console.log(`Is Map/Logo? ${isMap}`);
      } else {
        console.log("No image found for this page.");
      }
    } else {
      console.log(`\n[${query}] -> No Wikipedia results`);
    }
  } catch(e) {
    console.error(e.message);
  }
}

async function run() {
  await testWiki("Faselis");
  await testWiki("Yapraklı Koyu");
  await testWiki("Ölüdeniz");
  await testWiki("Kaputaş Plajı");
  await testWiki("İztuzu Plajı");
}

run();
