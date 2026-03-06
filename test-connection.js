const MICROSERVICE = "http://localhost:8001";
const APP = "http://localhost:5000";

async function test() {
  console.log("\n=== ukfont Connection Test ===\n");

  // Test 1: Microservice
  console.log("1. Microservice health...");
  try {
    const res = await fetch(`${MICROSERVICE}/health`);
    const data = await res.json();
    console.log(`   ✓ status=${data.status} fonts=${data.indexed_fonts}`);
  } catch(e) { console.log(`   ✗ ${e.message}`); }

  // Test 2: Simple POST test route
  console.log("\n2. Testing simple POST route (api/test-post)...");
  try {
    const res = await fetch(`${APP}/api/test-post`, { method: "POST" });
    const ct = res.headers.get("content-type") || "";
    if (ct.includes("json")) {
      const d = await res.json();
      console.log(`   ✓ POST works: ${JSON.stringify(d)}`);
    } else {
      console.log(`   ✗ Got HTML - Vite is intercepting ALL POST requests`);
      console.log(`   → This is a server config issue, not a route issue`);
    }
  } catch(e) { console.log(`   ✗ ${e.message}`); }

  // Test 3: Vision health (GET)
  console.log("\n3. Testing GET /api/vision/health...");
  try {
    const res = await fetch(`${APP}/api/vision/health`);
    const ct = res.headers.get("content-type") || "";
    if (ct.includes("json")) {
      const d = await res.json();
      console.log(`   ✓ Vision health: ${JSON.stringify(d)}`);
    } else {
      console.log(`   ✗ Got HTML`);
    }
  } catch(e) { console.log(`   ✗ ${e.message}`); }

  // Test 4: Identify font with real image
  console.log("\n4. Testing POST /api/identify-font...");
  try {
    const FormData = (await import("form-data")).default;
    const form = new FormData();
    // 1x1 white pixel PNG
    const pixel = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAAC0lEQVQI12NgAAIABQAABjE+ibYAAAAASUVORK5CYII=", "base64");
    form.append("image", pixel, { filename: "test.png", contentType: "image/png" });

    const res = await fetch(`${APP}/api/identify-font`, {
      method: "POST",
      body: form,
      headers: form.getHeaders(),
    });
    const ct = res.headers.get("content-type") || "";
    console.log(`   Status: ${res.status}, Content-Type: ${ct}`);
    if (ct.includes("json")) {
      const d = await res.json();
      console.log(`   ✓ JSON response: provider=${d.provider}`);
    } else {
      const t = await res.text();
      console.log(`   ✗ Got HTML - route not reached`);
      console.log(`   First 100 chars: ${t.slice(0,100)}`);
    }
  } catch(e) { console.log(`   ✗ ${e.message}\n   Stack: ${e.stack?.split('\n')[1]}`); }

  console.log("\n=== Done ===\n");
}
test();
