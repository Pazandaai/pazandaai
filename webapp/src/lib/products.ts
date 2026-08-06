export interface ProductCategory {
  id: string;
  label: string;
  emoji: string;
  image?: string;
}

export interface Product {
  key: string;
  label: string;
  emoji: string;
  category: string;
  aliases?: string[];
}

export const DEFAULT_CATEGORIES: ProductCategory[] = [
  { id: "veg", label: "Sabzavotlar", emoji: "🥕" },
  { id: "greens", label: "Ko'kat & Ziravor", emoji: "🌿" },
  { id: "meat", label: "Go'sht & Baliq", emoji: "🥩" },
  { id: "dairy", label: "Sut & Tuxum", emoji: "🥛" },
  { id: "grain", label: "Un & Don", emoji: "🌾" },
  { id: "fruit", label: "Mevalar", emoji: "🍎" },
  { id: "nuts", label: "Yong'oq & Urug'", emoji: "🥜" },
  { id: "pantry", label: "Yog', Sous & Qo'shimcha", emoji: "🫒" },
];

const P = (key: string, label: string, emoji: string, category: string, aliases: string[] = []): Product =>
  ({ key, label, emoji, category, aliases });

export const DEFAULT_PRODUCTS: Product[] = [
  // 🥕 Sabzavotlar
  P("sabzi", "Sabzi", "🥕", "veg", ["sariq sabzi", "qizil sabzi"]),
  P("piyoz", "Piyoz", "🧅", "veg", ["qizil piyoz", "ko'k piyoz", "sharlot piyoz", "yashil piyoz"]),
  P("kartoshka", "Kartoshka", "🥔", "veg"),
  P("batat", "Shirin kartoshka (batat)", "🍠", "veg", ["batat"]),
  P("sarimsoq", "Sarimsoq", "🧄", "veg"),
  P("pomidor", "Pomidor", "🍅", "veg", ["tomat"]),
  P("bodring", "Bodring", "🥒", "veg"),
  P("bulgor", "Bulg'or qalampiri", "🫑", "veg", ["bolg'or"]),
  P("achchiq", "Achchiq qalampir", "🌶️", "veg", ["chili", "jalapeno", "xalapeno"]),
  P("karam", "Karam", "🥬", "veg", ["savoy karami"]),
  P("zucchini", "Qovoqcha (zucchini)", "🥒", "veg", ["zucchini", "qovoqcha"]),
  P("baklajon", "Baklajon", "🍆", "veg"),
  P("lavlagi", "Lavlagi", "🥬", "veg"),
  P("turp", "Turp (Marg'ilon)", "🥗", "veg", ["marg'ilon turpi"]),
  P("qoziqorin", "Qo'ziqorin", "🍄", "veg", ["shampinyon", "veshenka"]),
  P("ispanoq", "Ispanoq / Kale", "🥬", "veg", ["kale", "mangold", "xardal barglari"]),
  // 🌿 Ko'kat & Ziravor
  P("kashnich", "Kashnich", "🌿", "greens", ["kashnich urug'lari"]),
  P("petrushka", "Petrushka", "🌿", "greens"),
  P("ukrop", "Ukrop", "🌿", "greens"),
  P("rayhon", "Rayhon (basil)", "🌿", "greens", ["basil", "reyhan"]),
  P("yalpiz", "Yalpiz", "🌿", "greens"),
  P("shivit", "Shivit", "🌿", "greens"),
  P("rozmarin", "Rozmarin", "🌿", "greens"),
  P("timyan", "Timyan", "🌿", "greens"),
  P("estragon", "Estragon", "🌿", "greens"),
  P("zira", "Zira", "🟤", "greens"),
  P("koriandr", "Koriandr", "🌱", "greens"),
  P("kurkuma", "Kurkuma", "🟡", "greens", ["zardachub"]),
  P("karri", "Karri", "🍛", "greens"),
  P("dolchin", "Dolchin", "🍂", "greens"),
  P("vanil", "Vanil", "🌼", "greens", ["vanilin", "vanil ekstrakti"]),
  P("hil", "Hil (kardamon)", "🌱", "greens", ["kardamon"]),
  P("zanjabil", "Zanjabil", "🫚", "greens"),
  P("fenxel", "Fenxel", "🌱", "greens", ["fenxel urug'lari"]),
  P("tuz", "Tuz", "🧂", "greens", ["dengiz tuzi"]),
  P("murch", "Qora murch", "⚫", "greens", ["murch"]),
  // 🥩 Go'sht & Baliq
  P("mol", "Mol go'shti", "🥩", "meat", ["mol tili", "mol jigari"]),
  P("qoy", "Qo'y go'shti", "🍖", "meat", ["qo'y qovurg'asi"]),
  P("tovuq", "Tovuq", "🍗", "meat", ["tovuq qanotchalari"]),
  P("qiyma", "Qiyma", "🍖", "meat"),
  P("jigar", "Jigar", "🍖", "meat"),
  P("bekon", "Bekon", "🥓", "meat"),
  P("qazi", "Qazi", "🍖", "meat"),
  P("dumba", "Dumba yog'i", "🍖", "meat"),
  P("somon", "Somon (losos)", "🐟", "meat", ["losos", "baliq"]),
  // 🥛 Sut & Tuxum
  P("tuxum", "Tuxum", "🥚", "dairy", ["tuxum sarig'i", "tuxum oqi"]),
  P("sut", "Sut", "🥛", "dairy"),
  P("qaymoq", "Qaymoq", "🍶", "dairy", ["heavy cream"]),
  P("saryog", "Sariyog'", "🧈", "dairy", ["saryog'"]),
  P("qatiq", "Qatiq / Kefir", "🥛", "dairy", ["kefir", "buttermilk", "suzma"]),
  P("smetana", "Smetana", "🥛", "dairy"),
  P("yogurt", "Yogurt", "🥛", "dairy"),
  P("tvorog", "Tvorog / Cream cheese", "🧀", "dairy", ["cream cheese", "panir"]),
  P("pishloq", "Pishloq", "🧀", "dairy", ["motsarella", "cheddar", "feta", "brynza", "parmezan", "xallumi", "echki pishlog'i", "rikotta", "pishlog'i"]),
  P("muzqaymoq", "Muzqaymoq", "🍨", "dairy"),
  P("kondensat", "Quyultirilgan sut", "🥫", "dairy", ["quyultirilgan sut", "sgushchenka", "kondensirovannoye"]),
  // 🌾 Un & Don
  P("guruch", "Guruch", "🍚", "grain", ["devzira", "lazer", "guruch uni"]),
  P("un", "Un", "🌾", "grain", ["bug'doy uni"]),
  P("javdar", "Javdar uni", "🌾", "grain", ["javdar uni", "grechka uni"]),
  P("suli", "Suli uni / yormasi", "🥣", "grain", ["suli yormasi"]),
  P("makkoun", "Makkajo'xori uni", "🌽", "grain", ["cornmeal"]),
  P("kraxmal", "Kraxmal", "🥣", "grain", ["kartoshka kraxmali"]),
  P("manna", "Manna yarmasi", "🥣", "grain", ["manka"]),
  P("makaron", "Makaron / Spagetti", "🍝", "grain", ["spagetti", "pasta", "maron"]),
  P("ugra", "Ugra", "🍜", "grain", ["uy ugrasi"]),
  P("lagmon", "Lag'mon ugrasi", "🍜", "grain", ["lag'mon"]),
  P("xamirturush", "Xamirturush", "🫧", "grain", ["drojji", "sourdough", "hamirturush"]),
  P("kreker", "Kreker", "🍪", "grain", ["grek krekeri", "perezel"]),
  P("non", "Non / Muffin", "🍞", "grain", ["muffin", "inglizcha muffin"]),
  P("kinoa", "Kinoa / Yarma", "🥣", "grain", ["kinoa", "yarma", "farro"]),
  P("grechka", "Grechka", "🥣", "grain", ["grechka uni"]),
  P("bulgur", "Bulg'or (bulgur)", "🌾", "grain", ["bulgur"]),
  P("nohot", "Nohut", "🫘", "grain", ["noxat", "nohot dukkagi"]),
  P("lobiya", "Lobiya", "🫘", "grain", ["qora lobiya", "loviya"]),
  // 🍎 Mevalar
  P("olma", "Olma", "🍎", "fruit", ["olmali sous", "applesauce"]),
  P("nok", "Nok", "🍐", "fruit"),
  P("shaftoli", "Shaftoli", "🍑", "fruit"),
  P("orik", "O'rik", "🍑", "fruit"),
  P("olxori", "Olxori", "🍇", "fruit"),
  P("uzum", "Uzum", "🍇", "fruit"),
  P("banan", "Banan", "🍌", "fruit"),
  P("mango", "Mango", "🥭", "fruit", ["gvayava", "papaya"]),
  P("ananas", "Ananas", "🍍", "fruit"),
  P("tarvuz", "Tarvuz", "🍉", "fruit"),
  P("qovun", "Qovun", "🍈", "fruit"),
  P("apelsin", "Apelsin", "🍊", "fruit"),
  P("limon", "Limon", "🍋", "fruit", ["limon sharbati", "limon rendasi"]),
  P("laym", "Laym", "🍋", "fruit", ["laym sharbati"]),
  P("greypfrut", "Greypfrut", "🍊", "fruit"),
  P("qulupnay", "Qulupnay", "🍓", "fruit"),
  P("chernika", "Chernika", "🫐", "fruit", ["smorodina"]),
  P("anor", "Anor", "🔴", "fruit"),
  P("xurmo", "Xurmo (unab)", "🌰", "fruit", ["unab", "medjool"]),
  P("mayiz", "Mayiz", "🍇", "fruit"),
  P("avokado", "Avokado", "🥑", "fruit"),
  // 🥜 Yong'oq & Urug'
  P("yongoq", "Yong'oq", "🌰", "nuts", ["gretskiy", "pekan"]),
  P("bodom", "Bodom", "🌰", "nuts", ["bodom uni", "bodom pastasi"]),
  P("funduk", "Funduk", "🌰", "nuts", ["findiq"]),
  P("pista", "Pista", "🥜", "nuts"),
  P("yeryongoq", "Yer-yong'oq", "🥜", "nuts", ["peanut", "yer-yong'oq pastasi"]),
  P("kunchut", "Kunchut", "⚪", "nuts", ["sezam", "taxini", "kunchut yog'i"]),
  P("qovoqurug", "Qovoq urug'i", "🎃", "nuts", ["pepitas"]),
  P("chia", "Chia / Zig'ir urug'i", "🫘", "nuts", ["zig'ir urug'i", "flaxseed"]),
  P("kokos", "Kokos", "🥥", "nuts", ["kokos qiyg'ichi"]),
  // 🫒 Yog', Sous & Qo'shimcha
  P("osyog", "O'simlik yog'i", "🫒", "pantry", ["o'simlik yog'i", "paxta yog'i"]),
  P("zaytun", "Zaytun yog'i", "🫒", "pantry"),
  P("kokosyog", "Kokos yog'i / suti", "🥥", "pantry", ["kokos suti", "kokos yog'i"]),
  P("soya", "Soya sousi", "🍶", "pantry", ["soyali sous"]),
  P("sirka", "Sirka", "🍶", "pantry", ["olma sirkasi", "guruch sirkasi", "oq sirka"]),
  P("tomatpasta", "Tomat pastasi", "🥫", "pantry", ["pomidor pastasi"]),
  P("tomatsous", "Tomat sousi", "🍅", "pantry", ["ketchup sousi"]),
  P("ketchup", "Ketchup", "🍅", "pantry"),
  P("mayonez", "Mayonez", "🥫", "pantry"),
  P("xardal", "Xardal", "🟡", "pantry", ["dijon"]),
  P("adjika", "Adjika / Achchiq sous", "🌶️", "pantry", ["hot sauce", "achchiq sous"]),
  P("asal", "Asal", "🍯", "pantry", ["klyon siropi", "agava siropi", "xurmo qiyomi"]),
  P("shakar", "Shakar", "🍬", "pantry"),
  P("jshakar", "Jigarrang shakar", "🍬", "pantry", ["jigarrang shakar"]),
  P("pudra", "Shakar kukuni", "🍬", "pantry", ["pudra"]),
  P("kakao", "Kakao", "🍫", "pantry"),
  P("shokolad", "Shokolad", "🍫", "pantry", ["achchiq shokolad"]),
  P("qahva", "Qahva", "☕", "pantry", ["espresso"]),
  P("choy", "Choy", "🍵", "pantry", ["qora choy"]),
  P("matcha", "Matcha choy", "🍵", "pantry", ["matcha"]),
  P("kimchi", "Kimchi", "🥬", "pantry", ["kimchi suvi"]),
  P("suv", "Mineral / Gazlangan suv", "💧", "pantry", ["gazlangan suv", "mineral suv", "club soda"]),
  P("soda", "Pishirish sodasi", "🧂", "pantry", ["baking soda", "soda"]),
  P("gulob", "Gulob (rose water)", "🌹", "pantry", ["rose water"]),
];

export const PRODUCT_CATEGORIES = DEFAULT_CATEGORIES;
export const PRODUCTS = DEFAULT_PRODUCTS;

export function getProduct(key: string): Product | undefined {
  return DEFAULT_PRODUCTS.find((p) => p.key === key);
}

export function findProduct(products: Product[], key: string): Product | undefined {
  return products.find((p) => p.key === key);
}
