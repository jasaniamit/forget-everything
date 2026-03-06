import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Copy, RefreshCw, Check, ChevronDown } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { motion, AnimatePresence } from "framer-motion";
import { Navbar } from "@/components/Navbar";
import logoSvg from "@assets/logo_1768878013498.jpg";

// Font mapping logic
const FONT_MAPS: Record<string, (text: string) => string> = {
  "Serif Italic": (text) => text.split("").map(c => {
    const map: any = {
      'a': '𝘢', 'b': '𝘣', 'c': '𝘤', 'd': '𝘥', 'e': '𝘦', 'f': '𝘧', 'g': '𝘨', 'h': '𝘩', 'i': '𝘪', 'j': '𝘫', 'k': '𝘬', 'l': '𝘭', 'm': '𝘮', 'n': '𝘯', 'o': '𝘰', 'p': '𝘱', 'q': '𝘲', 'r': '𝘳', 's': '𝘴', 't': '𝘵', 'u': '𝘶', 'v': '𝘷', 'w': '𝘸', 'x': '𝘹', 'y': '𝘺', 'z': '𝘻',
      'A': '𝘈', 'B': '𝘉', 'C': '𝘊', 'D': '𝘋', 'E': '𝘌', 'F': '𝘍', 'G': '𝘎', 'H': '𝘏', 'I': '𝘐', 'J': '𝘑', 'K': '𝘒', 'L': '𝘓', 'M': '𝘔', 'N': '𝘕', 'O': '𝘖', 'P': '𝘗', 'Q': '𝘘', 'R': '𝘙', 'S': '𝘚', 'T': '𝘛', 'U': '𝘜', 'V': '𝘝', 'W': '𝘞', 'X': '𝘹', 'Y': '𝘺', 'Z': '𝘻'
    };
    return map[c] || c;
  }).join(""),
  "Bold Script": (text) => text.split("").map(c => {
    const map: any = {
      'a': '𝓪', 'b': '𝓫', 'c': '𝓬', 'd': '𝓭', 'e': '𝓮', 'f': '𝓯', 'g': '𝓰', 'h': '𝓱', 'i': '𝓲', 'j': '𝓳', 'k': '𝓴', 'l': '𝓵', 'm': '𝓶', 'n': '𝓷', 'o': '𝓸', 'p': '𝓹', 'q': '𝓺', 'r': '𝓻', 's': '𝓼', 't': '𝓽', 'u': '𝓾', 'v': '𝓿', 'w': '𝔀', 'x': '𝔁', 'y': '𝔂', 'z': '𝔃',
      'A': '𝓐', 'B': '𝓑', 'C': '𝓒', 'D': '𝓓', 'E': '𝓔', 'F': '𝓕', 'G': '𝓖', 'H': '𝓗', 'I': '𝓘', 'J': '𝓙', 'K': '𝓚', 'L': '𝓛', 'M': '𝓜', 'N': '𝓝', 'O': '𝓞', 'P': '𝓟', 'Q': '𝓠', 'R': '𝓡', 'S': '𝓢', 'T': '𝓣', 'U': '𝓤', 'V': '𝓥', 'W': '𝓦', 'X': '𝓧', 'Y': '𝓨', 'Z': '𝓩'
    };
    return map[c] || c;
  }).join(""),
  "Double Struck": (text) => text.split("").map(c => {
    const map: any = {
      'a': '𝕒', 'b': '𝕓', 'c': '𝕔', 'd': '𝕕', 'e': '𝕖', 'f': '𝕗', 'g': '𝕘', 'h': '𝕙', 'i': '𝕚', 'j': '𝕛', 'k': '𝕜', 'l': '𝕝', 'm': '𝕞', 'n': '𝕟', 'o': '𝕠', 'p': '𝕡', 'q': '𝕢', 'r': '𝕣', 's': '𝕤', 't': '𝕥', 'u': '𝕦', 'v': '𝕧', 'w': '𝕨', 'x': '𝕩', 'y': '𝕪', 'z': '𝕫',
      'A': '𝔸', 'B': '𝔹', 'C': 'ℂ', 'D': '𝔻', 'E': '𝔼', 'F': '𝔽', 'G': '𝔾', 'H': 'ℍ', 'I': '𝕀', 'J': '𝕁', 'K': '𝕂', 'L': '𝕃', 'M': '𝕄', 'N': 'ℕ', 'O': '𝕆', 'P': 'ℙ', 'Q': 'ℚ', 'R': 'ℝ', 'S': '𝕊', 'T': '𝕋', 'U': '𝕌', 'V': '𝕍', 'W': '𝕎', 'X': '𝕏', 'Y': '𝕐', 'Z': 'ℤ'
    };
    return map[c] || c;
  }).join(""),
  "Fraktur": (text) => text.split("").map(c => {
    const map: any = {
      'a': '𝔞', 'b': '𝔟', 'c': '𝔠', 'd': '𝔡', 'e': '𝔢', 'f': '𝔣', 'g': '𝔤', 'h': '𝔥', 'i': '𝔦', 'j': '𝔧', 'k': '𝔨', 'l': '𝔩', 'm': '𝔪', 'n': '𝔫', 'o': '𝔬', 'p': '𝔭', 'q': '𝔮', 'r': '𝔯', 's': '𝔰', 't': '𝔱', 'u': '𝔲', 'v': '𝔳', 'w': '𝔴', 'x': '𝔵', 'y': '𝔶', 'z': '𝔷',
      'A': '𝔄', 'B': '𝔅', 'C': 'ℭ', 'D': '𝔇', 'E': '𝔈', 'F': '𝔉', 'G': '𝔊', 'H': 'ℌ', 'I': 'ℑ', 'J': '𝔍', 'K': '𝔎', 'L': '𝔏', 'M': '𝔐', 'N': '𝔑', 'O': '𝔒', 'P': '𝔓', 'Q': '𝔔', 'R': 'ℜ', 'S': '𝔖', 'T': '𝔗', 'U': '𝔘', 'V': '𝔙', 'W': '𝔚', 'X': '𝔛', 'Y': '𝔜', 'Z': 'ℨ'
    };
    return map[c] || c;
  }).join(""),
  "Monospace": (text) => text.split("").map(c => {
    const map: any = {
      'a': '𝚊', 'b': '𝚋', 'c': '𝚌', 'd': '𝚍', 'e': '𝚎', 'f': '𝚏', 'g': '𝚐', 'h': '𝚑', 'i': 'ⁱ', 'j': '𝚓', 'k': '𝚔', 'l': '𝚕', 'm': '𝚖', 'n': '𝚗', 'o': '𝚘', 'p': '𝚙', 'q': '𝚚', 'r': '𝚛', 's': '𝚜', 't': '𝚝', 'u': '𝚞', 'v': '𝚟', 'w': '𝚠', 'x': '𝚡', 'y': '𝚢', 'z': '𝚣',
      'A': '𝙰', 'B': '𝙱', 'C': '𝙲', 'D': '𝙳', 'E': '𝙴', 'F': '𝙵', 'G': '𝙶', 'H': '𝙷', 'I': '𝙸', 'J': '𝙹', 'K': '𝙺', 'L': '𝙻', 'M': '𝙼', 'N': '𝙽', 'O': '𝙾', 'P': '𝙿', 'Q': '𝚀', 'R': '𝚁', 'S': '𝚂', 'T': '𝚃', 'U': '𝚄', 'V': '𝚅', 'W': '𝚆', 'X': '𝚇', 'Y': '𝚈', 'Z': '𝚉'
    };
    return map[c] || c;
  }).join(""),
  "Sans Bold": (text) => text.split("").map(c => {
    const map: any = {
      'a': '𝗮', 'b': '𝗯', 'c': '𝗰', 'd': '𝗱', 'e': '𝗲', 'f': '𝗳', 'g': '𝗴', 'h': '𝗵', 'i': '𝗶', 'j': '𝗷', 'k': '𝗸', 'l': '𝗹', 'm': '𝗺', 'n': '𝗻', 'o': '𝗼', 'p': '𝗽', 'q': '𝗾', 'r': '𝗿', 's': '𝘀', 't': '𝘁', 'u': '𝘂', 'v': '𝘃', 'w': '𝘄', 'x': '𝘅', 'y': '𝘆', 'z': '𝘇',
      'A': '𝗔', 'B': '𝗕', 'C': '𝗖', 'D': '𝗗', 'E': '𝗘', 'F': '𝗙', 'G': '𝗚', 'H': '𝗛', 'I': '𝗜', 'J': '𝗝', 'K': '𝗞', 'L': '𝗟', 'M': '𝗠', 'N': '𝗡', 'O': '𝗢', 'P': '𝗣', 'Q': '𝗤', 'R': '𝗥', 'S': '𝗦', 'T': '𝗧', 'U': '𝗨', 'V': '𝗩', 'W': '𝗪', 'X': '𝗫', 'Y': '𝗬', 'Z': '𝗭'
    };
    return map[c] || c;
  }).join(""),
  "Wide": (text) => text.split("").map(c => {
    const map: any = {
      'a': 'ａ', 'b': 'ｂ', 'c': 'ｃ', 'd': 'ｄ', 'e': 'ｅ', 'f': 'ｆ', 'g': 'ｇ', 'h': 'ｈ', 'i': 'ｉ', 'j': 'ｊ', 'k': 'ｋ', 'l': 'ｌ', 'm': 'ｍ', 'n': 'ｎ', 'o': 'ｏ', 'p': 'ｐ', 'q': 'ｑ', 'r': 'ｒ', 's': 'ｓ', 't': 'ｔ', 'u': 'ｕ', 'v': 'ｖ', 'w': 'ｗ', 'x': 'ｘ', 'y': 'ｙ', 'z': 'ｚ',
      'A': 'Ａ', 'B': 'Ｂ', 'C': 'Ｃ', 'D': 'Ｄ', 'E': 'Ｅ', 'F': 'Ｆ', 'G': 'Ｇ', 'H': 'Ｈ', 'I': 'Ｉ', 'J': 'Ｊ', 'K': 'Ｋ', 'L': 'Ｌ', 'M': 'Ｍ', 'N': 'Ｎ', 'O': 'Ｏ', 'P': 'Ｐ', 'Q': 'Ｑ', 'R': 'Ｒ', 'S': 'Ｓ', 'T': 'Ｔ', 'U': 'Ｕ', 'V': 'Ｖ', 'W': 'Ｗ', 'X': 'Ｘ', 'Y': 'Ａ', 'Z': 'Ｚ'
    };
    return map[c] || c;
  }).join(""),
  "Small Caps": (text) => text.split("").map(c => {
    const map: any = {
      'a': 'ᴀ', 'b': 'ʙ', 'c': 'ᴄ', 'd': 'ᴅ', 'e': 'ᴇ', 'f': 'ꜰ', 'g': 'ɢ', 'h': 'ʜ', 'i': 'ɪ', 'j': 'ᴊ', 'k': 'ᴋ', 'l': 'ʟ', 'm': 'ᴍ', 'n': 'ɴ', 'o': 'ᴏ', 'p': 'ᴘ', 'q': 'q', 'r': 'ʀ', 's': 'ꜱ', 't': 'ᴛ', 'u': 'ᴜ', 'v': 'ᴠ', 'w': 'ᴡ', 'x': 'x', 'y': 'ʏ', 'z': 'ᴢ'
    };
    return map[c.toLowerCase()] || c;
  }).join(""),
  "Tiny": (text) => text.split("").map(c => {
    const map: any = {
      'a': 'ᵃ', 'b': 'ᵇ', 'c': 'ᶜ', 'd': 'ᵈ', 'e': 'ᵉ', 'f': 'ᶠ', 'g': 'ᵍ', 'h': 'ʰ', 'i': 'ⁱ', 'j': 'ʲ', 'k': 'ᵏ', 'l': 'ˡ', 'm': 'ᵐ', 'n': 'ⁿ', 'o': 'ᵒ', 'p': 'ᵖ', 'q': 'ᵠ', 'r': 'ʳ', 's': 'ˢ', 't': 'ᵗ', 'u': 'ᵘ', 'v': 'ᵛ', 'w': 'ʷ', 'x': 'ˣ', 'y': 'ʸ', 'z': 'ᶻ'
    };
    return map[c.toLowerCase()] || c;
  }).join(""),
  "Bubble": (text) => text.split("").map(c => {
    const map: any = {
      'a': 'ⓐ', 'b': 'ⓑ', 'c': 'ⓒ', 'd': 'ⓓ', 'e': 'ⓔ', 'f': 'ⓕ', 'g': 'ⓖ', 'h': 'ⓗ', 'i': 'ⓘ', 'j': 'ⓙ', 'k': 'ⓚ', 'l': 'ⓛ', 'm': 'ⓜ', 'n': 'ⓝ', 'o': 'ⓞ', 'p': 'ⓟ', 'q': 'ⓠ', 'r': 'ⓡ', 's': 'ⓢ', 't': 'ⓣ', 'u': 'ⓤ', 'v': 'ⓥ', 'w': 'ⓦ', 'x': 'ⓧ', 'y': 'ⓨ', 'z': 'ⓩ',
      'A': 'Ⓐ', 'B': 'Ⓑ', 'C': 'Ⓒ', 'D': 'Ⓓ', 'E': 'Ⓔ', 'F': 'Ⓕ', 'G': 'Ⓖ', 'H': 'Ⓗ', 'I': 'Ⓘ', 'J': 'Ⓙ', 'K': 'Ⓚ', 'L': 'Ⓛ', 'M': 'Ⓜ', 'N': 'Ⓝ', 'O': 'Ⓞ', 'P': 'Ⓟ', 'Q': 'Ⓠ', 'R': 'Ⓡ', 'S': 'Ⓢ', 'T': 'Ⓣ', 'U': 'Ⓤ', 'V': 'Ⓥ', 'W': 'Ⓦ', 'X': 'Ⓧ', 'Y': 'Ⓨ', 'Z': 'Ⓩ'
    };
    return map[c] || c;
  }).join(""),
  "Squares": (text) => text.split("").map(c => {
    const map: any = {
      'a': '🄰', 'b': '🄱', 'c': '🄲', 'd': '🄳', 'e': '🄴', 'f': '🄵', 'g': '🄶', 'h': '🄷', 'i': '🄸', 'j': '🄹', 'k': '🄺', 'l': '🄻', 'm': '🄼', 'n': '🄽', 'o': '🄾', 'p': '🄿', 'q': '🅀', 'r': '🅁', 's': '🅂', 't': '🅃', 'u': '🅄', 'v': '🅅', 'w': '🅆', 'x': '🅇', 'y': '🅈', 'z': '🅉',
      'A': '🄰', 'B': '🄱', 'C': '🄲', 'D': '🄳', 'E': '🄴', 'F': '🄵', 'G': '🄶', 'H': '🄷', 'I': '🄸', 'J': '🄹', 'K': '🄺', 'L': '🄻', 'M': '🄼', 'N': '🄽', 'O': '🄾', 'P': '🄿', 'Q': '🅀', 'R': '🅁', 'S': '🅂', 'T': '🅃', 'U': '🅄', 'V': '🅅', 'W': '🅆', 'X': '🅇', 'Y': '🅈', 'Z': '🅉'
    };
    return map[c] || c;
  }).join(""),
  "Mirror": (text) => text.split("").map(c => {
    const map: any = {
      'a': 'ɐ', 'b': 'q', 'c': 'ɔ', 'd': 'p', 'e': 'ǝ', 'f': 'ɟ', 'g': 'ƃ', 'h': 'ɥ', 'i': 'ᴉ', 'j': 'ɾ', 'k': 'ʞ', 'l': 'l', 'm': 'ɯ', 'n': 'u', 'o': 'o', 'p': 'd', 'q': 'b', 'r': 'ɹ', 's': 's', 't': 'ʇ', 'u': 'n', 'v': 'ʌ', 'w': 'ʍ', 'x': 'x', 'y': 'ʎ', 'z': 'z',
      'A': '∀', 'B': '𐐒', 'C': 'Ɔ', 'D': 'p', 'E': 'Ǝ', 'F': 'Ⅎ', 'G': '⅁', 'H': 'H', 'I': 'I', 'J': 'Ր', 'K': 'ʞ', 'L': '˥', 'M': 'W', 'N': 'N', 'O': 'O', 'P': 'Ԁ', 'Q': 'Ό', 'R': 'ᴚ', 'S': 'S', 'T': '⊥', 'U': '∩', 'V': 'Λ', 'W': 'M', 'X': 'X', 'Y': '⅄', 'Z': 'Z'
    };
    return map[c] || c;
  }).reverse().join(""),
};

