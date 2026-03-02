const { GoogleGenAI } = require('@google/genai');
const fs = require('fs');

async function go() {
    const ai = new GoogleGenAI({});
    const models = await ai.models.list();

    let res = [];
    for await (const model of models) {
        if (model.name.includes("image") || model.name.includes("banana") || model.name.includes("flash") || model.name.includes("pro")) {
            res.push(model.name);
        }
    }

    console.log(JSON.stringify(res, null, 2));
}

go().catch(console.error);
