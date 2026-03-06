import { pgTable, text, serial, integer, timestamp, varchar } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const fontFamilies = pgTable("font_families", {
  id: text("id").primaryKey(), // uuid
  familyName: text("family_name").notNull(),
  designerName: text("designer_name"),
  license: text("license").notNull(),
  donationEnabled: integer("donation_enabled").default(0), // 0 or 1
  donationLink: text("donation_link"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const fontStyles = pgTable("font_styles", {
  id: text("id").primaryKey(), // uuid
  familyId: text("family_id").notNull(),
  subfamily: text("subfamily").notNull(), // Regular, Bold, etc
  weightClass: integer("weight_class").notNull(),
  widthClass: integer("width_class").notNull(),
  italic: integer("italic").default(0),
  filePath: text("file_path").notNull(),
  previewPath: text("preview_path"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const fontMetrics = pgTable("font_metrics", {
  styleId: text("style_id").primaryKey(),
  xHeightRatio: text("x_height_ratio"), // Store as string/float
  capHeightRatio: text("cap_height_ratio"),
  widthRatio: text("width_ratio"),
  contrastRatio: text("contrast_ratio"),
  ascRatio: text("asc_ratio"),
  descRatio: text("desc_ratio"),
  italicAngle: text("italic_angle"),
});

export const fontGlyphFeatures = pgTable("font_glyph_features", {
  styleId: text("style_id").primaryKey(),
  aStory: text("a_story"), // single, double
  gStory: text("g_story"), // single, double
  figures: text("figures"), // lining, oldstyle
  figureWidth: text("figure_width"), // tabular, proportional
  capsOnly: integer("caps_only").default(0),
  smallCaps: integer("small_caps").default(0),
  variableAxes: text("variable_axes"), // JSON string
});

export const fontClassification = pgTable("font_classification", {
  styleId: text("style_id").primaryKey(),
  serifType: text("serif_type"),
  usageTags: text("usage_tags"), // JSON string array
  moodTags: text("mood_tags"), // JSON string array
});

export const fontCategories = pgTable("font_categories", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
});

export const fontSubStyles = pgTable("font_sub_styles", {
  id: serial("id").primaryKey(),
  categoryId: integer("category_id").references(() => fontCategories.id),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
});

export const fontCharacteristics = pgTable("font_characteristics", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
});

export const fontStyleMap = pgTable("font_style_map", {
  fontId: integer("font_id").notNull(),
  styleId: integer("style_id").notNull(),
});

export const fontCharacteristicMap = pgTable("font_characteristic_map", {
  fontId: integer("font_id").notNull(),
  characteristicId: integer("characteristic_id").notNull(),
});

export const fonts = pgTable("fonts", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  family: text("family").notNull(), // CSS font-family name for preview
  useCase: text("use_case").notNull(), // tech, business, food, designer, developer
  license: text("license").notNull(),
  designer: text("designer").notNull(),
  fileUrl: text("file_url").notNull(), // URL to download the font file
  description: text("description"),
  downloadCount: integer("download_count").default(0),
  weight: text("weight"), // Thin, Extra Light, Light, Regular, Medium, Semibold, Bold, Black
  width: text("width"), // Ultra Condensed, Condensed, Normal, Expanded, Ultra Expanded
  xHeight: text("x_height"), // Low, Medium, High
  contrast: text("contrast"), // Low, Medium, High
  italics: text("italics"), // Yes, No
  caps: text("caps"), // Standard, Caps Only
  figures: text("figures"), // Lining, Oldstyle
  story: text("story"), // Single, Double
  serifType: text("serif_type"), // Slab, Transitional, Modern
  aStory: text("a_story"), // Single, Double
  gStory: text("g_story"), // Single, Double
  familySize: integer("family_size"),
  subsets: text("subsets"), // JSON string array of languages (latin, greek, etc)
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertFontSchema = createInsertSchema(fonts).omit({
  id: true,
  createdAt: true,
  downloadCount: true
});

export type Font = typeof fonts.$inferSelect & { category: string };
export type InsertFont = z.infer<typeof insertFontSchema>;
