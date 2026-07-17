const axios = require('axios');
async function getWikiImage(query) {
  try {
    const searchRes = await axios.get(`https://tr.wikipedia.org/w/api.php`, {
      params: { action: 'query', list: 'search', srsearch: query, format: 'json', utf8: 1 }
    });
    
    if (searchRes.data.query.search.length > 0) {
      const bestTitle = searchRes.data.query.search[0].title;
      console.log("Found Wikipedia article:", bestTitle);
      
      const imageRes = await axios.get(`https://tr.wikipedia.org/w/api.php`, {
        params: { action: 'query', prop: 'pageimages', titles: bestTitle, format: 'json', pithumbsize: 800 }
      });
      
      const pages = imageRes.data.query.pages;
      const pageId = Object.keys(pages)[0];
      
      if (pages[pageId].thumbnail) {
        return pages[pageId].thumbnail.source;
      }
    }
    return null;
  } catch (err) {
    console.error(err);
    return null;
  }
}

async function test() {
  const img = await getWikiImage("Yapraklı Koyu");
  console.log("Image URL:", img);
}
test();
