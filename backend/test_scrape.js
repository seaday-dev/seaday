const axios = require('axios');

async function scrapeGoogleImage(query) {
  try {
    const res = await axios.get(`https://www.google.com/search?tbm=isch&q=${encodeURIComponent(query)}`, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/114.0.0.0 Safari/537.36'
      }
    });
    
    // Google embeds the first few images directly in the HTML as base64 data URIs
    // The format is usually like data:image/jpeg;base64,....
    const match = res.data.match(/https:\/\/encrypted-tbn0\.gstatic\.com\/images\?q=[^"&]+/);
    if (match) {
      console.log("Success! Found image:");
      console.log(match[0]);
    } else {
      console.log("No images found in HTML.");
    }
  } catch (err) {
    console.error("Scrape error:", err.message);
  }
}

scrapeGoogleImage('yapraklı koy mersin');
