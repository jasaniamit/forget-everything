import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { v4 as uuidv4 } from 'uuid';
import fontkit from 'fontkit';
import opentype from 'opentype.js';
import AdmZip from 'adm-zip';
import { storageDriver } from './storage/drivers';
import { db } from './db';
import { fontFamilies, fontStyles, fontMetrics, fontGlyphFeatures, fontClassification, fonts } from '@shared/schema';
import { sql } from 'drizzle-orm';

const upload = multer({ dest: 'data/uploads/' });

function detectAStory(font: any): string {
  const glyph = font.glyphForCodePoint('a'.charCodeAt(0));
  if (!glyph || !glyph.path) return 'double';
  const commands = glyph.path.commands || [];
  let contours = 0;
  commands.forEach((cmd: any) => {
    if (cmd.type === 'M') contours++;
  });
  return contours > 1 ? 'double' : 'single';
}

function detectGStory(font: any): string {
  const glyph = font.glyphForCodePoint('g'.charCodeAt(0));
  if (!glyph || !glyph.path) return 'double';
  const commands = glyph.path.commands || [];
  let contours = 0;
  commands.forEach((cmd: any) => {
    if (cmd.type === 'M') contours++;
  });
  return contours > 2 ? 'double' : 'single';
}

function detectFigureStyle(font: any): string {
  const zero = font.glyphForCodePoint('0'.charCodeAt(0));
  const seven = font.glyphForCodePoint('7'.charCodeAt(0));
  if (!zero || !seven) return 'lining';
  const zeroBBox = zero.bbox;
  const sevenBBox = seven.bbox;
  return (sevenBBox.minY < zeroBBox.minY - 50) ? 'oldstyle' : 'lining';
}

function detectFigureWidth(font: any): string {
  const zero = font.glyphForCodePoint('0'.charCodeAt(0));
  const one = font.glyphForCodePoint('1'.charCodeAt(0));
  if (!zero || !one) return 'proportional';
  return Math.abs(zero.advanceWidth - one.advanceWidth) < 5 ? 'tabular' : 'proportional';
}

function detectCapsOnly(font: any): boolean {
  const a = font.glyphForCodePoint('a'.charCodeAt(0));
  const A = font.glyphForCodePoint('A'.charCodeAt(0));
  if (!a || !A) return false;
  return a.advanceWidth === A.advanceWidth && a.bbox.maxY === A.bbox.maxY;
}

function detectSmallCaps(font: any): boolean {
  return font.availableFeatures?.includes('smcp') || false;
}

function inferSerifType(metrics: any, font: any): string {
  const contrast = parseFloat(metrics.contrastRatio);
  const italic = parseInt(metrics.italicAngle) !== 0;
  const isMono = font.postscriptName?.toLowerCase().includes('mono') || font.familyName?.toLowerCase().includes('mono');

  if (isMono) return 'mono';
  if (detectCapsOnly(font)) return 'display';

  if (contrast > 0.8) return 'didone';
  if (contrast > 0.4) return 'transitional';
  if (contrast < 0.2) {
    if (font.postscriptName?.toLowerCase().includes('sans')) return 'geometricSans';
    return 'slab';
  }
  return 'oldstyle';
}

