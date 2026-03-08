import { useState, useMemo, useRef, useEffect } from "react";
import { Navbar } from "@/components/Navbar";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { Search, Clock, ChevronRight, X, Copy } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

const EMOJI_DATA: Record<string, { icon: string; subgroups: Record<string, string[]> }> = {
  "Smileys & Emotion": {
    icon: "😀",
    subgroups: {
      "Smiling Faces": ["😀","😃","😄","😁","😆","😅","🤣","😂","🙂","🙃","😉","😊","😇","🥲","🥹"],
      "Affection": ["🥰","😍","🤩","😘","😗","☺️","😚","😙"],
      "Tongue & Playful": ["😋","😛","😜","🤪","😝","🤑"],
      "Thinking": ["🤗","🤭","🤫","🤔"],
      "Neutral & Skeptical": ["🤐","🥴","😐","😑","😶","😏","😒","🙄","😬","🤥"],
      "Sleepy": ["😌","😔","😪","🤤","😴"],
      "Sick & Unwell": ["😷","🤒","🤕","🤢","🤮","🤧","🥵","🥶","😵","🤯"],
      "Hats & Glasses": ["🤠","🥳","🥸","😎","🤓","🧐"],
      "Worried & Sad": ["😕","😟","🙁","☹️","😮","😯","😲","😳","🥺","😦","😧","😨","😰","😥","😢","😭","😱","😖","😣","😞","😓","😩","😫","🥱"],
      "Angry": ["😤","😡","😠","🤬","😈","👿","💀","☠️"],
      "Costume": ["💩","🤡","👹","👺","👻","👽","👾","🤖"],
      "Cat Faces": ["😺","😸","😹","😻","😼","😽","🙀","😿","😾"],
      "Monkeys": ["🙈","🙉","🙊"],
      "Hearts": ["❤️","🧡","💛","💚","💙","💜","🖤","🤍","🤎","💔","❣️","💕","💞","💓","💗","💖","💘","💝","💟","❤️‍🔥","❤️‍🩹","☮️"],
      "Expressions": ["💋","💯","💢","💥","💫","💦","💨","🕳️","💬","👁️‍🗨️","💭","💤","💌"]
    }
  },
  "People & Body": {
    icon: "👋",
    subgroups: {
      "Open Hand": ["👋","🤚","🖐️","✋","🖖"],
      "Partial Fingers": ["👌","🤌","🤏","✌️","🤞","🤟","🤘","🤙"],
      "Single Finger": ["👈","👉","👆","🖕","👇","☝️"],
      "Fist": ["👍","👎","✊","👊","🤛","🤜"],
      "Two Hands": ["👏","🙌","🤲","🤝","🙏"],
      "Hand Props": ["✍️","💅","🤳"],
      "Body Parts": ["💪","🦾","🦿","🦵","🦶","👂","🦻","👃","🫀","🫁","🧠","🦷","🦴","👀","👁️","👅","👄","🫂"],
      "Baby & Child": ["👶","🧒","👦","👧"],
      "Adults": ["🧑","👱","👨","🧔","🧔‍♂️","🧔‍♀️","👩","🧓","👴","👵"],
      "Roles": ["👮","🕵️","💂","🥷","👷","🫅","🤴","👸","👳","👲","🧕","🤵","👰","🤰","🤱","👼","🎅","🤶","🧑‍🎄","🦸","🦹","🧙","🧚","🧛","🧜","🧝","🧞","🧟"],
      "Activities": ["💆","💇","🚶","🧍","🧎","🏃","💃","🕺","🕴️","👯","🧖","🛀","🧗","🏋️","🤼","🤸","🤺","🏇","⛷️","🏂","🏌️","🏄","🚣","🧘","🛌","🏊","🤽","🚴","🤾"],
      "Family": ["👫","👬","👭","💏","💑","👪","🗣️","👤","👥"]
    }
  },
  "Animals & Nature": {
    icon: "🐶",
    subgroups: {
      "Dogs & Cats": ["🐶","🐕","🦮","🐕‍🦺","🐩","🐺","🦊","🦝","🐱","🐈","🐈‍⬛"],
      "Wild Mammals": ["🐯","🦁","🐮","🐷","🐗","🐭","🐹","🐰","🐇","🐿️","🦔","🐻","🐼","🐻‍❄️","🐨","🐸","🐴","🦄","🦓","🦒","🦘","🦬","🐃","🐂","🐄","🐎","🐖","🐏","🐑","🦙","🐐","🦌","🐵","🐒","🦍","🦧","🦦","🦥","🦨","🦡","🦫","🐁","🐀"],
      "Birds": ["🐓","🦃","🦤","🦚","🦜","🦢","🦩","🕊️","🐧","🦅","🦆","🦉","🦇","🐦","🪶"],
      "Reptiles": ["🐊","🐢","🦎","🐍","🦕","🦖"],
      "Sea Life": ["🐳","🐋","🐬","🦭","🐟","🐠","🐡","🦈","🐙","🐚","🦀","🦞","🦐","🦑","🦪"],
      "Bugs": ["🐛","🦋","🐌","🐞","🐜","🪲","🪳","🦟","🦗","🪰","🦂","🕷️","🕸️","🪱"],
      "Plants & Flowers": ["💐","🌸","💮","🪷","🏵️","🌹","🥀","🌺","🌻","🌼","🌷","🌱","🪴","🌲","🌳","🌴","🪵","🌵","🎋","🎍","☘️","🍀","🍁","🍂","🍃","🌾","🍄","🌰","🦠"],
      "Sky & Weather": ["☀️","🌤️","⛅","🌥️","☁️","🌦️","🌧️","⛈️","🌩️","🌨️","❄️","☃️","⛄","🌬️","🌀","🌈","🌂","☂️","☔","⛱️","⚡","🌪️","🌫️","🌊","🌋","⛰️","🏔️","🌙","🌚","🌛","🌜","🌝","🌞","⭐","🌟","🌠","🌌","🪐","💫","✨"],
      "Earth": ["🌍","🌎","🌏","🌐","🗺️","🌑","🌒","🌓","🌔","🌕","🌖","🌗","🌘"]
    }
  },
  "Food & Drink": {
    icon: "🍕",
    subgroups: {
      "Fruits": ["🍇","🍈","🍉","🍊","🍋","🍌","🍍","🥭","🍎","🍏","🍐","🍑","🍒","🍓","🫐","🥝","🍅","🫒","🥥"],
      "Vegetables": ["🥑","🍆","🥔","🥕","🌽","🌶️","🫑","🥒","🥬","🥦","🧄","🧅","🍄","🥜","🫘","🌰"],
      "Fast Food": ["🍔","🍟","🍕","🌮","🌯","🫔","🥙","🍖","🍗","🥩","🥓","🥚","🍳","🧈","🥞","🧇","🧀","🥪","🥗","🫕"],
      "World Food": ["🍱","🍘","🍙","🍚","🍛","🍜","🍝","🍠","🍢","🍣","🍤","🍥","🥮","🍡","🥟","🦪"],
      "Bread & Pastry": ["🍞","🥐","🥖","🫓","🥨","🥯","🧆","🥧"],
      "Sweets": ["🍦","🍧","🍨","🍩","🍪","🎂","🍰","🧁","🍫","🍬","🍭","🍮","🍯","🍿"],
      "Drinks": ["☕","🍵","🧃","🥤","🧋","🍶","🍺","🍻","🥂","🍷","🫗","🥃","🍸","🍹","🧉","🍾","🧊","🥛","🍼","🫖"],
      "Dishware": ["🍽️","🍴","🥄","🔪","🫙","🧂","🥢"]
    }
  },
  "Travel & Places": {
    icon: "✈️",
    subgroups: {
      "Map & Geography": ["🌍","🌎","🌏","🌐","🗺️","🧭","🏔️","⛰️","🌋","🗻","🏕️","🏖️","🏜️","🏝️","🏞️"],
      "Buildings": ["🏟️","🏛️","🏗️","🧱","🪨","🪵","🛖","🏠","🏡","🏢","🏣","🏤","🏥","🏦","🏨","🏩","🏪","🏫","🏬","🏭","🏯","🏰","💒","🗼","🗽","⛪","🕌","🛕","🕍","⛩️","🕋"],
      "Cityscapes": ["⛲","⛺","🌁","🌃","🏙️","🌄","🌅","🌆","🌇","🌉","🌌","🌠","🎇","🎆"],
      "Ground Transport": ["🚗","🚕","🚙","🛻","🚌","🚎","🏎️","🚓","🚑","🚒","🚐","🚚","🚛","🚜","🏍️","🛵","🦽","🦼","🛺","🚲","🛴","🛹","🛼","🚏","🛤️","🛣️","⛽","🚨","🚥","🚦","🛑","🚧"],
      "Water Transport": ["⚓","🛟","⛵","🚤","🛥️","🛳️","⛴️","🚢"],
      "Air Transport": ["✈️","🛩️","🛫","🛬","🛰️","🚀","🛸","🪂","💺","🚁","🚟","🚠","🚡"],
      "Clocks": ["⌚","⏰","⏱️","⏲️","🕰️","⌛","⏳","🕛","🕧","🕐","🕜","🕑","🕝","🕒","🕞","🕓","🕟","🕔","🕠","🕕","🕡","🕖","🕢","🕗","🕣","🕘","🕤","🕙","🕥","🕚","🕦"]
    }
  },
  "Activities": {
    icon: "🎉",
    subgroups: {
      "Events": ["🎃","🎄","🎆","🎇","🧨","✨","🎉","🎊","🎋","🎍","🎎","🎏","🎐","🎑","🎀","🎁","🎗️","🎟️","🎫"],
      "Awards": ["🏆","🥇","🥈","🥉","🏅","🎖️","🏵️"],
      "Ball Sports": ["⚽","🏀","🏈","⚾","🥎","🏐","🏉","🥏","🎾","🏸","🏓"],
      "Other Sports": ["🥊","🥋","🤺","🏹","🎯","⛳","🤿","🎣","🎽","🎿","🛷","🥌","🪃","🏒","🏑","🥍","🛹","🛼","🪁"],
      "Games & Toys": ["🎮","🕹️","🎲","♟️","🎭","🎰","🧸","🪆","🪅","🃏","🀄","🎴","🪀","🪁"],
      "Arts & Music": ["🎨","🖌️","🖍️","✏️","📝","🎭","🎬","🎤","🎧","🎼","🎹","🥁","🪘","🎷","🎺","🎸","🪗","🎻","🪕","🪈","🎙️"]
    }
  },
  "Objects": {
    icon: "💡",
    subgroups: {
      "Clothing": ["👓","🕶️","🥽","🥼","🦺","👔","👕","👖","🧣","🧤","🧥","🧦","👗","👘","🥻","🩱","🩲","🩳","👙","👚","👛","👜","👝","🎒","🧳","👒","🎩","🧢","🪖","⛑️","👑","💍","🛍️","👡","👠","👢","🥾","🥿","👞","👟","🩴"],
      "Sound & Media": ["🔔","🔕","🎵","🎶","📣","📢","🔊","🔉","🔈","🔇","📻","🎙️","🎚️","🎛️","📺","📡"],
      "Phone & Computer": ["📱","📲","☎️","📞","📟","📠","🔋","🪫","💻","🖥️","🖨️","⌨️","🖱️","🖲️","💽","💾","💿","📀","🧮"],
      "Camera & Light": ["🎥","📷","📸","📹","📼","🔍","🔎","🕯️","💡","🔦","🏮","🪔"],
      "Books & Office": ["📔","📒","📕","📗","📘","📙","📚","📖","🔖","🏷️","💰","🪙","💴","💵","💶","💷","💸","💳","🧾","📊","📈","📉","🗒️","🗓️","📆","📅","🗑️","📋","📌","📍","🗂️","📁","📂","✂️","🖇️","📎","📏","📐","✉️","📧","📨","📩","📤","📥","📦","📫","📬","📭","📮","🗳️","🖊️","🖋️","✒️"],
      "Tools": ["🔧","🪛","🔨","🪚","⛏️","⚒️","🛠️","⚔️","🗡️","🛡️","🪤","🪜","🧲","🪝","🧰","🪣","⚙️","🔩","🔗","🪡","🧷","📎","🗜️","🔑","🗝️","🔐","🔒","🔓","🔏"],
      "Medical": ["💉","🩸","💊","🩹","🩺","🩻","🩼","🧬","🔬","🔭"],
      "Household": ["🪑","🚪","🛏️","🛋️","🪞","🪟","🛁","🚿","🚽","🪠","🪒","🧴","🧷","🧹","🧺","🧻","🪣","🧼","🫧","🪥","🧽","🧯","🛒"],
      "Misc Objects": ["🚬","⚰️","🪦","⚱️","🏺","🔮","📿","🧿","🪬","💎","🧸","🪆","🪅","🪄","💣","🔫","🪃","🏹","🎏","🧨","🎊","🎈","🎀","🎁","🪩","🪞","🪟"]
    }
  },
  "Symbols": {
    icon: "❤️",
    subgroups: {
      "Arrows": ["⬆️","↗️","➡️","↘️","⬇️","↙️","⬅️","↖️","↕️","↔️","↩️","↪️","⤴️","⤵️","🔃","🔄","🔙","🔚","🔛","🔜","🔝"],
      "Warnings": ["⚠️","🚸","⛔","🚫","🚳","🚭","🚯","🚱","🚷","📵","🔞","☢️","☣️","ℹ️"],
      "Zodiac": ["♈","♉","♊","♋","♌","♍","♎","♏","♐","♑","♒","♓","⛎"],
      "Religion": ["✝️","☪️","🕉️","☸️","✡️","🔯","🕎","☯️","☦️","🛐","⚛️","🉑","🈶","🈚","🈸","🈺","🈷️","✴️","🆚","💮","🉐","㊙️","㊗️","🈴","🈵","🈹","🈲"],
      "Buttons": ["🆔","🆖","🆗","🆙","🆒","🆕","🆓","🆘","🅰️","🅱️","🆎","🆑","🅾️","🅿️","💯","📶","🔣","🔤","🔡","🔠","0️⃣","1️⃣","2️⃣","3️⃣","4️⃣","5️⃣","6️⃣","7️⃣","8️⃣","9️⃣","🔟","🔢","#️⃣","*️⃣"],
      "Media Controls": ["▶️","⏸️","⏹️","⏺️","⏭️","⏮️","⏩","⏪","⏫","⏬","◀️","🔼","🔽","🔀","🔁","🔂"],
      "Geometric": ["🔴","🟠","🟡","🟢","🔵","🟣","🟤","⚫","⚪","🔶","🔷","🔸","🔹","🔺","🔻","💠","🔘","🔲","🔳","▪️","▫️","◾","◽","◼️","◻️","🟥","🟧","🟨","🟩","🟦","🟪","🟫","⬛","⬜"],
      "Misc Symbols": ["♻️","🔱","📛","🔰","⭕","✅","☑️","✔️","❎","❌","❓","❔","❕","❗","〰️","💱","💲","⚕️","♾️","⚧️","‼️","⁉️","〽️","🛗","🔅","🔆"]
    }
  },
  "Flags": {
    icon: "🏁",
    subgroups: {
      "Special Flags": ["🏁","🚩","🎌","🏴","🏳️","🏳️‍🌈","🏳️‍⚧️","🏴‍☠️","🏴󠁧󠁢󠁥󠁮󠁧󠁿","🏴󠁧󠁢󠁳󠁣󠁴󠁿","🏴󠁧󠁢󠁷󠁬󠁳󠁿"],
      "Flags A–F": ["🇦🇫","🇦🇱","🇩🇿","🇦🇩","🇦🇴","🇦🇬","🇦🇷","🇦🇲","🇦🇺","🇦🇹","🇦🇿","🇧🇸","🇧🇭","🇧🇩","🇧🇧","🇧🇾","🇧🇪","🇧🇿","🇧🇯","🇧🇹","🇧🇴","🇧🇦","🇧🇼","🇧🇷","🇧🇳","🇧🇬","🇧🇫","🇧🇮","🇨🇻","🇰🇭","🇨🇲","🇨🇦","🇨🇫","🇹🇩","🇨🇱","🇨🇳","🇨🇴","🇰🇲","🇨🇬","🇨🇩","🇨🇷","🇨🇮","🇭🇷","🇨🇺","🇨🇾","🇨🇿","🇩🇰","🇩🇯","🇩🇲","🇩🇴","🇪🇨","🇪🇬","🇸🇻","🇬🇶","🇪🇷","🇪🇪","🇸🇿","🇪🇹","🇫🇯","🇫🇮","🇫🇷"],
      "Flags G–M": ["🇬🇦","🇬🇲","🇬🇪","🇩🇪","🇬🇭","🇬🇷","🇬🇩","🇬🇹","🇬🇳","🇬🇼","🇬🇾","🇭🇹","🇭🇳","🇭🇺","🇮🇸","🇮🇳","🇮🇩","🇮🇷","🇮🇶","🇮🇪","🇮🇱","🇮🇹","🇯🇲","🇯🇵","🇯🇴","🇰🇿","🇰🇪","🇰🇮","🇰🇼","🇰🇬","🇱🇦","🇱🇻","🇱🇧","🇱🇸","🇱🇷","🇱🇾","🇱🇮","🇱🇹","🇱🇺","🇲🇬","🇲🇼","🇲🇾","🇲🇻","🇲🇱","🇲🇹","🇲🇭","🇲🇷","🇲🇺","🇲🇽","🇫🇲","🇲🇩","🇲🇨","🇲🇳","🇲🇪","🇲🇦","🇲🇿","🇲🇲"],
      "Flags N–Z": ["🇳🇦","🇳🇷","🇳🇵","🇳🇱","🇳🇿","🇳🇮","🇳🇪","🇳🇬","🇳🇴","🇴🇲","🇵🇰","🇵🇼","🇵🇸","🇵🇦","🇵🇬","🇵🇾","🇵🇪","🇵🇭","🇵🇱","🇵🇹","🇶🇦","🇷🇴","🇷🇺","🇷🇼","🇰🇳","🇱🇨","🇻🇨","🇼🇸","🇸🇲","🇸🇹","🇸🇦","🇸🇳","🇷🇸","🇸🇱","🇸🇬","🇸🇰","🇸🇮","🇸🇧","🇸🇴","🇿🇦","🇸🇸","🇪🇸","🇱🇰","🇸🇩","🇸🇷","🇸🇪","🇨🇭","🇸🇾","🇹🇼","🇹🇯","🇹🇿","🇹🇭","🇹🇱","🇹🇬","🇹🇴","🇹🇹","🇹🇳","🇹🇷","🇹🇲","🇺🇬","🇺🇦","🇦🇪","🇬🇧","🇺🇸","🇺🇾","🇺🇿","🇻🇺","🇻🇪","🇻🇳","🇾🇪","🇿🇲","🇿🇼"]
    }
  }
};

