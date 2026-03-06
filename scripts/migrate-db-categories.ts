import { db } from "./server/db";
import { fonts, fontSubStyles, fontStyleMap } from "./shared/schema";
import { eq } from "drizzle-orm";

async function run() {
    console.log("Starting category data migration to fontStyleMap...");
    const allFonts = await db.select({ id: fonts.id, category: fonts.category }).from(fonts);

    const CATEGORY_STYLE_SLUG: Record<string, string> = {
        "sans-serif": "sans-serif",
        "serif": "serif",
        "display": "decorative",
        "handwriting": "handwriting",
        "monospace": "monospace",
        "decorative": "decorative",
        "slab serif": "serif",
        "script": "handwriting"
    };

    let insertedCount = 0;

    for (const font of allFonts) {
        if (!font.category) continue;
        const normalized = font.category.toLowerCase().trim();
        const styleSlug = CATEGORY_STYLE_SLUG[normalized] || "sans-serif";

        const [style] = await db.select().from(fontSubStyles).where(eq(fontSubStyles.slug, styleSlug)).limit(1);

        if (style) {
            // Upsert into fontStyleMap
            try {
                await db.insert(fontStyleMap)
                    .values({ fontId: font.id, styleId: style.id })
                    .onConflictDoNothing();
                insertedCount++;
            } catch (e) {
                // ignore
            }
        }
    }

    console.log(`Migration complete. Inserted ${insertedCount} mappings into fontStyleMap.`);
    process.exit(0);
}

run().catch(console.error);
