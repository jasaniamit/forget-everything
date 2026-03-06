import { type Express } from "express";
import { storage } from "../storage";

export function registerProxyRoutes(app: Express) {
    // Font file proxy — serves the binary font file through our own domain,
    // avoiding cross-origin / mixed-content restrictions from fonts.gstatic.com
    app.get("/api/fonts/:id/file", async (req, res) => {
        try {
            let idStr = req.params.id;
            // The id might sometimes come with an extension like .ttf, so clean it
            if (idStr.includes('.')) {
                idStr = idStr.split('.')[0];
            }

            const id = Number(idStr);
            if (isNaN(id)) {
                return res.status(400).json({ message: "Invalid font ID" });
            }

            const font = await storage.getFont(id);
            if (!font || !font.fileUrl) {
                return res.status(404).json({ message: "Font file not found" });
            }

            const upstream = await fetch(font.fileUrl);
            if (!upstream.ok) {
                return res.status(502).json({ message: "Could not fetch font from source" });
            }

            const contentType = upstream.headers.get("content-type") || "font/truetype";
            res.set("Content-Type", contentType);
            res.set("Cache-Control", "public, max-age=86400"); // Cache 24h
            res.set("Access-Control-Allow-Origin", "*");

            const buffer = await upstream.arrayBuffer();
            res.send(Buffer.from(buffer));
        } catch (err) {
            console.error("Font proxy error:", err);
            res.status(500).json({ message: "Internal server error during font proxy" });
        }
    });
}
