
import pg from 'pg';
import 'dotenv/config';

if (!process.env.DATABASE_URL) {
    console.error("DATABASE_URL not found");
    process.exit(1);
}

const client = new pg.Client({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

async function run() {
    try {
        await client.connect();
        console.log("Adding 'subsets' column to 'fonts' table...");
        await client.query("ALTER TABLE fonts ADD COLUMN IF NOT EXISTS subsets text;");
        console.log("Success!");
    } catch (err) {
        console.error("Error:", err);
    } finally {
        await client.end();
    }
}

run();
