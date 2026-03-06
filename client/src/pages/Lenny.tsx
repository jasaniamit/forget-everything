import { useState, useEffect } from "react";
import { Navbar } from "@/components/Navbar";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Copy, Check, RefreshCw } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { motion } from "framer-motion";
import { Link } from "wouter";
import logoSvg from "@assets/logo_1768878013498.jpg";

const EYES = ["°", "•", "¬", "ʘ", "◕", "◔", "ಠ", "۞", "◉", "⦿", "◎", "◑", "◐", "◒", "◓", "◖", "◗", "⚆", "⚇", "⚈", "⚉", "◡", "◠", "⍤", "⍥", "⍨", "⍩", "⑈", "⑉", "⑊", "⑋", "⑌", "⑍", "⑎", "⑏"];
const EYEBROWS = ["͡", " ̅", " ̿", " ͆", " ̪", " ̫", " ̬", " ̭", " ̮", " ̯", " ̰", " ̱", " ̲", " ̳", " ̻", " ̹", " ̺", " ̻", " ̼", " ̽", " ̾", " ̿"];
const MOUTHS = ["_", "v", ".", "w", "o", "u", "◡", "◠", "皿", "ω", "ε", "﹏", "益", "人", "∀", "ヮ", "口", "З", "Δ", "з", "‿", "︿", "▿", "▵", "▯", "▭", "▬", "▫", "▪", "◻", "◼", "◽", "◾", "◬", "◭", "◮", "ﭛ", "ٹ", "益", " ч ", " ⌔ ", " ਊ "];
const EARS = ["(", ")", "ʕ", "ʔ", "ᕦ", "ᕤ", "ᕙ", "ᕗ", "ᶘ", "ᶗ", "ᶙ", "༼", "༽", "ᕳ", "ᕲ", "ᕴ", "ᕵ", "ᕶ", "ᕷ", "ᕸ", "ᕹ", "ᕺ", "ᕻ", "◜", "◝", "◞", "◟", "◠", "◡", "⸂⸂", "⸃⸃", "˭̡̞", "◞", "◟"];
const NOSES = [" ͜ ", "👃", "⍝", "🐽", "👃", "⍝", "🐽"];

