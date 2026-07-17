const axios = require('axios');

async function testWeather(lat, lon) {
  try {
    const res = await axios.get(`https://api.open-meteo.com/v1/forecast`, {
      params: {
        latitude: lat,
        longitude: lon,
        current_weather: true
      }
    });
    console.log("Weather:", res.data.current_weather);
  } catch (err) {
    console.error(err.message);
  }
}

// Mersin coordinates
testWeather(36.8, 34.6);
