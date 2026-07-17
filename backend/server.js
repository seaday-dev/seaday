const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const axios = require('axios');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const { initializeApp, cert } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');
require('dotenv').config();

// ============================================
// HİBRİT VERİTABANI KÖPRÜSÜ (Firebase & JSON)
// ============================================
const USE_FIREBASE = process.env.USE_FIREBASE === 'true';

if (USE_FIREBASE) {
  try {
    // Vercel/Render ortamında FIREBASE_SERVICE_ACCOUNT_JSON env'den okunur
    const serviceAccount = process.env.FIREBASE_SERVICE_ACCOUNT_JSON 
        ? JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON)
        : require('./firebase-key.json'); // Yerel test için

    initializeApp({ credential: cert(serviceAccount) });
    console.log("🔥 Firebase Veritabanı Motoru Aktif!");
  } catch (err) {
    console.error("🔥 Firebase Başlatma Hatası:", err.message);
  }
}

const dbFirebase = USE_FIREBASE ? getFirestore() : null;

async function getUserByUsernameAndPassword(username, password) {
  if (USE_FIREBASE && dbFirebase) {
    const usersRef = dbFirebase.collection('users');
    const snapshot = await usersRef.where('username', '==', username).where('password', '==', password).get();
    if (snapshot.empty) return null;
    return snapshot.docs[0].data();
  } else {
    const db = readData();
    return db.users.find(u => u.username.toLowerCase() === username.toLowerCase() && u.password === password);
  }
}

async function getPlaceStatuses(placeId) {
  if (USE_FIREBASE && dbFirebase) {
    const statusRef = dbFirebase.collection('statuses');
    const snapshot = await statusRef.where('beach', '==', placeId).orderBy('timestamp', 'desc').limit(10).get();
    if (snapshot.empty) return [];
    return snapshot.docs.map(doc => doc.data());
  } else {
    const db = readData();
    return db.statuses.filter(s => s.beach === placeId).sort((a, b) => b.timestamp - a.timestamp).slice(0, 10);
  }
}

async function addNewStatus(statusObj) {
  if (USE_FIREBASE && dbFirebase) {
    const statusRef = dbFirebase.collection('statuses').doc(statusObj.id.toString());
    await statusRef.set(statusObj);
  } else {
    const db = readData();
    db.statuses.push(statusObj);
    writeData(db);
  }
}

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 3001;
const DATA_FILE = path.join(__dirname, 'data.json');

function readData() {
  try {
    const data = fs.readFileSync(DATA_FILE, 'utf8');
    return JSON.parse(data);
  } catch (err) {
    return { users: [], statuses: [] };
  }
}

function writeData(data) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
}

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

// In-Memory Cache Sistemi
const apiCache = new Map();
function getCached(key, maxAgeMs) {
  const item = apiCache.get(key);
  if (item && (Date.now() - item.time < maxAgeMs)) {
    return item.data;
  }
  return null;
}
function setCache(key, data) {
  apiCache.set(key, { time: Date.now(), data });
}

