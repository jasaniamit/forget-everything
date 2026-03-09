import { Switch, Route } from "wouter";
import FontFromImage from "@/pages/FontFromImage";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import Home from "@/pages/Home";
import FontDetail from "@/pages/FontDetail";
import IGGenerator from "@/pages/ig-generator";
import Category from "@/pages/Category";
import Emoji from "@/pages/Emoji";
import Lenny from "@/pages/Lenny";
import Contact from "@/pages/Contact";
import Upload from "@/pages/Upload";
import Admin from "@/pages/Admin";
import FontCharacter from "@/pages/FontCharacter";
import FontSpecimen from "@/pages/FontSpecimen";
import EmojiCreator from "@/pages/EmojiCreator";
import FontPairing from "@/pages/FontPairing";
import SpecimenBuilder from "@/pages/SpecimenBuilder";
import BrandFonts from "@/pages/BrandFonts";
import BrandDetail from "@/pages/BrandDetail";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/font/:id" component={FontDetail} />
      <Route path="/instagram-fonts" component={IGGenerator} />
      <Route path="/category" component={Category} />
      <Route path="/font-character" component={FontCharacter} />
      <Route path="/font-specimen" component={FontSpecimen} />
      <Route path="/emoji" component={Emoji} />
      <Route path="/emoji-creator" component={EmojiCreator} />
      <Route path="/lenny-face-generator" component={Lenny} />
      <Route path="/contact" component={Contact} />
      <Route path="/upload" component={Upload} />
      <Route path="/admin" component={Admin} />
      <Route path="/find-font" component={FontFromImage} />
      <Route path="/font-pairing" component={FontPairing} />
      <Route path="/specimen" component={SpecimenBuilder} />
      <Route path="/brand-fonts" component={BrandFonts} />
      <Route path="/brand/:slug" component={BrandDetail} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Router />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