// Procedural decorative elements to reach 100+ variants
const decorations = [
  ['(っ◔◡◔)っ ', ''], ['【', '】'], ['『', '』'], ['ミ★ ', ' ★彡'],
  ['·.¸¸.·♩♪♫ ', ' ♫♪♩·.¸¸.·'], ['★彡 ', ' 彡★'], ['(o_O) ', ' (O_o)'],
  ['† ', ' †'], ['•´¯`•. ', ' .•´¯`•'], ['(¯`·.¸¸.·´¯`·.¸¸.·´¯) ', ''],
  ['.·´¯`·.¸¸.·´¯`·. ', ''], ['×º°”˜`”°º× ', ' ×º°”˜`”°º×'],
  ['•?((¯°·._.• ', ' •._.·°¯))?•'], ['—(••÷[ ', ' ]÷••)—'],
  ['¸,ø¤º°`°º¤ø,¸ ', ' ¸,ø¤º°`°º¤ø,¸'], ['╰☆☆ ', ' ☆☆╮'],
  ['ıllıllı ', ' ıllıllı'], ['¤ (¯´☆✭.¸_)¤ ', ' ¤(_¸.✭☆´¯) ¤'],
  ['『』', '『』'], ['♜ ', ' ♜'], ['░▒▓█ ', ' █▓▒░'],
  ['➶➶➶➶➶ ', ' ➷➷➷➷➷'], ['・。.・゜✭・', '・✫・゜・。.'],
  ['｡･:*:･ﾟ★,｡･:*:･ﾟ☆ ', ' ｡･:*:･ﾟ★,｡･:*:･ﾟ☆'],
  ['.｡*ﾟ+.*.｡ ', ' ﾟ+..｡*ﾟ+'], ['☆.｡.:* ', ' .｡.:*☆'],
  ['*･ﾟﾟ･*:.｡..｡.:*ﾟ:*: ', ' :*:.｡..｡.:*･ﾟﾟ･*'], ['v^v^v^v^v ', ' v^v^v^v^v'],
  ['|!¤*\'~``~*¤!| ', ' |!¤*\'~``~*¤!|'], ['(¯`*•.¸,¤°´✿.｡.:* ', ' *.:｡.✿`°¤,¸.•*´¯)'],
  ['...¤¸¸.•´¯`•.¸¸.ஐ ', ' ஐ..•.¸¸.•´¯`•.¸¸.¤...'],
  ['.•°¤*(¯`★´¯)*¤°•. ', ' .•°¤*(¯`★´¯)*¤°•.'], ['—¤÷(`[¤ ', ' ¤]´)÷¤—'],
  ['..ø¤º°`°º¤ø.. ', ' ..ø¤º°`°º¤ø..'], ['·.¸¸.·´¯`·.¸¸.· ', ' ·.¸¸.·´¯`·.¸¸.·'],
  ['(¯`·._.· ', ' ·._.·´¯)'], ['¸.•*´¨`*•.¸¸. ', ' .¸¸.•*´¨`*•.¸'],
  ['Oº°‘¨ ', ' ¨‘°ºO'], ['•·.·´¯`·.·• ', ' •·.·´¯`·.·•'],
  ['`•.¸¸.•´´¯`••._.• ', ' •._.••`¯´´•.¸¸.•`'], ['(¯`•._.• ', ' •._.•´¯)'],
  ['¸.·´¯`·.´ ', ' `·.¸¸.·´¯'], ['.·´¯`·.¸¸.·´¯`·. ', ' .·´¯`·.¸¸.·´¯`·.'],
  ['(¯`·.¸¸.-> ', ' <-.¸¸.·´¯)'], ['๑۞๑ ', ' ๑۞๑'], ['[̲̅ə̲̅] ', ' [̲̅ə̲̅]'],
  ['ஜ۩۞۩ஜ ', ' ஜ۩۞۩ஜ'], ['(͡° ͜ʖ ͡°) ', ' (͡° ͜ʖ ͡°)'], ['ʕ•ᴥ•ʔ ', ' ʕ•ᴥ•ʔ'],
  ['(▀̿Ĺ̯▀̿ ̿) ', ' (▀̿Ĺ̯▀̿ ̿)'], ['(づ｡◕‿‿◕｡)づ ', ''], ['༼ つ ◕_◕ ༽つ ', ''],
  ['(☞ﾟ∀ﾟ)☞ ', ''], ['(╯°□°）╯︵ ┻━┻ ', ''], ['¯\\_(ツ)_/¯ ', ''],
  ['( ͡° ͜ʖ ͡°) ', ''], ['(づ￣ ³￣)づ ', ''], ['(ᵔᴥᵔ) ', ''],
  ['(•ω•) ', ''], ['(づ◔ ◡ ◔)づ ', ''], ['(◕‿◕✿) ', ''],
  ['(◡‿◡✿) ', ''], ['(ʘ‿ʘ) ', ''], ['(♥_♥) ', ''],
  ['(>_<) ', ''], ['(ง\'̀-\'́)ง ', ''], ['(͡๏̯͡๏) ', ''],
  ['(¬‿¬) ', ''], ['(╥﹏╥) ', ''], ['(╯◕_◕)╯ ', ''],
  ['(•_•) ', ''], ['(⌐■_■) ', ''], ['(◔ ◡ ◔) ', ''],
  ['(◕ ◡ ◔) ', ''], ['( ◡ ◡ ) ', ''], ['(◕ᴥ◕) ', ''],
  ['╚» ', ' «╝'], ['« ', ' »'], ['◈ ', ' ◈'],
  ['▣ ', ' ▣'], ['▢ ', ' ▢'], ['◉ ', ' ◉'],
  ['◎ ', ' ◎'], ['● ', ' ●'], ['○ ', ' ○'],
  ['◌ ', ' ◌'], ['◍ ', ' ◍'], ['◓ ', ' ◓'],
  ['◒ ', ' ◒'], ['◑ ', ' ◑'], ['◐ ', ' ◐'],
  ['◖ ', ' ◖'], ['◗ ', ' ◗'], ['◀ ', ' ▶'],
  ['◄ ', ' ►'], ['▼ ', ' ▲'], ['▽ ', ' △'],
  ['◁ ', ' ▷'], ['◢ ', ' ◣'], ['◥ ', ' ◤'],
  ['◘ ', ' ◘'], ['◙ ', ' ◙'], ['❦ ', ' ❦'],
  ['❧ ', ' ❧'], ['☙ ', ' ☙'], ['❤ ', ' ❤'],
];

