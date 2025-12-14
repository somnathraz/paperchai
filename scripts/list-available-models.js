const https = require('https');

const apiKey = process.env.GOOGLE_API_KEY;

if (!apiKey) {
    console.error("Error: GOOGLE_API_KEY is not set in environment variables.");
    process.exit(1);
}

const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`;

https.get(url, (res) => {
    let data = '';

    res.on('data', (chunk) => {
        data += chunk;
    });

    res.on('end', () => {
        try {
            const response = JSON.parse(data);
            if (response.error) {
                console.error("API Error:", response.error.message);
                return;
            }

            console.log("\nBased on your API Key, the following models are available:\n");

            const models = response.models || [];
            const generateModels = models
                .filter(m => m.supportedGenerationMethods && m.supportedGenerationMethods.includes("generateContent"))
                .filter(m => m.name.toLowerCase().includes("gemini")) // Focus on Gemini
                .sort((a, b) => b.name.localeCompare(a.name)); // Newest first typically

            generateModels.forEach(model => {
                const name = model.name.replace("models/", "");
                const version = model.version || "unknown";
                const desc = model.description ? model.description.substring(0, 100) : "No description";
                console.log(`- ${name}`);
                console.log(`  Ver: ${version}`);
                console.log(`  Desc: ${desc}`);
                console.log("");
            });

        } catch (e) {
            console.error("Failed to parse response:", e.message);
        }
    });

}).on('error', (e) => {
    console.error("Request error:", e.message);
});
