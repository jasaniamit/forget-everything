import { useState, useRef, useCallback } from "react";
import { Navbar } from "@/components/Navbar";
import { Copy, Check, Shuffle, ChevronDown, Search, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

// ─── PART LIBRARY ─────────────────────────────────────────────────────────────
// Each part is its own independent state — selecting one replaces its slot only.

const ARMS: { label: string; l: string; r: string }[] = [
  { label: "( )",     l: "(",   r: ")" },
  { label: "ヽ ﾉ",   l: "ヽ",  r: "ﾉ" },
  { label: "ʕ ʔ",    l: "ʕ",   r: "ʔ" },
  { label: "⎝ ⎠",    l: "⎝",   r: "⎠" },
  { label: "[ ]",    l: "[",   r: "]" },
  { label: "⸮ ?",    l: "⸮",   r: "?" },
  { label: "ᕙ ᕗ",   l: "ᕙ(",  r: ")ᕗ" },
  { label: "ᕦ ᕥ",   l: "ᕦ(",  r: ")ᕥ" },
  { label: "༼ ༽",   l: "༼",   r: "༽" },
  { label: "ᖗ ᖘ",   l: "ᖗ",   r: "ᖘ" },
  { label: "୧ ୨",   l: "୧(",  r: ")୨" },
  { label: "ง ง",   l: "(ง",  r: ")ง" },
  { label: "¯\\_/¯", l: "¯\\_(", r: ")_/¯" },
  { label: "╯  ╯",  l: "(╯",  r: ")╯" },
  { label: "ლ ლ",   l: "ლ(",  r: ")ლ" },
  { label: "⤜ ⤏",   l: "⤜(",  r: ")⤏" },
  { label: "| |",    l: "|(",   r: ")|" },
  { label: "ʢ ʡ",   l: "ʢ",   r: "ʡ" },
  { label: "﴾ ﴿",   l: "﴾",   r: "﴿" },
  { label: "{ }",    l: "{",   r: "}" },
];

const EYES_PAIRS: { label: string; l: string; r: string }[] = [
  { label: "° °",    l: "°",   r: "°" },
  { label: "• •",    l: "•",   r: "•" },
  { label: "ʘ ʘ",   l: "ʘ",   r: "ʘ" },
  { label: "◕ ◕",   l: "◕",   r: "◕" },
  { label: "◉ ◉",   l: "◉",   r: "◉" },
  { label: "ಠ ಠ",   l: "ಠ",   r: "ಠ" },
  { label: "⊙ ⊙",   l: "⊙",   r: "⊙" },
  { label: "* *",    l: "*",   r: "*" },
  { label: "^ ^",    l: "^",   r: "^" },
  { label: "- -",    l: "-",   r: "-" },
  { label: "~ ~",    l: "~",   r: "~" },
  { label: "x x",    l: "x",   r: "x" },
  { label: "T T",    l: "T",   r: "T" },
  { label: "$ $",    l: "$",   r: "$" },
  { label: "> <",    l: ">",   r: "<" },
  { label: "⩾ ⩽",   l: "⩾",   r: "⩽" },
  { label: "σ σ",   l: "σ",   r: "σ" },
  { label: "◔ ◔",   l: "◔",   r: "◔" },
  { label: "☉ ☉",   l: "☉",   r: "☉" },
  { label: "⍤ ⍤",   l: "⍤",   r: "⍤" },
  { label: "✧ ✧",   l: "✧",   r: "✧" },
  { label: "♥ ♥",   l: "♥",   r: "♥" },
  { label: "⚆ ⚆",   l: "⚆",   r: "⚆" },
  { label: "☼ ☼",   l: "☼",   r: "☼" },
  { label: "ò ó",   l: "ò",   r: "ó" },
  { label: "ó ò",   l: "ó",   r: "ò" },
  { label: "⇀ ↼",   l: "⇀",   r: "↼" },
  { label: "◐ ◑",   l: "◐",   r: "◑" },
  { label: "¬ ¬",   l: "¬",   r: "¬" },
  { label: "👁 👁",  l: "👁",  r: "👁" },
  { label: "◞ ◟",   l: "◞",   r: "◟" },
  { label: "⌐■ ■",  l: "⌐■",  r: "■" },
  { label: "ᴗ ᴗ",   l: "ᴗ",   r: "ᴗ" },
  { label: "ʖ ʖ",   l: "ʖ",   r: "ʖ" },
];

const BROWS: { label: string; v: string }[] = [
  { label: "͡ (default)", v: "͡" },
  { label: "none",        v: "" },
  { label: "͠ (angry)",   v: "͠" },
  { label: "̿ (raised)",  v: " ̿" },
  { label: "ᵔ (happy)",  v: "ᵔ" },
  { label: "• (dot)",     v: "•" },
  { label: "~ (wavy)",    v: "~" },
  { label: "- (flat)",    v: "-" },
  { label: "ˇ (v)",      v: "ˇ" },
  { label: "` (grave)",   v: "`" },
];

const NOSES: { label: string; v: string }[] = [
  { label: "ʖ (classic)",  v: " ͜ʖ " },
  { label: "none",          v: "" },
  { label: "ل (arabic)",   v: " ͟ل͜ " },
  { label: "ل (plain)",    v: " ل " },
  { label: "⌔ (diamond)",  v: " ⌔ " },
  { label: "ᗝ",            v: " ᗝ " },
  { label: "ᗨ",            v: " ᗨ " },
  { label: "ᴥ",            v: " ᴥ " },
  { label: "👃",            v: "👃" },
  { label: "🐽",            v: "🐽" },
  { label: "◡",            v: " ◡ " },
  { label: "_ (under)",    v: " _ " },
  { label: "· (dot)",      v: " · " },
  { label: "人",            v: " 人 " },
  { label: "ʬ",            v: " ʬ " },
];

const MOUTHS: { label: string; v: string }[] = [
  { label: "none", v: "" },
  { label: "ω",   v: "ω" },
  { label: "◡",   v: "◡" },
  { label: "_",   v: "_" },
  { label: "v",   v: "v" },
  { label: ".",   v: "." },
  { label: "ε",   v: "ε" },
  { label: "Д",   v: "Д" },
  { label: "益",  v: "益" },
  { label: "﹏",  v: "﹏" },
  { label: "∀",   v: "∀" },
  { label: "o",   v: "o" },
  { label: "O",   v: "O" },
  { label: "◠",   v: "◠" },
  { label: "‿",   v: "‿" },
  { label: "‸",   v: "‸" },
  { label: "ヮ",  v: "ヮ" },
  { label: "皿",  v: "皿" },
  { label: "□",   v: "□" },
  { label: "З",   v: "З" },
  { label: "з",   v: "з" },
  { label: "ツ",  v: "ツ" },
  { label: "Ĺ̯",  v: "Ĺ̯" },
  { label: "ロ",  v: "ロ" },
  { label: "ل",   v: "ل" },
  { label: "ᗜ",   v: "ᗜ" },
  { label: "³",   v: "³" },
  { label: "▾",   v: "▾" },
  { label: "w",   v: "w" },
  { label: "╭╮",  v: "╭╮" },
  { label: "ᴥ",   v: "ᴥ" },
  { label: "ᗨ",   v: "ᗨ" },
  { label: "෴",   v: "෴" },
  { label: "👄",  v: "👄" },
  { label: "👅",  v: "👅" },
];

// ─── FACE COLLECTION ─────────────────────────────────────────────────────────
// Tags system — every face can have multiple tags
interface FaceEntry {
  face: string;
  tags: string[];
}

const ALL_FACES: FaceEntry[] = [
  // Classic
  { face: "( ͡° ͜ʖ ͡°)",       tags: ["classic","happy","lenny"] },
  { face: "( ͠° ͟ʖ ͡°)",       tags: ["classic","shifty","lenny"] },
  { face: "( ͡° ʖ̯ ͡°)",       tags: ["classic","sad","lenny"] },
  { face: "( ͡~ ͜ʖ ͡°)",       tags: ["classic","wink","lenny"] },
  { face: "( ͡° ͜ʖ ͡ °)",      tags: ["classic","lenny"] },
  { face: "( ͡° ͜ʖ ͡ °)ᕤ",    tags: ["classic","fight","lenny"] },
  { face: "( ͡°( ͡° ͜ʖ( ͡° ͜ʖ ͡°)ʖ ͡°) ͡°)", tags: ["classic","lenny","nested"] },

  // Happy
  { face: "ᕕ( ᐛ )ᕗ",          tags: ["happy","running"] },
  { face: "( ´ ▽ ` )ﾉ",        tags: ["happy","wave"] },
  { face: "(*^▽^*)",            tags: ["happy","cute"] },
  { face: "(´∇ﾉ｀*)ノ",         tags: ["happy"] },
  { face: "( ﾟ▽ﾟ)/",           tags: ["happy","wave"] },
  { face: "(＝⌒▽⌒＝)",          tags: ["happy","cute"] },
  { face: "(*≧▽≦)",             tags: ["happy","excited"] },
  { face: "(≧◡≦)",              tags: ["happy","cute"] },
  { face: "＼(＾▽＾)／",        tags: ["happy","excited"] },
  { face: "(*˘︶˘*).｡.:*♡",    tags: ["happy","love"] },
  { face: "(ﾉ◕ヮ◕)ﾉ*:･ﾟ✧",    tags: ["happy","excited","magic"] },
  { face: "♪~ ᕕ(ᐛ)ᕗ",         tags: ["happy","music"] },
  { face: "( ^_^)／",           tags: ["happy","wave"] },
  { face: "\\(^o^)/",           tags: ["happy","excited"] },

  // Love & Cute
  { face: "(｡♥‿♥｡)",           tags: ["love","cute"] },
  { face: "(▰˘◡˘▰)",            tags: ["love","cute"] },
  { face: "(づ｡◕‿‿◕｡)づ",      tags: ["love","cute","hug"] },
  { face: "(づ￣ ³￣)づ",        tags: ["love","kiss","hug"] },
  { face: "(ღ˘⌣˘ღ)",            tags: ["love"] },
  { face: "♡(>ᴗ•)",             tags: ["love","cute"] },
  { face: "(´• ω •`) ♡",        tags: ["love","cute"] },
  { face: "(っ.❛ ᴗ ❛.)っ",      tags: ["love","hug"] },
  { face: "♥‿♥",               tags: ["love"] },
  { face: "(ˆ ³ˆ)♥",           tags: ["love","kiss"] },
  { face: "(◕‿◕✿)",             tags: ["love","cute"] },
  { face: "( ˘ ³˘)♥",          tags: ["love","kiss"] },

  // Sad & Crying
  { face: "(╥﹏╥)",             tags: ["sad","cry"] },
  { face: "(T_T)",              tags: ["sad","cry"] },
  { face: "(;_;)",              tags: ["sad","cry"] },
  { face: "(´д｀)",             tags: ["sad"] },
  { face: "(╯_╰)",              tags: ["sad"] },
  { face: "(ಥ﹏ಥ)",             tags: ["sad","cry"] },
  { face: "༼ つ ಥ_ಥ ༽つ",      tags: ["sad","cry","bear"] },
  { face: "(;´༎ຶД༎ຶ`)",       tags: ["sad","cry","extreme"] },
  { face: "o(TヘTo)",           tags: ["sad","cry"] },
  { face: "(｡T ω T｡)",         tags: ["sad","cry","cute"] },

  // Angry
  { face: "(ノಠ益ಠ)ノ",          tags: ["angry","flip"] },
  { face: "(╬◣д◢)",             tags: ["angry"] },
  { face: "(#`皿´)",             tags: ["angry"] },
  { face: "(ง ͠° ͟ل͜ ͡°)ง",    tags: ["angry","fight","lenny"] },
  { face: "(╯°□°）╯︵ ┻━┻",    tags: ["angry","flip","table"] },
  { face: "┻━┻ ︵ヽ(`Д´)ﾉ︵ ┻━┻", tags: ["angry","flip","table"] },
  { face: "ლ(ಠ益ಠლ)",          tags: ["angry"] },
  { face: "(ง •̀_•́)ง",         tags: ["angry","fight"] },
  { face: "(ง'̀-'́)ง",           tags: ["angry","fight"] },
  { face: "╚(ಠ_ಠ)=┐",         tags: ["angry"] },

  // Surprised / Shocked / WTF
  { face: "( ﾟдﾟ)",            tags: ["shocked","wtf"] },
  { face: "(((( ;°Д°))))",     tags: ["shocked","scared"] },
  { face: "(ﾟДﾟ??)",           tags: ["shocked","confused"] },
  { face: "(O_O)",              tags: ["shocked","wtf"] },
  { face: "ʕノ•ᴥ•ʔノ ︵ ┻━┻",  tags: ["shocked","bear","flip"] },
  { face: "﴾͡๏̯͡๏﴿ O'RLY?",   tags: ["shocked","wtf"] },
  { face: "(⊙_◎)",             tags: ["confused","wtf"] },
  { face: "Σ(°△°|||)︴",       tags: ["shocked"] },
  { face: "(ﾟoﾟ)",             tags: ["shocked"] },

  // Wink & Smug
  { face: "(^_−)☆",            tags: ["wink","cool"] },
  { face: "(^_-)",              tags: ["wink"] },
  { face: "(ゝ◡╹)ノ",           tags: ["wink","cute"] },
  { face: "(･ω<)☆",            tags: ["wink"] },
  { face: "(¬‿¬)",             tags: ["smug","sly"] },
  { face: "( ͡° ͜ʖ ͡ °)ᕤ",    tags: ["smug","fight","lenny"] },
  { face: "( ͡°╭͜ʖ╮͡° )",      tags: ["smug","lenny"] },

  // Cool & Sunglasses
  { face: "(⌐■_■)",            tags: ["cool","sunglasses"] },
  { face: "(▀̿Ĺ̯▀̿ ̿)",        tags: ["cool","sunglasses"] },
  { face: "ヾ(⌐■_■)ノ♪",       tags: ["cool","sunglasses","music"] },
  { face: "( ͡■ ͜ʖ ͡■)",       tags: ["cool","sunglasses","lenny"] },
  { face: "(•_•) ( •_•)>⌐■-■ (⌐■_■)", tags: ["cool","sunglasses"] },

  // Confused & Thinking
  { face: "(•ิ_•ิ)?",           tags: ["confused","thinking"] },
  { face: "(＠_＠;)",           tags: ["confused","dizzy"] },
  { face: "(・_・?)",            tags: ["confused"] },
  { face: "( •᷄ὤ•᷅)？",        tags: ["confused","worried"] },
  { face: "(^_^;)",             tags: ["confused","nervous"] },
  { face: "(・.・;)",            tags: ["nervous","confused"] },

  // Disapproval
  { face: "ಠ_ಠ",               tags: ["disapproval","serious"] },
  { face: "ಠ╭╮ಠ",             tags: ["disapproval"] },
  { face: "ರ_ರ",               tags: ["disapproval","monocle"] },
  { face: "(¬_¬)",             tags: ["disapproval","side-eye"] },
  { face: "◉_◉",               tags: ["disapproval","crazy"] },
  { face: "ᕙ(⇀‸↼‶)ᕗ",        tags: ["disapproval","flex"] },
  { face: "( ಠ ͜ʖರೃ)",        tags: ["disapproval","lenny","monocle"] },

  // Animals — Bears
  { face: "ʕ•ᴥ•ʔ",            tags: ["bear","animal","cute"] },
  { face: "ʕ·ᴥ·ʔ",            tags: ["bear","animal"] },
  { face: "ʕ•̀ω•́ʔ✧",          tags: ["bear","animal","cute"] },
  { face: "ʕ-ᴥ-ʔ",            tags: ["bear","animal","sad"] },
  { face: "ʕ≧ᴥ≦ʔ",            tags: ["bear","animal","happy"] },
  { face: "ʕ♡˙ᴥ˙♡ʔ",         tags: ["bear","animal","love"] },
  { face: "ʕ ಡ ﹏ ಡ ʔ",       tags: ["bear","animal","sad"] },
  { face: "༼ つ ◕_◕ ༽つ",     tags: ["bear","animal","hug","cute"] },

  // Animals — Cats
  { face: "(=^･ω･^=)",         tags: ["cat","animal","cute"] },
  { face: "(=^･ｪ･^=)",         tags: ["cat","animal"] },
  { face: "(=`ω´=)",           tags: ["cat","animal","angry"] },
  { face: "(=^‥^=)",           tags: ["cat","animal","happy"] },
  { face: "(^・ω・^ )",         tags: ["cat","animal"] },
  { face: "(=^ ◡ ^=)",         tags: ["cat","animal","happy"] },

  // Animals — Dogs
  { face: "(U・x・U)",          tags: ["dog","animal","cute"] },
  { face: "(ᵔᴥᵔ)",             tags: ["dog","animal","cute"] },
  { face: "∪･ω･∪",            tags: ["dog","animal"] },
  { face: "(❍ᴥ❍ʋ)",           tags: ["dog","animal"] },
  { face: "U^ｪ^U",            tags: ["dog","animal","cute"] },

  // Shrug
  { face: "¯\\_(ツ)_/¯",       tags: ["shrug","classic"] },
  { face: "¯\\(°_o)/¯",        tags: ["shrug","confused"] },

  // Fight / Flex
  { face: "ᕦ(ò_óˇ)ᕤ",        tags: ["flex","fight","strong"] },
  { face: "୧( ಠ Д ಠ )୨",      tags: ["fight","angry"] },
  { face: "(ง ͡° ͜ʖ ͡°)ง",    tags: ["fight","lenny"] },

  // Table flip
  { face: "(ノ ゜Д゜)ノ ︵ ┻━┻", tags: ["flip","table","angry"] },
  { face: "┬─┬ノ( º _ ºノ)",   tags: ["flip","table","calm"] },
  { face: "┬┴┬┴┤ ͜ʖ ͡°) ├┬┴┬┴", tags: ["flip","table","lenny"] },

  // Music / Dance
  { face: "~(˘▾˘~)",           tags: ["dance","music"] },
  { face: "(~˘▾˘)~",           tags: ["dance","music"] },
  { face: "θ～♪",              tags: ["music","happy"] },
  { face: "ヽ(♡‿♡)ノ",         tags: ["dance","happy","love"] },

  // Point / Shoot
  { face: "(☞ﾟ∀ﾟ)☞",          tags: ["point","cool"] },
  { face: "(☞ﾟヮﾟ)☞ ☜(ﾟヮﾟ☜)", tags: ["point","cool"] },
  { face: "(☞຺ل຺͜)☞",         tags: ["point"] },

  // Dead / Derp
  { face: "(x_x)",             tags: ["dead","derp"] },
  { face: "(+_+)",             tags: ["dead","derp"] },
  { face: "(✖╭╮✖)",           tags: ["dead"] },
  { face: "(×﹏×)",            tags: ["dead","sad"] },

  // Hug
  { face: "( っ◔◡◔)っ",       tags: ["hug","cute"] },
  { face: "(つ≧▽≦)つ",         tags: ["hug","happy"] },
  { face: "ʕっ•ᴥ•ʔっ",        tags: ["hug","bear","cute"] },

  // Hide / Shy
  { face: "(*/_\\)",           tags: ["hide","shy"] },
  { face: "(/ω\\)",            tags: ["hide","shy"] },
  { face: "(つд⊂)",            tags: ["hide","shy","sad"] },
  { face: "( ◡‿◡ *)",         tags: ["shy","cute"] },

  // Salute
  { face: "(￣^￣)ゞ",          tags: ["salute"] },
  { face: "(｀д´)ゝ",           tags: ["salute","serious"] },
  { face: "(￣ー￣)ゞ",          tags: ["salute","cool"] },

  // Writing
  { face: "φ(．．;)",           tags: ["writing","thinking"] },
  { face: "φ(◎◎ヘ)",           tags: ["writing","shocked"] },
  { face: "φ(･∀･*)",           tags: ["writing","happy"] },

  // Eating / Drinking
  { face: "( ˘▽˘)っ♨",        tags: ["eating","tea"] },
  { face: "( -_-)旦~",         tags: ["eating","tea","bored"] },
  { face: "ლ(´ڡ`ლ)",          tags: ["eating","yummy"] },
  { face: "(っ˘ڡ˘ς)",         tags: ["eating","yummy"] },

  // Wave
  { face: "(^-^*)/",           tags: ["wave","happy"] },
  { face: "(･ω･)ﾉﾞ",          tags: ["wave"] },
  { face: "( ° ∀ ° )ﾉﾞ",      tags: ["wave","happy"] },

  // Others / Misc
  { face: "¯\\_(ツ)_/¯",       tags: ["shrug"] },
  { face: "( ͡ᵔ ͜ʖ ͡ᵔ )",      tags: ["lenny","classic"] },
  { face: "˙ ͜ʟ˙",            tags: ["lenny","derp"] },
  { face: "◔̯◔",              tags: ["judging","side-eye"] },
  { face: "◔ ⌣ ◔",            tags: ["happy","weird"] },
  { face: "(─‿‿─)",           tags: ["smug","happy"] },
  { face: "( ‾ʖ̫‾)",          tags: ["lenny","calm"] },
  { face: "ƪ(˘⌣˘)ʃ",         tags: ["happy","cute"] },
  { face: "ʘ‿ʘ",              tags: ["happy","cute"] },
  { face: "(ʘᗩʘ')",           tags: ["shocked","open mouth"] },
  { face: "(°ロ°)☝",           tags: ["point","shocked"] },
  { face: "Ƹ̵̡Ӝ̵̨̄Ʒ",          tags: ["butterfly","art"] },
];

// All unique tags for the filter bar
const ALL_TAGS = Array.from(
  new Set(ALL_FACES.flatMap(f => f.tags))
).sort();

// ─── HELPERS ──────────────────────────────────────────────────────────────────
function buildFace(
  armL: string, armR: string,
  browL: string, eyeL: string,
  nose: string,
  mouth: string,
  browR: string, eyeR: string
): string {
  // Structure: ARM BROW EYE NOSE MOUTH BROW EYE ARM
  // This matches the classic ( ͡° ͜ʖ ͡°) pattern:
  //   left-arm + space + left-brow + left-eye + nose + mouth + right-brow + right-eye + space + right-arm
  // Classic: ( ͡° ͜ʖ ͡°) = arm + space + brow + eye + nose + mouth + brow + eye + space + arm
  const center = `${nose}${mouth}`;
  return `${armL} ${browL}${eyeL}${center}${browR}${eyeR} ${armR}`;
}

function rand<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

// ─── COPY BUTTON ─────────────────────────────────────────────────────────────
function CopyBtn({ text, size = "sm" }: { text: string; size?: "sm" | "lg" }) {
  const [copied, setCopied] = useState(false);
  const { toast } = useToast();
  const handle = () => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    toast({ title: "Copied!", description: text });
    setTimeout(() => setCopied(false), 2000);
  };
  if (size === "lg") return (
    <button onClick={handle}
      className="flex items-center gap-2 bg-primary text-white font-black px-8 py-4 rounded-2xl text-lg hover:opacity-90 active:scale-95 transition-all shadow-lg">
      {copied ? <Check className="w-5 h-5" /> : <Copy className="w-5 h-5" />}
      {copied ? "Copied!" : "Copy Face"}
    </button>
  );
  return (
    <button onClick={handle}
      className="absolute top-2 right-2 p-1.5 rounded-lg bg-white/80 hover:bg-primary hover:text-white text-zinc-500 opacity-0 group-hover:opacity-100 transition-all shadow text-xs">
      {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
    </button>
  );
}

// ─── PART PICKER ──────────────────────────────────────────────────────────────
function PartPicker<T extends { label: string }>({
  title, options, activeIdx, onPick, renderItem,
}: {
  title: string;
  options: T[];
  activeIdx: number;
  onPick: (i: number) => void;
  renderItem: (item: T) => string;
}) {
  return (
    <div>
      <div className="text-[10px] font-black uppercase tracking-widest text-zinc-400 mb-2">{title}</div>
      <div className="flex flex-wrap gap-1.5">
        {options.map((opt, i) => (
          <button key={i} onClick={() => onPick(i)}
            className={`px-2.5 py-1.5 rounded-lg text-sm font-mono border transition-all hover:scale-105 active:scale-95 ${
              activeIdx === i
                ? "bg-primary text-white border-primary shadow-md"
                : "bg-zinc-50 text-zinc-700 border-zinc-200 hover:border-primary/50"
            }`}>
            {renderItem(opt)}
          </button>
        ))}
      </div>
    </div>
  );
}

// ─── FACE CARD ────────────────────────────────────────────────────────────────
function FaceCard({ face }: { face: string }) {
  const { toast } = useToast();
  const [copied, setCopied] = useState(false);
  const copy = () => {
    navigator.clipboard.writeText(face);
    setCopied(true);
    toast({ title: "Copied!", description: face });
    setTimeout(() => setCopied(false), 1500);
  };
  return (
    <button onClick={copy}
      className="group relative flex items-center justify-center bg-white border border-zinc-100 hover:border-primary/40 hover:shadow-md rounded-xl p-3 text-center transition-all active:scale-95 min-h-[64px]">
      <span className="text-base leading-tight font-mono break-all whitespace-pre-wrap text-zinc-800 select-all">
        {face}
      </span>
      <span className="absolute top-1.5 right-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
        {copied
          ? <Check className="w-3.5 h-3.5 text-green-500" />
          : <Copy className="w-3.5 h-3.5 text-zinc-400" />}
      </span>
    </button>
  );
}

// ─── MAIN PAGE ────────────────────────────────────────────────────────────────
export default function LennyPage() {
  // Part indices
  const [armIdx,   setArmIdx]   = useState(0);
  const [eyeIdx,   setEyeIdx]   = useState(0);
  const [browIdx,  setBrowIdx]  = useState(0);
  const [noseIdx,  setNoseIdx]  = useState(0);
  const [mouthIdx, setMouthIdx] = useState(0);

  // Collection filters
  const [search,     setSearch]     = useState("");
  const [activeTag,  setActiveTag]  = useState<string | null>(null);
  const [showAllTags, setShowAllTags] = useState(false);

  const arm   = ARMS[armIdx];
  const eyes  = EYES_PAIRS[eyeIdx];
  const brow  = BROWS[browIdx].v;
  const nose  = NOSES[noseIdx].v;
  const mouth = MOUTHS[mouthIdx].v;

  const face = buildFace(arm.l, arm.r, brow, eyes.l, nose, mouth, brow, eyes.r);

  const randomize = () => {
    setArmIdx(Math.floor(Math.random() * ARMS.length));
    setEyeIdx(Math.floor(Math.random() * EYES_PAIRS.length));
    setBrowIdx(Math.floor(Math.random() * BROWS.length));
    setNoseIdx(Math.floor(Math.random() * NOSES.length));
    setMouthIdx(Math.floor(Math.random() * MOUTHS.length));
  };

  // Filtered collection
  const filtered = ALL_FACES.filter(f => {
    const matchTag = !activeTag || f.tags.includes(activeTag);
    const matchSearch = !search || f.face.includes(search) || f.tags.some(t => t.includes(search.toLowerCase()));
    return matchTag && matchSearch;
  });

  const VISIBLE_TAGS = showAllTags ? ALL_TAGS : ALL_TAGS.slice(0, 18);

  return (
    <div className="min-h-screen bg-[#ECEEF2]">
      <Navbar />

      <div className="max-w-[1200px] mx-auto px-4 py-8 space-y-10">

        {/* ── Header ── */}
        <div className="text-center space-y-2">
          <h1 className="text-5xl font-black tracking-tighter">
            Lenny Face <span className="text-primary">Generator</span>
          </h1>
          <p className="text-zinc-500 text-lg">
            Build custom lenny faces or copy from 200+ emoticons
          </p>
        </div>

        {/* ── BUILDER ── */}
        <div className="bg-white rounded-3xl shadow-xl border border-zinc-100 overflow-hidden">

          {/* Preview bar */}
          <div className="border-b border-zinc-100 px-8 py-12 flex flex-col items-center gap-6 bg-zinc-50/60">

            {/* Big assembled face — primary focus */}
            <div className="text-6xl font-mono text-zinc-800 select-all text-center leading-relaxed tracking-wide px-10 py-8 rounded-3xl bg-white border border-zinc-100 shadow-md min-w-[360px]">
              {face}
            </div>

            {/* Part boxes — BELOW the face */}
            <div className="flex items-end justify-center gap-2 flex-wrap">
              {/* Left arm */}
              <div className="flex flex-col items-center gap-1.5">
                <div className="w-14 h-14 rounded-xl bg-white border border-zinc-200 flex items-center justify-center text-2xl font-mono text-zinc-800 shadow-sm">{arm.l}</div>
                <span className="text-[9px] font-black uppercase tracking-widest text-zinc-300">Arm</span>
              </div>
              {/* Left brow */}
              <div className="flex flex-col items-center gap-1.5">
                <div className={`w-12 h-12 rounded-xl border flex items-center justify-center text-xl font-mono shadow-sm ${brow ? "bg-white border-zinc-200 text-zinc-800" : "bg-zinc-50 border-dashed border-zinc-200 text-zinc-300"}`}>{brow || "—"}</div>
                <span className="text-[9px] font-black uppercase tracking-widest text-zinc-300">Brow</span>
              </div>
              {/* Left eye */}
              <div className="flex flex-col items-center gap-1.5">
                <div className="w-14 h-14 rounded-xl bg-white border-2 border-primary/30 flex items-center justify-center text-2xl font-mono text-zinc-800 shadow-sm">{eyes.l}</div>
                <span className="text-[9px] font-black uppercase tracking-widest text-zinc-300">Eye</span>
              </div>
              {/* Nose */}
              <div className="flex flex-col items-center gap-1.5">
                <div className={`w-14 h-14 rounded-xl border flex items-center justify-center text-xl font-mono shadow-sm ${nose ? "bg-white border-zinc-200 text-zinc-800" : "bg-zinc-50 border-dashed border-zinc-200 text-zinc-300"}`}>{nose.trim() || "·"}</div>
                <span className="text-[9px] font-black uppercase tracking-widest text-zinc-300">Nose</span>
              </div>
              {/* Mouth */}
              <div className="flex flex-col items-center gap-1.5">
                <div className={`w-14 h-14 rounded-xl border flex items-center justify-center text-2xl font-mono shadow-sm ${mouth ? "bg-white border-2 border-primary/30 text-zinc-800" : "bg-zinc-50 border-dashed border-zinc-200 text-zinc-300"}`}>{mouth || "·"}</div>
                <span className="text-[9px] font-black uppercase tracking-widest text-zinc-300">Mouth</span>
              </div>
              {/* Right brow */}
              <div className="flex flex-col items-center gap-1.5">
                <div className={`w-12 h-12 rounded-xl border flex items-center justify-center text-xl font-mono shadow-sm ${brow ? "bg-white border-zinc-200 text-zinc-800" : "bg-zinc-50 border-dashed border-zinc-200 text-zinc-300"}`}>{brow || "—"}</div>
                <span className="text-[9px] font-black uppercase tracking-widest text-zinc-300">Brow</span>
              </div>
              {/* Right eye */}
              <div className="flex flex-col items-center gap-1.5">
                <div className="w-14 h-14 rounded-xl bg-white border-2 border-primary/30 flex items-center justify-center text-2xl font-mono text-zinc-800 shadow-sm">{eyes.r}</div>
                <span className="text-[9px] font-black uppercase tracking-widest text-zinc-300">Eye</span>
              </div>
              {/* Right arm */}
              <div className="flex flex-col items-center gap-1.5">
                <div className="w-14 h-14 rounded-xl bg-white border border-zinc-200 flex items-center justify-center text-2xl font-mono text-zinc-800 shadow-sm">{arm.r}</div>
                <span className="text-[9px] font-black uppercase tracking-widest text-zinc-300">Arm</span>
              </div>
            </div>

            <div className="flex gap-3">
              <CopyBtn text={face} size="lg" />
              <button onClick={randomize}
                className="flex items-center gap-2 border-2 border-zinc-200 text-zinc-600 font-bold px-6 py-4 rounded-2xl hover:border-primary hover:text-primary transition-all">
                <Shuffle className="w-5 h-5" /> Random
              </button>
            </div>
          </div>

          {/* Part pickers */}
          <div className="p-6 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">

            {/* Arms / Ears */}
            <div>
              <div className="text-[10px] font-black uppercase tracking-widest text-zinc-400 mb-2">Arms / Ears</div>
              <div className="flex flex-wrap gap-1.5">
                {ARMS.map((a, i) => (
                  <button key={i} onClick={() => setArmIdx(i)}
                    className={`px-2.5 py-1.5 rounded-lg text-xs font-mono border transition-all hover:scale-105 ${
                      armIdx === i ? "bg-primary text-white border-primary shadow" : "bg-zinc-50 text-zinc-700 border-zinc-200 hover:border-primary/50"
                    }`}>
                    {a.l}…{a.r}
                  </button>
                ))}
              </div>
            </div>

            {/* Eyes */}
            <div>
              <div className="text-[10px] font-black uppercase tracking-widest text-zinc-400 mb-2">Eyes</div>
              <div className="flex flex-wrap gap-1.5">
                {EYES_PAIRS.map((e, i) => (
                  <button key={i} onClick={() => setEyeIdx(i)}
                    className={`px-2.5 py-1.5 rounded-lg text-sm font-mono border transition-all hover:scale-105 ${
                      eyeIdx === i ? "bg-primary text-white border-primary shadow" : "bg-zinc-50 text-zinc-700 border-zinc-200 hover:border-primary/50"
                    }`}>
                    {e.l} {e.r}
                  </button>
                ))}
              </div>
            </div>

            {/* Eyebrows */}
            <div>
              <div className="text-[10px] font-black uppercase tracking-widest text-zinc-400 mb-2">Eyebrows</div>
              <div className="flex flex-wrap gap-1.5">
                {BROWS.map((b, i) => (
                  <button key={i} onClick={() => setBrowIdx(i)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-mono border transition-all hover:scale-105 ${
                      browIdx === i ? "bg-primary text-white border-primary shadow" : "bg-zinc-50 text-zinc-700 border-zinc-200 hover:border-primary/50"
                    }`}>
                    {b.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Nose — KEY FIX: each click sets exactly one nose, replaces the slot */}
            <div>
              <div className="text-[10px] font-black uppercase tracking-widest text-zinc-400 mb-2">Nose</div>
              <div className="flex flex-wrap gap-1.5">
                {NOSES.map((n, i) => (
                  <button key={i} onClick={() => setNoseIdx(i)}
                    className={`px-2.5 py-1.5 rounded-lg text-sm font-mono border transition-all hover:scale-105 ${
                      noseIdx === i ? "bg-primary text-white border-primary shadow" : "bg-zinc-50 text-zinc-700 border-zinc-200 hover:border-primary/50"
                    }`}>
                    {n.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Mouth */}
            <div>
              <div className="text-[10px] font-black uppercase tracking-widest text-zinc-400 mb-2">Mouth</div>
              <div className="flex flex-wrap gap-1.5">
                {MOUTHS.map((m, i) => (
                  <button key={i} onClick={() => setMouthIdx(i)}
                    className={`px-2.5 py-1.5 rounded-lg text-sm font-mono border transition-all hover:scale-105 ${
                      mouthIdx === i ? "bg-primary text-white border-primary shadow" : "bg-zinc-50 text-zinc-700 border-zinc-200 hover:border-primary/50"
                    }`}>
                    {m.v || "∅"}
                  </button>
                ))}
              </div>
            </div>

          </div>
        </div>

        {/* ── COLLECTION ── */}
        <div className="space-y-5">

          <div className="flex items-center justify-between flex-wrap gap-3">
            <h2 className="text-3xl font-black tracking-tight">
              Collection <span className="text-zinc-400 font-normal text-xl">({filtered.length})</span>
            </h2>

            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search faces or tags…"
                className="pl-9 pr-9 py-2.5 rounded-xl border border-zinc-200 bg-white text-sm focus:outline-none focus:border-primary w-64"
              />
              {search && (
                <button onClick={() => setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2">
                  <X className="w-4 h-4 text-zinc-400 hover:text-zinc-700" />
                </button>
              )}
            </div>
          </div>

          {/* Tag filter pills */}
          <div className="flex flex-wrap gap-2 items-center">
            <button
              onClick={() => setActiveTag(null)}
              className={`px-3 py-1.5 rounded-full text-xs font-bold border transition-all ${
                !activeTag ? "bg-primary text-white border-primary" : "bg-white text-zinc-600 border-zinc-200 hover:border-primary/50"
              }`}>
              All
            </button>
            {VISIBLE_TAGS.map(tag => (
              <button key={tag}
                onClick={() => setActiveTag(activeTag === tag ? null : tag)}
                className={`px-3 py-1.5 rounded-full text-xs font-bold border transition-all capitalize ${
                  activeTag === tag ? "bg-primary text-white border-primary" : "bg-white text-zinc-600 border-zinc-200 hover:border-primary/50"
                }`}>
                {tag}
              </button>
            ))}
            {ALL_TAGS.length > 18 && (
              <button
                onClick={() => setShowAllTags(v => !v)}
                className="px-3 py-1.5 rounded-full text-xs font-bold border border-zinc-200 bg-white text-zinc-500 hover:border-primary/50 flex items-center gap-1 transition-all">
                {showAllTags ? "Less" : `+${ALL_TAGS.length - 18} more`}
                <ChevronDown className={`w-3 h-3 transition-transform ${showAllTags ? "rotate-180" : ""}`} />
              </button>
            )}
          </div>

          {/* Face grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
            {filtered.map((f, i) => (
              <FaceCard key={i} face={f.face} />
            ))}
          </div>

          {filtered.length === 0 && (
            <div className="text-center py-16 text-zinc-400">
              <div className="text-5xl mb-3">( ͡° ͜ʖ ͡°)</div>
              <p className="font-medium">No faces found for "{search || activeTag}"</p>
            </div>
          )}
        </div>

        {/* ── SEO / Info ── */}
        <div className="bg-white rounded-2xl p-8 border border-zinc-100 shadow space-y-4 text-zinc-600 text-sm leading-relaxed">
          <h2 className="text-2xl font-black text-zinc-900">What is a Lenny Face?</h2>
          <p>The Lenny Face <strong>( ͡° ͜ʖ ͡°)</strong> is a Unicode emoticon that originated on a Finnish imageboard in 2012. It's made of combining Unicode characters that look like a face with eyebrows, eyes, and a distinctive nose.</p>
          <p>Use the builder above to swap any part — <strong>Arms, Eyes, Eyebrows, Nose, Mouth</strong> — each click replaces only that slot, so you always get exactly the face you want. Hit <strong>Random</strong> for infinite combinations.</p>
          <p>Click any face in the collection to instantly copy it. Filter by tag (happy, angry, bear, etc.) or search to find the right face for any situation.</p>
        </div>

      </div>
    </div>
  );
}
