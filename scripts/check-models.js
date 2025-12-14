const { GoogleGenerativeAI } = require("@google/generative-ai");
require('dotenv').config();

async function listModels() {
    const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY);
    try {
        const list = await genAI.getGenerativeModel({ model: "gemini-1.5-flash" }).apiKey; // Just accessing to get client context if needed, but actually listModels is on the manager.
        // Actually, newer SDK might behave differently. Let's try to find the listModels method.
        // Checking documentation style usage:
        // const genAI = new GoogleGenerativeAI(API_KEY);
        // const model = genAI.getGenerativeModel({ model: "MODEL_NAME" });

        // There isn't a direct listModels on the main class in some versions, but let's try assuming it's usable if we can find it.
        // Actually, it's often a separate call or not easily available in the high-level SDK.
        // Let's try a simple fetch if SDK doesn't expose it easily, OR use the model check.

        // Wait, let's try to just run a simple generation with "gemini-pro" which is usually standard, to see if it works.
        // If that works, it's a model name issue. 

        console.log("Checking API Key: ", process.env.GOOGLE_API_KEY ? "Present" : "Missing");

        // It seems there isn't a straightforward listModels in the node SDK without deeper dive.
        // Let's try to just use 'gemini-pro' as a fallback test.

    } catch (error) {
        console.error("Error:", error);
    }
}

// Better approach: straightforward fetch to the API endpoint for listing models.
async function fetchModels() {
    if (!process.env.GOOGLE_API_KEY) {
        console.error("No GOOGLE_API_KEY found");
        return;
    }
    const key = process.env.GOOGLE_API_KEY;
    const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${key}`;
    try {
        const response = await fetch(url);
        const data = await response.json();
        if (data.models) {
            console.log("Available Models:");
            data.models.forEach(m => {
                if (m.supportedGenerationMethods && m.supportedGenerationMethods.includes("generateContent")) {
                    console.log(`- ${m.name} (${m.displayName})`);
                }
            });
        } else {
            console.log("No models found or error:", data);
        }
    } catch (e) {
        console.error("Fetch error:", e);
    }
}

fetchModels();
