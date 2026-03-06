import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, "../../.env") });

import { db } from "../db";
import { fonts } from "@shared/schema";
import { eq } from "drizzle-orm";
import axios from "axios";

async function backfillSubsets() {
    const API_KEY = process.env.GOOGLE_FONTS_API_KEY;
    if (!API_KEY) {
        console.error("GOOGLE_FONTS_API_KEY is not set.");
        return;
    }

    try {
        console.log("Fetching font list from Google...");
        const response = await axios.get(
            `https://www.googleapis.com/webfonts/v1/webfonts?key=${API_KEY}`
        );
        const googleFonts = response.data.items;
        console.log(`Found ${googleFonts.length} fonts. Starting backfill...`);

        let updated = 0;
        let ignored = 0;

        for (const gf of googleFonts) {
            const existing = await db
                .select({ id: fonts.id, subsets: fonts.subsets })
                .from(fonts)
                .where(eq(fonts.family, gf.family))
                .limit(1);

            if (existing.length > 0) {
                // If subsets is null or empty, update it
                if (!existing[0].subsets || existing[0].subsets === '[]' || existing[0].subsets === 'null') {
                    await db
                        .update(fonts)
                        .set({ subsets: JSON.stringify(gf.subsets || ["latin"]) })
                        .where(eq(fonts.id, existing[0].id));
                    updated++;
                } else {
                    ignored++;
                }
            }

            if ((updated + ignored) % 100 === 0) {
                console.log(`Progress: ${updated} updated, ${ignored} ignored...`);
            }
        }

        console.log(`Backfill complete. ${updated} fonts updated, ${ignored} already had subsets.`);
    } catch (error: any) {
        console.error("Error:", error.message);
    }
}

backfillSubsets().then(() => process.exit(0));