const EMOTICONS = [
  {
    category: "Happy",
    icon: "😀",
    faces: ["( ͡° ͜ʖ ͡°)", "∠( ᐛ 」∠)＿", "(ﾟ⊿ﾟ)", "ᕕ( ᐛ )ᕗ", "_へ__(‾◡◝ )>", "( ᐛ )و", "( ´ ▽ ` )ﾉ", "(*^▽^*)", "(´∇ﾉ｀*)ノ", "(ノ^∇^)⊂((・▽・))⊃", "(　＾∇＾)", "( ﾟ▽ﾟ)/", "（‐＾▽＾‐）", "(“⌒∇⌒”)", "（*´▽｀*）", "(*＾▽＾)／", "(*^▽^*)", "(*~▽~)", "(*≧▽≦)", "(*⌒∇⌒*)", "(*⌒▽⌒*)", "θ～♪", "(^▽^)/", "(^∇^)", "(＾▽＾)", "(￣▽￣)ノ", "(￣▽+￣*)", "(゜▽゜;)", "（=´∇｀=）", "(＝⌒▽⌒＝)"]
  },
  {
    category: "Sunglasses",
    icon: "😎",
    faces: ["(▀̿Ĺ̯▀̿ ̿)", "( ͡° ͜ʖ ͡°)▄︻̷̿┻̿═━一", "(•_•) ( •_•)>⌐■-■ (⌐■_■)", "(⌐■_■)", "( ͡■ ͜ʖ ͡■)", "(•_•)>⌐■-■", "(⌐▨_▨)", "(̿▀̿ ̿Ĺ̯̿̿▀̿ ̿)̄", "(-_•)┳一一", "(⌐▀͡ ̯ʖ▀)", "(-_•)▄︻┻┳═一", "( ͡° ͜ʖ ͡°)▄︻̷̿┻̿═━一", "(⌐■_■)▄︻┳一", "(⌐■_■)︻╦╤─", "( ͡° ͜ʖ ͡°)︻̷̿┻̿═━一", "(▀̿Ĺ̯▀̿ ̿)", " (•_•) ( •_•)>⌐■-■ (⌐■_■)", "(⌐■_■)", "( ͡■ ͜ʖ ͡■)", " (•_•)>⌐■-■"]
  },
  {
    category: "Love",
    icon: "❤️",
    faces: ["(｡♥‿♥｡)", "(▰˘◡˘▰)", "(*^.^*)", "(๑♡⌓♡๑)", "(｡・//ε//・｡)", "(*˘︶˘*).｡.:*♡", "(っ.❛ ᴗ ❛.)っ", "(づ￣ ³￣)づ", "(●’◡’●)ﾉ", "(๑•́ ₃ •̀๑)", " (´• ω •`) ♡", "♡( ◡‿◡ )", "(*˘︶˘*)", "( ´ ▽ ` )", "(´ ε ` )♡", "(ღ˘⌣˘ღ)", "♡( ◡‿◡ )", "(*˘︶˘*).｡.:*♡", "♡(>ᴗ•)", "(♡-_-♡)"]
  },
  {
    category: "Cat",
    icon: "🐱",
    faces: ["(=^･ω･^=)", "(=^･ｪ･^=)", "(=①ω①=)", "( =ノωヽ=)", "(=^‥^=)", "(=^･ω･^=)y＝", "(=ＴェＴ=)", "(=; ｪ ;=)", "(=`ω´=)", "(=^..^=)", "(=^･^=)", "(^･ｪ･^)", "(=^‥^=)o", "(=^ ◡ ^=)", "(=^-ω-^=)", "(=^･ω･^=)∫", "(=^; ｪ ;^=)", "(^・ω・^ )", "(=^･ω･^=)", "(=^･ｪ･^=)"]
  },
  {
    category: "Dogs",
    icon: "🐶",
    faces: ["(U・x・U)", "v(・∀・*)", "o(^-^)o", "(❍ᴥ❍ʋ)", "(V●ᴥ●V)", "(=^･ω･^=)", "(ᵔᴥᵔ)", "∪･ω･∪", "（・⊝・）", "（・⊝・∞）", "(^・ω・^ )", "U^ｪ^U", "U´ᴥ`U", "U・x・U", "V●ᴥ●V", "(❍ᴥ❍ʋ)", "(U・x・U)", "v(・∀・*)", "o(^-^)o", "(❍ᴥ❍ʋ)"]
  },
  {
    category: "Angry",
    icon: "😠",
    faces: ["(╬◣д◢)", "(ノಠ益ಠ)ノ", "(#`皿´)", "(｀ε´)", "(｀Д´)", "(｀ー´)", "(｀∀´)", "(｀∇´)", "(｀o´)", "(｀д´)", "(｀^´) ", "(｀ω´)", "(｀ε´)", "(｀Д´)", "(｀ー´)", "(｀∀´)", "(｀∇´)", "(｀o´)", "(｀д´)", "(｀^´)"]
  },
  {
    category: "Hide",
    icon: "🫣",
    faces: ["(*/_＼)", "(*/｡＼)", "(*/ω＼*)", "(ﾉ_ヽ)", "(ノдヽ)", "(ﾉ∀＼*)", "(つд⊂)", "( ◡‿◡ *)", "(つω⊂)", "(/ω＼)", "(*/_＼)", "(*/｡＼)", "(*/ω＼*)", "(ﾉ_ヽ)", "(ノдヽ)", "(ﾉ∀＼*)", "(つд⊂)", "( ◡‿◡ *)", "(つω⊂)", "(/ω＼)"]
  },
  {
    category: "Crazy",
    icon: "🤪",
    faces: ["(⊙.☉)7", "(°ロ°)☝", "(⊙_◎)", "(▰˘︹˘▰)", "(✖╭╮✖)", "(≧ڡ≦*)", "( 🤪 )", "(´･ω･`)", "(◎_◎;)", "(´ε｀ )", "(⊙.☉)7", "(°ロ°)☝", "(⊙_◎)", "(▰˘︹˘▰)", "(✖╭╮✖)", "(≧ڡ≦*)", "( 🤪 )", "(´･ω･`)", "(◎_◎;)", "(´ε｀ )"]
  },
  {
    category: "Confused",
    icon: "😕",
    faces: ["(⊙_◎)", "(•ิ_•ิ)?", "(◎_◎;)", "(＠_＠;)", "(・_・?)", "(?_?)", "( •᷄ὤ•᷅)？", "( ﾟдﾟ)", "(・.・;)", "(^_^;)", "(⊙_◎)", "(•ิ_•ิ)?", "(◎_◎;)", "(＠_＠;)", "(・_・?)", "(?_?)", "( •᷄ὤ•᷅)？", "( ﾟдﾟ)", "(・.・;)", "(^_^;)"]
  },
  {
    category: "Thinking",
    icon: "🤔",
    faces: ["( ͡° ͜ʖ ͡°)", "( ͠° ͟ʖ ͡°)", "( ͡° ʖ̯ ͡°)", "(. ົ̅ ੭͜ ົ̅.)", "(๑• . •๑)??", "( -_-)旦~", "( ˘▽˘)っ♨", "( ˘ ³˘)♥", "(ง ͠° ͟ل͜ ͡°)ง", "(´-ω-`)", "( ͡° ͜ʖ ͡°)", "( ͠° ͟ʖ ͡°)", "( ͡° ʖ̯ ͡°)", "(. ົ̅ ੭͜ ົ̅.)", "(๑• . •๑)??", "( -_-)旦~", "( ˘▽˘)っ♨", "( ˘ ³˘)♥", "(ง ͠° ͟ل͜ ͡°)ง", "(´-ω-`)"]
  },
  {
    category: "Waving",
    icon: "👋",
    faces: ["( ´ ▽ ` )ﾉ", "(^-^*)/", "( ﾟ▽ﾟ)/", "( ^_^)／", "(￣▽￣)ノ", "( ° ∀ ° )ﾉﾞ", "(･ω･)ﾉﾞ", "(´• ω •`)ﾉ", "(｡･ω･)ﾉﾞ", "(o´▽`o)ﾉ", "( ´ ▽ ` )ﾉ", "(^-^*)/", "( ﾟ▽ﾟ)/", "( ^_^)／", "(￣▽￣)ノ", "( ° ∀ ° )ﾉﾞ", "(･ω･)ﾉﾞ", "(´• ω •`)ﾉ", "(｡･ω･)ﾉﾞ", "(o´▽`o)ﾉ"]
  },
  {
    category: "WTF ?",
    icon: "⁉️",
    faces: ["( ﾟдﾟ)", "( °益° )", "(O_O)", "(((( ;°Д°))))", "(＠_＠;)", "(゜д゜;)", "(ﾟДﾟ?))", "((((；゜Д゜)))", "(╬ಠ益ಠ)", "(⊙_⊙)", "( ﾟдﾟ)", "( °益° )", "(O_O)", "(((( ;°Д°))))", "(＠_＠;)", "(゜д゜;)", "(ﾟДﾟ?))", "((((；゜Д゜)))", "(╬ಠ益ಠ)", "(⊙_⊙)"]
  },
  {
    category: "Wink",
    icon: "😉",
    faces: ["(^_−)☆", "( ͡° ͜ʖ ͡°)", "(^_-)", "( ͡~ ͜ʖ ͡°)", "(ゝ◡╹)ノ", "(･ω<)☆", "(-_・)", "(^人<)〜☆", "( ͡° ͜ʖ ͡°)", "(・ω<)", "(^_−)☆", "( ͡° ͜ʖ ͡°)", "(^_-)", "( ͡~ ͜ʖ ͡°)", "(ゝ◡╹)ノ", "(･ω<)☆", "(-_・)", "(^人<)〜☆", "( ͡° ͜ʖ ͡°)", "(・ω<)"]
  },
  {
    category: "Saluting",
    icon: "🫡",
    faces: ["(￣^￣)ゞ", "(｀д´)ゝ", "(o^ ^o)ゞ", "(｀∀´)ゝ", "(￣ー￣)ゞ", "(・∀・)ゞ", "(´･ω･`)ゞ", "(｡･ω･)ゞ", "(｀･ω･´)ゞ", "(´• ω •`)ゞ", "(￣^￣)ゞ", "(｀д´)ゝ", "(o^ ^o)ゞ", "(｀∀´)ゝ", "(￣ー￣)ゞ", "(・∀∀)ゞ", "(´･ω･`)ゞ", "(｡･ω･)ゞ", "(｀･ω･´)ゞ", "(´• ω •`)ゞ"]
  },
  {
    category: "Sad",
    icon: "😢",
    faces: ["(╥﹏╥)", "(T_T)", "(;_;)", "(｡-人-｡)", "(╯_╰)", "(´д｀)", "(︶︹︺)", "(｡T ω T｡)", "o(TヘTo)", "(╥_╥)", "(╥﹏╥)", "(T_T)", "(;_;)", "(｡-人-｡)", "(╯_╰)", "(´д｀)", "(︶︹︺)", "(｡T ω T｡)", "o(TヘTo)", "(╥_╥)"]
  },
  {
    category: "Fight",
    icon: "👊",
    faces: ["(ง'̀-'́)ง", "(ง ͠° ͟ل͜ ͡°)ง", "୧( ಠ Д ಠ )୨", "(ง •̀_•́)ง", "(ง ͠ ͠° ͟ʖ #)ง", "(ง ͠° ͟ʖ #)ง", "(ง •̀_•́)ง", "(ง ͡° ͜ʖ ͡°)ง", "(ง ͠° ͟ل͜ ͡°)ง", "(ง'̀-'́)ง", "(ง'̀-'́)ง", "(ง ͠° ͟ل͜ ͡°)ง", "୧( ಠ Д ಠ )୨", "(ง •̀_•́)ง", "(ง ͠ ͠° ͟ʖ #)ง", "(ง ͠° ͟ʖ #)ง", "(ง •̀_•́)ง", "(ง ͡° ͜ʖ ͡°)ง", "(ง ͠° ͟ل͜ ͡°)ง", "(ง'̀-'́)ง"]
  },
  {
    category: "Bears",
    icon: "🐻",
    faces: ["ʕ•ᴥ•ʔ", "ʕ·ᴥ·ʔ", "ʕ•̀ω•́ʔ✧", "ʕ-ᴥ-ʔ", "ʕºᴥºʔ", "ʕノ•ᴥ•ʔノ ︵ ┻━┻", "ʕ •́؈•̀ ʔ", "ʕ≧ᴥ≦ʔ", "ʕ♡˙ᴥ˙♡ʔ", "ʕ ಡ ﹏ ಡ ʔ", "ʕ•ᴥ•ʔ", "ʕ·ᴥ·ʔ", "ʕ•̀ω•́ʔ✧", "ʕ-ᴥ-ʔ", "ʕºᴥºʔ", "ʕノ•ᴥ•ʔノ ︵ ┻━┻", "ʕ •́؈•̀ ʔ", "ʕ≧ᴥ≦ʔ", "ʕ♡˙ᴥ˙♡ʔ", "ʕ ಡ ﹏ ಡ ʔ"]
  },
  {
    category: "Writing",
    icon: "✍️",
    faces: ["φ(．．;)", "φ(￣ー￣ )ノ", "φ(◎◎ヘ)", "φ(.. )", "φ(._.)", "φ(・ω・` )", "φ(ºωº` )", "φ(ﾟДﾟ)y-~", "φ(･∀･*)", "φ(．．)", "φ(．．;)", "φ(￣ー￣ )ノ", "φ(◎◎ヘ)", "φ(.. )", "φ(._.)", "φ(・ω・` )", "φ(ºωº` )", "φ(ﾟДﾟ)y-~", "φ(･∀･*)", "φ(．．)"]
  },
  {
    category: "Evil",
    icon: "😈",
    faces: ["(✧ω✧)", "(￣∀￣)", "(´∀｀*)", "(^人^)", "(o´▽`o)", "(≧◡≦)", "( ´ ▽ ` )", "(^ω^)", "(^▽^)", "(^o^)", "(✧ω✧)", "(￣∀￣)", "(´∀｀*)", "(^人^)", "(o´▽`o)", "(≧◡≦)", "( ´ ▽ ` )", "(^ω^)", "(^▽^)", "(^o^)"]
  },
  {
    category: "Scared",
    icon: "😱",
    faces: ["(ノдヽ)", "(つд⊂)", "(´Å` )", "(((( ;°Д°))))", "(　ﾟДﾟ)", "((((；゜Д゜)))", "( °д°)", "(((( ﾟдﾟ))))", "(´д｀)", "(゜д゜;)", "(ノдヽ)", "(つд⊂)", "(´Å` )", "(((( ;°Д°))))", "(　ﾟДﾟ)", "((((；゜Д゜)))", "( °д°)", "(((( ﾟдﾟ))))", "(´д｀)", "(゜д゜;)"]
  },
  {
    category: "Clouds",
    icon: "☁️",
    faces: ["(☁️)", "(☁️ ☁️)", "(☁️ ☁️ ☁️)", "(☁️ ☁️ ☁️ ☁️)", "(☁️ ☁️ ☁️ ☁️ ☁️)", "(☁️)", "(☁️)", "(☁️)", "(☁️)", "(☁️)", "(☁️)", "(☁️ ☁️)", "(☁️ ☁️ ☁️)", "(☁️ ☁️ ☁️ ☁️)", "(☁️ ☁️ ☁️ ☁️ ☁️)", "(☁️)", "(☁️)", "(☁️)", "(☁️)", "(☁️)"]
  },
  {
    category: "Dead",
    icon: "💀",
    faces: ["(x_x)", "(+_+)", "(*_*)", "(X_X)", "(✖╭╮✖)", "(×﹏×)", "(x_X)", "(+_*)", "((+_+))", "(+o+)", "(x_x)", "(+_+)", "(*_*)", "(X_X)", "(✖╭╮✖)", "(×﹏×)", "(x_X)", "(+_*)", "((+_+))", "(+o+)"]
  },
  {
    category: "Worried",
    icon: "😟",
    faces: ["(・_・;)", "(・.・;)", "(￣_￣;)", "(＠_＠;)", "(~_~;)", "(；￣Д￣)", "(゜.゜)", "(•ิ_•ิ)?", "(・_•?)", "(?_?)", "(・_・;)", "(・.・;)", "(￣_￣;)", "(＠_＠;)", "(~_~;)", "(；￣Д￣)", "(゜.゜)", "(•ิ_•ิ)?", "(・_•?)", "(?_?)"]
  },
  {
    category: "Others",
    icon: "🌐",
    faces: ["(͡° ͜ʖ ͡°)", "¯\_(ツ)_/¯", "( ͡° ͜ʖ ͡°)", "ಠ_ಠ", "ʕ•ᴥ•ʔ", "( ͡° ͜ʖ ͡°)", "(╯°□°）╯︵ ┻━┻", "┻━┻ ︵ ヽ(°□°ヽ)﻿", "┬─┬ノ( º _ ºノ)", "( ͡° ͜ʖ ͡°)", "¯\_(ツ)_/¯", "( ͡° ͜ʖ ͡°)", "ಠ_ಠ", "ʕ•ᴥ•ʔ", "( ͡° ͜ʖ ͡°)", "(╯°□°）╯︵ ┻━┻", "┻━┻ ︵ ヽ(°□°ヽ)﻿", "┬─┬ノ( º _ ºノ)", "( ͡° ͜ʖ ͡°)", "¯\_(ツ)_/¯"]
  }
];

