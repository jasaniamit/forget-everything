import axios from 'axios';
import FormData from 'form-data';
import fs from 'fs';

const MICROSERVICE_URL = "http://localhost:8001";
const testImagePath = "C:\\Users\\KosmosArtFactory\\.gemini\\antigravity\\brain\\66c0acff-cf2a-410d-aef9-5a4468b4d3f3\\test_font_image_1772636420792.png";

async function testAnalyze() {
    console.log("1. Testing health...");
    try {
        const health = await axios.get(`${MICROSERVICE_URL}/health`, { timeout: 5000 });
        console.log("   OK:", health.data.message);
    } catch (err: any) {
        console.error("   FAIL:", err.message);
        return;
    }

    console.log("2. Reading image...");
    const imageBuffer = fs.readFileSync(testImagePath);
    console.log(`   ${imageBuffer.length} bytes`);

    console.log("3. POST /analyze...");
    const form = new FormData();
    form.append("image", imageBuffer, {
        filename: "test.png",
        contentType: "image/png",
        knownLength: imageBuffer.length,
    });

    try {
        const start = Date.now();
        const resp = await axios.post(`${MICROSERVICE_URL}/analyze`, form, {
            headers: { ...form.getHeaders() },
            timeout: 120000,
            maxContentLength: Infinity,
            maxBodyLength: Infinity,
        });
        console.log(`   OK in ${Date.now() - start}ms`);
        console.log(`   Text: "${resp.data?.detected_text}"`);
        console.log(`   Matches: ${resp.data?.matches?.length}`);
        if (resp.data?.matches?.[0]) {
            console.log(`   Top: ${resp.data.matches[0].font_name} (${resp.data.matches[0].match_pct}%)`);
        }
    } catch (err: any) {
        console.error("   FAIL:", err.message);
        if (err.response) {
            console.error("   Status:", err.response.status);
            console.error("   Body:", JSON.stringify(err.response.data).slice(0, 500));
        }
        if (err.code) console.error("   Code:", err.code);
    }
}

testAnalyze();
