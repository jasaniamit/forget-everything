import { useState, useEffect } from "react";
import { Navbar } from "@/components/Navbar";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Search, Loader2 } from "lucide-react";
import { motion } from "framer-motion";
import { Link } from "wouter";

const CATEGORIES = [
  { name: "Serif", count: 1240, color: "bg-blue-50" },
  { name: "Sans Serif", count: 850, color: "bg-purple-50" },
  { name: "Display", count: 620, color: "bg-pink-50" },
  { name: "Handwriting", count: 430, color: "bg-orange-50" },
  { name: "Monospace", count: 210, color: "bg-green-50" },
  { name: "Script", count: 340, color: "bg-yellow-50" },
  { name: "Retro", count: 180, color: "bg-indigo-50" },
  { name: "Decorative", count: 290, color: "bg-rose-50" },
  { name: "Comic", count: 150, color: "bg-cyan-50" },
  { name: "Stencil", count: 90, color: "bg-emerald-50" },
  { name: "Typewriter", count: 110, color: "bg-teal-50" },
  { name: "Pixel", count: 75, color: "bg-slate-50" },
];

export default function CategoryPage() {
  const [search, setSearch] = useState("");

  const filteredCategories = CATEGORIES.filter(cat => 
    cat.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-background font-sans">
      <Navbar />
      
      <main className="container mx-auto px-4 py-12 max-w-6xl">
        <div className="space-y-12">
          {/* Header Section */}
          <div className="space-y-6 text-center max-w-3xl mx-auto">
            <h1 className="text-5xl font-black tracking-tighter text-foreground">
              Explore <span className="text-primary">Font Categories</span>
            </h1>
            <p className="text-muted-foreground text-xl">
              Discover thousands of free fonts organized by style and category to perfectly match your creative project.
            </p>
            
            <div className="relative group max-w-2xl mx-auto pt-4">
              <Input
                placeholder="Search categories..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="h-16 pl-8 pr-16 text-xl bg-white border-2 border-primary/10 shadow-xl rounded-2xl focus-visible:ring-primary/20 transition-all"
              />
              <Search className="absolute right-8 top-1/2 -translate-y-1/2 h-6 w-6 text-muted-foreground group-focus-within:text-primary transition-colors" />
            </div>
          </div>

          {/* Categories Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {filteredCategories.map((category, idx) => (
              <motion.div
                key={category.name}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.05 }}
              >
                <Link href={`/?category=${category.name}`}>
                  <Card className={`group p-8 h-full border-0 shadow-sm hover:shadow-2xl transition-all cursor-pointer relative overflow-hidden ${category.color}`}>
                    <div className="relative z-10 flex flex-col items-center text-center space-y-4">
                      <div className="w-16 h-16 rounded-2xl bg-white shadow-sm flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                        <span className="text-3xl font-black text-primary">
                          {category.name.charAt(0)}
                        </span>
                      </div>
                      <div className="space-y-1">
                        <h3 className="text-xl font-black text-foreground group-hover:text-primary transition-colors">
                          {category.name}
                        </h3>
                        <p className="text-sm font-bold text-muted-foreground/60 uppercase tracking-widest">
                          {category.count} Fonts
                        </p>
                      </div>
                    </div>
                    {/* Decorative Background Element */}
                    <div className="absolute -right-8 -bottom-8 w-32 h-32 bg-white/40 rounded-full blur-2xl group-hover:scale-150 transition-transform duration-500" />
                  </Card>
                </Link>
              </motion.div>
            ))}
          </div>

          {filteredCategories.length === 0 && (
            <div className="text-center py-24 bg-secondary/20 rounded-3xl border-2 border-dashed border-border">
              <h3 className="text-2xl font-black mb-2">No categories found</h3>
              <p className="text-muted-foreground">Try searching for something else like "Serif" or "Retro"</p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
