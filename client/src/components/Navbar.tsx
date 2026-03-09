import { Link, useLocation } from "wouter";
import { cn } from "@/lib/utils";
import logoSvg from "@assets/logo_1768878013498.jpg";

export function Navbar() {
  const [location] = useLocation();

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-[#00153D] text-white overflow-x-auto no-scrollbar">
      <div className="container mx-auto px-4 h-[2.3rem] flex items-center justify-center min-w-max">
        <nav className="flex items-center gap-8 text-[13px] font-medium">
          <Link href="/" className="hover:text-primary transition-colors">Home</Link>
          <Link href="/category" className={cn("hover:text-primary transition-colors", location !== "/category" && "text-white/70")}>Categories</Link>
          <Link href="/font-pairing" className={cn("hover:text-primary transition-colors", location !== "/font-pairing" && "text-white/70")}>Font Pairing</Link>
          <Link href="/specimen" className={cn("hover:text-primary transition-colors", location !== "/specimen" && "text-white/70")}>Specimen Builder</Link>
          <Link href="/brand-fonts" className={cn("hover:text-primary transition-colors", location !== "/brand-fonts" && "text-white/70")}>Brand Fonts</Link>
          <Link href="/find-font" className={cn("hover:text-primary transition-colors", location !== "/find-font" && "text-white/70")}>Find Font</Link>
          <Link href="/instagram-fonts" className={cn("hover:text-primary transition-colors", location !== "/instagram-fonts" && "text-white/70")}>Instagram Fonts</Link>
          <Link href="/lenny-face-generator" className={cn("hover:text-primary transition-colors", location !== "/lenny-face-generator" && "text-white/70")}>Lenny Face</Link>
          <Link href="/emoji" className={cn("hover:text-primary transition-colors", location !== "/emoji" && "text-white/70")}>Emoji</Link>
          <Link href="/emoji-creator" className={cn("hover:text-primary transition-colors", location !== "/emoji-creator" && "text-white/70")}>Emoji Creator</Link>
          <Link href="/font-specimen" className={cn("hover:text-primary transition-colors", location !== "/font-specimen" && "text-white/70")}>Font Specimen</Link>
          <Link href="/font-character" className={cn("hover:text-primary transition-colors", location !== "/font-character" && "text-white/70")}>Font Character</Link>
          <Link href="/contact" className={cn("hover:text-primary transition-colors", location !== "/contact" && "text-white/70")}>Contact Us</Link>
        </nav>
      </div>
    </header>
  );
}