export function setupIngestionRoutes(app: any) {
  // requireAdmin middleware - same pattern as in routes.ts
  const requireAdmin = (req: any, res: any, next: any) => {
    const adminKey = process.env.ADMIN_API_KEY;
    if (!adminKey) {
      return res.status(500).json({ message: "ADMIN_API_KEY is not configured on the server" });
    }
    if (req.headers["x-admin-key"] !== adminKey) {
      return res.status(401).json({ message: "Unauthorized: invalid or missing x-admin-key header" });
    }
    next();
  };

  app.post('/api/fonts/upload', requireAdmin, upload.array('fonts'), async (req: any, res: any) => {
    try {
      const files = req.files as any[];
      const designerName = req.body.designerName;
      const license = req.body.license || 'Unknown';
      const donationLink = req.body.donationLink;
      const donationEnabled = donationLink ? 1 : 0;

      const processedFamilies = new Set<string>();

      for (const file of files) {
        const ext = path.extname(file.originalname).toLowerCase();
        let fontFiles: string[] = [];

        if (ext === '.zip') {
          const zip = new AdmZip(file.path);
          const zipDir = path.join('data/uploads', uuidv4());
          zip.extractAllTo(zipDir, true);

          const getFonts = (dir: string) => {
            const items = fs.readdirSync(dir);
            for (const item of items) {
              const fullPath = path.join(dir, item);
              if (fs.statSync(fullPath).isDirectory()) {
                getFonts(fullPath);
              } else if (['.ttf', '.otf', '.woff', '.woff2'].includes(path.extname(item).toLowerCase())) {
                fontFiles.push(fullPath);
              }
            }
          };
          getFonts(zipDir);
        } else if (['.ttf', '.otf', '.woff', '.woff2'].includes(ext)) {
          fontFiles.push(file.path);
        }

        for (const fontPath of fontFiles) {
          const fontBuffer = fs.readFileSync(fontPath);
          const font = fontkit.create(fontBuffer) as any;

          const familyName = font.familyName || font.postscriptName;
          const subfamily = font.subfamilyName || 'Regular';

          let familyId = uuidv4();
          const [existingFamily] = await db.select().from(fontFamilies).where(sql`family_name = ${familyName}`);
          if (existingFamily) {
            familyId = existingFamily.id;
          } else {
            await db.insert(fontFamilies).values({
              id: familyId,
              familyName,
              designerName,
              license,
              donationEnabled,
              donationLink,
            });
          }

          const savedPath = await storageDriver.saveFile(fontBuffer, familyName, subfamily, path.basename(fontPath));

          const styleId = uuidv4();
          await db.insert(fontStyles).values({
            id: styleId,
            familyId,
            subfamily,
            weightClass: font.weightClass || 400,
            widthClass: font.widthClass || 5,
            italic: font.italicAngle !== 0 ? 1 : 0,
            filePath: savedPath,
          });

          const metrics = {
            styleId,
            xHeightRatio: (font.xHeight / font.capHeight).toString(),
            capHeightRatio: (font.capHeight / font.unitsPerEm).toString(),
            widthRatio: (font.averageCharWidth / font.unitsPerEm).toString(),
            contrastRatio: "0.5",
            ascRatio: (font.ascent / font.unitsPerEm).toString(),
            descRatio: (font.descent / font.unitsPerEm).toString(),
            italicAngle: (font.italicAngle || 0).toString(),
          };
          await db.insert(fontMetrics).values(metrics);

          await db.insert(fontGlyphFeatures).values({
            styleId,
            aStory: detectAStory(font),
            gStory: detectGStory(font),
            figures: detectFigureStyle(font),
            figureWidth: detectFigureWidth(font),
            capsOnly: detectCapsOnly(font) ? 1 : 0,
            smallCaps: detectSmallCaps(font) ? 1 : 0,
          });

          const serifType = inferSerifType(metrics, font);
          await db.insert(fontClassification).values({
            styleId,
            serifType,
            usageTags: JSON.stringify(req.body.usageTags || []),
            moodTags: JSON.stringify(req.body.moodTags || []),
          });

          // Part 4 & 7: Map classification to Taxonomy
          const styleSlug = serifType.toLowerCase().replace(/ /g, '-');
          const [style] = await db.select().from(fontSubStyles).where(eq(fontSubStyles.slug, styleSlug)).limit(1);
          if (style) {
            await db.insert(fontStyleMap).values({ fontId: parseInt(styleId), styleId: style.id });
          }

          // Legacy sync
          await db.insert(fonts).values({
            name: `${familyName} ${subfamily}`,
            family: familyName,
            category: "Sans Serif",
            useCase: "designer",
            license: license,
            designer: designerName || "Unknown",
            fileUrl: `/${savedPath}`,
            weight: subfamily.includes("Bold") ? "Bold" : "Regular",
            width: "Normal",
            xHeight: "Medium",
            contrast: "Medium",
            italics: subfamily.includes("Italic") ? "Yes" : "No",
            caps: "Standard",
            figures: "Lining",
            story: "Double",
            familySize: 1
          }).onConflictDoNothing();

          processedFamilies.add(familyName);
        }
      }

      res.json({ message: 'Upload successful', families: Array.from(processedFamilies) });
    } catch (err) {
      console.error('Upload error:', err);
      res.status(500).json({ error: 'Failed to process fonts' });
    }
  });
}
