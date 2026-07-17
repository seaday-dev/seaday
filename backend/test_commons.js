const axios = require('axios');

async function testCommons(query) {
  try {
    const searchRes = await axios.get(`https://commons.wikimedia.org/w/api.php`, {
      params: { 
        action: 'query', 
        list: 'search', 
        srsearch: query, 
        srnamespace: '6', // 6 is File namespace in Commons
        format: 'json' 
      },
      headers: { 'User-Agent': 'SeadayApp/1.0 (sarpd@example.com)' }
    });
    
    if (searchRes.data.query.search.length > 0) {
      console.log(`\n[${query}] -> Found ${searchRes.data.query.search.length} results in Commons.`);
      const bestTitle = searchRes.data.query.search[0].title;
      console.log(`Best Title: ${bestTitle}`);
      
      const imgRes = await axios.get(`https://commons.wikimedia.org/w/api.php`, {
        params: { action: 'query', prop: 'imageinfo', iiprop: 'url', titles: bestTitle, format: 'json' },
        headers: { 'User-Agent': 'SeadayApp/1.0 (sarpd@example.com)' }
      });
      
      const pages = imgRes.data.query.pages;
      const firstPageId = Object.keys(pages)[0];
      if (pages[firstPageId] && pages[firstPageId].imageinfo) {
        console.log(`URL: ${pages[firstPageId].imageinfo[0].url}`);
      }
    } else {
      console.log(`\n[${query}] -> No results in Commons`);
    }
  } catch(e) {
    console.error(e.message);
  }
}

async function run() {
  await testCommons("Tisan Koyu");
  await testCommons("Yapraklı Koy");
  await testCommons("Yapraklı Koyu");
  await testCommons("Tisan");
}

run();