app.post('/api/login', async (req, res) => {
  const { username, password } = req.body;
  
  if (username === 'admin' && password === '123') {
    return res.json({ success: true, message: 'Admin girişi başarılı', username: 'admin' });
  }

  try {
    const user = await getUserByUsernameAndPassword(username, password);
    if (user) {
      res.json({ success: true, message: 'Giriş başarılı', username: user.username });
    } else {
      res.status(401).json({ success: false, message: 'Geçersiz kullanıcı adı veya şifre!' });
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Veritabanı bağlantı hatası' });
  }
});

// Arama Endpoint (Hibrit: Google veya OSM)
app.get('/api/search', async (req, res) => {
  const query = req.query.q;
  const apiKey = process.env.GOOGLE_PLACES_API_KEY;

  if (!query) return res.json({ success: true, results: [] });

  const isFreeMode = (!apiKey || apiKey === 'BURAYA_GOOGLE_API_KEY_GIRILECEK');
  const cacheKey = `search_${query}_${isFreeMode ? 'free' : 'pro'}`;
  const cachedData = getCached(cacheKey, 1000 * 60 * 60 * 24); // 24 saat cache
  if (cachedData) return res.json({ success: true, results: cachedData });

  // 1. FREE MOD (OSM)
  if (isFreeMode) {
    try {
      const req1 = axios.get(`https://nominatim.openstreetmap.org/search`, {
        params: { q: query, format: 'json', countrycodes: 'tr', limit: 15 },
        headers: { 'User-Agent': 'SeadayApp/1.0' }
      });
      const req2 = axios.get(`https://nominatim.openstreetmap.org/search`, {
        params: { q: query + ' plajı', format: 'json', countrycodes: 'tr', limit: 15 },
        headers: { 'User-Agent': 'SeadayApp/1.0' }
      });

      const [res1, res2] = await Promise.all([req1, req2]);
      const combined = [...res1.data, ...res2.data];

      // Deduplicate by place_id
      const unique = [];
      const ids = new Set();
      combined.forEach(p => {
         if (!ids.has(p.place_id)) {
            ids.add(p.place_id);
            unique.push(p);
         }
      });

      const regex = /(^|\s|\W)(plaj|plajı|koy|koyu|sahil|sahili|deniz|beach|bük|bükü)($|\s|\W)/i;
      
      const filteredResults = unique.filter(p => {
        if (p.type === 'beach' || p.type === 'bay' || p.class === 'natural' || p.class === 'tourism') return true;
        return regex.test(p.display_name);
      });

      const results = filteredResults.map(p => ({
        place_id: `osm_${p.place_id}`,
        name: p.display_name.split(',')[0],
        location: p.display_name.substring(p.display_name.indexOf(',') + 1).trim(),
        lat: parseFloat(p.lat),
        lon: parseFloat(p.lon)
      }));

      const finalResults = results.slice(0, 10);
      setCache(cacheKey, finalResults);
      return res.json({ success: true, results: finalResults });
    } catch (err) {
      console.error("OSM API Hatası:", err.message);
      return res.status(500).json({ success: false, message: 'Arama yapılamadı' });
    }
  }

  // 2. PRO MOD (Google)
  try {
    const response = await axios.get(`https://maps.googleapis.com/maps/api/place/autocomplete/json`, {
      params: { input: query, key: apiKey, language: 'tr' }
    });

    const results = response.data.predictions.map(p => ({
      place_id: p.place_id,
      name: p.structured_formatting.main_text,
      location: p.structured_formatting.secondary_text
    }));

    res.json({ success: true, results });
    setCache(cacheKey, results);
  } catch (err) {
    console.error("Places API Hatası:", err.message);
    res.status(500).json({ success: false, message: 'Arama yapılamadı' });
  }
});

async function getWikiImage(query) {
  const cacheKey = `wiki_${query}`;
  const cachedImg = getCached(cacheKey, 1000 * 60 * 60 * 24); // 24 saat cache
  if (cachedImg !== null) return cachedImg === 'null' ? null : cachedImg;

  try {
    // 1. Wikipedia Makalesi Araması Yerine, Wikimedia Commons Dosya (Resim) Araması Yapıyoruz.
    // 'srnamespace: 6' parametresi sadece resim/dosya arşivinde arama yapmamızı sağlar.
    const searchRes = await axios.get(`https://commons.wikimedia.org/w/api.php`, {
      params: { 
        action: 'query', 
        list: 'search', 
        srsearch: query, 
        srnamespace: '6', 
        format: 'json' 
      },
      headers: { 'User-Agent': 'SeadayApp/1.0 (sarpd@example.com)' }
    });
    
    if (searchRes.data.query.search.length > 0) {
      // Bulunan en iyi resim dosyasının adını alıyoruz (Örn: "File:Yapraklı Koy.jpg")
      const bestTitle = searchRes.data.query.search[0].title;
      
      const imgRes = await axios.get(`https://commons.wikimedia.org/w/api.php`, {
        params: { action: 'query', prop: 'imageinfo', iiprop: 'url', format: 'json', titles: bestTitle },
        headers: { 'User-Agent': 'SeadayApp/1.0 (sarpd@example.com)' }
      });
      const pages = imgRes.data.query.pages;
      const firstPageId = Object.keys(pages)[0];
      
      if (pages[firstPageId] && pages[firstPageId].imageinfo && pages[firstPageId].imageinfo.length > 0) {
        const source = pages[firstPageId].imageinfo[0].url;
        const lowerUrl = source.toLowerCase();
        
        // Harita, bayrak, logo veya SVG dosyasıysa bu resmi kullanma (Unsplash'a düşsün)
        const isBadImage = lowerUrl.endsWith('.svg') || 
                           lowerUrl.includes('map') || 
                           lowerUrl.includes('harita') || 
                           lowerUrl.includes('locator') || 
                           lowerUrl.includes('flag') || 
                           lowerUrl.includes('logo');
                           
        if (!isBadImage) {
          setCache(cacheKey, source);
          return source;
        }
      }
    }
  } catch(e) { console.error("Wiki Hatasi:", e.message); }
  setCache(cacheKey, 'null'); // Yoksa da kaydet ki sürekli aramasın
  return null;
}

app.get('/api/place-details/:place_id', async (req, res) => {
  const placeId = req.params.place_id;
  const queryName = req.query.name;
  const queryLocation = req.query.location;
  const apiKey = process.env.GOOGLE_PLACES_API_KEY;
  const isFreeMode = (!apiKey || apiKey === 'BURAYA_GOOGLE_API_KEY_GIRILECEK' || placeId.startsWith('osm_'));

  const cacheKey = `details_${placeId}_${isFreeMode ? 'free' : 'pro'}`;
  const cachedData = getCached(cacheKey, 1000 * 60 * 15); // 15 dakika cache (rüzgar güncelliği için)
  if (cachedData) return res.json({ success: true, data: cachedData });

  let beachData = {
    id: placeId,
    name: queryName || 'Yükleniyor...',
    location: queryLocation || '',
    image: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?q=80&w=1000',
    waveRating: 5,
    windSpeed: 10,
    reviews: [],
    aiSummary: "Özet hazırlanıyor..."
  };

  let aiPrompt = "";

  // 1. FREE MOD DETAYLARI
  if (isFreeMode) {
    if (!beachData.name || beachData.name === 'Yükleniyor...') {
       beachData.name = 'Plaj/Koy';
    }
    
    if (placeId.startsWith('osm_')) {
      const osmId = placeId.split('_')[1];
      try {
        // Artık localname'e bağımlı değiliz, queryName zaten var!
        // Sadece image bulmamız yetiyor.
        let realImage = await getWikiImage(beachData.name);
        
        if (realImage) {
          beachData.image = realImage;
        } else {
          // Temsili Yüksek Kaliteli Plaj Fotoğrafları Havuzu
          const photos = [
            'https://images.unsplash.com/photo-1520050735087-1ed65d9b0273?q=80&w=1000&auto=format&fit=crop',
            'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?q=80&w=1000&auto=format&fit=crop',
            'https://images.unsplash.com/photo-1499793983690-e29da59ef1c2?q=80&w=1000&auto=format&fit=crop',
            'https://images.unsplash.com/photo-1506929562872-bb421503ef21?q=80&w=1000&auto=format&fit=crop',
            'https://images.unsplash.com/photo-1519046904884-53103b34b206?q=80&w=1000&auto=format&fit=crop'
          ];
          beachData.image = photos[osmId % photos.length];
        }
      } catch (err) {
        console.error("OSM Detay Hatası:", err.message);
      }
    }

    aiPrompt = `Lütfen internetteki genel bilgine dayanarak, Türkiye'deki "${beachData.name}" isimli plaj/koy hakkında insanların genel düşüncelerini ve ortamını 3 cümlelik kısa ve öz bir Türkçe paragraf halinde özetle. Eğer bu yeri tam bilmiyorsan, genel olarak Türkiye sahillerinin güzelliğini anlatan 3 cümlelik bir şeyler yaz.
    
    ÇOK ÖNEMLİ:
    - Yanıtını SADECE ve SADECE aşağıdaki JSON formatında ver.
    - Asla İngilizce düşünce sürecini, taslağını veya markdown işaretlerini JSON'ın dışına veya içine ekleme.
    
    {
      "summary": "Türkçe özet metni buraya"
    }`;

  } 
  // 2. PRO MOD DETAYLARI
  else {
    try {
      const response = await axios.get(`https://maps.googleapis.com/maps/api/place/details/json`, {
        params: { place_id: placeId, key: apiKey, language: 'tr', fields: 'name,formatted_address,photos,reviews,rating,geometry' }
      });
      const result = response.data.result;
      beachData.name = result.name || 'Plaj';
      beachData.location = result.formatted_address || '';
      
      if (result.geometry && result.geometry.location) {
        req.query.lat = result.geometry.location.lat;
        req.query.lon = result.geometry.location.lng;
      }
      
      if (result.photos && result.photos.length > 0) {
        beachData.image = `https://maps.googleapis.com/maps/api/place/photo?maxwidth=1000&photoreference=${result.photos[0].photo_reference}&key=${apiKey}`;
      }
      if (result.reviews) {
        beachData.reviews = result.reviews.map(r => ({
          author: r.author_name,
          rating: r.rating,
          text: r.text,
          profile_photo_url: r.profile_photo_url
        }));
      }

      const reviewsText = beachData.reviews.map(r => `${r.rating} Yıldız: ${r.text}`).join('\n');
      aiPrompt = `Aşağıda bir plajın yorumları var. İnsanların bu plaj hakkında ne düşündüğünü 3 cümlelik kısa ve öz bir Türkçe paragraf halinde özetle.
      
      ÇOK ÖNEMLİ:
      - Yanıtını SADECE ve SADECE aşağıdaki JSON formatında ver.
      - Asla İngilizce düşünce sürecini, taslağını veya markdown işaretlerini JSON'ın dışına veya içine ekleme.
      
      {
        "summary": "Türkçe özet metni buraya"
      }
      
      YORUMLAR:
      ${reviewsText}`;
    } catch (err) {
      console.error("Place Details Hatası:", err.message);
    }
  }

  // OPEN-METEO ILE CANLI RÜZGAR VE DALGA HESAPLAMASI
  const lat = req.query.lat;
  const lon = req.query.lon;
  
  if (lat && lon) {
    try {
      const weatherRes = await axios.get(`https://api.open-meteo.com/v1/forecast`, {
        params: { latitude: lat, longitude: lon, current_weather: true }
      });
      const windSpeed = weatherRes.data.current_weather.windspeed;
      beachData.windSpeed = Math.round(windSpeed);
      // Rüzgar hızına göre dalga puanı (0-10)
      // 0 km/h -> 1, 35 km/h -> 10
      beachData.waveRating = Math.min(10, Math.max(1, Math.ceil(windSpeed / 3.5)));
    } catch (e) {
      console.error("Hava durumu API Hatası:", e.message);
    }
  }

  // AI Özeti başlangıçta boş geliyor. Kullanıcı butona basınca ayrı bir API çağrısıyla alınacak.
  beachData.aiSummary = null;

  setCache(cacheKey, beachData);
  res.json({ success: true, data: beachData });
});

// YENİ ROTA: Sadece AI özetini anlık (asenkron) üretir.
app.post('/api/ai-summary', async (req, res) => {
  const { name, reviews, isFreeMode } = req.body;
  const apiKey = process.env.GEMINI_API_KEY;
  
  if (!apiKey) {
    return res.json({ success: false, summary: "Yapay zeka özetine erişilemiyor." });
  }

  const cacheKey = `ai_${name}`;
  const cachedSummary = getCached(cacheKey, 1000 * 60 * 60 * 24); // 24 saat cache
  if (cachedSummary) return res.json({ success: true, summary: cachedSummary });

  let aiPrompt = "";
  if (isFreeMode) {
    aiPrompt = `Lütfen internetteki genel bilgine dayanarak, Türkiye'deki "${name}" isimli plaj/koy hakkında insanların genel düşüncelerini ve ortamını 3 cümlelik kısa ve öz bir Türkçe paragraf halinde özetle. Eğer bu yeri tam bilmiyorsan, genel olarak Türkiye sahillerinin güzelliğini anlatan 3 cümlelik bir şeyler yaz.
    
    ÇOK ÖNEMLİ:
    - Yanıtını SADECE ve SADECE aşağıdaki JSON formatında ver.
    - Asla İngilizce düşünce sürecini, taslağını veya markdown işaretlerini JSON'ın dışına veya içine ekleme.
    
    {
      "summary": "Türkçe özet metni buraya"
    }`;
  } else {
    if (!reviews || reviews.length === 0) {
      return res.json({ success: false, summary: "Yorum yetersiz olduğu için özet oluşturulamadı." });
    }
    const reviewsText = reviews.map(r => `${r.rating} Yıldız: ${r.text}`).join('\n');
    aiPrompt = `Aşağıda "${name}" plajının yorumları var. İnsanların bu plaj hakkında ne düşündüğünü 3 cümlelik kısa ve öz bir Türkçe paragraf halinde özetle.
    
    ÇOK ÖNEMLİ:
    - Yanıtını SADECE ve SADECE aşağıdaki JSON formatında ver.
    - Asla İngilizce düşünce sürecini, taslağını veya markdown işaretlerini JSON'ın dışına veya içine ekleme.
    
    {
      "summary": "Türkçe özet metni buraya"
    }
    
    YORUMLAR:
    ${reviewsText}`;
  }

  try {
    const modelListRes = await axios.get(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`);
    const models = modelListRes.data.models.filter(m => m.supportedGenerationMethods && m.supportedGenerationMethods.includes('generateContent') && !m.name.includes('vision') && !m.name.includes('audio'));
    
    let aiSuccess = false;
    let finalSummary = "Yapay zeka özeti şu an oluşturulamadı.";
    
    for (const m of models) {
      try {
        const modelName = m.name.replace('models/', '');
        const model = genAI.getGenerativeModel({ model: modelName });
        const result = await model.generateContent({
           contents: [{ role: "user", parts: [{ text: aiPrompt }] }],
           generationConfig: { responseMimeType: "application/json" }
        });
        let summaryText = (await result.response).text().trim();
        
        try {
           const parsed = JSON.parse(summaryText);
           finalSummary = parsed.summary;
        } catch (e) {
           const jsonMatch = summaryText.match(/\{[\s\S]*\}/);
           if (jsonMatch) {
              const parsed = JSON.parse(jsonMatch[0]);
              finalSummary = parsed.summary;
           } else {
              finalSummary = summaryText; 
           }
        }
        aiSuccess = true;
        break;
      } catch (err) { continue; }
    }
    
    if (aiSuccess) setCache(cacheKey, finalSummary);
    res.json({ success: aiSuccess, summary: finalSummary });
  } catch (err) {
    res.json({ success: false, summary: "Yapay zeka sisteminde bağlantı hatası." });
  }
});

app.get('/api/status/:place_id', async (req, res) => {
  try {
    const placeStatuses = await getPlaceStatuses(req.params.place_id);
    res.json(placeStatuses);
  } catch(err) {
    console.error(err);
    res.status(500).json([]);
  }
});

app.post('/api/status', async (req, res) => {
  try {
    const newStatus = { id: Date.now(), ...req.body, timestamp: Date.now() };
    await addNewStatus(newStatus);
    res.json({ success: true, newStatus });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Status eklenemedi' });
  }
});

app.listen(PORT, () => {
  console.log(`Backend server running on http://localhost:${PORT}`);
});
