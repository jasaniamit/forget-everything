import { Link } from "wouter";

export function Footer() {
  return (
    <footer className="bg-white border-t border-slate-100 py-12 mt-auto">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-7xl">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <img src="/logo.svg" alt="ukfont" className="h-8 w-auto object-contain" />
              <span className="text-xl font-black text-primary tracking-tight">ukfont</span>
            </div>
            <p className="text-sm text-slate-500 max-w-xs leading-relaxed">
              Your ultimate collection of free and premium fonts for all creative projects.
            </p>
          </div>
          <div>
            <h4 className="font-bold text-slate-800 mb-4 tracking-wide text-sm">Explore</h4>
            <ul className="space-y-2 text-sm text-slate-500">
              <li><Link href="/"><span className="hover:text-primary transition-colors cursor-pointer">Home</span></Link></li>
              <li><Link href="/category"><span className="hover:text-primary transition-colors cursor-pointer">Categories</span></Link></li>
            </ul>
          </div>
          <div>
            <h4 className="font-bold text-slate-800 mb-4 tracking-wide text-sm">Tools</h4>
            <ul className="space-y-2 text-sm text-slate-500">
              <li><Link href="/instagram-fonts"><span className="hover:text-primary transition-colors cursor-pointer">Instagram Fonts</span></Link></li>
              <li><Link href="/lenny-face-generator"><span className="hover:text-primary transition-colors cursor-pointer">Lenny Face Generator</span></Link></li>
              <li><Link href="/emoji"><span className="hover:text-primary transition-colors cursor-pointer">Emojis</span></Link></li>
            </ul>
          </div>
          <div>
            <h4 className="font-bold text-slate-800 mb-4 tracking-wide text-sm">Connect</h4>
            <ul className="space-y-2 text-sm text-slate-500">
              <li><Link href="/upload"><span className="hover:text-primary transition-colors cursor-pointer">Upload Font</span></Link></li>
              <li><Link href="/contact"><span className="hover:text-primary transition-colors cursor-pointer">Contact Us</span></Link></li>
            </ul>
          </div>
        </div>
        <div className="border-t border-slate-100 mt-12 pt-8 flex flex-col md:flex-row items-center justify-between text-xs text-slate-400">
          <p>© {new Date().getFullYear()} ukfont. All rights reserved.</p>
          <div className="flex gap-4 mt-4 md:mt-0 font-medium">
            <span className="hover:text-slate-600 cursor-pointer">Privacy Policy</span>
            <span className="hover:text-slate-600 cursor-pointer">Terms of Service</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
