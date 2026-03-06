import { useState, useRef, useEffect } from "react";
import { Navbar } from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Download, Undo, Redo, Eraser, Trash2, Move, ZoomIn, ZoomOut, RotateCcw, Layers, Plus } from "lucide-react";
import { cn } from "@/lib/utils";

const ASSET_CATEGORIES = [
  { id: 'shape', label: 'Shape', icon: 'https://emoji-maker.com/assets/img_tab/tab_selected_shape.png' },
  { id: 'moreshape', label: 'More Shape', icon: 'https://emoji-maker.com/assets/img_tab/tab_added_moreshape.png' },
  { id: 'eyes', label: 'Eyes', icon: 'https://emoji-maker.com/assets/img_tab/tab_added_eyes.png' },
  { id: 'eyesbig', label: 'Eyes Big', icon: 'https://emoji-maker.com/assets/img_tab/tab_added_eyesbig.png' },
  { id: 'eyebrows', label: 'Eyebrows', icon: 'https://emoji-maker.com/assets/img_tab/tab_added_eyebrows.png' },
  { id: 'happymouth', label: 'Happy Mouth', icon: 'https://emoji-maker.com/assets/img_tab/tab_added_happymouth.png' },
  { id: 'sadmouth', label: 'Sad Mouth', icon: 'https://emoji-maker.com/assets/img_tab/tab_added_sadmouth.png' },
  { id: 'nose', label: 'Nose', icon: 'https://emoji-maker.com/assets/img_tab/tab_added_nose.png' },
  { id: 'beard', label: 'Beard', icon: 'https://emoji-maker.com/assets/img_tab/tab_normal_beard.png' },
  { id: 'stache', label: 'Stache', icon: 'https://emoji-maker.com/assets/img_tab/tab_added_stache.png' },
  { id: 'glasses', label: 'Glasses', icon: 'https://emoji-maker.com/assets/img_tab/tab_normal_glasses.png' },
  { id: 'hair', label: 'Hair', icon: 'https://emoji-maker.com/assets/img_tab/tab_normal_hair.png' },
  { id: 'mask', label: 'Mask', icon: 'https://emoji-maker.com/assets/img_tab/tab_added_mask.png' },
  { id: 'misc', label: 'Misc', icon: 'https://emoji-maker.com/assets/img_tab/tab_normal_misc.png' },
  { id: 'hats', label: 'Hats', icon: 'https://emoji-maker.com/assets/img_tab/tab_normal_hats.png' },
  { id: 'hands', label: 'Hands', icon: 'https://emoji-maker.com/assets/img_tab/tab_normal_hands.png' },
];

const getAssetUrls = (category: string, count: number) => {
  const baseUrl = "https://emoji-maker.com/assets/emojis-thumb";
  const catMap: Record<string, string> = {
    shape: "Shape",
    moreshape: "More Shape",
    eyes: "Eyes",
    eyesbig: "Eyes Big",
    eyebrows: "Eyebrows",
    happymouth: "Happy Mouth",
    sadmouth: "Sad Mouth",
    nose: "Nose",
    beard: "Beard",
    stache: "Stache",
    glasses: "Glasses",
    hair: "Hair",
    mask: "Mask",
    misc: "Misc",
    hats: "Hats",
    hands: "Hands"
  };
  return Array.from({ length: count }, (_, i) => `${baseUrl}/${catMap[category]}/${i + 1}.png`);
};

interface EmojiLayer {
  id: string;
  type: string;
  url: string;
  x: number;
  y: number;
  scale: number;
  zIndex: number;
}

