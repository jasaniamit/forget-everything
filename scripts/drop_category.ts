import { db } from "../server/db";
import { sql } from "drizzle-orm";

async function run() {
    try {
        console.log("Dropping category column...");
        await db.execute(sql`ALTER TABLE fonts DROP COLUMN category;`);
        console.log("Dropped category column successfully.");
    } catch (e) {
        console.error(e);
    }
    process.exit(0);
}

run();
