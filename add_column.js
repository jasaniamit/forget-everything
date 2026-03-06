
import postgres from 'postgres';
import 'dotenv/config';

if (!process.env.DATABASE_URL) {
    console.error("DATABASE_URL not found");
    process.exit(1);
}

const sql = postgres(process.env.DATABASE_URL, { ssl: 'require' });

async function run() {
    try {
        console.log("Adding 'subsets' column to 'fonts' table...");
        await sql`ALTER TABLE fonts ADD COLUMN IF NOT EXISTS subsets text;`;
        console.log("Success!");
    } catch (err) {
        console.error("Error:", err);
    } finally {
        await sql.end();
    }
}

run();
