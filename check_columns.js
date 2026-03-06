
import pg from 'pg';
import 'dotenv/config';

const client = new pg.Client({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});


async function run() {
    console.log("Starting script...");
    console.log("DATABASE_URL present:", !!process.env.DATABASE_URL);
    if (process.env.DATABASE_URL) {
        console.log("DATABASE_URL (masked):", process.env.DATABASE_URL.substring(0, 20) + "...");
    }
    try {
        console.log("Connecting to database...");
        await client.connect();
        console.log("Connected! Querying columns...");
        const res = await client.query(`
            SELECT column_name, data_type 
            FROM information_schema.columns 
            WHERE table_name = 'fonts';
        `);
        console.log("Columns in 'fonts' table:", res.rows.length);
        res.rows.forEach(row => console.log(`- ${row.column_name}: ${row.data_type}`));
    } catch (err) {
        console.error("Error details:", err);
    } finally {
        await client.end();
    }
}


run();
