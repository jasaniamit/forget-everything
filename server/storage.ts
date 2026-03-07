import { db } from "./db";
import { fonts, type Font, type InsertFont, fontSubStyles, fontStyleMap, fontCharacteristics, fontCharacteristicMap, fontCategories } from "@shared/schema";
import { eq, like, or, desc, sql, and, inArray, getTableColumns, notIlike } from "drizzle-orm";

export interface IStorage {
  getFonts(filters?: any): Promise<{ fonts: Font[]; total: number; page: number; limit: number }>;
  getFont(id: number): Promise<Font | undefined>;
  createFont(font: InsertFont): Promise<Font>;
  updateFont(id: number, data: Partial<InsertFont>): Promise<Font | undefined>;
  incrementDownloadCount(id: number): Promise<Font | undefined>;
  bulkCreateFonts(fonts: InsertFont[]): Promise<void>;
}

export class DatabaseStorage implements IStorage {
  async bulkCreateFonts(insertFonts: InsertFont[]): Promise<void> {
    if (insertFonts.length === 0) return;
    const chunkSize = 100;
    for (let i = 0; i < insertFonts.length; i += chunkSize) {
      const chunk = insertFonts.slice(i, i + chunkSize);
      await db.insert(fonts).values(chunk).onConflictDoNothing();
    }
  }

