/* ============ アルヴェイン王国記 ============ */
const $=s=>document.querySelector(s);

/* ---------- 状態 ---------- */
let S=null;
function rnd(a,b){return a+Math.random()*(b-a);}
function ri(a,b){return Math.floor(rnd(a,b+1));}

/* ---------- 兵士ポートレート(スプライトシート) ---------- */
const ICON_VARIANTS_PER_CLASS=3; // 1職業あたりの見た目バリエーション数(units.pngの行数)
// 文字列から安定した0〜mod-1の整数を得る(旧セーブにiconVariantが無い場合のフォールバック用)
function hashInt(str,mod){
  let h=0;
  for(let i=0;i<str.length;i++)h=(h*31+str.charCodeAt(i))|0;
  return Math.abs(h)%mod;
}
// ユニットの見た目バリエーション(0〜ICON_VARIANTS_PER_CLASS-1)を解決する。
// 新規生成分はu.iconVariantを直接使い、無い場合(旧セーブ等)はu.idから決定論的に導出する。
function iconVariantOf(u){
  if(u&&Number.isInteger(u.iconVariant)&&u.iconVariant>=0&&u.iconVariant<ICON_VARIANTS_PER_CLASS)return u.iconVariant;
  return hashInt((u&&(u.id||u.nm))||"?",ICON_VARIANTS_PER_CLASS);
}
// 兵士の職業アイコン(スプライトシート切り出し)のHTML片を生成する共通ヘルパー
function classpicHtml(u){
  return `<div class="classpic classpic-${u.cls}-${iconVariantOf(u)}"></div>`;
}