export default function LennyPage() {
  const [leftEar, setLeftEar] = useState("(");
  const [rightEar, setRightEar] = useState(")");
  const [leftEye, setLeftEye] = useState("°");
  const [rightEye, setRightEye] = useState("°");
  const [leftEyebrow, setLeftEyebrow] = useState("͡");
  const [rightEyebrow, setRightEyebrow] = useState("͡");
  const [mouth, setMouth] = useState(" ͜ʖ ");
  const [nose, setNose] = useState("");
  const [currentLenny, setCurrentLenny] = useState("( ͡° ͜ʖ ͡°)");
  const { toast } = useToast();
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    // Face assembly logic - strictly positional to ensure replacement
    const n = nose || "";
    const m = mouth || "";
    // Format: LeftEar + " " + LeftEyebrow + LeftEye + Nose + Mouth + RightEyebrow + RightEye + " " + RightEar
    const face = `${leftEar} ${leftEyebrow}${leftEye}${n}${m}${rightEyebrow}${rightEye} ${rightEar}`;
    setCurrentLenny(face);
  }, [leftEar, rightEar, leftEye, rightEye, leftEyebrow, rightEyebrow, mouth, nose]);

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    toast({
      title: "Copied!",
      description: `${text} copied to clipboard`,
    });
    setTimeout(() => setCopied(false), 2000);
  };

  const randomize = () => {
    setLeftEar(EARS[Math.floor(Math.random() * EARS.length)]);
    setRightEar(EARS[Math.floor(Math.random() * EARS.length)]);
    setLeftEye(EYES[Math.floor(Math.random() * EYES.length)]);
    setRightEye(EYES[Math.floor(Math.random() * EYES.length)]);
    setLeftEyebrow(EYEBROWS[Math.floor(Math.random() * EYEBROWS.length)]);
    setRightEyebrow(EYEBROWS[Math.floor(Math.random() * EYEBROWS.length)]);
    setMouth(MOUTHS[Math.floor(Math.random() * MOUTHS.length)]);
    setNose(Math.random() > 0.5 ? NOSES[Math.floor(Math.random() * NOSES.length)] : "");
  };

  const updatePart = (part: string, value: string) => {
    switch(part) {
      case "Left Ear": setLeftEar(value); break;
      case "Right Ear": setRightEar(value); break;
      case "Eyes": setLeftEye(value); setRightEye(value); break;
      case "Eyebrows": setLeftEyebrow(value); setRightEyebrow(value); break;
      case "Nose": setNose(value); break;
      case "Mouth": setMouth(value); break;
    }
  };

  return (
    <div className="min-h-screen bg-background font-sans">
      <Navbar />
      
      <main className="container mx-auto px-4 py-12 max-w-6xl">
        <div className="space-y-16">
          {/* Header */}
          <div className="text-center space-y-6">
            <div className="flex justify-center mb-4">
              <Link href="/">
                <img src={logoSvg} alt="ukfont" className="h-40 w-40 object-contain cursor-pointer hover:scale-105 transition-transform" />
              </Link>
            </div>
            <h1 className="text-6xl font-black tracking-tighter">
              Lenny Face <span className="text-primary">Generator</span>
            </h1>
            <p className="text-muted-foreground text-xl max-w-2xl mx-auto">
              Create your own custom lenny faces or browse thousands of unique emoticons.
            </p>
          </div>

          {/* Generator Tool */}
          <Card className="p-8 shadow-2xl border-primary/10 bg-white">
            <div className="flex flex-col items-center space-y-12">
              <div className="p-16 bg-primary/5 rounded-[2rem] border-2 border-dashed border-primary/20 w-full min-h-[250px] flex items-center justify-center relative overflow-hidden">
                <motion.div
                  key={currentLenny}
                  initial={{ scale: 0.95, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  className="text-8xl font-medium tracking-normal flex items-center justify-center whitespace-pre leading-none"
                  style={{ fontFamily: "'Inter', sans-serif" }}
                >
                  {currentLenny}
                </motion.div>
                <Button 
                  size="icon" 
                  className="absolute right-6 top-6 h-12 w-12 rounded-xl" 
                  variant="outline"
                  onClick={randomize}
                >
                  <RefreshCw className="w-6 h-6" />
                </Button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10 w-full">
                {/* Selector Sections */}
                {[
                  { label: "Left Ear", options: EARS },
                  { label: "Right Ear", options: EARS },
                  { label: "Eyes", options: EYES },
                  { label: "Eyebrows", options: EYEBROWS },
                  { label: "Nose", options: [...NOSES, ""] },
                  { label: "Mouth", options: MOUTHS },
                ].map((section, idx) => (
                  <div key={idx} className="space-y-4">
                    <label className="text-[12px] font-black uppercase tracking-[0.2em] text-primary/60">{section.label}</label>
                    <div className="grid grid-cols-5 gap-3">
                      {section.options.slice(0, 15).map((opt, oIdx) => (
                        <Button 
                          key={oIdx} 
                          variant="outline" 
                          className="h-12 text-2xl font-medium hover-elevate transition-all border-border/60 rounded-xl overflow-hidden"
                          onClick={() => updatePart(section.label, opt)}
                        >
                          {opt || "∅"}
                        </Button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>

              <Button 
                size="lg" 
                className="w-full h-20 text-2xl font-black uppercase tracking-[0.3em] rounded-3xl shadow-xl hover-elevate active-elevate-2 bg-primary text-primary-foreground"
                onClick={() => copyToClipboard(currentLenny)}
              >
                {copied ? <Check className="mr-3 w-8 h-8" /> : <Copy className="mr-3 w-8 h-8" />}
                Copy Custom Lenny
              </Button>
            </div>
          </Card>

          {/* Categorized Lists */}
          <div className="space-y-20">
            {EMOTICONS.map((cat, i) => (
              <div key={i} className="space-y-8">
                <div className="flex items-center gap-4 border-b-2 border-primary/10 pb-4">
                  <span className="text-4xl">{cat.icon}</span>
                  <h2 className="text-3xl font-black uppercase tracking-tight">{cat.category}</h2>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-10 gap-4">
                  {cat.faces.map((face, fIdx) => (
                    <Button
                      key={fIdx}
                      variant="ghost"
                      className="h-20 text-[1.1rem] font-medium bg-white/50 border border-border/30 hover:border-primary/50 hover:bg-white hover:shadow-md transition-all rounded-xl p-2 whitespace-pre-wrap break-all leading-tight flex items-center justify-center text-center"
                      onClick={() => copyToClipboard(face)}
                    >
                      {face}
                    </Button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}