export default function EmojiCreator() {
  const [layers, setLayers] = useState<EmojiLayer[]>([]);
  const [selectedLayerId, setSelectedLayerId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('shape');
  const [history, setHistory] = useState<EmojiLayer[][]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const canvasRef = useRef<HTMLDivElement>(null);

  const saveToHistory = (newLayers: EmojiLayer[]) => {
    const newHistory = history.slice(0, historyIndex + 1);
    newHistory.push(newLayers);
    if (newHistory.length > 20) newHistory.shift();
    setHistory(newHistory);
    setHistoryIndex(newHistory.length - 1);
  };

  const addLayer = (type: string, url: string) => {
    const existingLayerIdx = layers.findIndex(l => l.type === type);
    let newLayers = [...layers];
    
    const newLayer: EmojiLayer = {
      id: Math.random().toString(36).substr(2, 9),
      type,
      url,
      x: 0,
      y: 0,
      scale: 1,
      zIndex: type === 'shape' || type === 'moreshape' ? 0 : layers.length + 1,
    };

    if (existingLayerIdx > -1) {
      newLayers[existingLayerIdx] = { ...newLayers[existingLayerIdx], url };
    } else {
      newLayers.push(newLayer);
    }
    
    setLayers(newLayers);
    setSelectedLayerId(newLayer.id);
    saveToHistory(newLayers);
  };

  const removeLayer = (id: string) => {
    const newLayers = layers.filter(l => l.id !== id);
    setLayers(newLayers);
    if (selectedLayerId === id) setSelectedLayerId(null);
    saveToHistory(newLayers);
  };

  const updateLayer = (id: string, updates: Partial<EmojiLayer>) => {
    const newLayers = layers.map(l => l.id === id ? { ...l, ...updates } : l);
    setLayers(newLayers);
  };

  const handleUndo = () => {
    if (historyIndex > 0) {
      const prev = history[historyIndex - 1];
      setLayers(prev);
      setHistoryIndex(historyIndex - 1);
    }
  };

  const handleRedo = () => {
    if (historyIndex < history.length - 1) {
      const next = history[historyIndex + 1];
      setLayers(next);
      setHistoryIndex(historyIndex + 1);
    }
  };

  const downloadEmoji = () => {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const sortedLayers = [...layers].sort((a, b) => a.zIndex - b.zIndex);
    let loaded = 0;
    sortedLayers.forEach(layer => {
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.src = layer.url;
      img.onload = () => {
        const size = 300 * layer.scale;
        ctx.drawImage(
          img, 
          256 + layer.x - size/2, 
          256 + layer.y - size/2, 
          size, 
          size
        );
        loaded++;
        if (loaded === sortedLayers.length) {
          const link = document.createElement('a');
          link.download = 'my-emoji.png';
          link.href = canvas.toDataURL();
          link.click();
        }
      };
    });
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] font-sans">
      <Navbar />
      
      <main className="container mx-auto px-4 py-8">
        <div className="flex flex-col lg:flex-row gap-8 items-start">
          {/* Canvas Section */}
          <div className="flex-1 flex flex-col items-center gap-8 w-full">
            <div className="relative group w-full max-w-[500px]">
              <Card className="aspect-square bg-white shadow-[0_20px_50px_rgba(0,0,0,0.1)] rounded-[40px] relative overflow-hidden border-none flex items-center justify-center p-12">
                <div className="absolute inset-0 bg-[radial-gradient(#e2e8f0_1px,transparent_1px)] [background-size:24px_24px] opacity-40" />
                
                <div ref={canvasRef} className="relative w-full h-full">
                  {layers.sort((a, b) => a.zIndex - b.zIndex).map((layer) => (
                    <div
                      key={layer.id}
                      className={cn(
                        "absolute cursor-grab active:cursor-grabbing transition-all duration-200",
                        selectedLayerId === layer.id && "scale-105 z-50"
                      )}
                      style={{
                        left: `calc(50% + ${layer.x}px)`,
                        top: `calc(50% + ${layer.y}px)`,
                        transform: `translate(-50%, -50%) scale(${layer.scale})`,
                      }}
                      onMouseDown={(e) => {
                        e.stopPropagation();
                        setSelectedLayerId(layer.id);
                        const startX = e.clientX - layer.x;
                        const startY = e.clientY - layer.y;
                        
                        const handleMouseMove = (moveEvent: MouseEvent) => {
                          updateLayer(layer.id, {
                            x: moveEvent.clientX - startX,
                            y: moveEvent.clientY - startY
                          });
                        };
                        
                        const handleMouseUp = () => {
                          window.removeEventListener('mousemove', handleMouseMove);
                          window.removeEventListener('mouseup', handleMouseUp);
                          saveToHistory(layers);
                        };
                        
                        window.addEventListener('mousemove', handleMouseMove);
                        window.addEventListener('mouseup', handleMouseUp);
                      }}
                    >
                      <img src={layer.url} alt={layer.type} className="w-64 h-64 object-contain pointer-events-none drop-shadow-2xl" />
                      {selectedLayerId === layer.id && (
                        <div className="absolute -inset-4 border-2 border-primary/30 rounded-full animate-pulse" />
                      )}
                    </div>
                  ))}
                </div>
              </Card>
            </div>

            <div className="flex flex-wrap justify-center gap-4 bg-white p-4 rounded-3xl shadow-lg border border-border/50">
              <Button variant="ghost" size="icon" onClick={handleUndo} disabled={historyIndex <= 0} className="hover:bg-primary/5 rounded-2xl h-12 w-12">
                <Undo className="h-5 w-5" />
              </Button>
              <Button variant="ghost" size="icon" onClick={handleRedo} disabled={historyIndex >= history.length - 1} className="hover:bg-primary/5 rounded-2xl h-12 w-12">
                <Redo className="h-5 w-5" />
              </Button>
              <div className="w-px bg-border mx-2" />
              <Button variant="ghost" size="icon" onClick={() => { setLayers([]); setHistory([]); setHistoryIndex(-1); }} className="hover:bg-destructive/5 hover:text-destructive rounded-2xl h-12 w-12">
                <Eraser className="h-5 w-5" />
              </Button>
              <Button className="bg-primary hover:bg-primary/90 text-white rounded-2xl px-10 h-12 font-bold shadow-lg shadow-primary/20 transition-all hover:scale-105 active:scale-95" onClick={downloadEmoji}>
                <Download className="mr-2 h-5 w-5" /> Export Emoji
              </Button>
            </div>
          </div>

          {/* Assets Sidebar */}
          <Card className="w-full lg:w-[450px] h-[800px] border-none rounded-[40px] overflow-hidden flex flex-col shadow-2xl bg-white">
            <div className="p-6 border-b bg-secondary/5">
              <h2 className="text-xl font-black text-primary flex items-center gap-2">
                <Layers className="h-6 w-6" /> Emoji Designer
              </h2>
            </div>

            <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col overflow-hidden">
              <div className="bg-white border-b overflow-x-auto no-scrollbar">
                <TabsList className="h-20 bg-transparent gap-2 px-6 flex justify-start min-w-max">
                  {ASSET_CATEGORIES.map(cat => (
                    <TabsTrigger 
                      key={cat.id} 
                      value={cat.id} 
                      className="data-[state=active]:bg-primary/5 data-[state=active]:text-primary flex flex-col items-center gap-1 px-4 h-14 rounded-2xl transition-all border border-transparent data-[state=active]:border-primary/10"
                    >
                      <img src={cat.icon} alt={cat.label} className="w-6 h-6 grayscale data-[state=active]:grayscale-0" />
                      <span className="text-[10px] font-black uppercase tracking-tighter">{cat.label}</span>
                    </TabsTrigger>
                  ))}
                </TabsList>
              </div>
              
              <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
                {ASSET_CATEGORIES.map(cat => (
                  <TabsContent key={cat.id} value={cat.id} className="mt-0 grid grid-cols-4 gap-6 outline-none">
                    {getAssetUrls(cat.id, 40).map((url, i) => (
                      <button
                        key={i}
                        onClick={() => addLayer(cat.id, url)}
                        className="group relative aspect-square p-2 bg-secondary/10 hover:bg-primary/5 rounded-[20px] transition-all hover:scale-110 active:scale-90 border border-transparent hover:border-primary/20"
                      >
                        <img src={url} alt={`${cat.label} ${i}`} className="w-full h-auto drop-shadow-sm" />
                        <div className="absolute inset-0 bg-primary/10 opacity-0 group-hover:opacity-100 rounded-[20px] transition-opacity flex items-center justify-center">
                          <Plus className="h-6 w-6 text-primary" />
                        </div>
                      </button>
                    ))}
                  </TabsContent>
                ))}
              </div>
            </Tabs>
            
            {selectedLayerId && (
              <div className="p-8 border-t bg-primary/[0.02] space-y-6 animate-in slide-in-from-bottom-4">
                <div className="flex items-center justify-between">
                  <div className="flex flex-col">
                    <span className="text-[10px] font-black uppercase tracking-[0.2em] text-primary/40">Adjust Layer</span>
                    <span className="text-sm font-bold text-primary capitalize">{layers.find(l => l.id === selectedLayerId)?.type} Controls</span>
                  </div>
                  <Button variant="ghost" size="icon" className="h-10 w-10 text-destructive/40 hover:text-destructive hover:bg-destructive/5 rounded-xl" onClick={() => removeLayer(selectedLayerId)}>
                    <Trash2 className="h-5 w-5" />
                  </Button>
                </div>
                
                <div className="space-y-4">
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-[11px] font-bold text-muted-foreground uppercase flex items-center gap-2">
                        <ZoomIn className="h-3 w-3" /> Resize
                      </span>
                      <span className="text-[11px] font-bold text-primary/60">{Math.round((layers.find(l => l.id === selectedLayerId)?.scale || 1) * 100)}%</span>
                    </div>
                    <input 
                      type="range" 
                      min="0.3" 
                      max="2.5" 
                      step="0.05"
                      value={layers.find(l => l.id === selectedLayerId)?.scale || 1}
                      onChange={(e) => updateLayer(selectedLayerId, { scale: parseFloat(e.target.value) })}
                      onMouseUp={() => saveToHistory(layers)}
                      className="w-full h-1.5 bg-primary/10 rounded-full appearance-none cursor-pointer accent-primary"
                    />
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <Button variant="outline" className="h-12 rounded-2xl border-primary/10 hover:bg-primary/5 text-primary font-bold gap-2" onClick={() => updateLayer(selectedLayerId, { x: 0, y: 0 })}>
                      <RotateCcw className="h-4 w-4" /> Center
                    </Button>
                    <div className="flex border rounded-2xl overflow-hidden border-primary/10">
                       <Button 
                        variant="ghost" 
                        className="flex-1 h-12 rounded-none border-r border-primary/10 hover:bg-primary/5"
                        onClick={() => {
                          const layer = layers.find(l => l.id === selectedLayerId);
                          if (layer) updateLayer(selectedLayerId, { zIndex: layer.zIndex - 1 });
                        }}
                      >
                        <Layers className="h-4 w-4 rotate-180" />
                      </Button>
                      <Button 
                        variant="ghost" 
                        className="flex-1 h-12 rounded-none hover:bg-primary/5"
                        onClick={() => {
                          const layer = layers.find(l => l.id === selectedLayerId);
                          if (layer) updateLayer(selectedLayerId, { zIndex: layer.zIndex + 1 });
                        }}
                      >
                        <Layers className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </Card>
        </div>
      </main>

      <style>{`
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #E2E8F0; border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #CBD5E1; }
      `}</style>
    </div>
  );
}
