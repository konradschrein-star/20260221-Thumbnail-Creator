const { GoogleGenAI } = require('@google/genai');

async function listModels() {
    const apiKey = process.env.GOOGLE_API_KEY;
    if (!apiKey) {
        console.error('GOOGLE_API_KEY not found');
        return;
    }
    const genAI = new GoogleGenAI({ apiKey });
    try {
        // We can't easily list models with this specific SDK in a one-liner without more code,
        // so let's just use fetch to the endpoint.
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`);
        const data = await response.json();
        if (data.models) {
            data.models.forEach(m => console.log(m.name));
        } else {
            console.log(JSON.stringify(data, null, 2));
        }
    } catch (e) {
        console.error(e);
    }
}

listModels();