/* ジョブ(職系統)・レア度・種族・個別兵士 ―― 栄冠ナイン式の個人管理 */
const JOB_TREES={
 warrior:{label:"戦士系",chain:[
   {key:"recruit",name:"新兵",min:1,bonus:0},{key:"soldier",name:"剣士",min:6,bonus:4},
   {key:"vet",name:"剛剣士",min:14,bonus:9},{key:"elite",name:"精鋭兵",min:25,bonus:16},
   {key:"captain",name:"剣聖",min:40,bonus:26},{key:"hero",name:"剣王",min:62,bonus:40}]},
 mage:{label:"魔法系",chain:[
   {key:"recruit",name:"魔法使い見習い",min:1,bonus:0},{key:"soldier",name:"魔法使い",min:6,bonus:4},
   {key:"vet",name:"魔導士",min:14,bonus:9},{key:"elite",name:"大魔導師",min:25,bonus:17},
   {key:"captain",name:"賢者",min:40,bonus:27},{key:"hero",name:"魔導王",min:62,bonus:42}]},
 archer:{label:"弓術系",chain:[
   {key:"recruit",name:"弓兵見習い",min:1,bonus:0},{key:"soldier",name:"弓兵",min:6,bonus:4},
   {key:"vet",name:"狙撃手",min:14,bonus:9},{key:"elite",name:"精鋭弓兵",min:25,bonus:16},
   {key:"captain",name:"弓聖候補",min:40,bonus:26},{key:"hero",name:"弓聖",min:62,bonus:41}]},
 monk:{label:"拳法系",chain:[
   {key:"recruit",name:"拳士見習い",min:1,bonus:0},{key:"soldier",name:"拳士",min:6,bonus:4},
   {key:"vet",name:"武闘家",min:14,bonus:9},{key:"elite",name:"達人",min:25,bonus:16},
   {key:"captain",name:"拳聖候補",min:40,bonus:26},{key:"hero",name:"拳聖",min:62,bonus:41}]},
 priest:{label:"神官系",chain:[
   {key:"recruit",name:"神官見習い",min:1,bonus:0},{key:"soldier",name:"神官",min:6,bonus:4},
   {key:"vet",name:"司祭",min:14,bonus:9},{key:"elite",name:"大司祭",min:25,bonus:16},
   {key:"captain",name:"枢機卿",min:40,bonus:26},{key:"hero",name:"聖者",min:62,bonus:41}]},
 hunter:{label:"狩人系",chain:[
   {key:"recruit",name:"見習い狩人",min:1,bonus:0},{key:"soldier",name:"狩人",min:6,bonus:4},
   {key:"vet",name:"密偵",min:14,bonus:9},{key:"elite",name:"隠密",min:25,bonus:16},
   {key:"captain",name:"影の頭領",min:40,bonus:26},{key:"hero",name:"影王",min:62,bonus:41}]},
};
/* ジョブ分岐(4段階目=elite到達時に選ぶ、18ルート。以降の名称・二つ名・ステータス傾向が変わる) */
const JOB_ROUTES={
 warrior:[
  {key:"heavy",label:"重剣",main:"str",sub:"vit",light:"agi",names:{elite:"重剣兵",captain:"大剣豪",hero:"剛剣王"},nickname:"剛剣の担い手"},
  {key:"dual",label:"双剣",main:"agi",sub:"str",light:"vit",names:{elite:"双剣兵",captain:"剣舞士",hero:"剣舞王"},nickname:"舞い斬る刃"},
  {key:"guard",label:"守剣",main:"lead",sub:"vit",light:"str",names:{elite:"守剣兵",captain:"守剣士",hero:"不動の盾王"},nickname:"揺るがぬ盾"},
 ],
 mage:[
  {key:"attack",label:"攻撃魔導",main:"int",sub:"agi",light:"wis",names:{elite:"火術師",captain:"破魔師",hero:"破魔導王"},nickname:"焔を纏う者"},
  {key:"support",label:"補助魔導",main:"wis",sub:"lead",light:"int",names:{elite:"支援術師",captain:"秘術師",hero:"大賢導王"},nickname:"叡智の紡ぎ手"},
  {key:"summon",label:"召喚魔導",main:"int",sub:"wis",light:"agi",names:{elite:"召喚術師",captain:"幻獣使い",hero:"幻獣導王"},nickname:"獣を呼ぶ者"},
 ],
 archer:[
  {key:"snipe",label:"狙撃",main:"agi",sub:"wis",light:"str",names:{elite:"精密射手",captain:"百中の射手",hero:"弓聖(狙撃)"},nickname:"一射必中"},
  {key:"rapid",label:"連射",main:"agi",sub:"str",light:"wis",names:{elite:"速射手",captain:"乱れ撃ちの弓兵",hero:"弓聖(速射)"},nickname:"矢継ぎ早の風"},
  {key:"skirmish",label:"遊撃",main:"agi",sub:"lead",light:"wis",names:{elite:"影走りの射手",captain:"影駆けの射手",hero:"弓聖(遊撃)"},nickname:"影を縫う矢"},
 ],
 monk:[
  {key:"hard",label:"剛拳",main:"str",sub:"agi",light:"vit",names:{elite:"剛拳士",captain:"剛拳王",hero:"拳聖(剛)"},nickname:"岩砕く拳"},
  {key:"soft",label:"柔拳",main:"agi",sub:"vit",light:"str",names:{elite:"柔拳士",captain:"柔拳皇",hero:"拳聖(柔)"},nickname:"風に流す身"},
  {key:"chi",label:"気拳",main:"int",sub:"wis",light:"vit",names:{elite:"気拳士",captain:"気拳仙",hero:"拳聖(気)"},nickname:"内に満つる氣"},
 ],
 priest:[
  {key:"heal",label:"治癒",main:"wis",sub:"vit",light:"int",names:{elite:"治癒師",captain:"治癒司祭",hero:"聖者(治癒)"},nickname:"癒しの手"},
  {key:"bless",label:"祝福",main:"lead",sub:"wis",light:"vit",names:{elite:"祝福師",captain:"祝福司祭",hero:"聖者(祝福)"},nickname:"恵みを注ぐ者"},
  {key:"smite",label:"討魔",main:"str",sub:"int",light:"vit",names:{elite:"討魔僧",captain:"討魔司祭",hero:"聖者(討魔)"},nickname:"魔を討つ聖槍"},
 ],
 hunter:[
  {key:"assassin",label:"暗殺",main:"agi",sub:"str",light:"wis",names:{elite:"暗殺者",captain:"必殺の刃",hero:"影王(暗殺)"},nickname:"音無き刃"},
  {key:"intel",label:"諜報",main:"wis",sub:"lead",light:"agi",names:{elite:"諜報員",captain:"諜報頭",hero:"影王(諜報)"},nickname:"千里の耳目"},
  {key:"track",label:"追跡",main:"agi",sub:"wis",light:"lead",names:{elite:"猟犬遣い",captain:"百鬼追いの猟人",hero:"影王(追跡)"},nickname:"決して逃さぬ者"},
 ],
};
function routeInfo(cls,routeKey){return (JOB_ROUTES[cls]||[]).find(r=>r.key===routeKey)||null;}
function jobFor(cls,lv,routeKey){
  const chain=JOB_TREES[cls].chain;let j=chain[0];for(const c of chain)if(lv>=c.min)j=c;
  if(routeKey&&(j.key==="elite"||j.key==="captain"||j.key==="hero")){
    const r=routeInfo(cls,routeKey);
    if(r)return{...j,name:r.names[j.key]};
  }
  return j;
}
function pickClass(){
  const magicLv=(S&&S.st)?S.st.magic:6;
  const w={warrior:34,archer:15,monk:11,mage:8+Math.min(20,magicLv*0.7),priest:12,hunter:15};
  const tot=Object.values(w).reduce((a,b)=>a+b,0);let r=Math.random()*tot;
  for(const k in w){if(r<w[k])return k;r-=w[k];}
  return "warrior";
}
/* レア度別・特性(直接は表示しないが内部で階層管理) */
const TRAIT_NORMAL=[
 {key:"brave", name:"勇敢",   desc:"戦役での戦力に貢献する",gm:1.04,moralGrow:0.1},
 {key:"tough", name:"頑丈",   desc:"怪我・脱落をしにくい",gm:1.0,injuryMult:0.33},
 {key:"quick", name:"俊敏",   desc:"訓練の伸びが良い",gm:1.08},
 {key:"leader",name:"統率",   desc:"周りの士気をわずかに上げる",gm:1.02,loyaltyGrow:0.15},
 {key:"clumsy",name:"不器用", desc:"成長がやや遅い",gm:0.9},
 {key:"lucky", name:"強運",   desc:"何かと運が良い",gm:1.03,deathMult:0.85},
 {key:"calm",  name:"平常心", desc:"浮き沈みが少なく、怪我をしにくい",gm:1.0,injuryMult:0.85},
 {key:"big",   name:"大柄",   desc:"体が大きく力がある",gm:1.02,injuryMult:0.92},
 {key:"small",  name:"小柄",   desc:"小柄だが身のこなしが良い",gm:1.05},
 {key:"careful",name:"慎重",   desc:"危険を避けるのが上手い",gm:1.0,injuryMult:0.8},
 {key:"cheerful",name:"陽気",desc:"周りを明るくする",gm:1.0,moralGrow:0.2},
 {key:"stubborn2",name:"頑固者",desc:"一度決めたら曲げない",gm:1.0,loyaltyGrow:0.15},
 {key:"nightowl",name:"夜型",desc:"夜の任務に強い",gm:1.06},
 {key:"earlybird",name:"早起き",desc:"朝から調子が良い",gm:1.0,moralGrow:0.1},
 {key:"bookish",name:"読書家",desc:"知識欲が旺盛",gm:1.07},
 {key:"stoic",name:"寡黙",desc:"多くを語らないが芯は強い",gm:1.0,injuryMult:0.9},
 {key:"friendly",name:"人懐っこい",desc:"すぐに打ち解ける",gm:1.0,loyaltyGrow:0.1},
 {key:"nimble",name:"軽快",desc:"身のこなしが良い",gm:1.06},
 {key:"sturdy",name:"丈夫",desc:"病気一つしたことがない",gm:1.0,injuryMult:0.9},
 {key:"trn_00",name:"統率力",desc:"自然と人が付いてくる雰囲気がある",loyaltyGrow:0.1,gm:1.03},
 {key:"trn_01",name:"楽天家",desc:"何事も楽観的に捉える",moralGrow:0.0,gm:1.01},
 {key:"trn_02",name:"心配性",desc:"何かと先のことを気に病む",moralGrow:-0.11,gm:1.0},
 {key:"trn_03",name:"涙もろい",desc:"情に厚く涙もろい",loyaltyGrow:-0.09,gm:1.03},
 {key:"trn_04",name:"聞き上手",desc:"人の話をよく聞く",gm:1.03},
 {key:"trn_05",name:"倹約家",desc:"無駄遣いをしない性分",loyaltyGrow:0.09,gm:1.01},
 {key:"trn_06",name:"浪費家",desc:"羽振りの良い性分",injuryMult:0.96,gm:1.08},
 {key:"trn_07",name:"潔癖",desc:"身の回りを綺麗に保つ",loyaltyGrow:0.17,gm:1.08},
 {key:"trn_08",name:"大雑把",desc:"細部にこだわらない大らかさ",loyaltyGrow:-0.08,gm:1.02},
 {key:"trn_09",name:"律儀",desc:"約束はきっちり守る",gm:1.02},
 {key:"trn_10",name:"せっかち",desc:"気が急きやすい",injuryMult:1.01,gm:1.01},
 {key:"trn_11",name:"のんびり屋",desc:"何事も焦らず構える",moralGrow:-0.1,gm:1.03},
 {key:"trn_12",name:"凝り性",desc:"一つのことに没頭しやすい",loyaltyGrow:0.11,gm:1.0},
 {key:"trn_13",name:"飽き性",desc:"飽きっぽい面がある",moralGrow:0.08,gm:1.03},
 {key:"trn_14",name:"綺麗好き",desc:"清潔感を大事にする",moralGrow:0.15,gm:1.04},
 {key:"trn_15",name:"面倒見が良い",desc:"誰かの世話をよく焼く",loyaltyGrow:0.08,gm:1.06},
 {key:"trn_16",name:"人見知り",desc:"人見知りする性分",gm:1.04},
 {key:"trn_17",name:"社交的",desc:"誰とでも気さくに話す",moralGrow:0.21,gm:1.06},
 {key:"trn_18",name:"内気",desc:"控えめで物静か",moralGrow:0.14,gm:1.01},
 {key:"trn_19",name:"素直",desc:"裏表のない性分",moralGrow:-0.11,gm:1.01},
 {key:"trn_20",name:"天邪鬼",desc:"つむじ曲がりなところがある",gm:1.05},
 {key:"trn_21",name:"働き者",desc:"休まずよく働く",gm:1.05},
 {key:"trn_22",name:"怠け者",desc:"のんびりした性分",injuryMult:1.0,gm:1.03},
 {key:"trn_23",name:"負けん気",desc:"負けず嫌いな一面がある",moralGrow:0.17,gm:1.05},
 {key:"trn_24",name:"おっとり",desc:"のんびりとした物腰",moralGrow:0.11,gm:1.08},
 {key:"trn_25",name:"早口",desc:"早口でまくし立てる",injuryMult:1.01,gm:1.0},
 {key:"trn_26",name:"無愛想",desc:"無愛想だが悪気はない",gm:1.08},
 {key:"trn_27",name:"気配り上手",desc:"周りへの気配りを欠かさない",moralGrow:0.11,gm:1.02},
 {key:"trn_28",name:"一途",desc:"一つのことに一途",moralGrow:-0.06,gm:1.0},
 {key:"trn_29",name:"移り気",desc:"気移りしやすい",loyaltyGrow:0.14,gm:1.01},
 {key:"trn_30",name:"物静か",desc:"物静かで多くを語らない",loyaltyGrow:0.01,gm:1.01},
 {key:"trn_31",name:"短気",desc:"短気なところがある",loyaltyGrow:0.03,gm:1.07},
 {key:"trn_32",name:"涙腺弱め",desc:"涙腺が緩い",gm:1.04},
 {key:"trn_33",name:"肝が据わっている",desc:"何が起きても慌てない",gm:1.07},
 {key:"trn_34",name:"気弱",desc:"気弱なところがある",moralGrow:0.0,gm:1.02},
 {key:"trn_35",name:"強気",desc:"何事も強気に構える",gm:1.07},
 {key:"trn_36",name:"控えめ",desc:"目立つことを好まない",loyaltyGrow:-0.04,gm:1.01},
 {key:"trn_37",name:"目立ちたがり",desc:"注目を集めたがる",moralGrow:0.08,gm:1.02},
 {key:"trn_38",name:"マイペース2",desc:"自分のペースを崩さない",loyaltyGrow:0.02,gm:1.02},
 {key:"trn_39",name:"純朴",desc:"飾らない純朴さがある",injuryMult:1.07,gm:1.03},
 {key:"trn_40",name:"好奇心旺盛",desc:"何にでも興味を示す",moralGrow:0.09,gm:1.06},
 {key:"trn_41",name:"用心深い2",desc:"石橋を叩いて渡る性分",loyaltyGrow:0.19,gm:1.05},
 {key:"trn_42",name:"温和",desc:"めったなことでは腹を立てない",gm:1.06},
 {key:"intuit",name:"直感型",desc:"物事の勘所を瞬時に掴む",gm:1.12},
 {key:"ambitious",name:"野心家",desc:"上を目指す意欲が人一倍強い",gm:1.14},
 {key:"fighting_spirit",name:"気迫十分",desc:"全身から漲る気迫がある",gm:1.13},
 {key:"wary2",name:"用心深い",desc:"軽率な行動を嫌う",injuryMult:0.8},
 {key:"wild",name:"破天荒",desc:"常識に囚われない生き方をする",gm:1.22,injuryMult:1.15},
 {key:"sincere",name:"誠実",desc:"嘘偽りのない人柄",loyaltyGrow:0.12},
 {key:"sore_loser",name:"闘志を絶やさぬ者",desc:"誰にも後れを取りたくない性分",gm:1.13},
 {key:"hardship",name:"苦労人",desc:"並々ならぬ苦労を重ねてきた",gm:1.05,injuryMult:0.85},
 {key:"cool_face",name:"涼しい顔",desc:"どんな窮地でも動じない",injuryMult:0.75,deathMult:0.85},
 {key:"strong_will",name:"芯が強い",desc:"何があっても揺るがぬ意志を持つ",injuryMult:0.78},
 {key:"reckless",name:"無鉄砲",desc:"後先を考えず突き進む質",gm:1.2,injuryMult:1.2},
 {key:"serene",name:"泰然自若",desc:"何が起きても慌てず騒がず",deathMult:0.8},
 {key:"earnest",name:"生真面目",desc:"何事にもきっちりと向き合う",gm:1.08,loyaltyGrow:0.06},
 {key:"fearless",name:"大胆不敵",desc:"恐れを知らぬ豪胆さを持つ",gm:1.16,injuryMult:1.08},
 {key:"lone_wolf",name:"一匹狼",desc:"群れるより、単独での働きを好む",gm:1.1},
];
const TRAIT_RARE=[
 {key:"skilled",name:"凄腕",desc:"基礎能力が並より高い",gm:1.2,loyaltyGrow:0.2},
 {key:"stalwart",name:"豪傑",desc:"並外れた体躯を持つ",gm:1.2,injuryMult:0.75},
 {key:"clever",name:"鬼才",desc:"物覚えが人並外れて早い",gm:1.2,expMult:0.9},
 {key:"unbreak",name:"不屈",desc:"どんな逆境でも折れぬ心を持つ",gm:1.2,deathMult:0.75},
 {key:"promising",name:"期待の逸材",desc:"今はまだ粗削りだが、伸びしろを感じさせる",gm:1.4,injuryMult:0.85},
 {key:"hardworker",name:"努力家",desc:"人一倍の鍛錬を欠かさない",gm:1.0,statBonus:1},
 {key:"gifted",name:"天賦の勘",desc:"物事の勘所を掴むのが早い",gm:1.0,expMult:0.9},
 {key:"versatile",name:"一芸の資質",desc:"新しい技を身につけるのが早い",gm:1.0,skillUpChance:0.7},
 {key:"prodigy",name:"神童",desc:"幼い頃から才を示していたという",gm:1.2,expMult:0.85},
 {key:"ironwill2",name:"鋼の精神",desc:"何事にも動じない胆力を持つ",gm:1.1,injuryMult:0.7},
 {key:"swift",name:"疾風",desc:"並外れた俊足を誇る",gm:1.1,injuryMult:0.75},
 {key:"scholar",name:"博識",desc:"あらゆる分野に通じているという",gm:1.1,expMult:0.88},
 {key:"charismatic",name:"カリスマ",desc:"人を惹きつける魅力を持つ",gm:1.1,loyaltyGrow:0.3},
 {key:"resilient",name:"不撓不屈",desc:"何度倒れても立ち上がる",gm:1.2,deathMult:0.7},
 {key:"perfectionist",name:"完璧主義",desc:"手を抜くということを知らない",gm:1.15,injuryMult:0.8},
 {key:"trr_00",name:"百戦の勘",desc:"数多の修羅場を潜り抜けてきた勘を持つ",loyaltyGrow:0.27,gm:1.19},
 {key:"trr_01",name:"鉄の胃袋",desc:"どれだけ食べても疲れを見せない",moralGrow:0.19,gm:1.09},
 {key:"trr_02",name:"不眠不休",desc:"眠らずとも平然としている",injuryMult:0.66,gm:1.09},
 {key:"trr_03",name:"一騎当千の器",desc:"一騎当千と評される器を持つ",injuryMult:0.62,gm:1.13},
 {key:"trr_04",name:"名門の出",desc:"名のある家の生まれだという",injuryMult:0.7,gm:1.1},
 {key:"trr_05",name:"隠れた実力者",desc:"表には出ないが確かな実力者だという",deathMult:0.82,gm:1.08},
 {key:"trr_06",name:"義侠心",desc:"義を見てせざるは勇無きなり、を地で行く",injuryMult:0.7,gm:1.1},
 {key:"trr_07",name:"職人気質",desc:"一つの道を極めた職人気質",injuryMult:0.82,gm:1.13},
 {key:"trr_08",name:"叩き上げ",desc:"下積みから這い上がってきた芯の強さがある",loyaltyGrow:0.29,gm:1.22},
 {key:"trr_09",name:"異才",desc:"誰も予想しない発想をする",injuryMult:0.7,gm:1.09},
 {key:"trr_10",name:"生粋の武人",desc:"生粋の武人としての矜持を持つ",deathMult:0.73,gm:1.12},
 {key:"trr_11",name:"冷徹",desc:"どんな状況でも冷静さを失わない",deathMult:0.81,gm:1.08},
 {key:"trr_12",name:"果断",desc:"決断が速く迷いがない",loyaltyGrow:0.19,gm:1.1},
 {key:"trr_13",name:"豪胆",desc:"豪胆で物怖じしない",deathMult:0.87,gm:1.15},
 {key:"trr_14",name:"義に篤い",desc:"義理堅く、裏切りを何より嫌う",injuryMult:0.7,gm:1.18},
 {key:"trr_15",name:"不断の探求心",desc:"飽くなき探求心を持つ",moralGrow:0.3,gm:1.1},
 {key:"trr_16",name:"規格外の体力",desc:"常人離れした体力を誇る",loyaltyGrow:0.23,gm:1.19},
 {key:"trr_17",name:"策士",desc:"先を読む策略に長けている",deathMult:0.87,gm:1.19},
 {key:"trr_18",name:"陰の実力者",desc:"表には出ないが確かな実力を持つ",deathMult:0.85,gm:1.19},
 {key:"trr_19",name:"天性の統率",desc:"生まれながらの統率の才を感じさせる",loyaltyGrow:0.26,gm:1.11},
 {key:"trr_20",name:"義理堅い",desc:"一度受けた恩は決して忘れない",injuryMult:0.68,gm:1.08},
 {key:"trr_21",name:"鬼気迫る集中力",desc:"一つのことに驚異的な集中を見せる",moralGrow:0.39,gm:1.12},
];
const TRAIT_EPIC=[
 {key:"swordsaint",name:"剣聖の末裔",desc:"名も知れぬ剣豪の血を引くという",gm:1.4,injuryMult:0.5,deathMult:0.55},
 {key:"sageblood", name:"賢者の血脈",desc:"古の賢者の血を引くという",gm:1.4,injuryMult:0.55,loyaltyGrow:0.4},
 {key:"shadowmaster",name:"隠密の達人",desc:"常人には気配すら掴めぬという",gm:1.4,injuryMult:0.45},
 {key:"greatvessel",name:"超期待の逸材",desc:"今はまだ目立たないが、将来化けるかもしれない",gm:1.6,injuryMult:0.7},
 {key:"latebloom",name:"大成型",desc:"歳を重ねてもなお学び続ける",gm:1.2,ageTrainResist:0.6},
 {key:"dragonheart",name:"竜の心臓",desc:"竜の血脈をわずかに宿すという",gm:1.4,injuryMult:0.6},
 {key:"oracle",name:"予見者",desc:"未来の一端を見通す力を持つという",gm:1.3,expMult:0.85},
 {key:"berserker",name:"修羅",desc:"戦いのさなか、常人離れした力を発揮する",gm:1.5,injuryMult:1.3},
 {key:"guardianspirit",name:"守護の加護",desc:"見えざる何かに守られているという",gm:1.3,deathMult:0.4,injuryMult:0.5},
 {key:"tactician",name:"稀代の軍師",desc:"戦況を読む力が並外れている",gm:1.3,loyaltyGrow:0.35},
 {key:"tre_00",name:"不世出の才",desc:"この世代に二人といない才を持つという",injuryMult:0.68,deathMult:0.64,gm:1.34},
 {key:"tre_01",name:"古の技を継ぐ者",desc:"失われた古の技を今に伝えているという",injuryMult:0.48,loyaltyGrow:0.38,gm:1.32},
 {key:"tre_02",name:"魂の統率者",desc:"戦場全体を統べる魂を持つという",injuryMult:0.65,deathMult:0.61,gm:1.29},
 {key:"tre_03",name:"時代を超えた技",desc:"時代を超えて受け継がれた技を宿す",injuryMult:0.63,deathMult:0.44,gm:1.35},
 {key:"tre_04",name:"運命の申し子",desc:"何か大きな運命に導かれているという",injuryMult:0.62,deathMult:0.59,gm:1.38},
];
const TRAIT_LEGEND=[
 {key:"reborn",name:"転生者",desc:"この世界の者とは異なる知識の気配を纏っている",gm:2.0,injuryMult:0.3,deathMult:0.25,ageResist:0.8},
 {key:"legendchild",name:"伝説の落し子",desc:"御伽噺の英雄の生まれ変わりとも噂される",gm:1.6,injuryMult:0.35,deathMult:0.3,ageResist:0.7},
 {key:"starchild",name:"星降りし子",desc:"星冠王朝・竜の伝承と関わりが囁かれる、桁外れの器",gm:1.6,injuryMult:0.35,deathMult:0.3,ageResist:0.7,condFlag:"dragonPact",condPw:10,lifespanMult:2},
 {key:"chosen",name:"選ばれし者",desc:"何者かの意志によって導かれているという",gm:1.8,deathMult:0.3},
 {key:"worldender",name:"終焉を見た者",desc:"かつて世界の終わりを目撃し、生き延びたという",gm:1.7,injuryMult:0.4},
 {key:"eternalblade",name:"永遠の剣",desc:"幾多の時代を渡り歩いてきた剣士だという",gm:1.7,ageResist:0.9},
 {key:"trl_00",name:"神託を受けし者",desc:"神々の声を聞くことができるという",injuryMult:0.25,deathMult:0.31,ageResist:0.63,gm:1.74},
 {key:"trl_01",name:"世界樹の申し子",desc:"世界樹の加護を受けて生まれたという",injuryMult:0.39,deathMult:0.24,ageResist:0.66,gm:1.9},
];
const TRAIT_ALL=[...TRAIT_NORMAL,...TRAIT_RARE,...TRAIT_EPIC,...TRAIT_LEGEND];
function traitInfo(key){return TRAIT_ALL.find(t=>t.key===key)||TRAIT_NORMAL[6];}
function pickTrait(){
  const r=Math.random();
  let pool,tier;
  if(r<0.0002){pool=TRAIT_LEGEND;tier="legend";}
  else if(r<0.017){pool=TRAIT_EPIC;tier="epic";}
  else if(r<0.087){pool=TRAIT_RARE;tier="rare";}
  else{pool=TRAIT_NORMAL;tier="normal";}
  const t=pool[Math.floor(Math.random()*pool.length)];
  return{...t,tier};
}
/* パワプロ風スキル制度:金/銀/青/灰/赤の5階級、最大3枠 */
const SKILL_DB=[
 // 金(激レア・強力)
 {key:"kengo",  name:"剣豪",     tier:"gold",cls:"warrior",desc:"戦場での勘所を体で知っている",str:12,agi:10},
 {key:"daimadou",name:"大魔導",  tier:"gold",cls:"mage",  desc:"魔力操作が常人の域を超える",int:14,wis:8},
 {key:"kyusei", name:"弓聖の目", tier:"gold",cls:"archer",desc:"外すということを知らない",agi:12,wis:10},
 {key:"teppeki",name:"鉄壁の闘気",tier:"gold",cls:"monk", desc:"どんな一撃も涼しい顔で受け流す",vit:18,str:8},
 {key:"fukutoshi",name:"不屈闘志",tier:"gold",desc:"心が折れるということを知らない",vit:12,lead:10},
 {key:"shikikan",name:"天性の指揮官",tier:"gold",desc:"そこにいるだけで周りの士気が上がる",lead:14,onlyCaptain:true},
 {key:"skgo_00",name:"剣豪の予備軍",tier:"gold",cls:"warrior",desc:"剣豪と称される日も近いという",str:18,agi:12},
 {key:"skgo_01",name:"大魔導の萌芽",tier:"gold",cls:"mage",desc:"大魔導師への道を歩み始めている",int:11,wis:12},
 {key:"skgo_02",name:"弓聖の予兆",tier:"gold",cls:"archer",desc:"弓聖と呼ばれる者の予兆を見せる",agi:13,wis:17},
 {key:"skgo_03",name:"拳聖の予備軍",tier:"gold",cls:"monk",desc:"拳聖と称される日も近いという",str:18,vit:20},
 {key:"skgo_04",name:"聖者への道",tier:"gold",cls:"priest",desc:"聖者と呼ばれる域に近づいている",wis:19,lead:19},
 {key:"skgo_05",name:"影王の予兆",tier:"gold",cls:"hunter",desc:"影王と呼ばれる者の予兆を見せる",agi:11,wis:14},
 {key:"skgo_06",name:"覇者の風格",tier:"gold",desc:"覇者と呼ぶに相応しい風格を纏う",lead:13,str:13},
 {key:"skgo_07",name:"神域の一端",tier:"gold",desc:"神域と称される力の一端に触れている",int:10,wis:11},
 {key:"skgo_08",name:"超越の兆し",tier:"gold",desc:"人の域を超えつつあるという",str:14,vit:16},
 {key:"skgo_09",name:"万古の叡智",tier:"gold",desc:"古今の叡智を汲み取っているという",wis:17,int:13},
 // 銀(レア・強力)
 {key:"mousho", name:"猛将",     tier:"silver",desc:"前に出れば出るほど輝く性分",str:10,vit:6},
 {key:"maryoku",name:"魔力循環", tier:"silver",cls:"mage",desc:"魔力の巡りが良く、伸びしろが大きい",trainMult:1.2},
 {key:"hyakusen",name:"百戦錬磨",tier:"silver",desc:"歳を重ねてなお衰えを感じさせない",wis:8,vit:5},
 {key:"ikuseijozu",name:"育成上手",tier:"silver",desc:"人に教えるのが誰よりもうまい",instructorMult:1.3},
 {key:"kyoujin", name:"強靭",    tier:"silver",desc:"多少のことでは倒れない体を持つ",vit:11,str:5},
 {key:"gouwan",  name:"剛腕",    tier:"silver",cls:"warrior",desc:"並外れた膂力を持つ",str:15},
 {key:"shippu",  name:"疾風の足捌き",tier:"silver",cls:"archer",desc:"矢継ぎ早の動きで矢面に立たない",agi:14},
 {key:"ougihen", name:"奥義の片鱗",tier:"silver",cls:"monk",desc:"拳法の奥義に片足を踏み入れている",str:8,agi:8},
 {key:"hidensho",name:"秘伝の魔導書",tier:"silver",cls:"mage",desc:"独自の魔導書を持ち歩く",int:11,trainMult:1.15},
 {key:"rekisen", name:"歴戦の勘", tier:"silver",desc:"修羅場を潜り抜けてきた者だけの勘",wis:12,agi:4},
 {key:"haganoishi",name:"鋼の意志",tier:"silver",desc:"何があっても揺らがない忠誠心",lead:9,vit:6},
 {key:"fudoushin",name:"不動心", tier:"silver",desc:"動じぬ心が身を守る",vit:8,wis:6},
 {key:"sks_00",name:"剛撃",tier:"silver",cls:"warrior",desc:"並の武具では耐えられぬ一撃を放つ",str:9,vit:8},
 {key:"sks_01",name:"大魔法陣",tier:"silver",cls:"mage",desc:"高度な魔法陣を自在に描ける",int:11,wis:9},
 {key:"sks_02",name:"百発百中の腕前",tier:"silver",cls:"archer",desc:"狙った的をほぼ外さない",agi:6,str:11},
 {key:"sks_03",name:"極めた崩し技",tier:"silver",cls:"monk",desc:"相手の体勢を完全に崩す技を持つ",str:8,agi:6},
 {key:"sks_04",name:"大治癒の術",tier:"silver",cls:"priest",desc:"重い傷も癒せる治癒術を持つ",wis:10,int:6},
 {key:"sks_05",name:"神業の追跡術",tier:"silver",cls:"hunter",desc:"どんな獲物も逃さぬ追跡術を持つ",agi:7,wis:6},
 {key:"sks_06",name:"歴戦の体幹",tier:"silver",cls:"warrior",desc:"数多の戦を経て鍛えられた体幹",vit:11,str:9},
 {key:"sks_07",name:"魔力の奔流",tier:"silver",cls:"mage",desc:"強大な魔力を制御下に置く",int:6},
 {key:"sks_08",name:"熟達の弓捌き",tier:"silver",cls:"archer",desc:"弓の扱いに熟達している",agi:10},
 {key:"sks_09",name:"拳聖への道",tier:"silver",cls:"monk",desc:"拳聖の域に片足を踏み入れている",str:6,vit:6},
 {key:"sks_10",name:"大司祭の祈り",tier:"silver",cls:"priest",desc:"並の神官を超えた祈りの力を持つ",wis:10,lead:10},
 {key:"sks_11",name:"影の頭領の技",tier:"silver",cls:"hunter",desc:"影の頭領と呼ぶに相応しい技を持つ",agi:9,wis:6},
 {key:"sks_12",name:"鬼神の如き膂力",tier:"silver",desc:"鬼神と称される膂力を持つ",str:10},
 {key:"sks_13",name:"賢者の知恵",tier:"silver",desc:"賢者と呼ぶに相応しい知恵を持つ",int:8,wis:8},
 {key:"sks_14",name:"神速の反射",tier:"silver",desc:"神速と称される反射神経を持つ",agi:9},
 {key:"sks_15",name:"万夫不当の勇",tier:"silver",desc:"万夫不当と称される勇猛さを持つ",str:5,lead:8},
 {key:"sks_16",name:"百戦の指揮",tier:"silver",desc:"百戦を経て磨かれた指揮の腕を持つ",lead:5,wis:5},
 {key:"sks_17",name:"鉄壁の体",tier:"silver",desc:"鉄壁と称される頑丈な体を持つ",vit:5},
 {key:"sks_18",name:"秘奥の一端",tier:"silver",desc:"秘奥義の一端を会得している",str:5,int:9},
 {key:"sks_19",name:"戦場の覇気",tier:"silver",desc:"戦場を支配する覇気を纏う",lead:7,str:6},
 {key:"sks_20",name:"達人の域",tier:"silver",desc:"この道の達人と呼ばれる域に達している",agi:10,wis:10},
 {key:"sks_21",name:"剛柔の理",tier:"silver",desc:"剛と柔、両方の理を修めている",str:8,agi:7},
 {key:"sks_22",name:"千里眼",tier:"silver",desc:"遠く離れた気配すら感じ取る",wis:8},
 {key:"sks_23",name:"不動の大将",tier:"silver",desc:"何があっても揺るがぬ大将の器",lead:11,vit:9},
 {key:"sks_24",name:"極意の一端",tier:"silver",desc:"流派の極意の一端に触れている",str:8,wis:7},
 // 固有(金の更に上。全兵士中で同時に一人しか持てない)
 {key:"kenseinoishi",name:"剣聖の意志",tier:"unique",cls:"warrior",desc:"もはや技を超え、在り方そのものになっている",str:24,vit:24,agi:8},
 {key:"hoshiyomi",name:"星読みの大魔導",tier:"unique",cls:"mage",desc:"星の巡りすら読み解くという",int:20,wis:20,instructorMult:1.6},
 {key:"hyakushikaichu",name:"百矢皆中",tier:"unique",cls:"archer",desc:"放った矢は、既に的に刺さっている",agi:22,str:20},
 {key:"haken",   name:"覇拳",    tier:"unique",cls:"monk",desc:"拳一つで戦況を変える",str:23,vit:20},
 {key:"ryuuketsu",name:"竜血の加護",tier:"unique",desc:"竜の血の加護を受けているという",vit:18,str:18,condFlag:"dragonPact",condVit:9,condStr:9},
 {key:"eiyuunoutsuwa",name:"英雄の器",tier:"unique",desc:"生まれながらの器の違いを見せつける",vit:20,lead:20},
 {key:"sku_00",name:"大英雄の器",tier:"unique",desc:"この世に二つとない英雄の器を持つ",lead:18,vit:14,str:10},
 {key:"sku_01",name:"竜騎士の証",tier:"unique",desc:"竜と心を通わせた騎士の証を持つ",str:16,agi:14,vit:12},
 // 青(標準・堅実)
 {key:"shuchu",  name:"集中",     tier:"blue",desc:"ここぞという場面に強い",agi:7,wis:7},
 {key:"seishin", name:"精神統一", tier:"blue",desc:"心が乱れにくい",wis:4,int:2},
 {key:"soujuku", name:"早熟",     tier:"blue",desc:"若いうちの伸びが良い",trainMult:1.15,onlyYoung:true},
 {key:"taiki",   name:"熟練の勘所", tier:"blue",desc:"歳を重ねてからが本領発揮",trainMult:1.2,onlyNotYoung:true},
 {key:"chugi",   name:"忠義",     tier:"blue",desc:"一度従えた相手には篤く尽くす",lead:4,vit:2},
 {key:"reisei",  name:"冷静沈着", tier:"blue",desc:"慌てるということがない",wis:5},
 {key:"nitoryu", name:"二刀流",   tier:"blue",cls:"warrior",desc:"二つの得物を同時に操る",str:9},
 {key:"gokyu",   name:"剛弓",     tier:"blue",cls:"archer",desc:"並より遥かに強い弓を引き絞る",agi:9},
 {key:"seireigatari",name:"精霊語り",tier:"blue",cls:"mage",desc:"精霊と対話する術を心得ている",trainMult:1.15},
 {key:"ukemi",   name:"受け身術", tier:"blue",cls:"monk", desc:"倒れ方一つで怪我を避ける",agi:5},
 {key:"yamasodachi",name:"山育ち",tier:"blue",desc:"険しい土地で鍛えられた足腰",vit:6,str:2},
 {key:"mebae",   name:"芽生えた統率力",tier:"blue",desc:"まだ粗削りだが、人をまとめる気配がある",lead:6},
 {key:"kanshiki", name:"間合いの達人",tier:"blue",desc:"敵との距離を常に測っている",agi:7},
 {key:"kyouki",  name:"矜持",     tier:"blue",desc:"己の役目に強い誇りを持つ",lead:3,str:2},
 {key:"tanren",  name:"日々の鍛錬",tier:"blue",desc:"欠かさぬ鍛錬が地力になっている",trainMult:1.12},
 {key:"kanpeki", name:"用心深さ",  tier:"blue",desc:"石橋を叩いて渡る性分",wis:4},
 {key:"skb_00",name:"連続突き",tier:"blue",cls:"warrior",desc:"素早い連続攻撃を得意とする",str:4,agi:4},
 {key:"skb_01",name:"中級魔法陣",tier:"blue",cls:"mage",desc:"複雑な魔法陣を描ける",int:3,wis:4},
 {key:"skb_02",name:"速射の腕",tier:"blue",cls:"archer",desc:"矢を素早く連射できる",agi:2,str:2},
 {key:"skb_03",name:"崩し技",tier:"blue",cls:"monk",desc:"相手の体勢を崩す技を持つ",str:2,agi:5},
 {key:"skb_04",name:"治癒の詠唱",tier:"blue",cls:"priest",desc:"治癒の呪文を確実に唱えられる",wis:2,int:4},
 {key:"skb_05",name:"追跡術",tier:"blue",cls:"hunter",desc:"獲物の跡を的確に追える",agi:5,wis:2},
 {key:"skb_06",name:"鍛えた足腰",tier:"blue",desc:"鍛え抜かれた足腰を持つ",str:2,vit:2},
 {key:"skb_07",name:"戦場の勘",tier:"blue",desc:"戦場の流れを読む勘を持つ",wis:3,lead:3},
 {key:"skb_08",name:"魔力操作",tier:"blue",desc:"魔力の流れを制御する技術を持つ",int:2,wis:5},
 {key:"skb_09",name:"俊敏な反射",tier:"blue",desc:"反射的に体が動く",agi:5,wis:5},
 {key:"skb_10",name:"統率の技",tier:"blue",desc:"小隊をまとめ上げる技術を持つ",lead:5,wis:2},
 {key:"skb_11",name:"鋼の体幹",tier:"blue",desc:"揺るがぬ体幹を持つ",vit:3,str:4},
 {key:"skb_12",name:"集中の極意",tier:"blue",desc:"雑念を払い集中する術を心得ている",int:4,wis:2},
 {key:"skb_13",name:"先読みの目",tier:"blue",desc:"相手の動きを先読みする",wis:4,agi:4},
 {key:"skb_14",name:"鍛錬の成果",tier:"blue",desc:"積み重ねた鍛錬が身についている",str:2,vit:5},
 {key:"skb_15",name:"持久の型",tier:"blue",desc:"長期戦にも耐える型を持つ",vit:2,wis:3},
 {key:"skb_16",name:"二段構え",tier:"blue",desc:"二の手を常に用意している",agi:3,int:2},
 {key:"skb_17",name:"威風",tier:"blue",desc:"立つだけで周囲を威圧する",lead:2,str:2},
 {key:"skb_18",name:"精妙な手さばき",tier:"blue",desc:"細やかな手技を持つ",agi:5,int:5},
 {key:"skb_19",name:"胆力",tier:"blue",desc:"並外れた胆力の持ち主",vit:3,lead:3},
 {key:"skb_20",name:"剛の型",tier:"blue",cls:"warrior",desc:"剛の力を発揮する型を持つ",str:5,vit:3},
 {key:"skb_21",name:"元素の理解",tier:"blue",cls:"mage",desc:"元素魔法への理解が深い",int:3},
 {key:"skb_22",name:"狙撃の呼吸",tier:"blue",cls:"archer",desc:"呼吸を止めて狙いを定める",agi:5,wis:5},
 {key:"skb_23",name:"気の流れ",tier:"blue",cls:"monk",desc:"体内の気を操る術を心得ている",vit:2,int:5},
 {key:"skb_24",name:"祝福の詠唱",tier:"blue",cls:"priest",desc:"祝福の呪文を確実に唱えられる",wis:5,lead:3},
 {key:"skb_25",name:"影の歩法",tier:"blue",cls:"hunter",desc:"足音を立てずに歩く術を持つ",agi:2},
 {key:"skb_26",name:"戦意昂揚",tier:"blue",desc:"自らを鼓舞する術を心得ている",lead:4,vit:4},
 {key:"skb_27",name:"勘所を掴む",tier:"blue",desc:"物事の勘所をすぐに掴む",wis:2,int:3},
 {key:"skb_28",name:"鉄壁の守り",tier:"blue",desc:"隙のない守りを見せる",vit:3,str:5},
 {key:"skb_29",name:"駆け引きの妙",tier:"blue",desc:"駆け引きに長けている",wis:2,lead:2},
 {key:"skb_30",name:"俊足の極み",tier:"blue",desc:"並外れた俊足を誇る",agi:3},
 {key:"skb_31",name:"熟練の手技",tier:"blue",desc:"熟練の手さばきを持つ",agi:3,int:5},
 {key:"skb_32",name:"不動の構え",tier:"blue",desc:"何があっても崩れぬ構えを持つ",vit:4,str:2},
 {key:"skb_33",name:"知略の冴え",tier:"blue",desc:"知略に長けている",int:4,wis:4},
 {key:"skb_34",name:"統率の重み",tier:"blue",desc:"その言葉に重みがある",lead:5},
 {key:"skb_35",name:"鍛え上げた拳",tier:"blue",cls:"monk",desc:"拳が鋼のように鍛えられている",str:2},
 {key:"skb_36",name:"秘伝の型",tier:"blue",desc:"秘伝とされる型の一端を会得している",str:2,int:2},
 {key:"skb_37",name:"戦の呼吸",tier:"blue",desc:"戦場の呼吸を心得ている",vit:3,agi:3},
 {key:"skb_38",name:"見切りの目",tier:"blue",desc:"相手の一撃を見切る目を持つ",wis:2,agi:4},
 {key:"skb_39",name:"士気の柱",tier:"blue",desc:"部隊の士気を支える存在になっている",lead:4,vit:5},
 {key:"skb_40",name:"研ぎ澄まされた勘",tier:"blue",desc:"勘が研ぎ澄まされている",wis:3},
 // 灰(平凡・フレーバー寄り)
 {key:"hayaoki", name:"朝稽古の習慣",   tier:"gray",desc:"朝が誰より早い",vit:2},
 {key:"makeZugirai",name:"負けず嫌い",tier:"gray",desc:"負けるのが人一倍嫌い",str:2},
 {key:"kimakure",name:"愛嬌者",   tier:"gray",desc:"周りを和ませる雰囲気を持つ",lead:2},
 {key:"donkan",  name:"鈍感",     tier:"gray",desc:"多少のことでは動じない",vit:2},
 {key:"oogui",   name:"大食い",   tier:"gray",desc:"人一倍よく食べ、よく働く",vit:2},
 {key:"kichoumen",name:"几帳面",  tier:"gray",desc:"物事をきっちり片付けないと気が済まない",wis:2},
 {key:"oshaberi",name:"おしゃべり",tier:"gray",desc:"誰とでもすぐ打ち解ける",lead:2},
 {key:"chikarajiman",name:"力自慢",tier:"gray",desc:"腕っぷしにはちょっとした自信がある",str:2},
 {key:"mehashi", name:"目端が利く",tier:"gray",desc:"周りの様子によく気がつく",wis:2},
 {key:"tesaki",  name:"手先が器用",tier:"gray",desc:"細かい作業も苦にしない",trainMult:1.06},
 {key:"yakei",   name:"夜警向き", tier:"gray",desc:"夜通しの見張りも苦にしない性分",wis:2},
 {key:"maipace", name:"マイペース",tier:"gray",desc:"何があっても自分の調子を崩さない",vit:2},
 {key:"onkou",   name:"温厚",     tier:"gray",desc:"めったなことでは腹を立てない",lead:2},
 {key:"hayamimi",name:"地獄耳",   tier:"gray",desc:"噂話を聞きつけるのが早い",wis:2},
 {key:"gankona", name:"頑固",     tier:"gray",desc:"一度決めたことは曲げない",str:2},
 {key:"kireimove",name:"身のこなし",tier:"gray",desc:"無駄のない動き方をする",agi:2},
 {key:"skg_00",name:"素振り",tier:"gray",desc:"基本の型を繰り返し磨いている",str:2},
 {key:"skg_01",name:"基礎体力",tier:"gray",desc:"地道な鍛錬で足腰を鍛えている",vit:3},
 {key:"skg_02",name:"詠唱練習",tier:"gray",desc:"呪文の詠唱に慣れてきている",int:2},
 {key:"skg_03",name:"走り込み",tier:"gray",desc:"日々の走り込みを欠かさない",agi:2},
 {key:"skg_04",name:"観察眼",tier:"gray",desc:"周囲をよく観察する癖がある",wis:3},
 {key:"skg_05",name:"号令の練習",tier:"gray",desc:"声を張る練習をしている",lead:3},
 {key:"skg_06",name:"型の反復",tier:"gray",desc:"同じ型を何度も繰り返す",str:1,vit:1},
 {key:"skg_07",name:"柔軟体操",tier:"gray",desc:"体をほぐす習慣がある",agi:3,vit:2},
 {key:"skg_08",name:"読書習慣",tier:"gray",desc:"暇さえあれば本を読む",int:3,wis:3},
 {key:"skg_09",name:"礼儀作法",tier:"gray",desc:"礼を尽くす所作を心得ている",lead:1,wis:1},
 {key:"skg_10",name:"素早い身のこなし",tier:"gray",desc:"無駄のない動きを意識している",agi:2},
 {key:"skg_11",name:"重量挙げ",tier:"gray",desc:"重いものを持ち上げる訓練をしている",str:2},
 {key:"skg_12",name:"持久走",tier:"gray",desc:"長く走り続ける訓練をしている",vit:1},
 {key:"skg_13",name:"暗算",tier:"gray",desc:"素早く数字を処理できる",int:1},
 {key:"skg_14",name:"聞き耳",tier:"gray",desc:"小さな物音も聞き逃さない",wis:3},
 {key:"skg_15",name:"指揮の型",tier:"gray",desc:"号令の型を覚え始めている",lead:3},
 {key:"skg_16",name:"巻き藁打ち",tier:"gray",cls:"warrior",desc:"巻き藁相手に打ち込みを重ねている",str:3},
 {key:"skg_17",name:"初級魔法陣",tier:"gray",cls:"mage",desc:"簡単な魔法陣を描ける",int:1},
 {key:"skg_18",name:"弓の構え",tier:"gray",cls:"archer",desc:"正しい構えを身につけている",agi:3},
 {key:"skg_19",name:"型稽古",tier:"gray",cls:"monk",desc:"拳法の型を繰り返している",str:2,agi:2},
 {key:"skg_20",name:"経文の暗誦",tier:"gray",cls:"priest",desc:"経文を諳んじられる",wis:3},
 {key:"skg_21",name:"足跡の見分け",tier:"gray",cls:"hunter",desc:"獣の足跡を見分けられる",wis:3},
 {key:"skg_22",name:"朝の鍛錬",tier:"gray",desc:"毎朝欠かさず体を動かす",str:3,vit:3},
 {key:"skg_23",name:"夜の見張り",tier:"gray",desc:"夜通しの見張りに慣れている",wis:1},
 {key:"skg_24",name:"荷運び",tier:"gray",desc:"重い荷を運ぶ仕事に慣れている",vit:3},
 {key:"skg_25",name:"縄結び",tier:"gray",desc:"素早く縄を結べる",agi:1},
 {key:"skg_26",name:"火起こし",tier:"gray",desc:"手早く火を起こせる",int:3},
 {key:"skg_27",name:"道案内",tier:"gray",desc:"土地勘に優れている",wis:1},
 {key:"skg_28",name:"声出し",tier:"gray",desc:"大きな声を出すのが得意",lead:1},
 {key:"skg_29",name:"早駆け",tier:"gray",desc:"短距離を素早く駆け抜ける",agi:1},
 {key:"skg_30",name:"腕相撲自慢",tier:"gray",desc:"腕力にはちょっとした自信がある",str:1},
 {key:"skg_31",name:"寒さに強い",tier:"gray",desc:"寒冷地でも動じない",vit:1},
 {key:"skg_32",name:"計算高い",tier:"gray",desc:"損得勘定が早い",int:3},
 {key:"skg_33",name:"物覚えが良い",tier:"gray",desc:"一度見た手順を忘れない",wis:1},
 {key:"skg_34",name:"まとめ役",tier:"gray",desc:"小さな集団をまとめるのが得意",lead:2},
 {key:"skg_35",name:"跳躍力",tier:"gray",desc:"高く飛び上がれる",agi:2},
 {key:"skg_36",name:"我慢強い",tier:"gray",desc:"痛みや疲れによく耐える",vit:2},
 {key:"skg_37",name:"暗記が得意",tier:"gray",desc:"文言を素早く覚えられる",int:3},
 {key:"skg_38",name:"勘が鋭い",tier:"gray",desc:"危険をいち早く察知する",wis:1},
 {key:"skg_39",name:"面倒見",tier:"gray",desc:"後輩の面倒見が良い",lead:3},
 {key:"skg_40",name:"俊足",tier:"gray",desc:"足の速さに自信がある",agi:1},
 {key:"skg_41",name:"石割り",tier:"gray",cls:"warrior",desc:"素手で石を砕く力を持つ",str:3},
 {key:"skg_42",name:"火花の術",tier:"gray",cls:"mage",desc:"小さな火花を起こせる",int:2},
 {key:"skg_43",name:"的当て",tier:"gray",cls:"archer",desc:"狙った的をよく外さない",agi:2},
 {key:"skg_44",name:"受け流し",tier:"gray",cls:"monk",desc:"相手の力を受け流す術を心得ている",agi:1},
 {key:"skg_45",name:"癒しの手",tier:"gray",cls:"priest",desc:"軽い傷を癒す手当てを心得ている",wis:3},
 {key:"skg_46",name:"罠の見分け",tier:"gray",cls:"hunter",desc:"仕掛けられた罠を見分けられる",wis:1},
 {key:"skg_47",name:"荒事慣れ",tier:"gray",desc:"荒事にも動じない胆力がある",str:2},
 {key:"skg_48",name:"長距離歩行",tier:"gray",desc:"長い距離を歩き通せる",vit:3},
 {key:"skg_49",name:"状況判断",tier:"gray",desc:"その場の状況を素早く読む",wis:2},
 {key:"skg_50",name:"士気高揚",tier:"gray",desc:"周りの気分を盛り上げるのが上手い",lead:2},
 {key:"skg_51",name:"身軽さ",tier:"gray",desc:"身のこなしが軽い",agi:3},
 {key:"skg_52",name:"下調べ",tier:"gray",desc:"事前の下調べを怠らない",int:1},
 // 赤(マイナス・じゃじゃ馬)
 {key:"manshin", name:"慢心",     tier:"red", desc:"自信過剰で油断しがち",str:-6,trainMult:1.15},
 {key:"tanki",   name:"せっかちな判断",     tier:"red", desc:"すぐカッとなる",lead:-3},
 {key:"okubyou", name:"臆病",     tier:"red", desc:"土壇場で及び腰になることがある",vit:-8},
 {key:"kegashou",name:"怪我持ち", tier:"red", desc:"昔からの古傷が疼くことがある",vit:-4},
 {key:"wagamama",name:"わがまま", tier:"red", desc:"気分の浮き沈みが激しい",lead:-3},
 {key:"skr_00",name:"独りよがり",tier:"red",desc:"自分のやり方に固執しがち",str:-3},
 {key:"skr_01",name:"空回り",tier:"red",desc:"気合が空回りすることがある",agi:-3},
 {key:"skr_02",name:"的外れ",tier:"red",desc:"時々見当違いな判断をする",wis:-3},
 {key:"skr_03",name:"過信",tier:"red",desc:"自分の力を過信しがち",vit:-3},
 {key:"skr_04",name:"独断専行",tier:"red",desc:"周りと連携せず突っ走る",lead:-3},
 {key:"skr_05",name:"集中力散漫",tier:"red",desc:"集中力が長く続かない",int:-3},
 {key:"skr_06",name:"力任せ",tier:"red",desc:"力任せで技が雑になりがち",agi:-2},
 {key:"skr_07",name:"猪突猛進",tier:"red",desc:"後先考えず突っ込みがち",wis:-2},
 {key:"skn_g01",name:"剛力の型",tier:"gray",desc:"力を効率よく伝える基本の型",str:3},
 {key:"skn_g02",name:"号令の心得",tier:"gray",desc:"人をまとめる声の出し方を心得ている",lead:3},
 {key:"skn_g03",name:"気合いの入れ方",tier:"gray",desc:"ここぞという時に力を発揮する術を知る",str:2,vit:2},
 {key:"skn_g04",name:"防御の要諦",tier:"gray",desc:"身を守る基本を押さえている",vit:3},
 {key:"skn_g05",name:"俊敏な身のこなし",tier:"gray",desc:"無駄のない体の動かし方をする",agi:3},
 {key:"skn_g06",name:"胆力の据わり",tier:"gray",desc:"肝が据わり、揺らがぬ構えを保てる",vit:2,lead:1},
 {key:"skn_b01",name:"疾風脚",tier:"blue",desc:"風のように駆ける足運び",agi:4},
 {key:"skn_b02",name:"鉄壁の構え",tier:"blue",desc:"何をされてもびくともしない構え",vit:4},
 {key:"skn_b03",name:"連携の呼吸",tier:"blue",desc:"仲間との間合いを自然と合わせる",lead:2,agi:2},
 {key:"skn_b04",name:"隠密の足運び",tier:"blue",desc:"足音を殺して動く技術",agi:4,wis:1},
 {key:"skn_b05",name:"不屈の一撃",tier:"blue",desc:"力を余さず一撃に込める技",str:5},
 {key:"skn_b06",name:"精密射撃の型",tier:"blue",desc:"狙いを外さぬための基本の型",agi:3,wis:2},
 {key:"skn_b07",name:"治癒の心得",tier:"blue",desc:"傷の手当てに通じている",int:2,wis:3},
 {key:"skn_b08",name:"魔力操作の妙",tier:"blue",desc:"魔力を無駄なく操る技術",int:5},
 {key:"skn_b09",name:"追跡の技",tier:"blue",desc:"わずかな痕跡も見逃さぬ技術",agi:3,wis:2},
 {key:"skn_b10",name:"知略の巡らせ方",tier:"blue",desc:"状況を読んで先を見通す思考法",wis:3,int:2},
 {key:"skn_s01",name:"心眼",tier:"silver",desc:"目に見えぬ機微を読み取る境地",wis:3,int:3},
 {key:"skn_s02",name:"戦地の直感",tier:"silver",desc:"戦場の空気を肌で読む研ぎ澄まされた勘",wis:4,agi:2},
 {key:"skn_s03",name:"統率の号令",tier:"silver",desc:"一声で部隊の士気を大きく引き上げる",lead:5},
 {key:"skn_s04",name:"一閃の剣技",tier:"silver",desc:"一瞬で相手の間合いを断つ剣の冴え",str:4,agi:3},
];
/* ==================== 装備制度(ハクスラ要素):武器・防具・装飾品の3スロット ==================== */
const EQUIPMENT_DB=[
 // ── 武器(腕力・敏捷寄り) ──
 {key:"eqp_sword_common",name:"粗末な剣",slot:"weapon",rarity:"common",statBonus:{str:4}},
 {key:"eqp_sword_uncommon",name:"鍛えの良い剣",slot:"weapon",rarity:"uncommon",statBonus:{str:7,agi:2}},
 {key:"eqp_sword_rare",name:"名工の剣",slot:"weapon",rarity:"rare",statBonus:{str:12,agi:4}},
 {key:"eqp_sword_epic",name:"魔剣ヴァルグレン",slot:"weapon",rarity:"epic",statBonus:{str:18,agi:7}},
 {key:"eqp_sword_legendary",name:"星喰らいの剣",slot:"weapon",rarity:"legendary",statBonus:{str:26,agi:12,lead:6}},
 // ── 防具(体力・魔力寄り) ──
 {key:"eqp_armor_common",name:"粗末な鎧",slot:"armor",rarity:"common",statBonus:{vit:4}},
 {key:"eqp_armor_uncommon",name:"鎖帷子",slot:"armor",rarity:"uncommon",statBonus:{vit:7,int:2}},
 {key:"eqp_armor_rare",name:"名工の板金鎧",slot:"armor",rarity:"rare",statBonus:{vit:12,int:4}},
 {key:"eqp_armor_epic",name:"竜鱗の鎧",slot:"armor",rarity:"epic",statBonus:{vit:18,int:7}},
 {key:"eqp_armor_legendary",name:"星屑の聖鎧",slot:"armor",rarity:"legendary",statBonus:{vit:26,int:12,wis:6}},
 // ── 装飾品(知力・統率寄り、全体的にバランス型) ──
 {key:"eqp_charm_common",name:"粗末なお守り",slot:"accessory",rarity:"common",statBonus:{wis:4}},
 {key:"eqp_charm_uncommon",name:"知恵の指輪",slot:"accessory",rarity:"uncommon",statBonus:{wis:6,lead:2}},
 {key:"eqp_charm_rare",name:"賢者の首飾り",slot:"accessory",rarity:"rare",statBonus:{wis:10,lead:4,int:3}},
 {key:"eqp_charm_epic",name:"王家の指輪",slot:"accessory",rarity:"epic",statBonus:{wis:15,lead:7,int:5}},
 {key:"eqp_charm_legendary",name:"星冠の宝珠",slot:"accessory",rarity:"legendary",statBonus:{wis:22,lead:12,int:8}},
];
const EQUIP_SLOT_LABEL={weapon:"武器",armor:"防具",accessory:"装飾品"};
function equipmentEffects(u){
  const e={str:0,vit:0,int:0,agi:0,wis:0,lead:0};
  if(!u.equipment)return e;
  for(const slot of["weapon","armor","accessory"]){
    const inst=u.equipment[slot];
    if(!inst)continue;
    const def=EQUIPMENT_DB.find(x=>x.key===inst.key);
    if(!def)continue;
    for(const k in def.statBonus)e[k]+=def.statBonus[k];
  }
  return e;
}
/* レア度に応じた装備を1件生成しS.equipmentInventoryに追加する(ダンジョン/遠征のドロップから呼ぶ) */
function rollEquipmentDrop(maxRarityKey){
  const order=["common","uncommon","rare","epic","legendary"];
  const maxIdx=Math.max(0,order.indexOf(maxRarityKey));
  const weights={common:40,uncommon:28,rare:18,epic:10,legendary:4};
  const cands=EQUIPMENT_DB.filter(d=>order.indexOf(d.rarity)<=maxIdx);
  if(!cands.length)return null;
  const tot=cands.reduce((a,d)=>a+(weights[d.rarity]||1),0);
  let r=Math.random()*tot;
  for(const d of cands){r-=(weights[d.rarity]||1);if(r<=0)return d;}
  return cands[cands.length-1];
}
function addEquipment(defKey){
  S.equipmentInventory=S.equipmentInventory||[];
  S.equipmentInventory.push({id:Math.random().toString(36).slice(2,9),key:defKey});
}
function equipItem(unitId,instanceId){
  const u=findAnyUnit(unitId);
  if(!u)return;
  const idx=(S.equipmentInventory||[]).findIndex(x=>x.id===instanceId);
  if(idx<0)return;
  const inst=S.equipmentInventory[idx];
  const def=EQUIPMENT_DB.find(x=>x.key===inst.key);
  if(!def)return;
  u.equipment=u.equipment||{weapon:null,armor:null,accessory:null};
  const prev=u.equipment[def.slot];
  if(prev)S.equipmentInventory.push(prev);
  S.equipmentInventory.splice(idx,1);
  u.equipment[def.slot]=inst;
  chron(`${fullName(u)}が「${def.name}」を装備した。`,"");
}
function unequipItem(unitId,slot){
  const u=findAnyUnit(unitId);
  if(!u||!u.equipment||!u.equipment[slot])return;
  S.equipmentInventory=S.equipmentInventory||[];
  S.equipmentInventory.push(u.equipment[slot]);
  u.equipment[slot]=null;
}
function skillTierWeight(){return[["red",9],["gray",44],["blue",30],["silver",13],["gold",4]];}
/* ジョブ系統の昇格時専用の重み(灰〜銀中心、赤は低確率、金は3段階目以降の昇格でのみ解放) */
function promotionTierWeight(includeGold){
  return includeGold
    ? [["red",5],["gray",33],["blue",30],["silver",18],["gold",14]]
    : [["red",5],["gray",40],["blue",35],["silver",20]];
}
function pickSkillFor(u,exclude,weightFn){
  const pool=(weightFn||skillTierWeight)();
  const tot=pool.reduce((a,p)=>a+p[1],0);let r=Math.random()*tot,tier="gray";
  for(const[k,w]of pool){if(r<w){tier=k;break;}r-=w;}
  let cands=SKILL_DB.filter(s=>s.tier===tier&&(!s.cls||s.cls===u.cls)&&(!s.onlyCaptain||u.captain)&&!exclude.includes(s.key));
  if(!cands.length)cands=SKILL_DB.filter(s=>s.tier==="gray"&&!exclude.includes(s.key));
  if(!cands.length)return null;
  return cands[Math.floor(Math.random()*cands.length)].key;
}
function initSkills(u){
  const n=Math.min(skillCap(u),Math.random()<0.7?1:2);
  const skills=[];
  for(let i=0;i<n;i++){const k=pickSkillFor(u,skills);if(k)skills.push(k);}
  return skills;
}
/* スキル所有上限:レベルに応じて段階的に拡張、転生者は特別に+10 */
function skillCap(u){
  let cap=(u.skillCapBase||3);
  if(u.trait==="reborn")cap+=10;
  return Math.min(cap,20);
}
/* アイテムによるスキル付与専用の重み(最上位の金クラスは対象外にする) */
function itemSkillTierWeight(){return[["red",10],["gray",48],["blue",32],["silver",10]];}
function trySkillUpItem(u){
  if(u.skills.length>=skillCap(u))return null;
  const k=pickSkillFor(u,u.skills,itemSkillTierWeight);
  if(!k)return null;
  u.skills.push(k);
  return SKILL_DB.find(s=>s.key===k);
}
function trySkillUp(u){
  if(u.skills.length>=skillCap(u))return null;
  const k=pickSkillFor(u,u.skills);
  if(!k)return null;
  u.skills.push(k);
  return SKILL_DB.find(s=>s.key===k);
}
/* ジョブ系統の昇格時(新兵→兵士、兵士→古参兵…)にのみ呼ぶ。3段階目(古参兵)以降の昇格で金も解放 */
function trySkillUpOnPromotion(u,tierIndex){
  if(u.skills.length>=skillCap(u))return null;
  const includeGold=tierIndex>=3;
  const k=pickSkillFor(u,u.skills,()=>promotionTierWeight(includeGold));
  if(!k)return null;
  u.skills.push(k);
  return SKILL_DB.find(s=>s.key===k);
}
function skillEffects(u){
  const e={trainMult:1,injuryMult:1,deathMult:1,loyaltyGrow:0,moralGrow:0,ageResist:0,instructorMult:1,
    str:0,vit:0,int:0,agi:0,wis:0,lead:0};
  const stage=ageStageOf(u);
  for(const key of u.skills){
    const s=SKILL_DB.find(x=>x.key===key);if(!s)continue;
    for(const k of["str","vit","int","agi","wis","lead"])if(s[k])e[k]+=s[k];
    if(s.condFlag&&S.flags&&S.flags[s.condFlag]){
      if(s.condStr)e.str+=s.condStr;
      if(s.condVit)e.vit+=s.condVit;
    }
    if(s.trainMult){
      if(s.onlyYoung&&stage.key!=="young")continue;
      if(s.onlyNotYoung&&stage.key==="young")continue;
      e.trainMult*=s.trainMult;
    }
    if(s.injuryMult)e.injuryMult*=s.injuryMult;
    if(s.deathMult)e.deathMult*=s.deathMult;
    if(s.loyaltyGrow)e.loyaltyGrow+=s.loyaltyGrow;
    if(s.moralGrow)e.moralGrow+=s.moralGrow;
    if(s.ageResist)e.ageResist=Math.max(e.ageResist,s.ageResist);
    if(s.instructorMult)e.instructorMult*=s.instructorMult;
  }
  const eq=equipmentEffects(u);
  for(const k of["str","vit","int","agi","wis","lead"])e[k]+=eq[k];
  return e;
}
const SKILL_TIER_LABEL={gold:"金",silver:"銀",blue:"青",gray:"灰",red:"赤",unique:"固有"};
function pickUniqueSkill(u){
  if(S.uniqueHolderId)return null; // 既に誰かが保持中
  const cands=SKILL_DB.filter(s=>s.tier==="unique"&&(!s.cls||s.cls===u.cls));
  if(!cands.length)return null;
  return cands[Math.floor(Math.random()*cands.length)];
}
/* 種族(国交が開くと出現)寿命付き */
const RACES=[
 {key:"human",name:"人間",str:0,vit:0,int:0,lifespan:65,desc:""},
 {key:"elf",  name:"エルフ",str:-1,vit:-1,int:4,lifespan:400,desc:"魔力に長け、弓も得意とする。老いを知らぬに等しい"},
 {key:"dwarf",name:"ドワーフ",str:3,vit:3,int:-2,lifespan:150,desc:"頑健で力強い。人間よりずっと長生きする"},
 {key:"beastkin",name:"獣人",str:1,vit:1,int:-1,lifespan:55,desc:"俊敏で野性的。群れで動くことを好む"},
 {key:"halfling",name:"小柄な亜人",str:-2,vit:0,int:0,lifespan:90,desc:"体は小さいが身のこなしが良く、危険を避けるのが上手い"},
 {key:"dragonkin",name:"竜人",str:2,vit:2,int:2,lifespan:260,desc:"竜の血を薄く引くという、極めて稀な存在"},
 {key:"starkin",name:"星霊種",str:3,vit:2,int:4,lifespan:500,desc:"星々の加護を受けて生まれるという伝説上の存在。魔王討伐後の世にごく稀に現れる"},
];
/* 出身地(種族と連動、軽いステータス傾向) */
const ORIGINS=[
 {key:"valley",name:"谷の集落",race:"human",bonus:{}},
 {key:"foothill",name:"麓の集落",race:"human",bonus:{vit:2}},
 {key:"mountainvillage",name:"山向こうの村",race:"human",bonus:{str:2}},
 {key:"wanderer",name:"旅芸人の一座",race:"human",bonus:{agi:2}},
 {key:"marketborn",name:"市場町",race:"human",bonus:{agi:1,wis:1}},
 {key:"lakeside",name:"ルシエラ湖畔",race:"elf",bonus:{int:2}},
 {key:"deepforest",name:"森の奥",race:"elf",bonus:{int:1,agi:1}},
 {key:"startower",name:"星読みの塔",race:"elf",bonus:{int:3,vit:-1}},
 {key:"mineshaft",name:"山岳の坑道",race:"dwarf",bonus:{str:1,vit:1}},
 {key:"smithclan",name:"鍛冶の集落",race:"dwarf",bonus:{str:2}},
 {key:"underlake",name:"地底湖の民",race:"dwarf",bonus:{vit:2,int:-1}},
 {key:"plainhunter",name:"草原の狩人",race:"beastkin",bonus:{agi:2}},
 {key:"mountainpack",name:"山岳の群れ",race:"beastkin",bonus:{str:1,vit:1}},
 {key:"tradefamily",name:"隊商の宿",race:"halfling",bonus:{agi:1,lead:1}},
 {key:"marketchild",name:"市場町の裏路地",race:"halfling",bonus:{wis:1,agi:1}},
 {key:"dragonblood",name:"竜の谷",race:"dragonkin",bonus:{int:1,str:1,vit:1}},
 {key:"starfallen",name:"星の落ちた地",race:"starkin",bonus:{int:2,str:1,vit:1}},
];
function pickOrigin(raceKey){
  const cands=ORIGINS.filter(o=>o.race===raceKey);
  if(!cands.length)return{key:"unknown",name:"出自不明",race:raceKey,bonus:{}};
  return cands[Math.floor(Math.random()*cands.length)];
}
function pickRace(){
  const rank=(S&&S.stage!=null)?STAGES[S.stage].rank:1;
  const pool=[["human",70]];
  if(S&&S.flags&&S.flags.elfOpen)pool.push(["elf",13]);
  if(S&&S.flags&&S.flags.dwarfOpen)pool.push(["dwarf",13]);
  if(rank>=3)pool.push(["beastkin",10]); // 町規模になると旅人に混じって流入
  if(rank>=2)pool.push(["halfling",8]);  // 市場が立てば自然に流入
  if(S&&S.flags&&S.flags.dragonPact)pool.push(["dragonkin",0.4]); // 竜盟約後のみ、極めて稀
  if(S&&S.flags&&S.flags.demonLordDefeated)pool.push(["starkin",0.15]); // 魔王討伐後のみ、さらに稀
  const tot=pool.reduce((a,p)=>a+p[1],0);let r=Math.random()*tot;
  for(const[k,w]of pool){if(r<w)return RACES.find(x=>x.key===k);r-=w;}
  return RACES[0];
}
/* 年齢:1年=25日(人間基準)。種族の寿命比で段階の境界も伸びる */
const AGE_YEAR_DAYS=25;
/* ==================== 称号システム(35種、実績系20+生き様系15) ==================== */
/* 効果は全て「戦力に直接影響しない」フレーバー寄りの4種類のみ(忠誠成長/士気成長/怪我率/経験値効率) */
const TITLE_DB=[
 // ── 実績系(20) ──
 {key:"t_conqueror5",name:"踏破者",desc:"ダンジョンを5回踏破した",effect:"loyaltyGrow",value:0.15},
 {key:"t_conqueror20",name:"大踏破者",desc:"ダンジョンを20回踏破した",effect:"expMult",value:1.06},
 {key:"t_demonslayer",name:"魔王討伐者",desc:"魔王を討伐した",effect:"injuryMult",value:0.9},
 {key:"t_evercrown",name:"常勝の将",desc:"リーダーとしてミッション大成功を10回果たした",effect:"expMult",value:1.08},
 {key:"t_leader30",name:"名リーダー",desc:"ミッションのリーダーを30回務めた",effect:"loyaltyGrow",value:0.15},
 {key:"t_pioneer",name:"開拓者",desc:"ダンジョン発見のきっかけとなった",effect:"moralGrow",value:0.1},
 {key:"t_treasurehunter",name:"財宝発見者",desc:"レジェンド級アイテムを入手した",effect:"moralGrow",value:0.12},
 {key:"t_uniqueholder",name:"固有の担い手",desc:"固有スキルを習得した",effect:"expMult",value:1.1},
 {key:"t_awakened",name:"覚醒者",desc:"覚醒を果たした",effect:"injuryMult",value:0.85},
 {key:"t_almosthall",name:"将の器",desc:"隊長格に到達した",effect:"loyaltyGrow",value:0.1},
 {key:"t_hero",name:"英雄",desc:"英雄格に到達した",effect:"moralGrow",value:0.15},
 {key:"t_survivor",name:"不屈の帰還者",desc:"大失敗から生還した",effect:"injuryMult",value:0.92},
 {key:"t_soloace",name:"一騎当千",desc:"単独で大きな成果を上げた",effect:"expMult",value:1.05},
 {key:"t_1year",name:"一年の功労",desc:"1年以上在籍した",effect:"loyaltyGrow",value:0.1},
 {key:"t_captainexp",name:"歴戦の指揮官",desc:"団長を務めた経験がある",effect:"loyaltyGrow",value:0.12},
 {key:"t_mentor5",name:"育ての親",desc:"教官として5人以上を指導した",effect:"expMult",value:1.05},
 {key:"t_jobchange",name:"転職者",desc:"ジョブチェンジを経験した",effect:"moralGrow",value:0.08},
 {key:"t_scarred3",name:"満身創痍の勲章",desc:"重傷を3回経験し、なお生き抜いている",effect:"injuryMult",value:0.88},
 {key:"t_guardian",name:"護りし者",desc:"戦友と共に、幾多の危機を乗り越えてきた",effect:"loyaltyGrow",value:0.1},
 {key:"t_starchosen",name:"星に選ばれし者",desc:"隠れた才が大きく開花した",effect:"expMult",value:1.1},
 // ── 生き様系(15) ──
 {key:"t_youngelite",name:"若き俊英",desc:"20歳未満で精鋭格に到達した",effect:"expMult",value:1.07},
 {key:"t_latebloom",name:"大器晩成",desc:"壮年を過ぎてから大きく道を切り拓いた",effect:"expMult",value:1.05},
 {key:"t_evergreen",name:"生涯現役",desc:"老境に至ってなお現役を貫いている",effect:"moralGrow",value:0.12},
 {key:"t_longlife",name:"長寿の証",desc:"種族の平均寿命を超えて生きている",effect:"injuryMult",value:0.9},
 {key:"t_loyal90",name:"忠義の士",desc:"高い忠誠を長く保ち続けている",effect:"loyaltyGrow",value:0.15},
 {key:"t_morale90",name:"士気の要",desc:"高い士気を長く保ち続けている",effect:"moralGrow",value:0.15},
 {key:"t_favorite",name:"愛され者",desc:"長のお気に入りに選ばれている",effect:"moralGrow",value:0.1},
 {key:"t_bonded",name:"絆の証",desc:"戦友との絆を結んでいる",effect:"loyaltyGrow",value:0.1},
 {key:"t_pureroute",name:"生粋の道",desc:"転職を経ずに一つの道を極めた",effect:"expMult",value:1.06},
 {key:"t_scarred5",name:"幾多の傷跡",desc:"負傷を5回経験している",effect:"injuryMult",value:0.87},
 {key:"t_unscathed",name:"無傷の英雄",desc:"一度も負傷せず英雄格に到達した",effect:"injuryMult",value:0.8},
 {key:"t_rareborn",name:"名家の生まれ",desc:"稀少な特性を持って生まれた",effect:"expMult",value:1.04},
 {key:"t_epicborn",name:"稀代の逸材",desc:"エピック級の特性を持って生まれた",effect:"expMult",value:1.07},
 {key:"t_legendborn",name:"伝説そのもの",desc:"レジェンド級の特性を持って生まれた",effect:"expMult",value:1.12},
 {key:"t_pillar",name:"王国の柱石",desc:"覚醒・英雄・固有のうち複数を成し遂げた",effect:"loyaltyGrow",value:0.2},
];
const TITLE_EFFECT_LABEL={loyaltyGrow:"忠誠成長",moralGrow:"士気成長",injuryMult:"怪我率",expMult:"経験値効率"};
function grantTitle(u,key){
  if(!u.titles)u.titles=[];
  if(u.titles.includes(key))return;
  const t=TITLE_DB.find(x=>x.key===key);
  if(!t)return;
  u.titles.push(key);
  const valTxt=t.effect==="injuryMult"?`×${t.value}`:t.effect==="expMult"?`×${t.value}`:`+${t.value}/日`;
  unitHistory(u,`称号「${t.name}」を得た(${TITLE_EFFECT_LABEL[t.effect]}${valTxt})。`);
  chron(`${u.nm}が称号「${t.name}」を得た。`,"");
}
function titleEffectsFor(u){
  const e={loyaltyGrow:0,moralGrow:0,injuryMult:1,expMult:1};
  for(const key of(u.titles||[])){
    const t=TITLE_DB.find(x=>x.key===key);
    if(!t)continue;
    if(t.effect==="loyaltyGrow")e.loyaltyGrow+=t.value;
    else if(t.effect==="moralGrow")e.moralGrow+=t.value;
    else if(t.effect==="injuryMult")e.injuryMult*=t.value;
    else if(t.effect==="expMult")e.expMult*=t.value;
  }
  return e;
}
function ageStageOf(u){
  const race=RACES.find(r=>r.key===u.race);
  const lifeMult=(traitInfo(u.trait).lifespanMult)||1;
  const lifespan=race.lifespan*lifeMult*(u.lifespanVariance||1);
  const ratio=lifespan/65;
  const timing=u.stageTiming||1; // 早熟/大器晩成の個体差(段階の訪れ方が人により違う)
  const cap=lifespan;
  const peakEnd=Math.min(36*ratio*timing,cap*0.55), midEnd=Math.min(54*ratio*timing,cap*0.76), oldEnd=Math.min(68*ratio*timing,cap*0.94); // 中堅入り・衰退期が早すぎるとの声を受け、各段階の到来を後ろ倒しに
  if(u.age<18*ratio)return{key:"young",label:"若手",mult:0.92,trainMult:1.25};
  if(u.age<peakEnd)return{key:"peak",label:"全盛期",mult:1.0,trainMult:1.0};
  if(u.age<midEnd)return{key:"mid",label:"中堅",mult:0.95,trainMult:0.9};
  if(u.age<oldEnd)return{key:"old",label:"老兵",mult:0.75,trainMult:0.6};
  return{key:"venerable",label:"高齢",mult:0.55,trainMult:0.35,cap};
}
// stageTimingの個体差をプレイヤーに見える形で表示するためのラベル(早熟=各段階が早く訪れる/晩成=遅く訪れる)
function stageTimingLabel(u){
  const t=u.stageTiming||1;
  if(t<=0.92)return"早熟";
  if(t>=1.12)return"晩成";
  return null;
}
const NAME_POOL=["ロイ","カヤ","ダン","ミナ","ヴォルフ","エラ","トム","シィ","バロン","ナナ","ギード","ルル","ハント","フィア","ゼン","コウ","マルタ","レイ","オル","ニナ","ダグ","ソラ","ヴィム","エッタ","ロブ","カイル","ミア","トール","サシャ","ベン","ユーリ","カノン","ジン","リナ","オズ","フェイ","ダリオ","エマ","キリル","ノア","レン","アリア","ヴィト","セイ","トビー","ラナ","ジェイ","マイア","コル","ヴェラ","シオン"];
const NAME_ELF=["シルヴィ","レイニエル","フィリアン","エレウィン","タリス"];
const NAME_DWARF=["ボルド","グロム","ドリン","ナズグ","ウルフガル"];
const NAME_BEASTKIN=["ガルル","キーファ","ロウガ","ヴァイル","シェナ"];
const NAME_HALFLING=["ピコ","メリル","トト","ナッツ","フィン"];
const NAME_DRAGONKIN=["イグニル","ヴェルダン","シェザール"];
const NAME_STARKIN=["アステル","ルミナ","ステラリオ"];
/* 苗字(種族ごとの専用プール) */
const SURNAME_POOL={
 human:["ハルト","ヴァイス","ロード","ブロン","カルヴ","ダール","ミラー","ソーン","ベルグ","カーライル","オーレン","ハスケル","モーガン","ライナー","デュラン","フォスター","ケイン","バロウズ","シェパード","ホーク","ラドクリフ","ヴェイン","エイムズ","コルトン"],
 elf:["シルヴァリエル","エレンウィスパー","ムーンリーフ","フェアウィンド","星読みの杖","レイクシェイド","ライトソング","シルバーブルーム","ウィローシェイド","ドーンウィスパー","エルフレイム","ミストヴェール","ナイトブルーム","スターフォール"],
 dwarf:["アイアンフォージ","ストーンハンマー","カラグリム","ドラフニル","岩胴の盾","炉守の槌","グランバルド","ソリッドロック","ダークアンヴィル","コッパービアード","グレイストーン","ブロンズフィスト","デルヴハイム"],
 beastkin:["ウルフファング","ソラハンター","キバノ","ナグラ","荒野の爪","タロンクロウ","シャドウポウ","ウィンドラン","ファングブレイズ","ムーンハウル","スイフトクロー"],
 halfling:["ポケットフル","リトルフィールド","マロウ","ティンバー","旅籠亭","バレルトン","グリーンフット","ハニーブルック","ラウンドヒル","メリーウェザー"],
 dragonkin:["ドラゴンブラッド","エンバースケイル","ヴェルムガル","古き血脈","フレイムクロウ","アッシュウィング","シンダーテイル","ゴールドスケイル"],
 starkin:["スターフォール","セレスティア","ルミエール","星辰の血脈","アストラルウィング","コスモスシェイド"],
};
function pickSurname(raceKey){const pool=SURNAME_POOL[raceKey]||SURNAME_POOL.human;return pool[Math.floor(Math.random()*pool.length)];}
/* 性格(純粋フレーバー、機能効果なし) */
const PERSONALITIES=["熱血","冷静","温厚","野心家","楽天家","慎重"];
const PERSONALITY_FRAG={
 熱血:["昔から血の気が多く、じっとしていられない性分だった。","何事にも真っ向からぶつかっていく気質だという。","一度火がつくと、誰にも止められないらしい。","負けん気の強さは、幼い頃から近所でも評判だった。"],
 冷静:["物事を落ち着いて見極める癖がある。","感情に流されることは滅多にないという。","どんな修羅場でも、顔色一つ変えないと評判だった。","静かに周りを観察するのが、昔からの癖らしい。"],
 温厚:["争いを好まず、誰にでも穏やかに接する。","怒った顔を見た者はほとんどいないらしい。","誰に対しても分け隔てなく接する性分だという。","争いごとの仲裁役を、よく任されていたらしい。"],
 野心家:["いつか名を上げてやると密かに誓っている。","現状に満足せず、常に上を見ているという。","小さな成功では満足しない性分らしい。","誰よりも高い場所を見ている、と周囲は語る。"],
 楽天家:["どんな時も「なんとかなる」が口癖だった。","苦境でもどこか飄々としているという。","悩むより先に笑ってしまう性分らしい。","暗い顔をしているところを、誰も見たことがないという。"],
 慎重:["石橋を叩いて渡る性分で、無茶をしない。","危険の芽を早くに摘み取ることに長けている。","念には念を入れる、堅実な気質だという。","先のことをよく考えてから動く子供だったらしい。"],
};
/* 兵士との会話ログ(性格別のちょっとした一言) */
const TALK_LINES={
 熱血:["「今日はやけに体が軽い。何かあれば真っ先に行かせてください」","「じっとしているのは性に合わないんです」","「次の任務、俺に任せてもらえませんか」"],
 冷静:["「特に変わったことはありません」と、いつも通り淡々と応じた。","「必要なことがあれば、いつでも呼んでください」","静かに頷き、それ以上は多くを語らなかった。"],
 温厚:["「皆さんのおかげで、毎日楽しく過ごせています」と笑った。","「何か困っていることはありませんか」と、逆に尋ねられた。","穏やかな笑みを浮かべ、世間話に付き合ってくれた。"],
 野心家:["「いつか、もっと大きな仕事を任せてもらいたいものです」","「上を目指すなら、今のままではいけませんね」","目を輝かせながら、将来の展望を語ってくれた。"],
 楽天家:["「なんとかなりますよ、いつも通り」と笑い飛ばした。","「悩んでも仕方ないので、今日はよく眠ります」","屈託のない笑顔で、他愛のない話をしてくれた。"],
 慎重:["「油断は禁物です。備えあれば憂いなし、ですから」","「念のため、色々と確認しておきました」","少し考え込んでから、丁寧に近況を話してくれた。"],
};
const TALK_LINES_FAVORITE=["「お気にかけていただき、光栄です」と少し照れた様子だった。","「長のお役に立てるよう、これからも励みます」"];
const TALK_LINES_CAPTAIN=["「団の皆をしっかりまとめてみせます」と、団長らしい顔つきで応じた。","「団長という立場の重みを、日々感じています」"];
function talkToUnit(u){
  let pool=TALK_LINES[u.personality]||TALK_LINES.冷静;
  if(u.captain&&Math.random()<0.4)pool=TALK_LINES_CAPTAIN;
  else if(u.favorite&&Math.random()<0.35)pool=TALK_LINES_FAVORITE;
  const line=pool[Math.floor(Math.random()*pool.length)];
  u.talks=u.talks||[];
  u.talks.push({day:S.day,text:line});
  if(u.talks.length>20)u.talks.shift();
  return line;
}
/* 生い立ち文書(出身×性格×特性の組み合わせ) */
const ORIGIN_INTRO_TMPL=["${o}――幼い頃をそこで過ごしたという。","${o}の生まれで、物心つく前からその土地を知っていた。","出は${o}。今もその土地の訛りが少し残っている。","${o}で育ち、その空気を吸って大きくなったという。","小さい頃の記憶の多くは、${o}での日々だという。"];
const REBORN_INTRO_TMPL=["この世界の生まれではないと、本人だけが知っている。それでも${o}の暮らしに馴染もうと努めてきたという。","前世の記憶を微かに抱えたまま、気づけば${o}で生を受けていたという。","なぜか${o}に生を受けたが、脳裏に浮かぶ景色は、どこか異なる世界のものだという。","${o}の者として育てられたが、時折見せる知識は明らかにこの世界のものではない。"];
const TRAIT_FRAG={
 normal:["どこにでもいる、ありふれた一人だったという。","特別な逸話は残っていないが、それもまた人生だろう。"],
 rare:["ただ、人並み以上の何かを秘めているという評判もある。","並の者とは一線を画す素質を、幼い頃から示していたらしい。","周囲が驚くような一面を、時折覗かせていたという。"],
 epic:["その力の片鱗は、既に周囲の目を引いていた。","只者ではない何かを纏っている、と古老は言う。","幼い頃から、どこか浮世離れした雰囲気があったらしい。"],
 legend:["世界にも稀な、桁外れの器を持って生まれたのだという。","伝承にしか語られぬような存在だと、まことしやかに囁かれている。","生まれた日、空に見慣れぬ光が差したという言い伝えがある。"],
};
function makeBackstory(originName,personality,traitTier,traitKey){
  const pool=traitKey==="reborn"?REBORN_INTRO_TMPL:ORIGIN_INTRO_TMPL;
  const introTmpl=pool[Math.floor(Math.random()*pool.length)];
  const intro=introTmpl.replace("${o}",originName);
  const pers=PERSONALITY_FRAG[personality][Math.floor(Math.random()*PERSONALITY_FRAG[personality].length)];
  let s=intro+pers;
  const tierKey=TRAIT_FRAG[traitTier]?traitTier:"normal";
  const tf=TRAIT_FRAG[tierKey];
  s+=tf[Math.floor(Math.random()*tf.length)];
  return s;
}
function makeUnit(){
  const cls=pickClass();
  const race=pickRace();
  const origin=pickOrigin(race.key);
  const trait=pickTrait();
  let nm=NAME_POOL[Math.floor(Math.random()*NAME_POOL.length)];
  if(race.key==="elf")nm=NAME_ELF[Math.floor(Math.random()*NAME_ELF.length)];
  if(race.key==="dwarf")nm=NAME_DWARF[Math.floor(Math.random()*NAME_DWARF.length)];
  if(race.key==="beastkin")nm=NAME_BEASTKIN[Math.floor(Math.random()*NAME_BEASTKIN.length)];
  if(race.key==="halfling")nm=NAME_HALFLING[Math.floor(Math.random()*NAME_HALFLING.length)];
  if(race.key==="dragonkin")nm=NAME_DRAGONKIN[Math.floor(Math.random()*NAME_DRAGONKIN.length)];
  if(race.key==="starkin")nm=NAME_STARKIN[Math.floor(Math.random()*NAME_STARKIN.length)];
  const surname=pickSurname(race.key);
  const personality=PERSONALITIES[Math.floor(Math.random()*PERSONALITIES.length)];
  const startAge=race.key==="elf"?ri(60,140):race.key==="dwarf"?ri(20,45):ri(16,27);
  const ob=origin.bonus||{};
  const backstory=makeBackstory(origin.name,personality,trait.tier,trait.key);
  const u={
    id:Math.random().toString(36).slice(2,9),
    nm, surname, personality, backstory,
    cls, race:race.key, origin:origin.key,
    lv:1,exp:0,
    str:ri(3,12)+race.str+(trait.str||0)+(ob.str||0),
    vit:ri(3,12)+race.vit+(trait.vit||0)+(ob.vit||0),
    int:ri(2,11)+race.int+(trait.int||0)+(ob.int||0),
    agi:ri(3,12)+(trait.agi||0)+(ob.agi||0),
    wis:ri(2,10)+(trait.wis||0)+(ob.wis||0),
    lead:ri(2,10)+(trait.lead||0)+(ob.lead||0),
    moral:ri(45,70), loyalty:ri(40,65),
    trait:trait.key, traitTier:trait.tier, pw:trait.pw||0, gm:trait.gm, route:null, titles:[], founder:false, totalExpEarned:0, criticalSurvivalCount:0, uniqueJob:null, wasCaptain:false, lifespanVariance:rnd(0.82,1.22), stageTiming:rnd(0.82,1.22),
    skills:[], injured:0, captain:false,
    age:startAge, role:"active", retiredAskedStage:null,
    bondWith:null, joinDay:(S&&S.day)||1,
    history:[],
    awakened:false, awakenTitle:null,
    fatigue:0, favorite:false, birthDay:ri(1,AGE_YEAR_DAYS), skillCapBase:ri(1,10),
    equipment:{weapon:null,armor:null,accessory:null},
    iconVariant:ri(0,ICON_VARIANTS_PER_CLASS-1),
  };
  u.skills=initSkills(u);
  return u;
}
function effectiveAgeMult(u){
  const st=ageStageOf(u);
  const eff=skillEffects(u);
  return 1-(1-st.mult)*(1-eff.ageResist);
}
function effectiveTrainMult(u){
  const st=ageStageOf(u);
  const resist=traitInfo(u.trait).ageTrainResist||0;
  return 1-(1-st.trainMult)*(1-resist);
}
/* 職ごとの主軸・準主軸ステータス(戦力計算・レベルアップ成長の両方で参照) */
const CLASS_STAT_PRIORITY={
 warrior:{main:"str",sub:"vit",light:"agi"},
 mage:{main:"int",sub:"wis",light:"agi"},
 archer:{main:"agi",sub:"str",light:"wis"},
 monk:{main:"str",sub:"agi",light:"vit"},
 priest:{main:"wis",sub:"int",light:"vit"},
 hunter:{main:"agi",sub:"wis",light:"str"},
};
function statPriorityFor(u){
  if(u.route){
    const r=routeInfo(u.cls,u.route);
    if(r)return r;
  }
  return CLASS_STAT_PRIORITY[u.cls]||CLASS_STAT_PRIORITY.warrior;
}
function fullName(u){return u.nm+(u.surname?" "+u.surname:"");}
function unitPower(u){
  const j=jobFor(u.cls,u.lv,u.route);
  const eff=skillEffects(u);
  const tr=traitInfo(u.trait);
  const str=u.str+eff.str, vit=u.vit+eff.vit, intg=u.int+eff.int, agi=u.agi+eff.agi, wis=u.wis+eff.wis, lead=(u.lead||0)+eff.lead;
  const statVal={str,vit,int:intg,agi,wis,lead};
  const pr=statPriorityFor(u);
  let p=statVal[pr.main]*0.45+statVal[pr.sub]*0.25+statVal[pr.light]*0.1+j.bonus+u.lv*0.4;
  p+=lead*0.06; // 統率は全職共通で薄く常時加算(指揮官気質はどの職にもいくらか値打ちがある)
  p+=(u.pw||0); // 特性由来の戦力補正(スキルは全てステータス補正化されたため、こちらは特性のみ)
  if(tr.condFlag&&S.flags&&S.flags[tr.condFlag])p+=(tr.condPw||0);
  if(u.captain)p+=4+lead*0.1; // 団長ボーナスは統率値でスケール(固定+6から変更)
  p*=effectiveAgeMult(u);
  if(u.loyalty<25)p*=0.85;
  if(u.injured>0)p*=(INJURY_TIERS[u.injurySeverity]&&INJURY_TIERS[u.injurySeverity].pwMult)||0.5;
  else p*=conditionInfo(u).pwMult;
  return p;
}
/* unitPower()と同じ計算式を、内訳表示用に構成要素へ分解したもの */
function unitPowerBreakdown(u){
  const j=jobFor(u.cls,u.lv,u.route);
  const eff=skillEffects(u);
  const tr=traitInfo(u.trait);
  const str=u.str+eff.str, vit=u.vit+eff.vit, intg=u.int+eff.int, agi=u.agi+eff.agi, wis=u.wis+eff.wis, lead=(u.lead||0)+eff.lead;
  const statVal={str,vit,int:intg,agi,wis,lead};
  const pr=statPriorityFor(u);
  const STAT_LABEL_JA={str:"腕力",vit:"体力",int:"魔力",agi:"敏捷",wis:"知恵",lead:"統率"};
  return{
    mainLabel:STAT_LABEL_JA[pr.main],mainVal:statVal[pr.main]*0.45,
    subLabel:STAT_LABEL_JA[pr.sub],subVal:statVal[pr.sub]*0.25,
    lightLabel:STAT_LABEL_JA[pr.light],lightVal:statVal[pr.light]*0.1,
    jobBonus:j.bonus,lvBonus:u.lv*0.4,leadBonus:lead*0.06,
    traitBonus:(u.pw||0)+((tr.condFlag&&S.flags&&S.flags[tr.condFlag])?(tr.condPw||0):0),
    captainBonus:u.captain?4+lead*0.1:0,
    ageMult:effectiveAgeMult(u),
    loyaltyMult:u.loyalty<25?0.85:1,
    condMult:u.injured>0?((INJURY_TIERS[u.injurySeverity]&&INJURY_TIERS[u.injurySeverity].pwMult)||0.5):conditionInfo(u).pwMult,
  };
}
function rosterCap(){
  const rank=STAGES[S.stage].rank;
  if(rank>=6)return 24;
  if(rank>=5)return 16;
  return 10; // 自治領(rank4)で騎士団編成可能になった時点の定員
}
function totalTroopPower(){
  if(!S.flags.knightOrder){
    return S.units.reduce((a,u)=>a+unitPower(u),0);
  }
  const cap=rosterCap();
  const sorted=[...S.units].sort((a,b)=>unitPower(b)-unitPower(a));
  let p=12; // 騎士団編成ボーナス
  sorted.forEach((u,i)=>{ p+= i<cap ? unitPower(u) : unitPower(u)*0.25; });
  return p;
}
function isInRoster(u){
  if(!S.flags.knightOrder)return true;
  const sorted=[...S.units].sort((a,b)=>unitPower(b)-unitPower(a));
  return sorted.findIndex(x=>x.id===u.id)<rosterCap();
}
function unitCap(){
  const rank=STAGES[S.stage].rank;
  return 20+(rank-1)*8; // Rank1:20 〜 Rank6:60
}
function addUnits(n){
  const room=Math.max(0,unitCap()-S.units.length);
  const actual=Math.min(n,room);
  if(actual<=0){
    if(n>0)chron(`兵舎が満員のため、新たな加入を受け入れられなかった(定員${unitCap()}名)。誰かを解雇するか、国を発展させて定員を増やす必要がある。`,"sys");
    return;
  }
  for(let i=0;i<actual;i++){
    const u=makeUnit();
    S.units.push(u);
    if(u.traitTier==="legend")chron(`――${u.nm}という者が加わった。${traitInfo(u.trait).desc}。ただ者ではない気配がする。`,"big");
    else if(u.traitTier==="epic")chron(`${u.nm}が加わった。「${traitInfo(u.trait).name}」の異名を持つという。`,"sys");
  }
  if(actual<n)chron(`定員(${unitCap()}名)の都合で、一部の加入は見送られた。`,"sys");
}
function unitHistory(u,text){u.history.push({day:S.day,text});if(u.history.length>30)u.history.shift();}
function releaseUniqueIfHolder(u){
  if(S.uniqueHolderId===u.id){
    S.uniqueHolderId=null;
    const uniq=u.skills.map(k=>SKILL_DB.find(s=>s.key===k)).find(s=>s&&s.tier==="unique");
    if(uniq)chron(`「${uniq.name}」を宿していた${u.nm}の物語はここで幕を閉じたが、その力はいつか、誰かに引き継がれるだろう。`,"grave");
  }
}