const ALL_EMOJIS = Object.entries(EMOJI_DATA).flatMap(([group, { subgroups }]) =>
  Object.entries(subgroups).flatMap(([subgroup, emojis]) =>
    emojis.map(emoji => ({ emoji, group, subgroup }))
  )
);
const UNIQUE_EMOJIS = Array.from(new Map(ALL_EMOJIS.map(e => [e.emoji, e])).values());

const SKIN_TONES = [, "\u{1F3FB}", "\u{1F3FC}", "\u{1F3FD}", "\u{1F3FE}", "\u{1F3FF}"];
const SKIN_TONE_COLORS = ["#FFD93D","#FDDBB4","#F1C27D","#E0AC69","#C68642","#8D5524"];
const MAX_RECENT = 36;

export default function EmojiPage() {
  const [search, setSearch] = useState("");
  const [activeGroup, setActiveGroup] = useState<string | null>(null);
  const [copiedEmoji, setCopiedEmoji] = useState<string | null>(null);
  const [recentEmojis, setRecentEmojis] = useState<string[]>([]);
  const [selectedEmoji, setSelectedEmoji] = useState<{ emoji: string; group: string; subgroup: string } | null>(null);
  const [skinTone, setSkinTone] = useState(0);
  const { toast } = useToast();
  const searchRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "/" && document.activeElement !== searchRef.current) {
        e.preventDefault();
        searchRef.current?.focus();
      }
      if (e.key === "Escape") { setSearch(""); setSelectedEmoji(null); }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  const applySkintone = (emoji: string) => {
    if (skinTone === 0) return emoji;
    const tone = SKIN_TONES[skinTone];
    const skinnable = /[\u{1F466}-\u{1F469}\u{1F46B}-\u{1F46D}\u{1F575}\u{1F645}-\u{1F647}\u{1F64B}\u{1F64D}\u{1F64E}\u{1F926}\u{1F937}-\u{1F939}\u{1F93C}-\u{1F93E}\u{1F9B8}\u{1F9B9}\u{1F9CD}-\u{1F9CF}\u{1F9D1}-\u{1F9DD}\u{26F9}\u{1F3C3}-\u{1F3C4}\u{1F3CA}\u{1F442}\u{1F443}\u{1F446}-\u{1F44F}\u{1F470}-\u{1F478}\u{1F47C}\u{1F481}-\u{1F483}\u{1F485}\u{1F486}\u{1F48F}\u{1F491}\u{261D}\u{270A}-\u{270D}\u{1F590}\u{1F595}\u{1F596}\u{1FAF0}-\u{1FAF8}]/u.test(emoji);
    return skinnable ? emoji + tone : emoji;
  };

  const copyToClipboard = (rawEmoji: string) => {
    const emoji = applySkintone(rawEmoji);
    navigator.clipboard.writeText(emoji).then(() => {
      setCopiedEmoji(rawEmoji);
      setRecentEmojis(prev => [rawEmoji, ...prev.filter(e => e !== rawEmoji)].slice(0, MAX_RECENT));
      toast({ title: `${emoji} Copied!`, description: "Emoji copied to clipboard" });
      setTimeout(() => setCopiedEmoji(null), 1500);
    });
  };

  const filteredResults = useMemo(() => {
    if (!search.trim()) return null;
    const q = search.toLowerCase();
    return UNIQUE_EMOJIS.filter(({ group, subgroup }) =>
      group.toLowerCase().includes(q) || subgroup.toLowerCase().includes(q)
    ).slice(0, 300);
  }, [search]);

  const displayGroups = activeGroup
    ? { [activeGroup]: EMOJI_DATA[activeGroup] }
    : EMOJI_DATA;

  return (
    <div className="min-h-screen bg-white text-zinc-900 font-sans">
      <Navbar />
      <main className="max-w-7xl mx-auto px-4 py-10">

        {/* Header */}
        <div className="mb-8 flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div>
            <h1 className="text-5xl font-black tracking-tighter leading-none">
              Emoji <span className="text-primary">Library</span>
            </h1>
            <p className="text-zinc-500 mt-2 text-lg">
              {UNIQUE_EMOJIS.length.toLocaleString()} emojis · Click to copy · Unicode 15.1
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-zinc-400 text-xs uppercase tracking-widest mr-1">Skin tone</span>
            {SKIN_TONES.map((_, i) => (
              <button
                key={i}
                onClick={() => setSkinTone(i)}
                title={["Default","Light","Medium-Light","Medium","Medium-Dark","Dark"][i]}
                className={`w-8 h-8 rounded-full flex items-center justify-center text-sm transition-all border-2 ${
                  skinTone === i ? "border-primary scale-110 shadow-md" : "border-zinc-200 hover:border-zinc-400"
                }`}
                style={{ background: SKIN_TONE_COLORS[i] }}
              />
            ))}
          </div>
        </div>

        {/* Search */}
        <div className="relative mb-8 max-w-2xl">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-zinc-400" />
          <Input
            ref={searchRef}
            placeholder="Search by category name… (press / to focus)"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="h-14 pl-12 pr-12 text-base bg-zinc-50 border-zinc-200 rounded-2xl placeholder:text-zinc-400"
          />
          {search && (
            <button onClick={() => setSearch("")} className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-700">
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        {/* Recently Used */}
        {recentEmojis.length > 0 && !search && (
          <div className="mb-8 p-5 bg-zinc-50 rounded-2xl border border-zinc-100">
            <div className="flex items-center gap-2 mb-3">
              <Clock className="h-4 w-4 text-zinc-400" />
              <span className="text-zinc-500 text-xs font-bold uppercase tracking-widest">Recently Used</span>
            </div>
            <div className="flex flex-wrap gap-1">
              {recentEmojis.map((emoji, i) => (
                <EmojiBtn key={i} emoji={emoji} copied={copiedEmoji === emoji}
                  onClick={() => copyToClipboard(emoji)}
                  onRightClick={() => setSelectedEmoji(UNIQUE_EMOJIS.find(e => e.emoji === emoji) || null)}
                  applyTone={applySkintone}
                />
              ))}
            </div>
          </div>
        )}

        {/* Search Results */}
        {filteredResults && (
          <div className="mb-8">
            {filteredResults.length === 0 ? (
              <div className="text-center py-20 text-zinc-400">
                <div className="text-6xl mb-4">🔍</div>
                <p className="text-xl font-bold text-zinc-600">No results</p>
                <p className="text-sm mt-1">Try "food", "animals", "flags", "hearts", etc.</p>
              </div>
            ) : (
              <>
                <p className="text-zinc-400 text-sm mb-4 font-medium">
                  {filteredResults.length} results for <span className="text-zinc-700 font-bold">"{search}"</span>
                </p>
                <div className="flex flex-wrap gap-1">
                  {filteredResults.map(({ emoji }, i) => (
                    <EmojiBtn key={i} emoji={emoji} copied={copiedEmoji === emoji}
                      onClick={() => copyToClipboard(emoji)}
                      onRightClick={() => setSelectedEmoji(UNIQUE_EMOJIS.find(e => e.emoji === emoji) || null)}
                      applyTone={applySkintone}
                    />
                  ))}
                </div>
              </>
            )}
          </div>
        )}

        {/* Category Tabs */}
        {!search && (
          <>
            <div className="flex gap-2 mb-8 overflow-x-auto pb-2" style={{ scrollbarWidth: "none" }}>
              <button
                onClick={() => setActiveGroup(null)}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold whitespace-nowrap border transition-all ${
                  !activeGroup ? "bg-primary text-white border-primary" : "bg-white text-zinc-600 border-zinc-200 hover:border-zinc-400"
                }`}
              >All</button>
              {Object.entries(EMOJI_DATA).map(([group, { icon }]) => (
                <button
                  key={group}
                  onClick={() => setActiveGroup(activeGroup === group ? null : group)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold whitespace-nowrap border transition-all ${
                    activeGroup === group ? "bg-primary text-white border-primary" : "bg-white text-zinc-600 border-zinc-200 hover:border-zinc-400"
                  }`}
                >
                  <span>{icon}</span>
                  <span className="hidden sm:inline">{group}</span>
                </button>
              ))}
            </div>

            <div className="space-y-12">
              {Object.entries(displayGroups).map(([group, { icon, subgroups }]) => (
                <section key={group}>
                  <div className="flex items-center gap-3 mb-5 pb-3 border-b border-zinc-100">
                    <span className="text-3xl">{icon}</span>
                    <h2 className="text-2xl font-black tracking-tight">{group}</h2>
                    <span className="ml-auto text-zinc-400 text-sm font-medium">
                      {Object.values(subgroups).flat().length}
                    </span>
                  </div>
                  <div className="space-y-5">
                    {Object.entries(subgroups).map(([subgroup, emojis]) => (
                      <div key={subgroup}>
                        <p className="text-zinc-400 text-xs font-bold uppercase tracking-widest mb-2 flex items-center gap-1">
                          <ChevronRight className="h-3 w-3" />{subgroup}
                        </p>
                        <div className="flex flex-wrap gap-1">
                          {emojis.map((emoji, i) => (
                            <EmojiBtn key={i} emoji={emoji} copied={copiedEmoji === emoji}
                              onClick={() => copyToClipboard(emoji)}
                              onRightClick={() => setSelectedEmoji({ emoji, group, subgroup })}
                              applyTone={applySkintone}
                            />
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </section>
              ))}
            </div>
          </>
        )}
      </main>

      {/* Detail Panel */}
      <AnimatePresence>
        {selectedEmoji && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/10 z-40" onClick={() => setSelectedEmoji(null)} />
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="fixed right-4 top-1/2 -translate-y-1/2 w-72 bg-white border border-zinc-200 rounded-2xl shadow-2xl p-6 z-50"
            >
              <button onClick={() => setSelectedEmoji(null)} className="absolute top-4 right-4 text-zinc-400 hover:text-zinc-700">
                <X className="h-4 w-4" />
              </button>
              <div className="text-8xl text-center mb-5">{selectedEmoji.emoji}</div>
              <div className="space-y-3 text-sm">
                <div>
                  <p className="text-zinc-400 text-xs font-bold uppercase tracking-widest">Group</p>
                  <p className="font-bold mt-0.5">{selectedEmoji.group}</p>
                </div>
                <div>
                  <p className="text-zinc-400 text-xs font-bold uppercase tracking-widest">Category</p>
                  <p className="font-bold mt-0.5">{selectedEmoji.subgroup}</p>
                </div>
                <div>
                  <p className="text-zinc-400 text-xs font-bold uppercase tracking-widest">Unicode</p>
                  <p className="font-mono text-xs text-primary mt-0.5 break-all">
                    {[...selectedEmoji.emoji].map(c => `U+${c.codePointAt(0)!.toString(16).toUpperCase().padStart(4,'0')}`).join(' ')}
                  </p>
                </div>
              </div>
              <button
                onClick={() => { copyToClipboard(selectedEmoji.emoji); setSelectedEmoji(null); }}
                className="mt-5 w-full bg-primary text-white font-black py-3 rounded-xl hover:opacity-90 flex items-center justify-center gap-2"
              >
                <Copy className="h-4 w-4" /> Copy Emoji
              </button>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}

function EmojiBtn({ emoji, copied, onClick, onRightClick, applyTone }: {
  emoji: string; copied: boolean; onClick: () => void; onRightClick: () => void; applyTone: (e: string) => string;
}) {
  return (
    <motion.button
      whileHover={{ scale: 1.2 }} whileTap={{ scale: 0.85 }}
      onClick={onClick}
      onContextMenu={e => { e.preventDefault(); onRightClick(); }}
      title="Click to copy · Right-click for details"
      className={`relative w-11 h-11 flex items-center justify-center text-2xl rounded-xl transition-all ${
        copied ? "bg-primary/10 ring-2 ring-primary" : "bg-zinc-50 hover:bg-zinc-100 border border-zinc-100 hover:border-zinc-200"
      }`}
    >
      {applyTone(emoji)}
      <AnimatePresence>
        {copied && (
          <motion.div
            initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            className="absolute -top-7 left-1/2 -translate-x-1/2 bg-primary text-white text-[9px] font-black px-2 py-0.5 rounded-full whitespace-nowrap pointer-events-none"
          >
            COPIED!
          </motion.div>
        )}
      </AnimatePresence>
    </motion.button>
  );
}
