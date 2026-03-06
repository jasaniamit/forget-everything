import type { Express } from "express";
import { type Server } from "http";
import { setupIngestionRoutes } from "./ingestion";
import { autoIngestIfNeeded } from "./google-fonts-ingestion";
import { db } from "./db";
import { fontCategories, fontSubStyles, fonts, fontStyleMap } from "@shared/schema";
import { eq } from "drizzle-orm";

import { registerPublicRoutes } from "./routes/public";
import { registerAdminRoutes } from "./routes/admin";
import { registerProxyRoutes } from "./routes/proxy";
import { registerFontFromImageRoutes } from "./routes/font-from-image";

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {

  setupIngestionRoutes(app);

  // DEBUG TEST ROUTE - remove after fixing
  app.post('/api/test-post', (req, res) => {
    res.json({ ok: true, message: 'POST route works' });
  });


  await seedDatabase();

  registerPublicRoutes(app);
  registerFontFromImageRoutes(app);
  registerAdminRoutes(app);
  registerProxyRoutes(app);

  // Auto-ingest Google Fonts in background if DB is sparse
  await autoIngestIfNeeded(1500);

  return httpServer;
}

async function seedDatabase() {
  // Seed Basic Styles in fontCategories
  const basicCategoryResults = await db.select().from(fontCategories).where(eq(fontCategories.slug, 'basic')).limit(1);
  const basicCategory = basicCategoryResults[0];
  let categoryId;
  if (!basicCategory) {
    const [inserted] = await db.insert(fontCategories).values({ name: 'Basic Styles', slug: 'basic' }).returning();
    categoryId = inserted.id;
  } else {
    categoryId = basicCategory.id;
  }

  const basicStyles = [
    { name: 'Sans Serif', slug: 'sans-serif' },
    { name: 'Serif', slug: 'serif' },
    { name: 'Slab Serif', slug: 'slab-serif' },
    { name: 'Script', slug: 'script' },
    { name: 'Decorative', slug: 'decorative' },
    { name: 'Handwriting', slug: 'handwriting' },
    { name: 'Monospace', slug: 'monospace' },
  ];

  for (const style of basicStyles) {
    const exists = await db.select().from(fontSubStyles).where(eq(fontSubStyles.slug, style.slug)).limit(1);
    if (exists.length === 0) {
      await db.insert(fontSubStyles).values({ ...style, categoryId });
    }
  }

  // Seed some Trendy Categories
  const trendyCategory = await db.select().from(fontCategories).where(eq(fontCategories.slug, 'trendy')).limit(1);
  if (trendyCategory.length === 0) {
    const [inserted] = await db.insert(fontCategories).values({ name: 'Trendy Styles', slug: 'trendy' }).returning();
    const trendyStyles = [
      { name: 'Fun', slug: 'fun' },
      { name: 'Extreme', slug: 'extreme' },
      { name: 'Calligraphy', slug: 'calligraphy' }
    ];
    for (const style of trendyStyles) {
      await db.insert(fontSubStyles).values({ ...style, categoryId: inserted.id });
    }
  }

  const existingFontsCount = (await db.select().from(fonts)).length;
  if (existingFontsCount < 10) {
    const commonFonts = [
      {
        name: "Roboto", family: "Roboto", category: "sans-serif", useCase: JSON.stringify(["tech", "business"]), designer: "Christian Robertson",
        weight: JSON.stringify(["Thin", "Light", "Regular", "Medium", "Bold", "Black"]), width: "Normal", xHeight: "Medium", contrast: "Low", italics: "Yes", caps: "Standard", figures: "Lining", story: "Double", familySize: 12, aStory: "Double", gStory: "Single"
      },
      {
        name: "Open Sans", family: "Open Sans", category: "sans-serif", useCase: JSON.stringify(["business", "web"]), designer: "Steve Matteson",
        weight: JSON.stringify(["Light", "Regular", "Semibold", "Bold", "Extra Bold"]), width: "Normal", xHeight: "High", contrast: "Low", italics: "Yes", caps: "Standard", figures: "Lining", story: "Double", familySize: 10, aStory: "Double", gStory: "Single"
      },
      {
        name: "Merriweather", family: "Merriweather", category: "serif", useCase: JSON.stringify(["editorial", "print"]), designer: "Sorkin Type",
        weight: JSON.stringify(["Light", "Regular", "Bold", "Black"]), width: "Normal", xHeight: "Medium", contrast: "High", italics: "Yes", caps: "Standard", figures: "Lining", story: "Single", familySize: 8, serifType: "Transitional", aStory: "Single", gStory: "Double"
      },
      {
        name: "Playfair Display", family: "Playfair Display", category: "serif", useCase: JSON.stringify(["designer", "fashion", "editorial"]), designer: "Claus Eggers Sørensen",
        weight: JSON.stringify(["Regular", "Medium", "Semibold", "Bold", "Extra Bold", "Black"]), width: "Normal", xHeight: "Low", contrast: "High", italics: "Yes", caps: "Standard", figures: "Oldstyle", story: "Single", familySize: 6, serifType: "Modern", aStory: "Double", gStory: "Double"
      },
      {
        name: "Fira Code", family: "Fira Code", category: "monospace", useCase: JSON.stringify(["developer", "tech"]), designer: "Nikita Prokopov",
        weight: JSON.stringify(["Light", "Regular", "Medium", "Semibold", "Bold"]), width: "Normal", xHeight: "High", contrast: "Low", italics: "No", caps: "Standard", figures: "Lining", story: "Single", familySize: 5, aStory: "Single", gStory: "Single"
      },
      {
        name: "Architects Daughter", family: "Architects Daughter", category: "handwriting", useCase: JSON.stringify(["designer", "creative"]), designer: "Kimberly Geswein",
        weight: JSON.stringify(["Regular"]), width: "Normal", xHeight: "Medium", contrast: "Low", italics: "No", caps: "Standard", figures: "Lining", story: "Single", familySize: 1, aStory: "Single", gStory: "Single"
      },
      {
        name: "Inter", family: "Inter", category: "sans-serif", useCase: JSON.stringify(["tech", "developer", "web"]), designer: "Rasmus Andersson",
        weight: JSON.stringify(["Thin", "Extra Light", "Light", "Regular", "Medium", "Semibold", "Bold", "Extra Bold", "Black"]), width: "Condensed", xHeight: "High", contrast: "Low", italics: "Yes", caps: "Standard", figures: "Lining", story: "Double", familySize: 18, aStory: "Double", gStory: "Single"
      },
      {
        name: "Lora", family: "Lora", category: "serif", useCase: JSON.stringify(["business", "editorial"]), designer: "Cyreal",
        weight: JSON.stringify(["Regular", "Medium", "Semibold", "Bold"]), width: "Normal", xHeight: "Medium", contrast: "Medium", italics: "Yes", caps: "Standard", figures: "Lining", story: "Single", familySize: 4, serifType: "Transitional", aStory: "Single", gStory: "Double"
      },
      {
        name: "Montserrat", family: "Montserrat", category: "sans-serif", useCase: JSON.stringify(["designer", "branding", "display"]), designer: "Julieta Ulanovsky",
        weight: JSON.stringify(["Thin", "Extra Light", "Light", "Regular", "Medium", "Semibold", "Bold", "Extra Bold", "Black"]), width: "Normal", xHeight: "Medium", contrast: "Low", italics: "Yes", caps: "Standard", figures: "Lining", story: "Double", familySize: 18, aStory: "Double", gStory: "Single"
      },
      {
        name: "Lato", family: "Lato", category: "sans-serif", useCase: JSON.stringify(["business", "web"]), designer: "Łukasz Dziedzic",
        weight: JSON.stringify(["Thin", "Light", "Regular", "Bold", "Black"]), width: "Normal", xHeight: "Medium", contrast: "Low", italics: "Yes", caps: "Standard", figures: "Lining", story: "Double", familySize: 10, aStory: "Double", gStory: "Single"
      }
    ];

    for (const font of commonFonts) {
      const [newFont] = await db.insert(fonts).values({
        ...font,
        license: "OFL / Apache 2.0",
        fileUrl: `https://fonts.google.com/download?family=${font.family.replace(/ /g, '+')}`,
        description: `${font.name} is a high-quality ${font.category.toLowerCase()} font suitable for ${font.useCase} projects.`,
      }).returning();

      // Map legacy category to new style
      const styleSlug = font.category.toLowerCase().replace(/ /g, '-');
      const [style] = await db.select().from(fontSubStyles).where(eq(fontSubStyles.slug, styleSlug)).limit(1);
      if (style) {
        await db.insert(fontStyleMap).values({ fontId: newFont.id, styleId: style.id });
      }
    }
  }
}