const generateVariants = (text: string) => {
  const baseFonts = Object.entries(FONT_MAPS).map(([name, generator]) => ({
    name,
    text: generator(text)
  }));

  const decorated = decorations.map(([prefix, suffix], i) => ({
    name: `Style ${i + 1}`,
    text: `${prefix}${text}${suffix}`
  }));

  const mixed = decorations.slice(0, 50).map(([prefix, suffix], i) => {
    const fontGenerators = Object.values(FONT_MAPS);
    const gen = fontGenerators[i % fontGenerators.length];
    return {
      name: `Special ${i + 1}`,
      text: `${prefix}${gen(text)}${suffix}`
    };
  });

  return [...baseFonts, ...decorated, ...mixed];
};

export default function IGGenerator() {
  const [inputText, setInputText] = useState("");
  const [results, setResults] = useState<{ name: string; text: string }[]>([]);
  const [displayCount, setDisplayCount] = useState(20);
  const { toast } = useToast();
  const [copiedId, setCopiedId] = useState<string | null>(null);

  useEffect(() => {
    const text = inputText || "Type something here...";
    setResults(generateVariants(text));
    setDisplayCount(20); // Reset count when input changes
  }, [inputText]);

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    toast({
      title: "Copied!",
      description: "Text copied to clipboard",
    });
    setTimeout(() => setCopiedId(null), 2000);
  };

  const loadMore = () => {
    setDisplayCount(prev => Math.min(prev + 20, results.length));
  };

  const visibleResults = results.slice(0, displayCount);

  return (
    <div className="min-h-screen bg-background font-sans">
      <Navbar />
      
      <main className="p-6 space-y-8 max-w-5xl mx-auto">
        <div className="flex flex-col items-center mb-8">
          <img src={logoSvg} alt="ukfont" className="h-24 w-24 object-contain mb-4" />
          <h1 className="text-4xl font-black text-center tracking-tight">
            Instagram <span className="text-primary">Fonts</span>
          </h1>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto text-center mt-4">
            Generate fancy, stylish fonts for your Instagram bio, captions, and comments. Simply type your text and copy the style you like.
          </p>
        </div>

        <Card className="p-8 shadow-xl border-primary/10 bg-white dark:bg-card">
          <div className="space-y-6">
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-[0.2em] text-primary">YOUR TEXT</label>
              <Input
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                placeholder="Type or paste your text here..."
                className="text-xl h-14 font-medium border-2 border-border/40 focus-visible:ring-primary focus-visible:border-primary transition-all rounded-xl"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <AnimatePresence mode="popLayout">
                {visibleResults.map((result, idx) => (
                  <motion.div
                    key={`${result.name}-${idx}`}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: Math.min(idx * 0.05, 0.5) }}
                    layout
                  >
                    <Card className="p-4 hover:border-primary/40 transition-all group relative bg-background/50 border-border/40 overflow-hidden">
                      <div className="flex flex-col gap-3">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60">{result.name}</span>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-8 w-8 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                            onClick={() => copyToClipboard(result.text, result.name)}
                          >
                            {copiedId === result.name ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
                          </Button>
                        </div>
                        <p className="text-2xl font-medium break-all leading-tight">
                          {result.text}
                        </p>
                      </div>
                    </Card>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>

            {displayCount < results.length && (
              <div className="flex justify-center pt-8">
                <Button 
                  onClick={loadMore} 
                  variant="outline" 
                  size="lg"
                  className="rounded-xl font-black uppercase tracking-widest px-12 h-14 border-2 hover:bg-primary hover:text-white hover:border-primary transition-all"
                >
                  <ChevronDown className="mr-2 h-5 w-5" />
                  Load More Styles
                </Button>
              </div>
            )}
          </div>
        </Card>

        <div className="prose prose-sm max-w-none text-muted-foreground/80 bg-white/50 p-8 rounded-2xl border border-border/40">
          <h2 className="text-foreground font-black uppercase tracking-tighter">About Instagram Font Generator</h2>
          <p>
            Our Instagram Font Generator is a free online tool that allows you to convert standard text into various fancy and stylish fonts. 
            These fonts are created using Unicode characters, which means they are compatible with most social media platforms including Instagram, 
            Facebook, Twitter, and TikTok.
          </p>
          <h3 className="text-foreground font-bold">How to use?</h3>
          <ol>
            <li>Type your text in the input box above.</li>
            <li>Our tool will instantly generate dozens of stylish variations.</li>
            <li>Click the copy button or just click on the font you like.</li>
            <li>Paste it into your Instagram bio, caption, or comments.</li>
          </ol>
        </div>
      </main>
    </div>
  );
}
