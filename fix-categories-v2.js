const { db } = require("./server/db");
const { fonts } = require("./shared/schema");
const { sql, eq } = require("drizzle-orm");

async function run() {
    console.log("Starting Category Migration V2...");

    // 1. Check current state
    const before = await db.select({ category: fonts.category, count: sql`count(*)` })
        .from(fonts)
        .groupBy(fonts.category);
    console.log("BEFORE:", JSON.stringify(before, null, 2));

    const mapping = {
        "Sans Serif": "sans-serif",
        "Serif": "serif",
        "Monospace": "monospace",
        "Handwriting": "handwriting",
        "Display": "display",
        "Decorative": "display",
        "Slab Serif": "serif",
        "Script": "handwriting"
    };

    let total = 0;
    for (const [oldCat, newCat] of Object.entries(mapping)) {
        console.log(`Updating '${oldCat}' -> '${newCat}'...`);
        const result = await db.update(fonts)
            .set({ category: newCat })
            .where(sql`LOWER(${fonts.category}) = LOWER(${oldCat})`)
            .returning({ id: fonts.id });
        console.log(`- Updated ${result.length} fonts.`);
        total += result.length;
    }

    // Also handle null or empty if needed, but let's stick to these for now.

    // 2. Check final state
    const after = await db.select({ category: fonts.category, count: sql`count(*)` })
        .from(fonts)
        .groupBy(fonts.category);
    console.log("AFTER:", JSON.stringify(after, null, 2));
    console.log(`Migration V2 complete. Total updated: ${total}`);
    process.exit(0);
}

run().catch(err => {
    console.error("Migration failed:", err);
    process.exit(1);
});
