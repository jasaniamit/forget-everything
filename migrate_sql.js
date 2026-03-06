const { db } = require("./server/db");
const { sql } = require("drizzle-orm");
const fs = require("fs");

async function run() {
    console.log("Starting bulk SQL migration...");
    try {
        const res = await db.execute(sql`
      UPDATE fonts 
      SET category = LOWER(REPLACE(category, ' ', '-'))
      WHERE category LIKE '% %' OR category != LOWER(category);
    `);
        const status = {
            success: true,
            timestamp: new Date().toISOString(),
            result: res
        };
        fs.writeFileSync("migration_status.json", JSON.stringify(status, null, 2));
        console.log("Migration successful!");
    } catch (err) {
        console.error("Migration failed:", err);
        fs.writeFileSync("migration_status.json", JSON.stringify({ success: false, error: err.message }, null, 2));
    }
    process.exit(0);
}

run();
