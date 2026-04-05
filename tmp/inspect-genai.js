const { GoogleGenAI } = require('@google/genai');
const ai = new GoogleGenAI({ apiKey: 'dummy' });
console.log('ai keys:', Object.keys(ai));
if (ai.files) console.log('ai.files keys:', Object.keys(ai.files));
if (ai.apiClient) console.log('ai.apiClient keys:', Object.keys(ai.apiClient));
