
import pg from 'pg';
import 'dotenv/config';

const client = new pg.Client({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

async function run() {
    try {
        await client.connect();

        // Check total counts
        const countFonts = await client.query("SELECT COUNT(*) FROM fonts");
        const countVectors = await client.query("SELECT COUNT(*) FROM font_vectors");

        console.log(`Total fonts in 'fonts' table: ${countFonts.rows[0].count}`);
        console.log(`Total fonts in 'font_vectors' table: ${countVectors.rows[0].count}`);

        // Check for orphaned vectors or missing vectors
        const missingVectors = await client.query(`
            SELECT f.id, f.name 
            FROM fonts f 
            LEFT JOIN font_vectors fv ON f.id = fv.font_id 
            WHERE fv.font_id IS NULL 
            LIMIT 10
        `);

        if (missingVectors.rows.length > 0) {
            console.log("Fonts missing vectors (sample):");
            missingVectors.rows.forEach(r => console.log(`- ID: ${r.id}, Name: ${r.name}`));
        } else {
            console.log("All fonts have vectors.");
        }

        const orphanedVectors = await client.query(`
            SELECT fv.font_id, fv.font_name 
            FROM font_vectors fv 
            LEFT JOIN fonts f ON fv.font_id = f.id 
            WHERE f.id IS NULL 
            LIMIT 10
        `);

        if (orphanedVectors.rows.length > 0) {
            console.log("Orphaned vectors (vectors without matching font in 'fonts' table):");
            orphanedVectors.rows.forEach(r => console.log(`- ID: ${r.font_id}, Name: ${r.font_name}`));
        } else {
            console.log("No orphaned vectors found.");
        }

    } catch (err) {
        console.error("Error:", err);
    } finally {
        await client.end();
    }
}

run();