  async getFonts(filters: any = {}): Promise<{ fonts: Font[]; total: number; page: number; limit: number }> {
    const { search, category, useCase, weight, width, xHeight, contrast, italics, caps, figures, story, minFamilySize, maxFamilySize, style, characteristic, serifType, aStory, gStory, subset, seed } = filters;
    const page = Math.max(1, parseInt(filters.page?.toString() || "1", 10));
    const limit = Math.min(100, Math.max(1, parseInt(filters.limit?.toString() || "30", 10)));
    const offset = (page - 1) * limit;

    let conditions = [];

    // ── Exclude icon/symbol/emoji fonts from default browsing ──────────────
    // These render as symbols/boxes not text — exclude unless user explicitly searches.
    const isIconSearch = search && /icon|symbol|emoji|material.*symbol|material.*icon|font.*awesome/i.test(search);
    const isIconCategory = category && /icon|symbol|emoji/i.test(String(category));
    let iconExcluded = false;

    if (!isIconSearch && !isIconCategory) {
      iconExcluded = true;
      // Use Drizzle notIlike for each pattern — combined with and()
      const ICON_PATTERNS = [
        "%Material Icon%",
        "%Material Symbol%",
        "%Noto Emoji%",
        "%Noto Color Emoji%",
        "%Font Awesome%",
        "%Segoe UI Emoji%",
        "%OpenMoji%",
        "%Twemoji%",
      ];
      conditions.push(and(...ICON_PATTERNS.map(p => notIlike(fonts.name, p)))!);
    }

    if (search) {
      const searchLower = `%${search.toLowerCase()}%`;
      conditions.push(or(like(sql`lower(${fonts.name})`, searchLower), like(sql`lower(${fonts.family})`, searchLower)));
    }

    if (category && category !== 'All') {
      const catSlugs = Array.isArray(category) ? category : [category];
      const validSlugs = catSlugs.filter(s => s && s !== 'All');
      if (validSlugs.length > 0) {
        const fontIdsQuery = db.select({ fontId: fontStyleMap.fontId })
          .from(fontStyleMap)
          .innerJoin(fontSubStyles, eq(fontStyleMap.styleId, fontSubStyles.id))
          .innerJoin(fontCategories, eq(fontSubStyles.categoryId, fontCategories.id))
          .where(sql`lower(font_categories.slug) IN (${validSlugs.map(s => s.toLowerCase()).join(',')}) OR lower(font_sub_styles.slug) IN (${validSlugs.map(s => s.toLowerCase()).join(',')})`);

        conditions.push(inArray(fonts.id, fontIdsQuery));
      }
    }
    if (useCase && useCase !== 'All') conditions.push(sql`${fonts.useCase} LIKE ${'%"' + useCase + '"%'}`);
    if (weight) {
      // weight filter uses buckets: "Light" | "Regular" | "Bold"
      // DB stores actual variant names: ["Thin","Light","Regular","Bold","Black"] etc.
      // Map each bucket to the variant names it covers
      const BUCKET_VARIANTS: Record<string, string[]> = {
        "Light":   ["Thin", "Extra Light", "ExtraLight", "Light"],
        "Regular": ["Regular", "Medium"],
        "Bold":    ["Semibold", "SemiBold", "Bold", "Extra Bold", "ExtraBold", "Black"],
      };
      let buckets: string[] = [];
      try { buckets = JSON.parse(weight); } catch { buckets = [weight]; }
      if (!Array.isArray(buckets)) buckets = [buckets];
      // Expand buckets to all matching variant names
      const variants = buckets.flatMap(b => BUCKET_VARIANTS[b] ?? [b]);
      if (variants.length > 0) {
        const wConds = variants.map((v: string) => sql`${fonts.weight} LIKE ${'%"' + v + '"%'}`);
        conditions.push(or(...wConds)!);
      }
    }
    if (width) conditions.push(eq(fonts.width, width));
    if (xHeight) conditions.push(eq(fonts.xHeight, xHeight));
    if (contrast) conditions.push(eq(fonts.contrast, contrast));
    if (italics) conditions.push(eq(fonts.italics, italics));
    if (caps) conditions.push(eq(fonts.caps, caps));
    if (figures) conditions.push(eq(fonts.figures, figures));
    if (story) conditions.push(eq(fonts.story, story));
    if (subset && subset !== 'All') conditions.push(sql`${fonts.subsets} LIKE ${'%"' + subset + '"%'}`);

    if (minFamilySize !== undefined && minFamilySize !== "") {
      const min = parseInt(minFamilySize.toString());
      if (!isNaN(min)) conditions.push(sql`${fonts.familySize} >= ${min}`);
    }
    if (maxFamilySize !== undefined && maxFamilySize !== "") {
      const max = parseInt(maxFamilySize.toString());
      if (!isNaN(max)) conditions.push(sql`${fonts.familySize} <= ${max}`);
    }

    if (style) {
      const styleSlugs = Array.isArray(style) ? style : [style];
      const validSlugs = styleSlugs.filter(s => s && s !== 'All');
      if (validSlugs.length > 0) {
        const fontIdsQuery = db.select({ fontId: fontStyleMap.fontId })
          .from(fontStyleMap)
          .innerJoin(fontSubStyles, eq(fontStyleMap.styleId, fontSubStyles.id))
          .where(inArray(fontSubStyles.slug, validSlugs));

        conditions.push(inArray(fonts.id, fontIdsQuery));
      }
    }

    if (characteristic) {
      const charSlugs = Array.isArray(characteristic) ? characteristic : [characteristic];
      const validSlugs = charSlugs.filter(c => c && c !== 'All');
      if (validSlugs.length > 0) {
        const fontIdsQuery = db.select({ fontId: fontCharacteristicMap.fontId })
          .from(fontCharacteristicMap)
          .innerJoin(fontCharacteristics, eq(fontCharacteristicMap.characteristicId, fontCharacteristics.id))
          .where(inArray(fontCharacteristics.slug, validSlugs));
        conditions.push(inArray(fonts.id, fontIdsQuery));
      }
    }

    if (serifType) conditions.push(eq(fonts.serifType, serifType));
    if (aStory) conditions.push(eq(fonts.aStory, aStory));
    if (gStory) conditions.push(eq(fonts.gStory, gStory));

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    // Count query
    const [countResult] = await db
      .select({ count: sql<number>`cast(count(*) as integer)` })
      .from(fonts)
      .where(whereClause);
    const total = countResult?.count ?? 0;

    // Data query with pagination
    const baseQuery = db.select({
      ...getTableColumns(fonts),
      category: sql<string>`(
        SELECT fs.name 
        FROM font_style_map fsm 
        JOIN font_sub_styles fs ON fs.id = fsm.style_id 
        WHERE fsm.font_id = fonts.id 
        LIMIT 1
      )`.as('category')
    }).from(fonts);

    let query = baseQuery;
    if (whereClause) query = query.where(whereClause) as any;
    // ── Rotation: seed-based ordering so the feed refreshes over time ────────
    // seed changes every 30 min → different fonts float to top each half-hour
    // When seed=0 (default), use download count. When seed is set, mix in randomness.
    // Count user-applied filters (not counting the automatic icon exclusion)
    const userFilterCount = conditions.length - (iconExcluded ? 1 : 0);
    const isDefaultBrowse = !search && !category && userFilterCount === 0;

    let fontResults;
    if (seed && isDefaultBrowse) {
      // Default browse: weighted random rotation — popular fonts still surface but shuffled
      // COALESCE handles NULL downloadCount for fonts ingested via Python (bypasses Drizzle default)
      // Use seed % 9973 (prime) to keep multiplication within PostgreSQL integer range (max ~2.1B)
      const safeSeed = seed % 9973;
      fontResults = await query
        .orderBy(sql`(COALESCE(${fonts.downloadCount}, 0) * 0.4 + (${safeSeed} * ${fonts.id} % 1000) * 0.6) DESC`)
        .limit(limit).offset(offset);
    } else {
      // Search/filter active: stable sort by download count, NULL treated as 0
      fontResults = await query
        .orderBy(sql`COALESCE(${fonts.downloadCount}, 0) DESC, ${fonts.id} ASC`)
        .limit(limit).offset(offset);
    }

    return { fonts: fontResults, total, page, limit };
  }

  async getFont(id: number): Promise<Font | undefined> {
    const [font] = await db.select({
      ...getTableColumns(fonts),
      category: sql<string>`(
        SELECT fs.name 
        FROM font_style_map fsm 
        JOIN font_sub_styles fs ON fs.id = fsm.style_id 
        WHERE fsm.font_id = fonts.id 
        LIMIT 1
      )`.as('category')
    }).from(fonts).where(eq(fonts.id, id));
    return font;
  }

  async createFont(insertFont: InsertFont): Promise<Font> {
    const [font] = await db.insert(fonts).values(insertFont).returning();
    return font as Font;
  }

  async updateFont(id: number, data: Partial<InsertFont>): Promise<Font | undefined> {
    const [font] = await db.update(fonts).set(data).where(eq(fonts.id, id)).returning();
    return font as Font;
  }

  async incrementDownloadCount(id: number): Promise<Font | undefined> {
    const [font] = await db.update(fonts).set({ downloadCount: sql`${fonts.downloadCount} + 1` }).where(eq(fonts.id, id)).returning();
    return font as Font;
  }
}

export const storage = new DatabaseStorage();
