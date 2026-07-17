const { GoogleGenerativeAI } = require('@google/generative-ai');
const genAI = new GoogleGenerativeAI('AQ.Ab8RN6KqZLreAJ4abJwCU-WF8SHcmptMzM6BeRDWbBwvW_5IqA');

async function run(modelName) {
  try {
    console.log(`Testing model: ${modelName}...`);
    const model = genAI.getGenerativeModel({ model: modelName });
    const result = await model.generateContent("Merhaba, nasılsın?");
    const response = await result.response;
    console.log(`Success with ${modelName}:`, response.text());
  } catch (err) {
    console.error(`Error with ${modelName}:`, err.message);
  }
}

async function testAll() {
  await run('gemini-1.5-flash');
  await run('gemini-1.5-flash-latest');
  await run('gemini-pro');
  await run('gemini-1.0-pro');
}

testAll();
