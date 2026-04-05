const { GoogleGenerativeAI } = require('@google/generative-ai');
const fs = require('fs');
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const models = ["gemini-1.5-flash", "gemini-1.5-pro", "gemini-1.5-pro-latest", "gemini-2.0-flash"];
async function run() {
  let log = "";
  for (const name of models) {
    try {
      const model = genAI.getGenerativeModel({ model: name });
      const result = await model.generateContent("hello");
      log += `${name} SUCCESS\n`;
    } catch(e) { 
      log += `${name} FAILED: ${e.message}\n`; 
    }
  }
  fs.writeFileSync('c:\\Users\\EMMA\\Desktop\\Company\\studyforge\\tmp\\models-log.txt', log);
}
run();
