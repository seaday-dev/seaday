const { GoogleGenerativeAI } = require('@google/generative-ai');
const axios = require('axios');

async function listModels() {
  try {
    const response = await axios.get(`https://generativelanguage.googleapis.com/v1beta/models?key=AQ.Ab8RN6KqZLreAJ4abJwCU-WF8SHcmptMzM6BeRDWbBwvW_5IqA`);
    console.log("Models available for this key:", response.data);
  } catch (err) {
    console.error("Error listing models:", err.response ? err.response.data : err.message);
  }
}

listModels();
