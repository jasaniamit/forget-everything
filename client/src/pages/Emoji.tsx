import { useState } from "react";
import { Navbar } from "@/components/Navbar";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, Copy, Check, Heart, Star, Smile, Coffee, Car, Home as HomeIcon, Zap, Ghost, Moon } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { motion, AnimatePresence } from "framer-motion";
import logoSvg from "@assets/logo_1768878013498.jpg";

const EMOJI_CATEGORIES = [
  { name: "Smilies", icon: <Smile className="w-4 h-4" />, emojis: ["😀", "😃", "😄", "😁", "😆", "😅", "😂", "🤣", "😊", "😇", "🙂", "🙃", "😉", "😌", "😍", "🥰", "😘", "😗", "😙", "😚", "😋", "😛", "😝", "😜", "🤪", "🤨", "🧐", "🤓", "😎", "🤩", "🥳", "😏", "😒", "😞", "😔", "😟", "😕", "🙁", "☹️", "😣", "😖", "😫", "😩", "🥺", "😢", "😭", "😤", "😠", "😡", "🤬", "🤯", "😳", "🥵", "🥶", "😱", "😨", "😰", "😥", "😓", "🤗", "🤔", "🤭", "🤫", "🤥", "😶", "😐", "😑", "😬", "🙄", "😯", "😦", "😧", "😮", "😲", "🥱", "😴", "🤤", "😪", "😵", "🤐", "🥴", "🤢", "🤮", "🤧", "😷", "🤒", "🤕"] },
  { name: "Hearts & Symbols", icon: <Heart className="w-4 h-4" />, emojis: ["❤️", "🧡", "💛", "💚", "💙", "💜", "🖤", "🤍", "🤎", "💔", "❣️", "💕", "💞", "💓", "💗", "💖", "💘", "💝", "💟", "☮️", "✝️", "☪️", "🕉️", "☸️", "✡️", "🔯", "🕎", "☯️", "☦️", "🛐", "⛎", "♈", "♉", "♊", "♋", "♌", "♍", "♎", "♏", "♐", "♑", "♒", "♓", "🆔", "⚛️", "🉑", "☢️", "☣️", "📴", "📳", "🈶", "🈚", "🈸", "🈺", "🈷️", "✴️", "🆚", "💮", "🉐", "㊙️", "㊗️", "🈴", "🈵", "🈹", "🈲", "🅰️", "🅱️", "AB", " CL", "🅾️", "🅿️", "🆘", "❌", "⭕", "🛑", "⛔", "📛", "🚫", "💯", "💢", "♨️", "🚷", "🚯", "🚳", "🚱", "🔞", "📵", "🚭"] },
  { name: "Objects & Food", icon: <Coffee className="w-4 h-4" />, emojis: ["⌚", "📱", "📲", "💻", "⌨️", "🖱️", "🖲️", "🕹️", "🗜️", "💽", "💾", "💿", "📀", "📼", "📷", "📸", "📹", "🎥", "📽️", "🎞️", "📞", "☎️", "📟", "📠", "📺", "📻", "🎙️", "🎚️", "🎛️", "🧭", "⏱️", "⏲️", "⏰", "🕰️", "⌛", "⏳", "📡", "🔋", "🔌", "💡", "🔦", "🕯️", "🪔", "🧯", "🛢️", "💸", "💵", "💴", "💶", "💷", "💰", "💳", "💎", "⚖️", "🪜", "🧰", "🪛", "🔧", "🔨", "⚒️", "🛠️", "⛏️", "🪚", "🔩", "⚙️", "🪤", "🧱", "⛓️", "🧲", "🔫", "💣", "🧨", "🪓", "🔪", "🗡️", "⚔️", "🛡️", "🚬", "⚰️", "🪦", "⚱️", "🏺", "🔮", "📿", "🧿", "💈"] },
  { name: "Travel & Places", icon: <Car className="w-4 h-4" />, emojis: ["🚗", "🚕", "🚙", "🚌", "🚎", "🏎️", "🚓", "🚑", "🚒", "🚐", "🛻", "🚚", "🚛", "🚜", "🏎️", "🏍️", "🛵", "🦽", "🦼", "🛺", "🚲", "🛴", "🛹", "🛼", "🚏", "🛣️", "🛤️", "🛢️", "⛽", "🚨", "🚥", "🚦", "🛑", "🚧", "⚓", "⛵", "🛶", "🚤", "🛳️", "⛴️", "🛥️", "🚢", "✈️", "🛩️", "🛫", "🛬", "🪂", "💺", "🚁", "🚟", "🚠", "🚡", "🛰️", "🚀", "🛸", "🛎️", "🧳", "⌛", "⏳", "⌚", "⏰", "⏱️", "⏲️", "🕰️", "🌡️", "☀️", "🌝", "🌞", "🪐", "🌟", "🌠", "🌌", "☁️", "⛅", "⛈️", "🌤️", "🌥️", "🌦️", "🌧️", "🌨️", "🌩️", "🌪️", "🌫️", "🌬️", "🌀", "🌈", "🌂", "☂️", "☔", "⛱️"] }
];

export default function EmojiPage() {
  const [search, setSearch] = useState("");
  const { toast } = useToast();
  const [copiedEmoji, setCopiedEmoji] = useState<string | null>(null);

  const copyToClipboard = (emoji: string) => {
    navigator.clipboard.writeText(emoji);
    setCopiedEmoji(emoji);
    toast({
      title: "Copied!",
      description: `${emoji} copied to clipboard`,
    });
    setTimeout(() => setCopiedEmoji(null), 2000);
  };

  const filteredCategories = EMOJI_CATEGORIES.map(category => ({
    ...category,
    emojis: category.emojis.filter(emoji => 
      category.name.toLowerCase().includes(search.toLowerCase()) || search === ""
    )
  })).filter(cat => cat.emojis.length > 0);

  return (
    <div className="min-h-screen bg-background font-sans">
      <Navbar />
      
      <main className="container mx-auto px-4 py-12 max-w-6xl">
        <div className="space-y-12">
          {/* Header */}
          <div className="text-center space-y-6 max-w-3xl mx-auto">
            <div className="flex justify-center mb-4">
              <img src={logoSvg} alt="ukfont" className="h-24 w-24 object-contain" />
            </div>
            <h1 className="text-5xl font-black tracking-tighter">
              Emoji <span className="text-primary">Discovery</span>
            </h1>
            <p className="text-muted-foreground text-xl">
              Clean, fast, and simple. Click any emoji to copy it instantly to your clipboard.
            </p>
            <div className="relative group max-w-2xl mx-auto">
              <Input
                placeholder="Search emojis..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="h-14 pl-12 pr-6 text-lg bg-white border-2 border-primary/10 shadow-lg rounded-2xl focus-visible:ring-primary/20"
              />
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground group-focus-within:text-primary transition-colors" />
            </div>
          </div>

          {/* Categories */}
          <div className="space-y-12">
            {filteredCategories.map((category) => (
              <section key={category.name} className="space-y-6">
                <div className="flex items-center gap-4">
                  <div className="p-2 bg-primary/10 rounded-lg text-primary">
                    {category.icon}
                  </div>
                  <h2 className="text-xl font-black uppercase tracking-widest">{category.name}</h2>
                  <div className="h-px flex-1 bg-border/40" />
                </div>

                <div className="grid grid-cols-4 sm:grid-cols-8 md:grid-cols-10 lg:grid-cols-12 gap-2">
                  {category.emojis.map((emoji, idx) => (
                    <motion.button
                      key={`${category.name}-${idx}`}
                      whileHover={{ scale: 1.2 }}
                      whileTap={{ scale: 0.9 }}
                      onClick={() => copyToClipboard(emoji)}
                      className={`
                        aspect-square flex items-center justify-center text-3xl p-2 rounded-xl transition-all relative
                        ${copiedEmoji === emoji ? 'bg-primary/20 ring-2 ring-primary' : 'bg-white hover:shadow-lg border border-border/40'}
                      `}
                    >
                      {emoji}
                      <AnimatePresence>
                        {copiedEmoji === emoji && (
                          <motion.div
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0 }}
                            className="absolute -top-8 bg-black text-white text-[10px] py-1 px-2 rounded font-bold"
                          >
                            COPIED!
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </motion.button>
                  ))}
                </div>
              </section>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}
