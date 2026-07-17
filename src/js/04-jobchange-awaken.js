/* ---------- ミッション:3〜5人の部隊を送る大型ミッション(リスク/リワード選択式) ---------- */
/* ==================== ダンジョンシステム ==================== */
const DUNGEON_PREFIX=["忘れられた","呪われた","朽ちた","凍てつく","燃え盛る","静寂の","血塗られた","封じられし","古き","名もなき","崩れかけた","光なき","囁きの","荒れ果てた","深淵の","蒼ざめた","黄昏の","黒き","嘆きの","毒されし","眠れる","砕けし","狂気の","忌まわしき","星屑の"];
const DUNGEON_CORE=["回廊","地下墓地","祭壇の間","坑道","神殿跡","巣窟","迷宮","氷穴","火口","遺跡","地下水路","墓所","塔","洞窟","封印の間","大書庫","監獄跡","礼拝堂","樹海","竜脈","鏡の間","時計塔","庭園跡","涸れ井戸","星見台"];
function dungeonName(){return DUNGEON_PREFIX[Math.floor(Math.random()*DUNGEON_PREFIX.length)]+DUNGEON_CORE[Math.floor(Math.random()*DUNGEON_CORE.length)];}
const DUNGEON_TYPES=[
 {key:"combat",label:"戦闘型",color:"#d47a7a",statFn:u=>u.str*0.45+u.vit*0.35+u.agi*0.2},
 {key:"puzzle",label:"知略型",color:"#b08fd9",statFn:u=>u.wis*0.4+u.int*0.4+u.lead*0.2},
 {key:"stealth",label:"隠密型",color:"#7ac98f",statFn:u=>u.agi*0.45+u.wis*0.35+u.str*0.2},
 {key:"endurance",label:"耐久型",color:"#d4b56a",statFn:u=>u.vit*0.5+u.str*0.3+u.lead*0.2},
 {key:"arcane",label:"魔導型",color:"#7a9ed4",statFn:u=>u.int*0.5+u.wis*0.3+u.vit*0.2},
 {key:"trap",label:"罠地帯",color:"#d9a05e",statFn:u=>u.agi*0.4+u.wis*0.4+u.int*0.2},
 {key:"cursed",label:"呪詛型",color:"#9a6bb0",statFn:u=>u.int*0.4+u.wis*0.35+u.vit*0.25},
 {key:"labyrinth",label:"迷宮型",color:"#6fa3a0",statFn:u=>u.wis*0.5+u.agi*0.3+u.lead*0.2},
 {key:"fortress",label:"要塞型",color:"#a06f4f",statFn:u=>u.str*0.4+u.lead*0.35+u.vit*0.25},
 {key:"abyss",label:"深淵型",color:"#5a6fa0",statFn:u=>u.int*0.35+u.str*0.3+u.vit*0.2+u.agi*0.15},
];
function bestDungeonTypeFor(u){
  let best=null,bestScore=-1;
  for(const t of DUNGEON_TYPES){
    const score=t.statFn(u);
    if(score>bestScore){bestScore=score;best=t;}
  }
  return best;
}
const BOSS_NAME_POOL=["屍食らいの巨人","影纏う狩人","古の守護竜","堕ちた聖騎士","千年蜘蛛の女王","業火の獄卒","氷結の亡霊王","嘆きの石像鬼","毒沼の主","狂乱の魔道士","無貌の刺客","墓守の骸骨王","星喰らいの触手","雷鳴の巨鳥","深淵の番人","朽ちぬ亡者の王","血に飢えた獣王","砂塵の巨蠍","鏡界の分身","呪詛纏いし木霊","漆黒の翼竜","涙の亡霊姫","鉄仮面の処刑人","百目の見張り","蝕む影の集合体","氷牙の狼王","灼熱の溶岩巨人","古書に棲む知性体","終焉の鐘撞き","絡繰り仕掛けの番人","忘却の書記官","九尾の妖狐","荒野の彷徨う騎士","深海より来たりし者","時渡りの旅人","嵐を呼ぶ大鴉","黄金に憑かれし亡者","星読みの魔女","地底の顎","無音の追跡者"];
function generateBossName(rarityKey){
  const base=BOSS_NAME_POOL[Math.floor(Math.random()*BOSS_NAME_POOL.length)];
  const rank=rarityKey==="legendary"?"冥王・":rarityKey==="epic"?"魔将・":rarityKey==="rare"?"上位・":"";
  return rank+base;
}
function dungeonRarity(){
  const kRank=STAGES[S.stage].rank; // 1(開拓期)〜6
  const r=Math.random();
  const legendCut=Math.max(0.0005,0.0005+(kRank-1)*0.012);
  const epicCut=legendCut+Math.max(0.003,0.01+(kRank-1)*0.05);
  const rareCut=epicCut+Math.max(0.05,0.15+(kRank-1)*0.09);
  if(r<legendCut)return{key:"legendary",label:"レジェンドダンジョン",mult:3.6,color:"#e8c874"};
  if(r<epicCut)return{key:"epic",label:"エピックダンジョン",mult:2.3,color:"#c98fe8"};
  if(r<rareCut)return{key:"rare",label:"レアダンジョン",mult:1.5,color:"#8fd0e8"};
  return{key:"common",label:"",mult:1,color:null};
}
function dungeonLevelRange(){
  const cleared=S.dungeonsCleared||0;
  const avgPower=S.units.length?totalTroopPower()/S.units.length:8;
  const powerBase=Math.round(avgPower*0.75); // 部隊の育ち具合からも直接算出。まだ易しいとのフィードバックを受けさらに厳しく調整
  const clearBase=Math.min(90,1+Math.floor(cleared*2.2));
  const base=Math.min(95,Math.max(powerBase,clearBase));
  const spread=Math.min(20,6+cleared*1.5); // 序盤は幅も狭く、徐々に広がっていく
  return[Math.max(1,base),Math.min(100,base+spread)];
}
function generateDungeon(){
  const[lo,hi]=dungeonLevelRange();
  const level=ri(lo,hi);
  const rarity=dungeonRarity();
  const type=DUNGEON_TYPES[Math.floor(Math.random()*DUNGEON_TYPES.length)];
  const requiredPower=Math.round((20+level*4.0)*rarity.mult); // シビアすぎるとの声を受け、目安戦力の要求値を緩和
  const duration=Math.max(3,Math.round(level/6)+Math.round((rarity.mult-1)*2.2));
  return{
    id:Math.random().toString(36).slice(2,9),
    name:dungeonName(),level,rarity,type,requiredPower,duration,
    bossName:generateBossName(rarity.key),bossPower:Math.round(requiredPower*1.3),
    discoveredDay:S.day,
  };
}
/* ---------- サプライズ転職イベント(低確率・ランダム転職+新職の主軸ステータスにボーナス) ---------- */
function buildJobChangeSurpriseEvent(){
  const eligible=S.units.filter(u=>u.injured<=0);
  if(!eligible.length)return null;
  const u=eligible[Math.floor(Math.random()*eligible.length)];
  const others=Object.keys(JOB_TREES).filter(k=>k!==u.cls);
  const newCls=others[Math.floor(Math.random()*others.length)];
  const oldLabel=JOB_TREES[u.cls].label;
  const newLabel=JOB_TREES[newCls].label;
  return{tag:"意 外",title:`${u.nm}、知られざる才`,
   body:`${u.nm}が、実は${newLabel}の心得を持っていたことが判明した。今の${oldLabel}としての務めより、そちらの方が向いているかもしれない。`,
   speaker:`ガレオン「昔取った杵柄、というやつでしょうか。転向させてみますか」`,
   choices:[
    {label:`${newLabel}へ転向させる`,hint:"新しい職の主軸ステータスにボーナス",fx:{call:()=>{
      const pr=CLASS_STAT_PRIORITY[newCls]||CLASS_STAT_PRIORITY.warrior;
      const bonus=ri(3,10);
      u[pr.main]+=bonus;
      changeJobCore(u,newCls,`実は${newLabel}の才があったようで、転向した(${USTAT_DEF[pr.main].lbl}+${bonus})。`);
      chron(`――${u.nm}は、実は${newLabel}の心得があったという。${oldLabel}から転向し、${USTAT_DEF[pr.main].lbl}が+${bonus}された。`,"big");
    }}},
    {label:"今のままでいさせる",hint:"変更しない",fx:{log:`${u.nm}は、今の${oldLabel}としての道を続けることにした。`}},
   ]};
}
function checkDungeonDiscovery(rewardMult,discoverer){
  const chance=0.6*(rewardMult||1);
  if(Math.random()<chance){
    const d=generateDungeon();
    S.availableDungeons=S.availableDungeons||[];
    S.availableDungeons.push(d);
    if(S.availableDungeons.length>5){
      const dropIdx=S.availableDungeons.findIndex(x=>!x.isFinal&&!x.protected);
      if(dropIdx>=0)S.availableDungeons.splice(dropIdx,1);
    }
    chron(`ミッションの道中、${d.rarity.label?`【${d.rarity.label}】`:""}「${d.name}」への入口が見つかったという。`,"big");
    if(discoverer)grantTitle(discoverer,"t_pioneer");
    return d;
  }
  return null;
}

/* ==================== アイテムシステム ==================== */
function jobChangeItemEffect(newCls,targetId){
  const u=findAnyUnit(targetId);
  if(!u){chron("秘薬に応える者は、今はいなかった。","");return;}
  if(u.cls===newCls){chron(`${u.nm}は既にその道を歩んでいる。秘薬は効果を発揮しなかった。`,"");return;}
  const oldLabel=JOB_TREES[u.cls].label;
  if(Math.random()<0.65){
    changeJobCore(u,newCls,`秘薬の力で${JOB_TREES[newCls].label}へ転職した。`);
    chron(`${u.nm}が秘薬の力で${oldLabel}から${JOB_TREES[newCls].label}へ転職した。`,"big");
  }else{
    chron(`${u.nm}に秘薬を与えたが、体質に合わなかったようだ。秘薬は失われた。`,"grave");
  }
}
/* アイテムで新規兵士を仲間に加える共通処理。rankLabelで大まかな粒(質)を指定する */
function itemRecruitUnit(rankLabel,flavorText){
  if(S.units.length>=unitCap()){chron("兵舎が満員のため、新たな仲間を迎えられなかった。","sys");return null;}
  const u=makeRecruitCandidate();
  if(rankLabel)fitUnitToRank(u,rankLabel);
  S.units.push(u);
  unitHistory(u,flavorText||"アイテムの縁で、アルヴェインの一員となった。");
  chron(`${fullName(u)}が仲間に加わった。「よろしくお願いします」`,"big");
  return u;
}
const ITEMS=[
 // ── コモン(手軽な消耗品) ──
 {key:"coin_small",name:"小さな硬貨袋",rarity:"common",desc:"国庫が少し潤う。",effect:()=>apply({gold:ri(15,30),log:"硬貨袋を使い、国庫がわずかに潤った。"})},
 {key:"grain_sack",name:"穀物の袋",rarity:"common",desc:"食糧が少し増える。",effect:()=>apply({food:ri(20,40),log:"穀物の袋を蔵に運び入れた。"})},
 {key:"tonic",name:"疲労回復の秘薬",rarity:"common",desc:"選んだ兵の疲労を大きく回復。",needsTarget:true,effect:(targetId)=>{const u=findAnyUnit(targetId);if(!u)return;u.fatigue=Math.max(0,(u.fatigue||0)-50);chron(`${u.nm}が秘薬を使い、疲労が大きく和らいだ。`,"");}},
 {key:"bandage_kit",name:"上等な包帯",rarity:"common",desc:"療養中の兵の回復日数を短縮。",effect:()=>{const c=S.units.filter(u=>u.injured>0);if(!c.length){chron("療養中の兵がおらず、包帯は使われなかった。","");return;}const u=c[Math.floor(Math.random()*c.length)];u.injured=Math.max(0,u.injured-2);chron(`${u.nm}の傷の治りが早まった。`,"");}},
 {key:"charm_luck",name:"幸運のお守り",rarity:"common",desc:"民心が少し上がる。",effect:()=>apply({mood:ri(3,6),log:"幸運のお守りが配られ、民の顔に笑みが戻った。"})},
 {key:"herb_bundle",name:"薬草の束",rarity:"common",desc:"農業が少し上がる。",effect:()=>apply({st:{agriculture:ri(1,3)},log:"薬草の知識が畑仕事に活かされた。"})},
 {key:"scrap_iron",name:"くず鉄の塊",rarity:"common",desc:"軍事が少し上がる。",effect:()=>apply({st:{military:ri(1,3)},log:"くず鉄が武具の補修に使われた。"})},
 {key:"old_map",name:"古い地図の切れ端",rarity:"common",desc:"ダンジョン発見率が一時的に上がる(次のミッションのみ)。",effect:()=>{S.flags._mapBonus=true;chron("古い地図を手に入れた。次のミッションで役立つかもしれない。","");}},
 {key:"training_manual",name:"初歩の教本",rarity:"common",desc:"ランダムな兵に少量の経験値。",effect:()=>{if(!S.units.length)return;const u=S.units[Math.floor(Math.random()*S.units.length)];u.exp+=ri(8,15);processLevelUps(u);chron(`${u.nm}が教本を読み込み、わずかに腕を上げた。`,"");}},
 {key:"spice_box",name:"香辛料の小箱",rarity:"common",desc:"経済が少し上がる。",effect:()=>apply({st:{economy:ri(1,3)},log:"珍しい香辛料が市場で評判になった。"})},
 {key:"candle_bundle",name:"上等な蝋燭",rarity:"common",desc:"魔導が少し上がる。",effect:()=>apply({st:{magic:ri(1,3)},log:"夜通しの研究が捗ったようだ。"})},
 {key:"letter_intro",name:"紹介状",rarity:"common",desc:"外交が少し上がる。",effect:()=>apply({st:{diplomacy:ri(1,3)},log:"紹介状が思わぬところで役に立った。"})},
 // ── アンコモン ──
 {key:"coin_pouch",name:"重い金貨袋",rarity:"uncommon",desc:"国庫がまとまって潤う。",effect:()=>apply({gold:ri(60,110),log:"金貨袋の中身が国庫に納められた。"})},
 {key:"stat_tonic",name:"成長の霊薬",rarity:"uncommon",desc:"ランダムな兵の全ステータスが少し上昇。",effect:()=>{if(!S.units.length)return;const u=S.units[Math.floor(Math.random()*S.units.length)];const b=ri(2,4);for(const k of["str","vit","int","agi","wis","lead"])u[k]+=b;chron(`${u.nm}が霊薬を服用し、力がみなぎるのを感じた。`,"big");}},
 {key:"full_heal",name:"完全治癒の秘薬",rarity:"uncommon",desc:"療養中の兵を即座に全回復させる。",effect:()=>{const c=S.units.filter(u=>u.injured>0);if(!c.length){chron("療養中の兵がおらず、秘薬は温存された。","");return;}const u=c[Math.floor(Math.random()*c.length)];u.injured=0;u.injurySeverity=null;chron(`${u.nm}の傷が、たちどころに癒えた。`,"big");}},
 {key:"skillbook",name:"技伝授の書",rarity:"uncommon",desc:"選んだ兵にランダムなスキルを1つ授ける(最上位クラスのスキルは対象外)。",needsTarget:true,effect:(targetId)=>{const u=findAnyUnit(targetId);if(!u)return;const learned=trySkillUpItem(u);if(learned)chron(`${fullName(u)}が技伝授の書から「${learned.name}」を学んだ。`,"big");else chron("技伝授の書を開いたが、これ以上学べることはなかったようだ。","");}},
 {key:"morale_banner",name:"鼓舞の軍旗",rarity:"uncommon",desc:"全兵士の士気が上がる。",effect:()=>{for(const u of S.units)u.moral=Math.min(100,u.moral+ri(10,18));chron("鼓舞の軍旗が掲げられ、全軍の士気が高まった。","big");}},
 {key:"recruit_ticket",name:"人材紹介状",rarity:"uncommon",desc:"やや優秀な人材が一人加わる。",effect:()=>{if(S.units.length>=unitCap()){chron("兵舎が満員のため、人材紹介状は使えなかった。","");return;}const u=makeUnit();const targetLv=ri(3,6);for(let i=1;i<targetLv;i++)u.exp+=i*10;processLevelUps(u,true);S.units.push(u);chron(`人材紹介状により、${u.nm} ${u.surname}が加わった。`,"big");}},
 {key:"forge_stone",name:"強化の砥石",rarity:"uncommon",desc:"軍事がまとまって上がる。",effect:()=>apply({st:{military:ri(3,6)},log:"武具が念入りに研ぎ澄まされた。"})},
 {key:"grimoire_page",name:"魔導書の一頁",rarity:"uncommon",desc:"魔導がまとまって上がる。",effect:()=>apply({st:{magic:ri(3,6)},log:"失われた術式の一端が解読された。"})},
 {key:"trade_route",name:"新たな交易路の記録",rarity:"uncommon",desc:"経済がまとまって上がる。",effect:()=>apply({st:{economy:ri(3,6)},log:"新たな交易路が拓かれた。"})},
 {key:"census_scroll",name:"戸籍簿の写し",rarity:"uncommon",desc:"人口が少し増える。",effect:()=>apply({pop:ri(3,6),log:"戸籍の整理により、行方知れずだった民が数名見つかった。"})},
 {key:"treaty_seal",name:"古い盟約の印章",rarity:"uncommon",desc:"外交がまとまって上がる。",effect:()=>apply({st:{diplomacy:ri(3,6)},log:"古い盟約の印章が、外交の場で重みを持った。"})},
 // ── レア ──
 {key:"phoenix_feather",name:"不死鳥の羽根",rarity:"rare",desc:"戦没しかけた兵を一人、必ず救う(お守りとして常時携帯)。",type:"permanent",effect:()=>{chron("不死鳥の羽根を懐に忍ばせた。いざという時、誰かの命を救うだろう。","big");S.flags.phoenixCharm=(S.flags.phoenixCharm||0)+1;}},
 {key:"talented_scroll",name:"逸材招来の巻物",rarity:"rare",desc:"高ステータスの逸材が一人加わる。",effect:()=>{if(S.units.length>=unitCap()){chron("兵舎が満員のため、巻物は使えなかった。","");return;}const u=makeRecruitCandidate();u.talented=true;const bonus=ri(8,14);for(const k of["str","vit","int","agi","wis","lead"])u[k]+=bonus;S.units.push(u);chron(`逸材招来の巻物により、${u.nm} ${u.surname}(逸材)が加わった。`,"big");}},
 {key:"unique_shard",name:"固有の欠片",rarity:"rare",desc:"固有スキル保持者がいなければ、ランダムな兵が固有スキルに目覚める。",effect:()=>{if(S.uniqueHolderId||!S.units.length){chron("固有の欠片は、今は反応を示さなかった。","");return;}const u=S.units[Math.floor(Math.random()*S.units.length)];const uniq=SKILL_DB.filter(s=>s.tier==="unique"&&(!s.cls||s.cls===u.cls));if(!uniq.length)return;const pick=uniq[Math.floor(Math.random()*uniq.length)];u.skills.push(pick.key);S.uniqueHolderId=u.id;grantTitle(u,"t_uniqueholder");chron(`固有の欠片に触れた${u.nm}が、「${pick.name}」に目覚めた。`,"big");}},
 {key:"awaken_catalyst",name:"覚醒の触媒",rarity:"rare",desc:"英雄格の兵一人の経験値を大幅に押し上げる。",effect:()=>{const heroes=S.units.filter(u=>jobFor(u.cls,u.lv,u.route).key==="hero"&&!u.awakened);if(!heroes.length){chron("覚醒の触媒に応える者はいなかった。","");return;}const u=heroes[Math.floor(Math.random()*heroes.length)];u.exp+=u.lv*10*3;processLevelUps(u);chron(`覚醒の触媒により、${u.nm}の力が大きく伸びた。`,"big");}},
 {key:"time_capsule",name:"時を止める香",rarity:"rare",desc:"全兵士の疲労を全回復。",effect:()=>{for(const u of S.units)u.fatigue=0;chron("不思議な香が焚かれ、全軍が疲れを忘れたように動き出した。","big");}},
 {key:"golden_seed",name:"黄金の種",rarity:"rare",desc:"経済・農業がまとまって上がる。",effect:()=>apply({st:{economy:5,agriculture:5},log:"黄金の種が蒔かれ、この地に豊かさをもたらした。"})},
 {key:"war_horn",name:"古の戦角",rarity:"rare",desc:"軍事が大きく上がる。",effect:()=>apply({st:{military:8},log:"古の戦角の音が谷に響き渡った。"})},
 {key:"star_chart",name:"星読みの図",rarity:"rare",desc:"魔導が大きく上がる。",effect:()=>apply({st:{magic:8},log:"星々の配置から、新たな真理が読み解かれた。"})},
 {key:"envoy_ring",name:"使節の指輪",rarity:"rare",desc:"外交が大きく上がる。",effect:()=>apply({st:{diplomacy:8},log:"使節の指輪を示すと、相手方の態度が目に見えて変わった。"})},
 // ── エピック ──
 {key:"dragon_scale",name:"竜の逆鱗",rarity:"epic",desc:"全兵士のステータスが上昇する。",effect:()=>{for(const u of S.units){const b=ri(1,3);for(const k of["str","vit","int","agi","wis","lead"])u[k]+=b;}chron("竜の逆鱗の力が、全軍に行き渡った。伝説はまことだったようだ。","big");}},
 {key:"reborn_elixir",name:"転生者の秘薬",rarity:"epic",desc:"レジェンド級の逸材(転生者)が一人、必ず加わる。",effect:()=>{if(S.units.length>=unitCap()){chron("兵舎が満員のため、秘薬は使えなかった。","");return;}const u=makeUnit();u.trait="reborn";u.traitTier="legend";const tr=traitInfo("reborn");u.str+=tr.str||0;u.vit+=tr.vit||0;u.int+=tr.int||0;u.pw=tr.pw||0;u.gm=tr.gm||1;S.units.push(u);chron(`――転生者の秘薬が輝き、${u.nm} ${u.surname}という名の者が姿を現した。ただ者ではない気配がする。`,"big");}},
 {key:"philosopher_stone",name:"賢者の石",rarity:"epic",desc:"全国力が大きく上昇する。",effect:()=>apply({st:{military:6,economy:6,agriculture:6,magic:6,order:6,diplomacy:6},log:"賢者の石の力が、国のあらゆる面に行き渡った。"})},
 {key:"crown_relic",name:"古の王冠",rarity:"epic",desc:"民心が大きく上昇し、以後の税収がわずかに上がる(永続)。",type:"permanent",effect:()=>{apply({mood:15,log:"古の王冠を戴くと、不思議な威厳が長を包んだ。"});S.flags.crownRelic=true;}},
 // ── レジェンド ──
 {key:"world_tree_seed",name:"世界樹の種",rarity:"legendary",desc:"国のあらゆる面に絶大な恩恵をもたらす。",effect:()=>apply({gold:300,food:200,pop:15,mood:20,st:{military:10,economy:10,agriculture:10,magic:10,order:10,diplomacy:10},log:"――世界樹の種が芽吹いた。この地に、かつてない恩恵をもたらすだろう。",logCls:"big"})},
 {key:"star_child_charm",name:"星降りし子の護符",rarity:"legendary",desc:"レジェンド級の逸材(星降りし子)が一人、必ず加わる。",effect:()=>{if(S.units.length>=unitCap()){chron("兵舎が満員のため、護符は使えなかった。","");return;}const u=makeUnit();u.trait="starchild";u.traitTier="legend";const tr=traitInfo("starchild");for(const k of["str","vit","int"])u[k]+=tr[k]||0;u.pw=tr.pw||0;u.gm=tr.gm||1;S.units.push(u);chron(`――星降りし子の護符が光を放ち、${u.nm} ${u.surname}が姿を現した。星に導かれし者だという。`,"big");}},
 // ── コモン追加(第2弾) ──
 {key:"dried_fish",name:"干し魚の束",rarity:"common",desc:"食糧が少し増える。",effect:()=>apply({food:ri(15,28),log:"干し魚が蔵に運び込まれた。"})},
 {key:"wool_blanket",name:"厚手の毛布",rarity:"common",desc:"選んだ兵の疲労を少し回復。",needsTarget:true,effect:(targetId)=>{const u=findAnyUnit(targetId);if(!u)return;u.fatigue=Math.max(0,(u.fatigue||0)-18);chron(`${u.nm}が毛布にくるまり、ぐっすり眠った。`,"");}},
 {key:"copper_coin",name:"古い銅貨",rarity:"common",desc:"国庫が少し潤う。",effect:()=>apply({gold:ri(8,20),log:"古い銅貨が見つかり、いくらかの足しになった。"})},
 {key:"paper_lantern",name:"紙灯籠",rarity:"common",desc:"民心が少し上がる。",effect:()=>apply({mood:ri(2,4),log:"夜、紙灯籠が谷を淡く照らした。"})},
 {key:"sharpening_oil",name:"研ぎ油",rarity:"common",desc:"軍事が少し上がる。",effect:()=>apply({st:{military:ri(1,3)},log:"武具の手入れが行き届いた。"})},
 {key:"fertile_soil",name:"肥沃な土",rarity:"common",desc:"農業が少し上がる。",effect:()=>apply({st:{agriculture:ri(1,3)},log:"畑の一角に肥沃な土が運び込まれた。"})},
 {key:"small_mirror",name:"小さな鏡",rarity:"common",desc:"外交が少し上がる。",effect:()=>apply({st:{diplomacy:ri(1,3)},log:"贈り物にした鏡が、思いのほか喜ばれた。"})},
 {key:"chalk_stick",name:"白墨の棒",rarity:"common",desc:"魔導が少し上がる。",effect:()=>apply({st:{magic:ri(1,3)},log:"魔法陣を描く白墨が新調された。"})},
 {key:"guard_whistle",name:"見張りの角笛",rarity:"common",desc:"治安が少し上がる。",effect:()=>apply({st:{order:ri(1,3)},log:"角笛の合図が、見回りの連携を良くした。"})},
 {key:"honey_jar",name:"蜂蜜の壺",rarity:"common",desc:"民心が少し上がる。",effect:()=>apply({mood:ri(2,5),log:"蜂蜜の壺が振る舞われ、子供たちが喜んだ。"})},
 {key:"leather_strap",name:"革紐の束",rarity:"common",desc:"経済が少し上がる。",effect:()=>apply({st:{economy:ri(1,3)},log:"革紐が様々な道具の補修に使われた。"})},
 {key:"pressed_flower",name:"押し花のしおり",rarity:"common",desc:"ランダムな兵の士気が少し上がる。",effect:()=>{if(!S.units.length)return;const u=S.units[Math.floor(Math.random()*S.units.length)];u.moral=Math.min(100,u.moral+ri(5,10));chron(`${u.nm}が押し花のしおりを大切そうにしまった。`,"");}},
 {key:"clay_pot",name:"素焼きの壺",rarity:"common",desc:"食糧が少し増える。",effect:()=>apply({food:ri(15,28),log:"素焼きの壺に、日々の蓄えが詰められた。"})},
 {key:"iron_nail",name:"鉄釘の袋",rarity:"common",desc:"経済が少し上がる。",effect:()=>apply({st:{economy:ri(1,3)},log:"鉄釘が建築に一役買った。"})},
 {key:"wild_herb",name:"野草の一束",rarity:"common",desc:"選んだ兵の疲労を少し回復。",needsTarget:true,effect:(targetId)=>{const u=findAnyUnit(targetId);if(!u)return;u.fatigue=Math.max(0,(u.fatigue||0)-18);chron(`${u.nm}が野草を煎じて飲んだ。`,"");}},
 {key:"traveling_map",name:"旅の地図",rarity:"common",desc:"外交が少し上がる。",effect:()=>apply({st:{diplomacy:ri(1,3)},log:"旅の地図が、思わぬ交渉の助けになった。"})},
 // ── アンコモン追加(第2弾) ──
 {key:"silver_bell",name:"銀の鈴",rarity:"uncommon",desc:"民心がまとまって上がる。",effect:()=>apply({mood:ri(8,14),log:"銀の鈴の音が、谷に静かな安らぎをもたらした。"})},
 {key:"iron_shipment",name:"鉄材の輸送隊",rarity:"uncommon",desc:"軍事がまとまって上がる。",effect:()=>apply({st:{military:ri(3,6)},log:"鉄材の輸送隊が到着し、武具の質が上がった。"})},
 {key:"seed_vault",name:"種子庫の一部",rarity:"uncommon",desc:"農業がまとまって上がる。",effect:()=>apply({st:{agriculture:ri(3,6)},log:"種子庫が拡充され、来期への備えが進んだ。"})},
 {key:"scholar_letter",name:"学者からの書状",rarity:"uncommon",desc:"魔導がまとまって上がる。",effect:()=>apply({st:{magic:ri(3,6)},log:"学者からの書状に、貴重な知見が記されていた。"})},
 {key:"patrol_map",name:"詳細な巡回図",rarity:"uncommon",desc:"治安がまとまって上がる。",effect:()=>apply({st:{order:ri(3,6)},log:"巡回図をもとに、見回りの経路が整理された。"})},
 {key:"guild_seal",name:"商業組合の証",rarity:"uncommon",desc:"経済がまとまって上がる。",effect:()=>apply({st:{economy:ri(3,6)},log:"商業組合の証が、取引を大きく後押しした。"})},
 {key:"warm_meal",name:"温かい炊き出し",rarity:"uncommon",desc:"全兵士の疲労が少し回復。",effect:()=>{for(const u of S.units)u.fatigue=Math.max(0,(u.fatigue||0)-12);chron("炊き出しが振る舞われ、兵たちの顔がほころんだ。","big");}},
 {key:"trade_caravan",name:"隊商との取引",rarity:"uncommon",desc:"国庫がまとまって潤う。",effect:()=>apply({gold:ri(50,90),log:"隊商との取引がまとまり、実入りが増えた。"})},
 {key:"census_book",name:"戸籍簿の写し(続)",rarity:"uncommon",desc:"人口がまとまって増える。",effect:()=>apply({pop:ri(4,8),log:"戸籍簿の整理で、新たな住民が把握された。"})},
 {key:"morale_song",name:"鼓舞の歌",rarity:"uncommon",desc:"全兵士の士気が少し上がる。",effect:()=>{for(const u of S.units)u.moral=Math.min(100,u.moral+ri(6,12));chron("鼓舞の歌が広まり、全軍の士気が上向いた。","big");}},
 {key:"apprentice_scroll",name:"見習いの心得書",rarity:"uncommon",desc:"ランダムな兵に中量の経験値。",effect:()=>{if(!S.units.length)return;const u=S.units[Math.floor(Math.random()*S.units.length)];u.exp+=ri(12,22);processLevelUps(u);chron(`${u.nm}が心得書を熟読し、腕を上げた。`,"big");}},
 // ── レア追加(第2弾) ──
 {key:"blessed_banner",name:"祝福の軍旗",rarity:"rare",desc:"全兵士の忠誠・士気が上がる。",effect:()=>{for(const u of S.units){u.loyalty=Math.min(100,u.loyalty+ri(6,12));u.moral=Math.min(100,u.moral+ri(6,12));}chron("祝福の軍旗が掲げられ、全軍の士気と忠誠が高まった。","big");}},
 {key:"master_forge",name:"名匠の炉",rarity:"rare",desc:"軍事・経済がまとまって上がる。",effect:()=>apply({st:{military:6,economy:4},log:"名匠の炉が、武具と交易の双方を潤した。"})},
 {key:"ancient_seed",name:"古の種",rarity:"rare",desc:"農業が大きく上がる。",effect:()=>apply({st:{agriculture:8},log:"古の種が、豊かな実りをもたらした。"})},
 {key:"diplomatic_gift",name:"外交の贈答品",rarity:"rare",desc:"外交が大きく上がる。",effect:()=>apply({st:{diplomacy:8},log:"見事な贈答品が、外交の場に驚きをもたらした。"})},
 {key:"forbidden_tome",name:"禁書の写し",rarity:"rare",desc:"魔導が大きく上がる。",effect:()=>apply({st:{magic:8},log:"禁書に記された術式の一端が解読された。"})},
 {key:"veteran_gathering",name:"古参兵の集い",rarity:"rare",desc:"全兵士の経験値がまとまって上がる。",effect:()=>{for(const u of S.units){u.exp+=ri(6,12);processLevelUps(u);}chron("古参兵の集いが開かれ、若手も大いに学んだ。","big");}},
 {key:"grand_bounty",name:"豊穣の恵み",rarity:"rare",desc:"食糧・国庫がまとまって増える。",effect:()=>apply({food:80,gold:60,log:"豊穣の恵みが、蔵と国庫の双方を潤した。"})},
 {key:"skill_master_book",name:"技能大全",rarity:"rare",desc:"選んだ兵にランダムなスキルを1つ授ける(最上位クラスのスキルは対象外)。",needsTarget:true,effect:(targetId)=>{const u=findAnyUnit(targetId);if(!u)return;const learned=trySkillUpItem(u);if(learned)chron(`${fullName(u)}が技能大全から「${learned.name}」を学んだ。`,"big");else chron("技能大全を開いたが、これ以上学べることはなかったようだ。","");}},
 // ── エピック追加(第2弾) ──
 {key:"phoenix_egg",name:"不死鳥の卵",rarity:"epic",desc:"戦没を防ぐお守りが2つ手に入る。",type:"permanent",effect:()=>{S.flags.phoenixCharm=(S.flags.phoenixCharm||0)+2;chron("不死鳥の卵を懐に忍ばせた。いざという時、二度まで命を救うだろう。","big");}},
 {key:"grand_library",name:"大図書館の蔵書",rarity:"epic",desc:"全兵士に経験値、魔導・知識面の国力も上がる。",effect:()=>{for(const u of S.units){u.exp+=ri(8,15);processLevelUps(u);}apply({st:{magic:6,diplomacy:4}});chron("大図書館の蔵書が、国全体に知の恩恵をもたらした。","big");}},
 {key:"titan_bone",name:"巨人の骨",rarity:"epic",desc:"軍事・農業が大きく上昇する。",effect:()=>apply({st:{military:9,agriculture:9},log:"巨人の骨から得た知見が、様々な分野に活かされた。"})},
 // ── レジェンド追加(第2弾) ──
 {key:"eternal_flame",name:"永遠の炎",rarity:"legendary",desc:"国庫・食糧・民心が絶大に上昇する永続の炉。",type:"permanent",effect:()=>{apply({gold:200,food:150,mood:15,log:"――永遠の炎が灯された。以後、この炉は尽きることなく国を支え続けるという。"});S.flags.eternalFlame=true;}},
 // ── 装備品(消耗品・選択式で特定の兵のステータスを永続強化) ──
 {key:"eq_str_common",name:"剛力の腕輪(粗末)",rarity:"common",desc:"選んだ兵の腕力を+3する装備品(消耗品)。",needsTarget:true,statKey:"str",amount:3,effect:(targetId)=>{const u=findAnyUnit(targetId);if(!u)return;u.str+=3;unitHistory(u,`「剛力の腕輪(粗末)」を身につけ、腕力が高まった。`);chron(`${u.nm}が「剛力の腕輪(粗末)」を身につけ、腕力が高まった。`,"big");}},
 {key:"eq_str_rare",name:"剛力の腕輪",rarity:"rare",desc:"選んだ兵の腕力を+7する装備品(消耗品)。",needsTarget:true,statKey:"str",amount:7,effect:(targetId)=>{const u=findAnyUnit(targetId);if(!u)return;u.str+=7;unitHistory(u,`「剛力の腕輪」を身につけ、腕力が高まった。`);chron(`${u.nm}が「剛力の腕輪」を身につけ、腕力が高まった。`,"big");}},
 {key:"eq_str_epic",name:"剛力の秘宝",rarity:"epic",desc:"選んだ兵の腕力を+13する装備品(消耗品)。",needsTarget:true,statKey:"str",amount:13,effect:(targetId)=>{const u=findAnyUnit(targetId);if(!u)return;u.str+=13;unitHistory(u,`「剛力の秘宝」を身につけ、腕力が高まった。`);chron(`${u.nm}が「剛力の秘宝」を身につけ、腕力が高まった。`,"big");}},
 {key:"eq_vit_common",name:"頑健の腕輪(粗末)",rarity:"common",desc:"選んだ兵の体力を+3する装備品(消耗品)。",needsTarget:true,statKey:"vit",amount:3,effect:(targetId)=>{const u=findAnyUnit(targetId);if(!u)return;u.vit+=3;unitHistory(u,`「頑健の腕輪(粗末)」を身につけ、体力が高まった。`);chron(`${u.nm}が「頑健の腕輪(粗末)」を身につけ、体力が高まった。`,"big");}},
 {key:"eq_vit_rare",name:"頑健の腕輪",rarity:"rare",desc:"選んだ兵の体力を+7する装備品(消耗品)。",needsTarget:true,statKey:"vit",amount:7,effect:(targetId)=>{const u=findAnyUnit(targetId);if(!u)return;u.vit+=7;unitHistory(u,`「頑健の腕輪」を身につけ、体力が高まった。`);chron(`${u.nm}が「頑健の腕輪」を身につけ、体力が高まった。`,"big");}},
 {key:"eq_vit_epic",name:"頑健の秘宝",rarity:"epic",desc:"選んだ兵の体力を+13する装備品(消耗品)。",needsTarget:true,statKey:"vit",amount:13,effect:(targetId)=>{const u=findAnyUnit(targetId);if(!u)return;u.vit+=13;unitHistory(u,`「頑健の秘宝」を身につけ、体力が高まった。`);chron(`${u.nm}が「頑健の秘宝」を身につけ、体力が高まった。`,"big");}},
 {key:"eq_int_common",name:"魔力賦活の腕輪(粗末)",rarity:"common",desc:"選んだ兵の魔力を+3する装備品(消耗品)。",needsTarget:true,statKey:"int",amount:3,effect:(targetId)=>{const u=findAnyUnit(targetId);if(!u)return;u.int+=3;unitHistory(u,`「魔力賦活の腕輪(粗末)」を身につけ、魔力が高まった。`);chron(`${u.nm}が「魔力賦活の腕輪(粗末)」を身につけ、魔力が高まった。`,"big");}},
 {key:"eq_int_rare",name:"魔力賦活の腕輪",rarity:"rare",desc:"選んだ兵の魔力を+7する装備品(消耗品)。",needsTarget:true,statKey:"int",amount:7,effect:(targetId)=>{const u=findAnyUnit(targetId);if(!u)return;u.int+=7;unitHistory(u,`「魔力賦活の腕輪」を身につけ、魔力が高まった。`);chron(`${u.nm}が「魔力賦活の腕輪」を身につけ、魔力が高まった。`,"big");}},
 {key:"eq_int_epic",name:"魔力賦活の秘宝",rarity:"epic",desc:"選んだ兵の魔力を+13する装備品(消耗品)。",needsTarget:true,statKey:"int",amount:13,effect:(targetId)=>{const u=findAnyUnit(targetId);if(!u)return;u.int+=13;unitHistory(u,`「魔力賦活の秘宝」を身につけ、魔力が高まった。`);chron(`${u.nm}が「魔力賦活の秘宝」を身につけ、魔力が高まった。`,"big");}},
 {key:"eq_agi_common",name:"俊敏の腕輪(粗末)",rarity:"common",desc:"選んだ兵の敏捷を+3する装備品(消耗品)。",needsTarget:true,statKey:"agi",amount:3,effect:(targetId)=>{const u=findAnyUnit(targetId);if(!u)return;u.agi+=3;unitHistory(u,`「俊敏の腕輪(粗末)」を身につけ、敏捷が高まった。`);chron(`${u.nm}が「俊敏の腕輪(粗末)」を身につけ、敏捷が高まった。`,"big");}},
 {key:"eq_agi_rare",name:"俊敏の腕輪",rarity:"rare",desc:"選んだ兵の敏捷を+7する装備品(消耗品)。",needsTarget:true,statKey:"agi",amount:7,effect:(targetId)=>{const u=findAnyUnit(targetId);if(!u)return;u.agi+=7;unitHistory(u,`「俊敏の腕輪」を身につけ、敏捷が高まった。`);chron(`${u.nm}が「俊敏の腕輪」を身につけ、敏捷が高まった。`,"big");}},
 {key:"eq_agi_epic",name:"俊敏の秘宝",rarity:"epic",desc:"選んだ兵の敏捷を+13する装備品(消耗品)。",needsTarget:true,statKey:"agi",amount:13,effect:(targetId)=>{const u=findAnyUnit(targetId);if(!u)return;u.agi+=13;unitHistory(u,`「俊敏の秘宝」を身につけ、敏捷が高まった。`);chron(`${u.nm}が「俊敏の秘宝」を身につけ、敏捷が高まった。`,"big");}},
 {key:"eq_wis_common",name:"明知の腕輪(粗末)",rarity:"common",desc:"選んだ兵の知力を+3する装備品(消耗品)。",needsTarget:true,statKey:"wis",amount:3,effect:(targetId)=>{const u=findAnyUnit(targetId);if(!u)return;u.wis+=3;unitHistory(u,`「明知の腕輪(粗末)」を身につけ、知力が高まった。`);chron(`${u.nm}が「明知の腕輪(粗末)」を身につけ、知力が高まった。`,"big");}},
 {key:"eq_wis_rare",name:"明知の腕輪",rarity:"rare",desc:"選んだ兵の知力を+7する装備品(消耗品)。",needsTarget:true,statKey:"wis",amount:7,effect:(targetId)=>{const u=findAnyUnit(targetId);if(!u)return;u.wis+=7;unitHistory(u,`「明知の腕輪」を身につけ、知力が高まった。`);chron(`${u.nm}が「明知の腕輪」を身につけ、知力が高まった。`,"big");}},
 {key:"eq_wis_epic",name:"明知の秘宝",rarity:"epic",desc:"選んだ兵の知力を+13する装備品(消耗品)。",needsTarget:true,statKey:"wis",amount:13,effect:(targetId)=>{const u=findAnyUnit(targetId);if(!u)return;u.wis+=13;unitHistory(u,`「明知の秘宝」を身につけ、知力が高まった。`);chron(`${u.nm}が「明知の秘宝」を身につけ、知力が高まった。`,"big");}},
 {key:"eq_lead_common",name:"統率の腕輪(粗末)",rarity:"common",desc:"選んだ兵の統率を+3する装備品(消耗品)。",needsTarget:true,statKey:"lead",amount:3,effect:(targetId)=>{const u=findAnyUnit(targetId);if(!u)return;u.lead+=3;unitHistory(u,`「統率の腕輪(粗末)」を身につけ、統率が高まった。`);chron(`${u.nm}が「統率の腕輪(粗末)」を身につけ、統率が高まった。`,"big");}},
 {key:"eq_lead_rare",name:"統率の腕輪",rarity:"rare",desc:"選んだ兵の統率を+7する装備品(消耗品)。",needsTarget:true,statKey:"lead",amount:7,effect:(targetId)=>{const u=findAnyUnit(targetId);if(!u)return;u.lead+=7;unitHistory(u,`「統率の腕輪」を身につけ、統率が高まった。`);chron(`${u.nm}が「統率の腕輪」を身につけ、統率が高まった。`,"big");}},
 {key:"eq_lead_epic",name:"統率の秘宝",rarity:"epic",desc:"選んだ兵の統率を+13する装備品(消耗品)。",needsTarget:true,statKey:"lead",amount:13,effect:(targetId)=>{const u=findAnyUnit(targetId);if(!u)return;u.lead+=13;unitHistory(u,`「統率の秘宝」を身につけ、統率が高まった。`);chron(`${u.nm}が「統率の秘宝」を身につけ、統率が高まった。`,"big");}},
 {key:"bread_basket",name:"焼きたてパンの籠",rarity:"common",desc:"民心が少し上がる。",effect:()=>apply({mood:ri(2,5),log:"焼きたてのパンが配られ、良い匂いが広場を満たした。"})},
 {key:"whetstone",name:"研磨用の砥石",rarity:"common",desc:"選んだ兵の疲労を少し回復。",needsTarget:true,effect:(targetId)=>{const u=findAnyUnit(targetId);if(!u)return;u.fatigue=Math.max(0,(u.fatigue||0)-20);chron(`${u.nm}が武具の手入れをして、気分を新たにした。`,"");}},
 {key:"fishing_net",name:"上等な漁網",rarity:"common",desc:"食糧が少し増える。",effect:()=>apply({food:ri(15,30),log:"上等な漁網のおかげで、水揚げが増えた。"})},
 {key:"lucky_coin",name:"縁起の良い古銭",rarity:"common",desc:"国庫が少し潤う。",effect:()=>apply({gold:ri(10,25),log:"古銭を売り払い、いくらかの足しになった。"})},
 {key:"salve",name:"軟膏の壺",rarity:"common",desc:"療養中の兵の回復日数を短縮。",effect:()=>{const c=S.units.filter(u=>u.injured>0);if(!c.length){chron("療養中の兵がおらず、軟膏は使われなかった。","");return;}const u=c[Math.floor(Math.random()*c.length)];u.injured=Math.max(0,u.injured-1);chron(`${u.nm}に軟膏が塗られた。`,"");}},
 {key:"song_sheet",name:"古い歌の楽譜",rarity:"common",desc:"民心が少し上がる。",effect:()=>apply({mood:ri(2,5),log:"古い歌が広場で歌われ、懐かしさに涙する者もいた。"})},
 {key:"nail_box",name:"良質な釘の箱",rarity:"common",desc:"経済が少し上がる。",effect:()=>apply({st:{economy:ri(1,3)},log:"良質な釘が建築の助けになった。"})},
 {key:"seed_pouch",name:"種籾の小袋",rarity:"common",desc:"農業が少し上がる。",effect:()=>apply({st:{agriculture:ri(1,3)},log:"新種の種籾が試験的に蒔かれた。"})},
 {key:"whistle",name:"合図の笛",rarity:"common",desc:"治安が少し上がる。",effect:()=>apply({st:{order:ri(1,3)},log:"合図の笛が、見回りの連携を良くした。"})},
 {key:"ink_bottle",name:"上質なインク瓶",rarity:"common",desc:"外交が少し上がる。",effect:()=>apply({st:{diplomacy:ri(1,3)},log:"美しい書状が、相手方に好印象を与えた。"})},
 {key:"lens_shard",name:"透明な硝子片",rarity:"common",desc:"魔導が少し上がる。",effect:()=>apply({st:{magic:ri(1,3)},log:"硝子片を用いた実験が、興味深い結果を示した。"})},
 {key:"dried_meat",name:"燻製肉の束",rarity:"common",desc:"食糧が少し増える。",effect:()=>apply({food:ri(15,30),log:"燻製肉が蔵に運び込まれた。"})},
 {key:"tin_whistle",name:"錫の小笛",rarity:"common",desc:"ランダムな兵に少量の経験値。",effect:()=>{if(!S.units.length)return;const u=S.units[Math.floor(Math.random()*S.units.length)];u.exp+=ri(6,12);processLevelUps(u);chron(`${u.nm}が錫の小笛で気を紛らわせながら、鍛錬に励んだ。`,"");}},
 {key:"quiet_cloak",name:"物静かな外套",rarity:"common",desc:"選んだ兵の疲労を少し回復。",needsTarget:true,effect:(targetId)=>{const u=findAnyUnit(targetId);if(!u)return;u.fatigue=Math.max(0,(u.fatigue||0)-20);chron(`${u.nm}が外套にくるまり、しばし休んだ。`,"");}},
 {key:"pocket_almanac",name:"懐中暦",rarity:"common",desc:"経済が少し上がる。",effect:()=>apply({st:{economy:ri(1,3)},log:"懐中暦が、商いの段取りに重宝された。"})},
 // ── アンコモン追加 ──
 {key:"iron_ration",name:"携行食の樽",rarity:"uncommon",desc:"食糧がまとまって増える。",effect:()=>apply({food:ri(50,90),log:"携行食の樽が、備蓄をぐっと押し上げた。"})},
 {key:"festival_fund",name:"祭りの積立金",rarity:"uncommon",desc:"民心がまとまって上がる。",effect:()=>apply({mood:ri(8,14),log:"祭りの積立金で、久しぶりに大きな催しが開かれた。"})},
 {key:"survey_map",name:"詳細な測量図",rarity:"uncommon",desc:"農業がまとまって上がる。",effect:()=>apply({st:{agriculture:ri(3,6)},log:"測量図をもとに、畑の区画が見直された。"})},
 {key:"patrol_bell",name:"見回りの鐘",rarity:"uncommon",desc:"治安がまとまって上がる。",effect:()=>apply({st:{order:ri(3,6)},log:"見回りの鐘が、夜の警戒を大きく引き締めた。"})},
 {key:"guard_dog",name:"訓練された番犬",rarity:"uncommon",desc:"治安がまとまって上がる。",effect:()=>apply({st:{order:ri(3,6)},log:"番犬が村を巡回するようになり、不審者が減った。"})},
 {key:"merchant_contract",name:"商会との契約書",rarity:"uncommon",desc:"経済がまとまって上がる。",effect:()=>apply({st:{economy:ri(3,6)},log:"商会との契約が成立し、取引が活発になった。"})},
 {key:"veteran_advice",name:"古参兵の助言書",rarity:"uncommon",desc:"ランダムな兵に中量の経験値。",effect:()=>{if(!S.units.length)return;const u=S.units[Math.floor(Math.random()*S.units.length)];u.exp+=ri(15,25);processLevelUps(u);chron(`${u.nm}が古参兵の助言を胸に、鍛錬に打ち込んだ。`,"big");}},
 {key:"resupply_crate",name:"補給物資の木箱",rarity:"uncommon",desc:"国庫と食糧が両方少し増える。",effect:()=>apply({gold:ri(30,55),food:ri(25,45),log:"補給物資の木箱が届き、蔵が潤った。"})},
 {key:"lantern_oil",name:"上質な灯油",rarity:"uncommon",desc:"魔導がまとまって上がる。",effect:()=>apply({st:{magic:ri(3,6)},log:"上質な灯油のおかげで、夜間の研究が捗った。"})},
 {key:"gift_box",name:"隣国からの贈り物",rarity:"uncommon",desc:"外交がまとまって上がる。",effect:()=>apply({st:{diplomacy:ri(3,6)},log:"隣国からの贈り物が、良好な関係の証となった。"})},
 {key:"war_drum",name:"鼓舞の陣太鼓",rarity:"uncommon",desc:"軍事がまとまって上がる。",effect:()=>apply({st:{military:ri(3,6)},log:"陣太鼓の響きが、兵たちの士気を奮い立たせた。"})},
 {key:"rest_voucher",name:"休暇の許可証",rarity:"uncommon",desc:"全兵士の疲労が少し回復。",effect:()=>{for(const u of S.units)u.fatigue=Math.max(0,(u.fatigue||0)-15);chron("休暇の許可証が配られ、兵たちはしばし羽を伸ばした。","big");}},
 {key:"census_officer",name:"戸籍役人の派遣状",rarity:"uncommon",desc:"人口が少し増える。",effect:()=>apply({pop:ri(4,8),log:"戸籍役人の調べにより、新たな住民が把握された。"})},
 // ── レア追加 ──
 {key:"veteran_scroll",name:"歴戦の巻物",rarity:"rare",desc:"ランダムな兵の経験値を大きく押し上げる。",effect:()=>{if(!S.units.length)return;const u=S.units[Math.floor(Math.random()*S.units.length)];u.exp+=u.lv*10*1.5;processLevelUps(u);chron(`${u.nm}が歴戦の巻物を読み、大きく力をつけた。`,"big");}},
 {key:"iron_will_charm",name:"不屈の護符",rarity:"rare",desc:"全兵士の忠誠が上がる。",effect:()=>{for(const u of S.units)u.loyalty=Math.min(100,u.loyalty+ri(8,15));chron("不屈の護符が配られ、全軍の忠誠が篤くなった。","big");}},
 {key:"masterwork_tools",name:"名工の道具一式",rarity:"rare",desc:"経済・軍事がまとまって上がる。",effect:()=>apply({st:{economy:5,military:5},log:"名工の道具が、様々な産業に活かされた。"})},
 {key:"twin_bond_charm",name:"絆結びの護符",rarity:"rare",desc:"兵二人がランダムに戦友の絆で結ばれる。",effect:()=>{const c=S.units.filter(u=>!u.bondWith);if(c.length<2){chron("絆結びの護符に応える者は、今はいなかった。","");return;}const a=c[Math.floor(Math.random()*c.length)];const rest=c.filter(x=>x.id!==a.id);const b=rest[Math.floor(Math.random()*rest.length)];a.bondWith=b.id;b.bondWith=a.id;chron(`絆結びの護符により、${a.nm}と${b.nm}が戦友の絆で結ばれた。`,"big");}},
 {key:"golden_plow",name:"黄金の鋤",rarity:"rare",desc:"農業が大きく上がる。",effect:()=>apply({st:{agriculture:8},log:"黄金の鋤が、畑に奇跡のような実りをもたらした。"})},
 {key:"shadow_cloak",name:"影渡りの外套",rarity:"rare",desc:"治安が大きく上がる。",effect:()=>apply({st:{order:8},log:"影渡りの外套を纏った者たちが、闇に潜む不正を暴いた。"})},
 {key:"census_grand",name:"大規模な戸籍改め",rarity:"rare",desc:"人口がまとまって増える。",effect:()=>apply({pop:ri(10,18),log:"大規模な戸籍改めにより、多くの民の存在が明らかになった。"})},
 {key:"mentor_ticket",name:"名師招聘状",rarity:"rare",desc:"経験豊富な指南役が一人加わる。",effect:()=>{const u=makeUnit();const targetLv=ri(15,25);for(let i=1;i<targetLv;i++)u.exp+=i*10;processLevelUps(u,true);u.role="active";S.instructors.push(u);chron(`招聘状により、${u.nm} ${u.surname}が指南役として加わった。`,"big");}},
 // ── エピック追加 ──
 {key:"twin_dragon_scale",name:"双竜の鱗",rarity:"epic",desc:"軍事・魔導が大きく上昇する。",effect:()=>apply({st:{military:9,magic:9},log:"双竜の鱗が放つ力が、軍と魔導塔の双方に満ちた。"})},
 {key:"golden_harvest",name:"黄金の収穫祭",rarity:"epic",desc:"食糧・経済・民心が大きく上昇する。",effect:()=>apply({food:100,st:{economy:6},mood:10,log:"黄金の収穫祭が開かれ、村全体が沸き立った。"})},
 {key:"veteran_squad",name:"精鋭部隊の証",rarity:"epic",desc:"全兵士の経験値が上がる。",effect:()=>{for(const u of S.units){u.exp+=ri(10,18);processLevelUps(u);}chron("精鋭部隊の証を掲げ、全軍が気を引き締めて鍛錬に励んだ。","big");}},
 // ── レジェンド追加 ──
 {key:"kings_regalia",name:"王家の宝器",rarity:"legendary",desc:"民心・忠誠・全国力が大きく上昇する永続の宝。",type:"permanent",effect:()=>{apply({mood:25,st:{military:8,economy:8,agriculture:8,magic:8,order:8,diplomacy:8},log:"――王家の宝器が、玉座の間に安置された。以後、国のあらゆる面に加護が宿るという。",logCls:"big"});for(const u of S.units)u.loyalty=Math.min(100,u.loyalty+10);S.flags.kingsRegalia=true;}},
 {key:"legend_child_charm",name:"伝説の落し子の証",rarity:"legendary",desc:"レジェンド級の逸材(伝説の落し子)が一人、必ず加わる。",effect:()=>{if(S.units.length>=unitCap()){chron("兵舎が満員のため、証は使えなかった。","");return;}const u=makeUnit();u.trait="legendchild";u.traitTier="legend";const tr=traitInfo("legendchild");for(const k of["str","vit","int"])u[k]+=tr[k]||0;u.pw=tr.pw||0;u.gm=tr.gm||1;S.units.push(u);chron(`――伝説の落し子の証が輝き、${u.nm} ${u.surname}が姿を現した。伝承にしか語られぬ存在だという。`,"big");}},
 // ── 兵士強化系(追加10種) ──
 {key:"loyalty_seal",name:"忠義の証",rarity:"common",desc:"選んだ兵の忠誠が上がる。",needsTarget:true,effect:(targetId)=>{const u=findAnyUnit(targetId);if(!u)return;u.loyalty=Math.min(100,u.loyalty+ri(8,14));chron(`${fullName(u)}が忠義の証を受け取り、忠誠を新たにした。`,"");}},
 {key:"morale_medal",name:"士気鼓舞の徽章",rarity:"common",desc:"選んだ兵の士気が上がる。",needsTarget:true,effect:(targetId)=>{const u=findAnyUnit(targetId);if(!u)return;u.moral=Math.min(100,u.moral+ri(8,14));chron(`${fullName(u)}が徽章を授けられ、大いに奮い立った。`,"");}},
 {key:"youth_spring",name:"若返りの泉水",rarity:"uncommon",desc:"選んだ兵の年齢が少し若返る。",needsTarget:true,effect:(targetId)=>{const u=findAnyUnit(targetId);if(!u)return;const y=ri(1,3);u.age=Math.max(1,u.age-y);chron(`${fullName(u)}が若返りの泉水を飲み、${y}歳分若返ったように見える。`,"big");}},
 {key:"discipline_creed",name:"鍛錬の心得書",rarity:"uncommon",desc:"選んだ兵のスキル所有上限が1つ増える。",needsTarget:true,effect:(targetId)=>{const u=findAnyUnit(targetId);if(!u)return;u.skillCapBase=Math.min(20,(u.skillCapBase||3)+1);chron(`${fullName(u)}が鍛錬の心得を学び、より多くの技を修められるようになった。`,"");}},
 {key:"brawn_tonic",name:"剛体の秘薬",rarity:"uncommon",desc:"選んだ兵の腕力・体力が上がる。",needsTarget:true,effect:(targetId)=>{const u=findAnyUnit(targetId);if(!u)return;const b=ri(4,7);u.str+=b;u.vit+=b;chron(`${fullName(u)}が剛体の秘薬を服し、肉体が一回り逞しくなった。`,"big");}},
 {key:"clarity_tonic",name:"明晰の秘薬",rarity:"uncommon",desc:"選んだ兵の魔力・知力が上がる。",needsTarget:true,effect:(targetId)=>{const u=findAnyUnit(targetId);if(!u)return;const b=ri(4,7);u.int+=b;u.wis+=b;chron(`${fullName(u)}が明晰の秘薬を服し、思考が冴え渡るのを感じた。`,"big");}},
 {key:"tempest_tonic",name:"疾風の秘薬",rarity:"rare",desc:"選んだ兵の敏捷・統率が上がる。",needsTarget:true,effect:(targetId)=>{const u=findAnyUnit(targetId);if(!u)return;const b=ri(5,9);u.agi+=b;u.lead+=b;chron(`${fullName(u)}が疾風の秘薬を服し、身のこなしが目に見えて鋭くなった。`,"big");}},
 {key:"hero_medal",name:"英雄の勲章",rarity:"rare",desc:"選んだ兵の忠誠・士気が大きく上がる。",needsTarget:true,effect:(targetId)=>{const u=findAnyUnit(targetId);if(!u)return;const b=ri(10,18);u.loyalty=Math.min(100,u.loyalty+b);u.moral=Math.min(100,u.moral+b);chron(`${fullName(u)}に英雄の勲章が授けられた。誇らしげな表情を浮かべている。`,"big");}},
 {key:"royal_sash",name:"王家の紋章帯",rarity:"rare",desc:"選んだ兵のスキル所有上限が増え、新たなスキルを1つ授かる。",needsTarget:true,effect:(targetId)=>{const u=findAnyUnit(targetId);if(!u)return;u.skillCapBase=Math.min(20,(u.skillCapBase||3)+2);const learned=trySkillUpItem(u);chron(`${fullName(u)}が王家の紋章帯を賜った。${learned?`新たに「${learned.name}」を会得した。`:"研鑽を積む糧となるだろう。"}`,"big");}},
 {key:"omni_relic",name:"全能の秘宝",rarity:"epic",desc:"選んだ兵の全ステータスが上がる。",needsTarget:true,effect:(targetId)=>{const u=findAnyUnit(targetId);if(!u)return;const b=ri(3,6);for(const k of["str","vit","int","agi","wis","lead"])u[k]+=b;chron(`――${fullName(u)}が全能の秘宝に触れ、あらゆる力が底上げされた。`,"big");}},
 // ── 仲間になる系(追加10種) ──
 {key:"join_traveler",name:"旅の若者の紹介状",rarity:"common",desc:"旅の若者が一人、仲間に加わる。",effect:()=>itemRecruitUnit("D","旅の若者として村を訪れ、紹介状を手にそのままアルヴェインの一員となった。")},
 {key:"join_mercenary",name:"流れの傭兵の証",rarity:"common",desc:"流れの傭兵が一人、仲間に加わる。",effect:()=>itemRecruitUnit("C","流れの傭兵として腕に覚えがあり、証を手に入団した。")},
 {key:"join_troupe",name:"旅芸人一座の推薦状",rarity:"common",desc:"旅芸人一座の一人が、仲間に加わる。",effect:()=>itemRecruitUnit("D","旅芸人一座の中にいた者で、推薦状を携えて入団した。")},
 {key:"join_volunteer",name:"義勇兵の志願状",rarity:"uncommon",desc:"義勇兵が一人、仲間に加わる。",effect:()=>itemRecruitUnit("C","義勇兵として志願状を提出し、正式に入団した。")},
 {key:"join_hermit",name:"隠棲の武人の手紙",rarity:"uncommon",desc:"隠棲していた武人が一人、仲間に加わる。",effect:()=>itemRecruitUnit("B","山中に隠棲していたという武人で、手紙を通じて入団した。")},
 {key:"join_mercband",name:"傭兵団長の紹介状",rarity:"uncommon",desc:"傭兵団出身の腕利きが一人、仲間に加わる。",effect:()=>itemRecruitUnit("B","かつて傭兵団に属していたという腕利きで、団長の紹介状を携えていた。")},
 {key:"join_foreigner",name:"異国の剣士の来訪状",rarity:"rare",desc:"異国から来た剣士が一人、仲間に加わる。",effect:()=>itemRecruitUnit("A","異国からはるばる訪れた剣士で、来訪状と共に入団を決めた。")},
 {key:"join_hidden_talent",name:"隠れた逸材の噂",rarity:"rare",desc:"隠れた逸材が一人、仲間に加わる(稀に並外れた素質を見せる)。",effect:()=>{const u=itemRecruitUnit("A","噂に聞く隠れた逸材で、素性を明かさぬまま入団した。");if(u){const bonus=rollHiddenPotential(u);if(bonus>0)chron(`――${fullName(u)}は、噂通りの並外れた素質を見せた(全ステータス+${bonus})。`,"big");}}},
 {key:"join_noble_son",name:"名家の子息の使者状",rarity:"epic",desc:"名家の子息が一人、仲間に加わる。",effect:()=>itemRecruitUnit("S","とある名家の子息だという者で、使者状と共に鳴り物入りで入団した。")},
 {key:"join_royal_knight",name:"王国騎士団の推薦状",rarity:"epic",desc:"名のある騎士が一人、忠誠・士気の高い状態で仲間に加わる。",effect:()=>{const u=itemRecruitUnit("S","王国騎士団に籍を置いていたという歴戦の騎士で、推薦状と共に入団した。");if(u){u.loyalty=Math.min(100,Math.max(u.loyalty,80));u.moral=Math.min(100,Math.max(u.moral,80));}}},
 // ── 転職の秘薬(特定ジョブへの転職・対象はランダム選出) ──
 {key:"job_change_warrior",name:"剣術指南の秘薬",rarity:"uncommon",desc:"選んだ兵を戦士系へ転職させる(成功率65%)。",needsTarget:true,effect:(targetId)=>{jobChangeItemEffect("warrior",targetId);}},
 {key:"job_change_mage",name:"魔導開眼の秘薬",rarity:"uncommon",desc:"選んだ兵を魔法系へ転職させる(成功率65%)。",needsTarget:true,effect:(targetId)=>{jobChangeItemEffect("mage",targetId);}},
 {key:"job_change_archer",name:"弓術開眼の秘薬",rarity:"uncommon",desc:"選んだ兵を弓術系へ転職させる(成功率65%)。",needsTarget:true,effect:(targetId)=>{jobChangeItemEffect("archer",targetId);}},
 {key:"job_change_monk",name:"拳法伝授の秘薬",rarity:"uncommon",desc:"選んだ兵を拳法系へ転職させる(成功率65%)。",needsTarget:true,effect:(targetId)=>{jobChangeItemEffect("monk",targetId);}},
 {key:"job_change_priest",name:"神学修得の秘薬",rarity:"uncommon",desc:"選んだ兵を神官系へ転職させる(成功率65%)。",needsTarget:true,effect:(targetId)=>{jobChangeItemEffect("priest",targetId);}},
 {key:"job_change_hunter",name:"狩猟術の秘薬",rarity:"uncommon",desc:"選んだ兵を狩人系へ転職させる(成功率65%)。",needsTarget:true,effect:(targetId)=>{jobChangeItemEffect("hunter",targetId);}},
];
const RARITY_LABEL={common:"コモン",uncommon:"アンコモン",rare:"レア",epic:"エピック",legendary:"レジェンド"};
const RARITY_COLOR={common:"#9aa0ac",uncommon:"#7ac98f",rare:"#8fd0e8",epic:"#c98fe8",legendary:"#e8c874"};
function itemsByRarity(rarity){return ITEMS.filter(i=>i.rarity===rarity);}
function rollItemDrop(dungeonRarityKey){
  const weights={
   common:{common:55,uncommon:30,rare:12,epic:2.5,legendary:0.5},
   rare:{common:30,uncommon:38,rare:24,epic:6,legendary:2},
   epic:{common:12,uncommon:28,rare:32,epic:22,legendary:6},
   legendary:{common:2,uncommon:10,rare:28,epic:35,legendary:25},
  }[dungeonRarityKey]||{common:55,uncommon:30,rare:12,epic:2.5,legendary:0.5};
  const tot=Object.values(weights).reduce((a,b)=>a+b,0);let r=Math.random()*tot;
  let tier="common";
  for(const k in weights){if(r<weights[k]){tier=k;break;}r-=weights[k];}
  const pool=itemsByRarity(tier);
  if(!pool.length)return null;
  return pool[Math.floor(Math.random()*pool.length)];
}
function addItem(itemKey){
  S.items=S.items||[];
  const existing=S.items.find(x=>x.key===itemKey);
  if(existing)existing.count++;
  else S.items.push({key:itemKey,count:1});
}
let itemResultQueue=[];
function buildItemResultEvent(idx){
  const r=itemResultQueue[idx]||{name:"",text:""};
  return{tag:"使 用",title:`「${r.name}」を使用`,
   body:r.text||"特に変化はなかった。",
   choices:[{label:"分かった",fx:{}}]};
}
function useItem(itemKey,targetId){
  const idx=(S.items||[]).findIndex(x=>x.key===itemKey);
  if(idx<0)return;
  const def=ITEMS.find(i=>i.key===itemKey);
  if(!def)return;
  const beforeLast=S.log.length?S.log[S.log.length-1]:null;
  if(def.needsTarget)def.effect(targetId);
  else def.effect();
  S.items[idx].count--;
  if(S.items[idx].count<=0)S.items.splice(idx,1);
  clamp();render();refreshOpenPanels();save();
  const idx2=beforeLast?S.log.indexOf(beforeLast):-1;
  const newLogs=S.log.slice(idx2+1);
  if(newLogs.length){
    const qIdx=itemResultQueue.length;
    itemResultQueue.push({text:newLogs.map(l=>l.t).join("<br><br>"),name:def.name});
    pushEvent("__item_result__"+qIdx);
  }
}

/* ==================== ダンジョン攻略フロー ==================== */
function findMatchingSquad(units){
  const ids=new Set(units.map(u=>u.id));
  return (S.squads||[]).find(s=>s.unitIds&&s.unitIds.length===ids.size&&s.unitIds.every(id=>ids.has(id)));
}
function recordSquadSortie(squad){
  const matched=findMatchingSquad(squad);
  if(matched)matched.sortieCount=(matched.sortieCount||0)+1;
}
function squadSynergyMult(squad){
  if(squad.length<2)return 1.0;
  // 同じルートを2人以上組ませると連携ボーナス(同ルートの人数が多いほど、または複数ペアあるほど上乗せ)
  const routeCounts={};
  for(const u of squad)if(u.route)routeCounts[u.route]=(routeCounts[u.route]||0)+1;
  let sameRouteBonus=0;
  for(const k in routeCounts)if(routeCounts[k]>=2)sameRouteBonus+=(routeCounts[k]-1)*0.035;
  // 同じ職系統(cls)が3人以上いる場合も、連携の乱れとして小さくマイナス(バランス編成を後押し)
  const clsCounts={};
  for(const u of squad)clsCounts[u.cls]=(clsCounts[u.cls]||0)+1;
  let overlapPenalty=0;
  for(const k in clsCounts)if(clsCounts[k]>=4)overlapPenalty+=0.03;
  // 常設の小隊として同じ顔ぶれで出撃を重ねるほど、連携が育っていく(小隊制度)
  const matched=findMatchingSquad(squad);
  const historyBonus=matched?Math.min(0.2,(matched.sortieCount||0)*0.02):0;
  return Math.max(0.9,Math.min(1.35,1+sameRouteBonus-overlapPenalty+historyBonus));
}
// パーティの「質」を測る指標。人数を増やすだけで有利にならないよう平均戦力を基準にし、
// 5人編成を基準にしたrequiredPowerとそのまま比較できるよう5倍して正規化する。
function squadEffectivePower(squad,type){
  if(!squad.length)return 0;
  const rawAvg=squad.reduce((a,u)=>a+unitPower(u),0)/squad.length;
  const affinityAvg=type?squad.reduce((a,u)=>a+type.statFn(u)*1.6,0)/squad.length:rawAvg;
  return (rawAvg*0.5+affinityAvg*0.5)*squadSynergyMult(squad)*5;
}
function estimateDungeonSuccess(dungeon){
  const eligible=S.units.filter(u=>u.injured<=0&&(u.fatigue||0)<70&&!u.dungeonBusy&&!u.campUntil);
  const size=Math.min(5,eligible.length);
  if(size<1)return{squad:[],pct:0,pctGreat:0,pctCriticalFail:100};
  const squad=[...eligible].sort((a,b)=>(dungeon.type?dungeon.type.statFn(b):unitPower(b))-(dungeon.type?dungeon.type.statFn(a):unitPower(a))).slice(0,size);
  const squadPower=squadEffectivePower(squad,dungeon.type);
  const centerRoll=squadPower/dungeon.requiredPower*100;
  // roll = centerRoll + rnd(-20,20) の分布から、各tierの概算確率を出す(判定式と同じ閾値60/105/165を使用)
  const pct=Math.max(0,Math.min(100,Math.round((centerRoll-105+20)/40*100))); // 「成功」以上(success/critical_success)の確率
  const pctGreat=Math.max(0,Math.min(100,Math.round((centerRoll-165+20)/40*100))); // 「大成功」の確率
  const pctCriticalFail=Math.max(0,Math.min(100,100-Math.round((centerRoll-60+20)/40*100))); // 「大失敗」の確率
  return{squad,pct,pctGreat,pctCriticalFail};
}
function dispatchDungeon(dungeonId,manualIds){
  const idx=(S.availableDungeons||[]).findIndex(d=>d.id===dungeonId);
  if(idx<0)return;
  const dungeon=S.availableDungeons[idx];
  const eligible=S.units.filter(u=>u.injured<=0&&(u.fatigue||0)<70&&!u.dungeonBusy&&!u.campUntil);
  let squad;
  if(manualIds&&manualIds.length){
    squad=manualIds.map(id=>eligible.find(u=>u.id===id)).filter(Boolean).slice(0,5);
    if(!squad.length){chron("選択された兵が派遣できる状態ではなくなっている。","sys");return;}
  }else{
    const size=Math.min(5,eligible.length);
    if(size<1){chron("ダンジョンに送れる兵がいない(全員が負傷中・疲労・出払い中)。","sys");return;}
    squad=[...eligible].sort((a,b)=>(dungeon.type?dungeon.type.statFn(b):unitPower(b))-(dungeon.type?dungeon.type.statFn(a):unitPower(a))).slice(0,size);
  }
  for(const u of squad)u.dungeonBusy=S.day+dungeon.duration;
  recordSquadSortie(squad);
  dungeon.squadIds=squad.map(u=>u.id);
  dungeon.resolveDay=S.day+dungeon.duration;
  S.activeDungeons=S.activeDungeons||[];
  S.activeDungeons.push(dungeon);
  S.availableDungeons.splice(idx,1);
  (S.scheduled[dungeon.resolveDay]=S.scheduled[dungeon.resolveDay]||[]).push("__dungeon_resolve_"+dungeon.id);
  chron(`${squad.map(fullName).join("・")}が「${dungeon.name}」へと出発した。${dungeon.duration}日後に結果が分かるだろう。`,"big");
  clamp();render();renderTroops();refreshOpenPanels();save();
}
function removeActiveDungeon(dungeonId){
  S.activeDungeons=(S.activeDungeons||[]).filter(d=>d.id!==dungeonId);
}
function resolveDungeonRun(dungeonId){
  const dungeon=(S.activeDungeons||[]).find(d=>d.id===dungeonId);
  if(!dungeon){return;}
  const squad=(dungeon.squadIds||[]).map(id=>S.units.find(u=>u.id===id)).filter(Boolean);
  for(const u of squad)u.dungeonBusy=null;
  if(!squad.length){
    chron(`「${dungeon.name}」に向かった部隊と連絡が取れなくなっている。`,"grave");
    removeActiveDungeon(dungeonId);save();return;
  }
  const squadPower=squadEffectivePower(squad,dungeon.type);
  const roll=squadPower/dungeon.requiredPower*100+rnd(-20,20);
  const tier=roll>=165?"critical_success":roll>=105?"success":roll>=60?"fail":"critical_fail";
  const level=dungeon.level;
  const levelMult=1+level/28; // レベルが上がるほど報酬が伸びる(後半でも報酬が目減りしないよう伸び幅を強化)
  const magicExpBonus=(1+Math.min(0.45,S.st.magic*0.0045))*(S.flags.statS_magic?1.05:1); // 魔導が高いほど経験値効率が上がる。魔導Sで恒久的にさらに上乗せ
  const rarityRewardMult=Math.sqrt(dungeon.rarity.mult); // レア度は緩やかに反映
  let itemGained=null, goldGained=0, died=null, diedWasHallWorthy=false, bossWin=false, dungeonFound=null;
  const memberLog=[];
  if(tier==="critical_success"||tier==="success"){
    bossWin=squadPower*(tier==="critical_success"?1.3:1.0)>=dungeon.bossPower*rnd(0.8,1.2);
    for(const u of squad){const g=Math.round((tier==="critical_success"?ri(18,28):ri(9,16))*levelMult*rarityRewardMult*magicExpBonus);u.exp+=g;processLevelUps(u);unitHistory(u,`「${dungeon.name}」を踏破した。`);memberLog.push({u,gain:g,note:"踏破"});}
    if(bossWin){
      itemGained=rollItemDrop(dungeon.rarity.key);
      if(itemGained)addItem(itemGained.key);
      let equipGained=null;
      if(Math.random()<0.3){equipGained=rollEquipmentDrop(dungeon.rarity.key);if(equipGained)addEquipment(equipGained.key);}
      S.dungeonsCleared=(S.dungeonsCleared||0)+1;
      tryUnlockDemonLordDungeon();
      for(const u of squad){
        u.dungeonClearCount=(u.dungeonClearCount||0)+1;
        if(u.dungeonClearCount>=5)grantTitle(u,"t_conqueror5");
        if(u.dungeonClearCount>=20)grantTitle(u,"t_conqueror20");
        if(itemGained&&itemGained.rarity==="legendary")grantTitle(u,"t_treasurehunter");
      }
      goldGained=Math.round(ri(25,55)*dungeon.rarity.mult*levelMult);
      apply({gold:goldGained,mood:2});
      chron(`――「${dungeon.name}」を踏破し、ボス「${dungeon.bossName}」を打ち破った!${itemGained?`「${itemGained.name}」を手に入れた。`:""}${equipGained?`さらに「${equipGained.name}」を入手した。`:""}`,"big");
      if(dungeon.isFinal){
        for(const u of squad)grantTitle(u,"t_demonslayer");
        S.flags.demonLordDefeated=true;
        apply({mood:20,st:{military:15,order:10},gold:500});
        chron("――魔王は、ついに討たれた。長きにわたる脅威は去り、アルヴェインに真の平和が訪れた。","big");
        spawnDemonAbyssDungeon();
      }
      if(dungeon.id==="demonlord_abyss")spawnDemonAbyssDungeon();
      checkDemonLordNotice();
      if(!dungeon.isFinal&&Math.random()<0.3)dungeonFound=checkDungeonDiscovery(1.2,squad[0]);
    }else{
      goldGained=Math.round(ri(12,28)*dungeon.rarity.mult*levelMult);
      apply({gold:goldGained});
      chron(`「${dungeon.name}」は踏破したが、ボス「${dungeon.bossName}」には及ばなかった。`,"sys");
    }
  }else if(tier==="fail"){
    const hurtOnes=[...squad].sort(()=>Math.random()-.5).slice(0,Math.max(1,Math.round(squad.length*0.4)));
    for(const u of hurtOnes){inflictInjury(u,[0.4,0.4,0.2]);unitHistory(u,`「${dungeon.name}」で${INJURY_TIERS[u.injurySeverity].label}を負った。`);memberLog.push({u,gain:0,note:INJURY_TIERS[u.injurySeverity].label});}
    for(const u of squad.filter(x=>!hurtOnes.includes(x)))memberLog.push({u,gain:0,note:"無傷で撤退"});
    apply({mood:-2});
    chron(`「${dungeon.name}」への挑戦は失敗に終わった。部隊は撤退した。`,"grave");
  }else{ // critical_fail
    const deathChance=Math.min(0.55,level/110)*(1-Math.min(0.55,S.st.order*0.0055))*(S.flags.statS_order?0.92:1); // 治安が高いほど戦没率が下がる。治安Sで恒久的にさらに下がる
    const hurtOnes=[...squad].sort(()=>Math.random()-.5).slice(0,Math.max(1,Math.round(squad.length*0.6)));
    for(const u of hurtOnes){inflictInjury(u,[0.1,0.3,0.6]);unitHistory(u,`「${dungeon.name}」で${INJURY_TIERS[u.injurySeverity].label}を負った。`);memberLog.push({u,gain:0,note:INJURY_TIERS[u.injurySeverity].label});}
    for(const u of squad.filter(x=>!hurtOnes.includes(x)))memberLog.push({u,gain:0,note:"無傷で撤退"});
    apply({mood:-5,gold:-Math.round(ri(10,30))});
    if(Math.random()<deathChance){
      const victim=squad[Math.floor(Math.random()*squad.length)];
      if((S.flags.phoenixCharm||0)>0){
        S.flags.phoenixCharm--;
        chron(`「${dungeon.name}」で${victim.nm}が致命傷を負いかけたが、不死鳥の羽根の加護でかろうじて一命を取り留めた。`,"big");
        victim.criticalSurvivalCount=(victim.criticalSurvivalCount||0)+1;grantTitle(victim,"t_survivor");
        const rec=memberLog.find(l=>l.u.id===victim.id);if(rec)rec.note="致命傷(お守りで一命を取り留めた)";
      }else{
        died=victim;
        diedWasHallWorthy=isHallWorthy(victim);
        removeUnitById(victim.id,"loss");
        chron(`――「${dungeon.name}」は大失敗に終わった。${victim.nm}は、二度と戻らなかった。`,"grave");
        const rec=memberLog.find(l=>l.u.id===victim.id);if(rec)rec.note="戦没";
      }
    }else{
      for(const u of hurtOnes)if(u.injurySeverity==="severe"){u.criticalSurvivalCount=(u.criticalSurvivalCount||0)+1;grantTitle(u,"t_survivor");}
      chron(`――「${dungeon.name}」は大失敗に終わった。命からがらの撤退となった。`,"grave");
    }
  }
  removeActiveDungeon(dungeonId);
  clamp();render();renderTroops();refreshOpenPanels();save();
  showDungeonResult(dungeon,tier,bossWin,memberLog,goldGained,itemGained,died,diedWasHallWorthy,dungeonFound);
}
let dungeonResultQueue=[];
function showDungeonResult(dungeon,tier,bossWin,memberLog,goldGained,itemGained,died,diedWasHallWorthy,dungeonFound){
  const tierLabel={critical_success:"大成功",success:"成功",fail:"失敗",critical_fail:"大失敗"}[tier];
  const tierColor={critical_success:"#e8c874",success:"#8fbf6f",fail:"#d99a6a",critical_fail:"#d97a7a"}[tier];
  let h=`<div style="font-size:12px;color:var(--dim);margin-bottom:4px">${dungeon.rarity.label?`【${dungeon.rarity.label}】`:""}${dungeon.name}</div>`;
  h+=`<div style="font-size:20px;font-weight:800;color:${tierColor};margin-bottom:6px;font-family:'Shippori Mincho',serif">${tierLabel}</div>`;
  if((tier==="critical_success"||tier==="success"))h+=`<div style="font-size:13px;color:${bossWin?"var(--gold)":"var(--dim)"};margin-bottom:6px">ボス「${dungeon.bossName}」:${bossWin?"撃破":"取り逃がした"}</div>`;
  if(goldGained)h+=`<div style="font-size:13px;color:var(--gold);margin-bottom:10px">獲得:${goldGained}G</div>`;
  if(itemGained){const c=RARITY_COLOR[itemGained.rarity];h+=`<div class="pcard" style="border-color:${c}"><div class="nm" style="color:${c}">◆アイテム入手:${itemGained.name}</div><div class="ds">${itemGained.desc}</div></div>`;}
  if(dungeonFound){const c=dungeonFound.rarity.color||"#8fd0e8";h+=`<div class="pcard" style="border-color:${c}"><div class="nm" style="color:${c}">◆新たなダンジョンを発見</div><div class="ds">${dungeonFound.rarity.label?`【${dungeonFound.rarity.label}】`:""}「${dungeonFound.name}」への入口が見つかった。</div></div>`;}
  for(const l of memberLog){
    h+=`<div class="pcard"><div class="nm">${l.u.nm}</div><div class="ds">${l.gain?`経験値+${l.gain} ／ `:""}${l.note}</div></div>`;
  }
  if(died)h+=`<div class="pcard" style="border-color:#d97a7a"><div class="nm" style="color:#d97a7a">戦没</div><div class="ds">${died.nm}は、このダンジョンで命を落とした。${diedWasHallWorthy?"殿堂に記録が残る。":""}</div></div>`;
  const alreadyShowing=$("#panelDungeonResult").classList.contains("show");
  dungeonResultQueue.push(h);
  if(!alreadyShowing)showNextDungeonResult();
}
function showNextDungeonResult(){
  if(!dungeonResultQueue.length)return;
  const remaining=dungeonResultQueue.length-1;
  const h=dungeonResultQueue.shift();
  $("#dungeonResultBody").innerHTML=h+(remaining>0?`<div style="font-size:11px;color:var(--dim);margin-top:10px;text-align:center">(他に${remaining}件の結果が控えています)</div>`:"");
  $("#panelDungeonResult").classList.add("show");
}

/* ==================== 魔王軍システム ==================== */
function checkDemonLordNotice(){
  if(!S.flags.demonNoticed&&(S.dungeonsCleared||0)>=8){
    S.flags.demonNoticed=true;
    chron("――闇の奥で、何かがこちらに気づいた。魔王軍がこの地に目をつけたようだ。","grave");
  }
}
function checkDemonInvasion(){
  if(!S.flags.demonNoticed||S.flags.demonLordDefeated)return;
  if(Math.random()<0.035)pushEvent("__demon_invasion__");
}
const DEMON_INVASION_FLAVORS=[
 "魔王軍配下の魔物が、村に迫っているとの報せが入った。",
 "夜陰に紛れ、魔物の一団がこの地に近づいているという。",
 "国境の見張りから、魔物の群れを目撃したとの報せが届いた。",
 "森の奥から、獣とも異形ともつかぬ気配が近づいてくる。",
 "魔王軍の斥候と思しき影が、たびたび目撃されるようになった。",
];
function buildDemonInvasionEvent(){
  const eligible=S.units.filter(u=>u.injured<=0&&!u.dungeonBusy&&!u.campUntil);
  if(!eligible.length){
    apply({mood:-4,gold:-ri(20,50)});
    chron("魔物の襲撃を防ぐ兵がおらず、村に被害が出た。","grave");
    return null;
  }
  const cands=[...eligible].sort((a,b)=>unitPower(b)-unitPower(a)).slice(0,5);
  const flavor=DEMON_INVASION_FLAVORS[Math.floor(Math.random()*DEMON_INVASION_FLAVORS.length)];
  const choices=cands.map(u=>({
    label:`${u.nm}を先陣に立てる`,
    hint:`戦力${Math.round(unitPower(u))} ／ 対応練度Lv.${S.demonArmyLevel||0}`,
    fx:{call:()=>{
      const support=eligible.filter(x=>x.id!==u.id).sort((a,b)=>unitPower(b)-unitPower(a)).slice(0,4);
      demonDefenseSquad=[u,...support];
      demonDefenseLeader=u;
      resolveDemonDefense();
    }}
  }));
  return{tag:"魔王軍",title:"魔物の侵攻",
   body:`${flavor}(現在の対応練度:Lv.${S.demonArmyLevel||0})。先陣を任せる者を選ぶ。他の兵は自動で後詰めにつく。`,
   speaker:"ガレオン「誰を先頭に立てるか、それが全てを分けましょう」",
   choices};
}
/* 魔王の玉座の解禁:防衛練度だけでなく、ダンジョン踏破数も要求し、到達難度と歯応えの落差を縮める */
function tryUnlockDemonLordDungeon(){
  if(S.flags.demonLordDungeonUnlocked)return;
  if((S.demonArmyLevel||0)<8||(S.dungeonsCleared||0)<12)return;
  S.flags.demonLordDungeonUnlocked=true;
  const finalD={
    id:"demonlord_final",name:"魔王の玉座",level:100,
    rarity:{key:"legendary",label:"魔王討伐",mult:5,color:"#8e2f2f"},
    requiredPower:520,duration:6,bossName:"魔王",bossPower:676,
    discoveredDay:S.day,isFinal:true,
  };
  S.availableDungeons=S.availableDungeons||[];
  S.availableDungeons.push(finalD);
  chron("――ついに、魔王の座す場所への道が見えた。「魔王の玉座」が挑戦可能になった。","big");
}
/* 魔王討伐後のエンドコンテンツ:何度でも挑める高難度の周回ダンジョン(踏破数に応じて緩やかに強くなる) */
function spawnDemonAbyssDungeon(){
  if((S.availableDungeons||[]).some(d=>d.id==="demonlord_abyss"))return;
  const cleared=S.dungeonsCleared||0;
  const scale=1+Math.min(1.2,cleared*0.02);
  const req=Math.round(560*scale);
  S.availableDungeons=S.availableDungeons||[];
  S.availableDungeons.push({
    id:"demonlord_abyss",name:"深淵の魔王城",level:100,
    rarity:{key:"legendary",label:"周回討伐",mult:5.5,color:"#5a2f8e"},
    requiredPower:req,duration:5,bossName:"魔王の残滓",bossPower:Math.round(req*1.25),
    discoveredDay:S.day,protected:true,
  });
}
let demonDefenseSquad=[], demonDefenseLeader=null;
function resolveDemonDefense(){
  const squad=demonDefenseSquad;
  const leader=demonDefenseLeader;
  const power=squad.reduce((a,u)=>a+unitPower(u)*(leader&&u.id===leader.id?1.25:1),0)*squadSynergyMult(squad);
  const threat=48+(S.demonArmyLevel||0)*20; // 魔王の玉座との強さの落差を縮めるため、防衛戦の練度上昇に応じた強さの伸びを急にした
  const roll=power+rnd(-15,15);
  if(roll>=threat){
    S.demonArmyLevel=(S.demonArmyLevel||0)+1;
    for(const u of squad){const gain=leader&&u.id===leader.id?ri(10,18):ri(6,12);u.exp+=gain;processLevelUps(u);}
    if(leader)leader.leaderCount=(leader.leaderCount||0)+1;
    apply({mood:2,st:{military:1}});
    let itemMsg="";
    if(Math.random()<0.25){
      const item=rollItemDrop(S.demonArmyLevel>=5?"rare":"uncommon");
      if(item){addItem(item.key);itemMsg=`戦利品として「${item.name}」を持ち帰った。`;}
    }
    chron(`魔物の侵攻を退けた。防衛の練度が上がった(魔王軍対応Lv.${S.demonArmyLevel})。${itemMsg}`,"big");
    tryUnlockDemonLordDungeon();
  }else{
    const hurtOnes=[...squad].sort(()=>Math.random()-.5).slice(0,Math.max(1,Math.round(squad.length*0.3)));
    for(const u of hurtOnes)inflictInjury(u,[0.5,0.4,0.1]);
    apply({mood:-3,gold:-ri(15,40)});
    chron("魔物の侵攻を防ぎきれず、被害が出た。","grave");
  }
  demonDefenseSquad=[];demonDefenseLeader=null;
}


const EXPEDITION_THEMES=[
 {name:"名もなき遺跡",flavor:"地図にも載っていない遺跡が、猟師の手によって発見されたという。",statFn:u=>u.wis*0.4+u.int*0.35+u.str*0.25},
 {name:"山中の魔物の巣",flavor:"北の山中に、魔物の巣ができているとの報せが入った。放置すれば被害が広がりかねない。",statFn:u=>u.str*0.4+u.vit*0.4+u.agi*0.2},
 {name:"街道の盗賊団",flavor:"街道を荒らし続けてきた盗賊団の隠れ家が、ついに突き止められた。",statFn:u=>u.agi*0.4+u.str*0.3+u.wis*0.3},
 {name:"沈んだ交易船",flavor:"嵐で沈んだという交易船の噂を、漁師たちが伝えてきた。積み荷が残っているかもしれない。",statFn:u=>u.vit*0.35+u.agi*0.35+u.wis*0.3},
 {name:"呪われた古戦場",flavor:"かつての戦場跡から、夜な夜な怪しい声が聞こえるという。",statFn:u=>u.int*0.4+u.vit*0.3+u.wis*0.3},
 {name:"氷穴の奥",flavor:"山間の氷穴に、奇妙な光が灯っているのを猟師が見たという。",statFn:u=>u.wis*0.35+u.agi*0.3+u.vit*0.35},
 {name:"竜の足跡",flavor:"巨大な足跡が谷の外れに続いているのが見つかった。竜のものだという噂もある。",statFn:u=>u.str*0.35+u.vit*0.35+u.lead*0.3},
 {name:"地下水路の異変",flavor:"王都の地下水路で異音がするとの報告があった。何かが棲み着いたのかもしれない。",statFn:u=>u.agi*0.35+u.str*0.3+u.int*0.35},
 {name:"廃坑の怪音",flavor:"かつて栄えた鉱山の廃坑から、規則的な物音が響いてくるという。",statFn:u=>u.vit*0.4+u.str*0.3+u.wis*0.3},
 {name:"消えた行商隊",flavor:"半月前に街道を発ったはずの行商隊が、いまだ戻らないという。",statFn:u=>u.agi*0.4+u.wis*0.35+u.str*0.25},
 {name:"霧の谷の噂",flavor:"いつも霧に包まれている隣の谷で、灯りが揺れているのを見た者がいるという。",statFn:u=>u.wis*0.4+u.agi*0.3+u.int*0.3},
 {name:"古井戸の底",flavor:"村外れの涸れ井戸の底から、うめき声のようなものが聞こえるという。",statFn:u=>u.vit*0.35+u.int*0.35+u.agi*0.3},
 {name:"漂着した箱舟",flavor:"見知らぬ紋章の刻まれた小舟が、川岸に打ち上げられているのが見つかった。",statFn:u=>u.wis*0.4+u.lead*0.3+u.int*0.3},
 {name:"崩れた砦跡",flavor:"かつての国境砦の跡地に、何者かが出入りしているのが目撃された。",statFn:u=>u.str*0.35+u.lead*0.35+u.vit*0.3},
 {name:"星降る丘の異変",flavor:"流れ星がよく落ちるという丘で、地面が妙に光っているとの報告があった。",statFn:u=>u.int*0.45+u.wis*0.3+u.agi*0.25},
 {name:"獣道の異形",flavor:"猟師たちが使う獣道の奥で、見たこともない足跡が見つかったという。",statFn:u=>u.agi*0.4+u.str*0.35+u.vit*0.25},
];
function expeditionRarity(){
  const kRank=STAGES[S.stage].rank;
  const r=Math.random();
  const epicCut=Math.max(0.005,0.01+(kRank-1)*0.03);
  const rareCut=epicCut+Math.max(0.04,0.09+(kRank-1)*0.06);
  if(r<epicCut)return{key:"epic",label:"エピックミッション",mult:2.4,tagcolor:"#c98fe8"};
  if(r<rareCut)return{key:"rare",label:"レアミッション",mult:1.6,tagcolor:"#8fd0e8"};
  return{key:"common",label:"",mult:1,tagcolor:null};
}
let expeditionState=null;
function missionLevelForExpedition(){
  // 部隊の平均レベルを主軸に、国力はごく小さな補正として加味(序盤から段階的に上がるようにする)
  const avgLv=S.units.length?S.units.reduce((a,u)=>a+u.lv,0)/S.units.length:1;
  const powerIdx=(S.st.military+S.st.economy)/2;
  const base=Math.round(avgLv*1.3+powerIdx*0.1);
  return Math.max(1,Math.min(100,base+ri(-4,4)));
}
function buildExpeditionEvent(){
  const eligible=S.units.filter(u=>u.injured<=0&&(u.fatigue||0)<60&&!u.dungeonBusy&&!u.campUntil);
  if(eligible.length<3)return null;
  const theme=EXPEDITION_THEMES[Math.floor(Math.random()*EXPEDITION_THEMES.length)];
  const rarity=expeditionRarity();
  const level=missionLevelForExpedition();
  const leaderCands=[...eligible].sort((a,b)=>theme.statFn(b)-theme.statFn(a)).slice(0,5);
  expeditionState={theme,rarity,level,leaderCands};
  const rarityPrefix=rarity.label?`【${rarity.label}】`:"";
  const choices=leaderCands.map(u=>({
    label:`${u.nm}をリーダーに任命`,
    hint:`Lv.${u.lv}・適性目安${Math.round(theme.statFn(u))} ／ 腕${u.str}・体${u.vit}・魔${u.int}・敏${u.agi}・知${u.wis}・統${u.lead}`,
    fx:{call:()=>{expeditionState.leader=u;pushEventPriority("__expedition_risk__");}}
  }));
  choices.push({label:"今回は見送る",hint:"部隊を休ませる",fx:{log:`「${theme.name}」の話は今回、見送ることにした。`,call:()=>{expeditionState=null;}}});
  return{tag:"ミッション:人選",title:`${rarityPrefix}ミッション:${theme.name}(難度目安Lv.${level})`,
   body:`${theme.flavor}\n\nまずは部隊を率いるリーダーを選ぶ。リーダーは特別に多くの経験値を得る。`,
   speaker:"ガレオン「誰を大将に据えるか。それだけで結果が大きく変わりましょう」",
   choices};
}
function buildExpeditionRiskEvent(){
  if(!expeditionState||!expeditionState.leader)return null;
  const{theme,leader,leaderCands,rarity}=expeditionState;
  const members=leaderCands.filter(u=>u.id!==leader.id);
  expeditionState.squad=[leader,...members];
  return{tag:"ミッション:方針",title:`${leader.nm}率いる部隊、出立前`,
   body:`部隊編成(${expeditionState.squad.length}名):${expeditionState.squad.map(fullName).join("・")}\nリーダー:${fullName(leader)}\n\nどのように攻めるか、方針を決める。`,
   choices:[
    {label:"慎重に進む",hint:"安全策・ブレ幅が狭く安定/報酬控えめ",fx:{call:()=>resolveExpedition("cautious",0.6)}},
    {label:"標準的に進む",hint:"バランス型",fx:{call:()=>resolveExpedition("standard",1.0)}},
    {label:"積極的に攻める",hint:"ブレ幅が大きい(大成功も大失敗も出やすい)/報酬大",fx:{call:()=>resolveExpedition("aggressive",1.8)}},
    {label:"今回は見送る",fx:{call:()=>{expeditionState=null;}}},
   ]};
}
function resolveExpedition(riskKey,rewardMult){
  const{theme,leader,squad,rarity,level}=expeditionState;
  const lv=level||30;
  const levelMult=1+lv/32; // 後半でも報酬が目減りしないよう伸び幅を強化
  const magicExpBonus=(1+Math.min(0.45,S.st.magic*0.0045))*(S.flags.statS_magic?1.05:1);
  const rawPower=squad.reduce((a,u)=>a+theme.statFn(u)*(u.id===leader.id?1.3:1),0)*squadSynergyMult(squad);
  // 方針は「平均成功率」ではなく「ブレ幅(分散)」で差をつける。積極的は同じ平均でもブレが大きく、大成功も大失敗も出やすい。
  const variance={cautious:[-8,10],standard:[-16,16],aggressive:[-30,26]}[riskKey]||[-16,16];
  const scaleFactor=0.55+(lv/4.2)*(1+lv/250); // 兵の戦力は装備・スキル・称号で複合的に伸びるため、後半になるほど閾値も緩やかに加速して伸ばし「後半は全く失敗しない」状態を防ぐ
  const roll=rawPower*1.0+rnd(variance[0],variance[1]);
  const tier=roll>=20*2.5*scaleFactor?"great":roll>=20*1.4*scaleFactor?"success":roll>=20*scaleFactor?"fail":"critical";
  for(const u of squad)u.fatigue=Math.min(100,(u.fatigue||0)+ri(28,42));
  leader.leaderCount=(leader.leaderCount||0)+1;
  if(leader.leaderCount>=30)grantTitle(leader,"t_leader30");
  if(tier==="great"){
    leader.leaderGreatCount=(leader.leaderGreatCount||0)+1;
    if(leader.leaderGreatCount>=10)grantTitle(leader,"t_evercrown");
  }
  const log=[];
  let goldGain=0, died=null, diedWasHallWorthy=false, uniqueLearned=null, itemGained=null, dungeonFound=null;
  if(tier==="great"){
    goldGain=Math.round(ri(60,110)*rewardMult*rarity.mult*levelMult);
    for(const u of squad){
      const isLeader=u.id===leader.id;
      const gain=Math.round((isLeader?ri(18,28):ri(9,15))*levelMult*magicExpBonus);
      u.exp+=gain;processLevelUps(u);
      unitHistory(u,`ミッション「${theme.name}」${isLeader?"をリーダーとして率い、":"に参加し、"}大きな成果を上げた。`);
      log.push({u,gain,isLeader,note:"大活躍"});
    }
    // 超低確率で固有スキル習得(リーダーのみ、既に固有保持者がいなければ)
    if(!S.uniqueHolderId&&Math.random()<0.015){
      const uniq=SKILL_DB.filter(s=>s.tier==="unique"&&(!s.cls||s.cls===leader.cls));
      if(uniq.length){
        const pick=uniq[Math.floor(Math.random()*uniq.length)];
        leader.skills.push(pick.key);S.uniqueHolderId=leader.id;grantTitle(leader,"t_uniqueholder");
        uniqueLearned=pick;
        unitHistory(leader,`ミッションの最中、「${pick.name}」の境地に至った。`);
      }
    }
    // 大成功なら一定確率でアイテムドロップ(レア度に応じて質が変わる)
    if(Math.random()<0.4){
      itemGained=rollItemDrop(rarity.key);
      if(itemGained)addItem(itemGained.key);
    }
    apply({gold:goldGain,st:{economy:1},mood:2});
    dungeonFound=checkDungeonDiscovery(1.6,leader);
    chron(`――ミッション「${theme.name}」は大成功に終わった。${leader.nm}率いる部隊が、意気揚々と帰還した。${itemGained?`「${itemGained.name}」を手に入れた。`:""}`,"big");
  }else if(tier==="success"){
    goldGain=Math.round(ri(25,50)*rewardMult*rarity.mult*levelMult);
    for(const u of squad){
      const isLeader=u.id===leader.id;
      const gain=Math.round((isLeader?ri(9,14):ri(4,8))*levelMult*magicExpBonus);
      u.exp+=gain;processLevelUps(u);
      unitHistory(u,`ミッション「${theme.name}」から無事帰還した。`);
      log.push({u,gain,isLeader,note:"無事帰還"});
    }
    apply({gold:goldGain});
    chron(`ミッション「${theme.name}」は無事に終わった。部隊は疲れた様子で帰ってきた。`,"sys");
    dungeonFound=checkDungeonDiscovery(0.8,leader);
  }else if(tier==="fail"){
    const riskHurtBonus=riskKey==="aggressive"?0.15:riskKey==="cautious"?-0.1:0;
    const hurtCount=Math.max(1,Math.round(squad.length*(0.35+riskHurtBonus)));
    const hurtOnes=[...squad].sort(()=>Math.random()-.5).slice(0,hurtCount);
    const severityW=riskKey==="aggressive"?[0.3,0.4,0.3]:riskKey==="cautious"?[0.6,0.35,0.05]:[0.45,0.4,0.15];
    for(const u of hurtOnes){inflictInjury(u,severityW);unitHistory(u,`ミッション「${theme.name}」で${INJURY_TIERS[u.injurySeverity].label}を負った。`);log.push({u,gain:0,isLeader:u.id===leader.id,note:INJURY_TIERS[u.injurySeverity].label});}
    for(const u of squad.filter(x=>!hurtOnes.includes(x)))log.push({u,gain:0,isLeader:u.id===leader.id,note:"無傷で帰還"});
    apply({mood:-2});
    chron(`――ミッション「${theme.name}」は苦戦を強いられた。部隊は失意のうちに帰還した。`,"grave");
  }else{ // critical(大失敗)
    const riskHurtBonus=riskKey==="aggressive"?0.15:riskKey==="cautious"?-0.1:0;
    const hurtCount=Math.max(1,Math.round(squad.length*(0.6+riskHurtBonus)));
    const hurtOnes=[...squad].sort(()=>Math.random()-.5).slice(0,hurtCount);
    const severityW=riskKey==="aggressive"?[0.05,0.3,0.65]:riskKey==="cautious"?[0.25,0.45,0.3]:[0.15,0.4,0.45];
    for(const u of hurtOnes){inflictInjury(u,severityW);unitHistory(u,`ミッション「${theme.name}」で${INJURY_TIERS[u.injurySeverity].label}を負った。`);log.push({u,gain:0,isLeader:u.id===leader.id,note:INJURY_TIERS[u.injurySeverity].label});}
    for(const u of squad.filter(x=>!hurtOnes.includes(x)))log.push({u,gain:0,isLeader:u.id===leader.id,note:"無傷で帰還"});
    // 低確率で戦没(積極的だとさらに上がる)
    const deathChance=(riskKey==="aggressive"?0.20:riskKey==="cautious"?0.08:0.14)*(1-Math.min(0.55,S.st.order*0.0055))*(S.flags.statS_order?0.92:1);
    if(Math.random()<deathChance){
      const victim=squad[Math.floor(Math.random()*squad.length)];
      died=victim;
      diedWasHallWorthy=isHallWorthy(victim);
      const rec=log.find(l=>l.u.id===victim.id);if(rec)rec.note="戦没";
      removeUnitById(victim.id,"loss");
      chron(`――ミッション「${theme.name}」は大失敗に終わった。${victim.nm}は、ついに帰らぬ人となった。`,"grave");
    }else{
      for(const u of hurtOnes)if(u.injurySeverity==="severe"){u.criticalSurvivalCount=(u.criticalSurvivalCount||0)+1;grantTitle(u,"t_survivor");}
      chron(`――ミッション「${theme.name}」は大失敗に終わった。部隊はほうほうの体で逃げ帰った。`,"grave");
    }
    apply({mood:-5,gold:-Math.round(ri(10,30))});
  }
  clamp();render();renderTroops();refreshOpenPanels();save();
  showExpeditionResult(theme,rarity,tier,leader,log,goldGain,died,uniqueLearned,diedWasHallWorthy,itemGained,dungeonFound);
  expeditionState=null;
}
function showExpeditionResult(theme,rarity,tier,leader,log,goldGain,died,uniqueLearned,diedWasHallWorthy,itemGained,dungeonFound){
  const tierLabel={great:"大成功",success:"成功",fail:"失敗",critical:"大失敗"}[tier];
  const tierColor={great:"#e8c874",success:"#8fbf6f",fail:"#d99a6a",critical:"#d97a7a"}[tier];
  let h=`<div class="resultplate">
    <div class="rplabel">${rarity.label?`【${rarity.label}】`:""}${theme.name}</div>
    <div class="rpsummary" style="color:${tierColor};font-size:20px;font-weight:800;font-family:'Shippori Mincho',serif">${tierLabel}</div>
    ${goldGain?`<div style="font-size:13px;color:var(--gold);margin-top:4px">獲得:${goldGain}G</div>`:""}
  </div>`;
  if(uniqueLearned)h+=`<div class="pcard" style="border-color:var(--gold);box-shadow:0 0 10px rgba(201,162,75,.3)"><div class="nm">◆固有スキル習得</div><div class="ds">${leader.nm} ${leader.surname||""}が「${uniqueLearned.name}」を会得した。歴史に残る瞬間だ。</div></div>`;
  if(itemGained){const c=RARITY_COLOR[itemGained.rarity];h+=`<div class="pcard" style="border-color:${c}"><div class="nm" style="color:${c}">◆アイテム入手:${itemGained.name}</div><div class="ds">${itemGained.desc}</div></div>`;}
  if(dungeonFound){const c=dungeonFound.rarity.color||"#8fd0e8";h+=`<div class="pcard" style="border-color:${c}"><div class="nm" style="color:${c}">◆新たなダンジョンを発見</div><div class="ds">${dungeonFound.rarity.label?`【${dungeonFound.rarity.label}】`:""}「${dungeonFound.name}」への入口が見つかった。ダンジョン画面から挑戦できる。</div></div>`;}
  const sortedLog=[...log].sort((a,b)=>(b.isLeader?1:0)-(a.isLeader?1:0));
  for(const l of sortedLog){
    h+=`<div class="pcard" style="${l.note.includes("戦没")?"border-color:#d97a7a":""}"><div class="nm">${l.isLeader?`<span style="color:var(--gold)">★</span> `:""}${l.u.nm} ${l.u.surname||""}</div><div class="ds">${l.gain?`経験値+${l.gain} ／ `:""}${l.note}</div></div>`;
  }
  if(died)h+=`<div class="pcard" style="border-color:#d97a7a"><div class="nm" style="color:#d97a7a">戦没</div><div class="ds">${died.nm} ${died.surname||""}は、このミッションで命を落とした。${diedWasHallWorthy?"殿堂に記録が残る。":""}</div></div>`;
  $("#expResultBody").innerHTML=h;
  $("#panelExpResult").classList.add("show");
}
function buildRetireEvent(uid){
  const u=S.units.find(x=>x.id===uid);
  if(!u)return null;
  const stage=ageStageOf(u);
  const j=jobFor(u.cls,u.lv,u.route);
  return{tag:"進 退",title:`${u.nm}、${stage.label}を迎える`,
   body:`${u.nm}(${JOB_TREES[u.cls].label}・${j.name} Lv.${u.lv})も、齢${Math.floor(u.age)}。かつての勢いはやや薄れてきたようだ。本人は「まだやれます」と言うが、潮時を考える頃合いかもしれない。`,
   speaker:u.bondWith?`(戦友の一人が、心配そうにこちらを見ている)`:`${u.nm}「まだ働けます。ですが……長のご判断に従います」`,
   choices:[
    {label:"現役を続けさせる",hint:"能力はやや低下したまま戦い続ける",fx:{log:`${u.nm}は現役を続けることを選んだ。`}},
    {label:"退役させ、指南役(教官)に任じる",hint:"全兵士の訓練効果が微増",fx:{call:()=>retireUnit(u,true)}},
    {label:"静かに退役させる",hint:"戦力からは外れる",fx:{call:()=>retireUnit(u,false)}},
   ]};
}
/* ==================== ユニーク職(第7の道、英雄格昇進時に1回だけ判定・排他制なし) ==================== */
const UNIQUE_JOBS=[
 {key:"protagonist",name:"主人公",nickname:"主人公",
  check:(u)=>u.founder||((u.totalExpEarned||0)>0&&S.units.every(o=>o.id===u.id||(o.totalExpEarned||0)<=(u.totalExpEarned||0)))},
 {key:"guardian_saint",name:"守護聖",nickname:"守護聖",
  check:(u)=>(u.criticalSurvivalCount||0)>=1&&S.units.every(o=>o.id===u.id||(o.vit+skillEffects(o).vit)<=(u.vit+skillEffects(u).vit))},
 {key:"phoenix",name:"不死鳥",nickname:"不死鳥",
  check:(u)=>(u.criticalSurvivalCount||0)>=3},
 {key:"archsage",name:"大賢者",nickname:"大賢者",
  check:(u)=>u.cls==="mage"&&S.units.every(o=>o.id===u.id||((o.int+skillEffects(o).int)+(o.wis+skillEffects(o).wis))<=((u.int+skillEffects(u).int)+(u.wis+skillEffects(u).wis)))},
 {key:"destroyer_god",name:"破壊神",nickname:"破壊神",
  check:(u)=>!!u.wasCaptain&&S.units.every(o=>o.id===u.id||(o.lead+skillEffects(o).lead)<=(u.lead+skillEffects(u).lead))},
 {key:"hero_unique",name:"勇者",nickname:"勇者",
  check:(u)=>(u.titles||[]).length>=3&&u.traitTier==="legend"},
];
function checkUniqueJobOnHero(u){
  if(u.uniqueJob)return null;
  for(const def of UNIQUE_JOBS){
    try{if(def.check(u)){u.uniqueJob=def.key;return def;}}catch(e){/* 判定失敗時はスキップ */}
  }
  return null;
}
function buildHeroEvent(uid){
  const u=S.units.find(x=>x.id===uid);
  if(!u)return null;
  const j=jobFor(u.cls,u.lv,u.route);
  const uniqueDef=u.uniqueJob?UNIQUE_JOBS.find(d=>d.key===u.uniqueJob):null;
  const uniqueBody=uniqueDef?`\n\n――否、それだけではない。${u.nm}の歩みは、もはや${JOB_TREES[u.cls].label}の域すら超えている。人々はその者をこう呼び始めた――《${uniqueDef.nickname}》と。`:"";
  return{tag:"栄 誉",title:uniqueDef?`${u.nm}、《${uniqueDef.nickname}》の域へ`:`${u.nm}、${j.name}の域へ`,
   body:`${u.nm}が、ついに${JOB_TREES[u.cls].label}の頂――「${j.name}」と呼ぶべき域に達した。もはや一介の兵ではない。二つ名を授けるべきだ、と大臣たちが口を揃える。${uniqueBody}`,
   speaker:"ガレオン「かような者は、そう多くは出ません。しかるべき栄誉を」",
   choices:[
    {label:"盛大に二つ名を授け、称える",hint:"民心+3 / 本人の士気・忠誠が大きく上がる",fx:{mood:3,call:()=>{
      u.moral=Math.min(100,u.moral+20);u.loyalty=Math.min(100,u.loyalty+20);
      unitHistory(u,`民の前で二つ名を授けられた。生涯忘れぬ日になったという。`);
      // ごく稀に、固有(ユニーク)の域に達することがある(全兵士中で同時に一人だけ)
      if(!S.uniqueHolderId&&u.skills.length<3&&Math.random()<0.12){
        const uniq=pickUniqueSkill(u);
        if(uniq){
          u.skills.push(uniq.key);
          S.uniqueHolderId=u.id;grantTitle(u,"t_uniqueholder");
          unitHistory(u,`「${uniq.name}」の域に達したと、大臣たちが色めき立った。`);
          chron(`――${u.nm}は、もはや並の英雄ではない。「${uniq.name}」。この世に唯一の力を宿したと、大臣たちが色めき立った。`,"big");
        }
      }
    },log:`${u.nm}は民の前で正式に二つ名を授けられた。歓声が谷に響いた。`,logCls:"big"}},
    {label:"内々に労うだけにとどめる",hint:"控えめ",fx:{call:()=>{u.moral=Math.min(100,u.moral+8);unitHistory(u,`内々に長から労いの言葉を受けた。`);},log:`${u.nm}は内々に長から直接、労いの言葉を受けた。`}},
   ]};
}
function buildCaptainPromoEvent(uid){
  const u=S.units.find(x=>x.id===uid);
  if(!u)return null;
  const j=jobFor(u.cls,u.lv,u.route);
  return{tag:"昇 進",title:`${u.nm}、${j.name}に昇進`,
   body:`${u.nm}が「${j.name}」に昇進した。着実に力をつけてきた成果が、ここで形になった。`,
   speaker:"セラ「良い報告です。今後の活躍も期待できそうですね」",
   choices:[
    {label:"昇進を祝う",hint:"本人の士気が上がる",fx:{call:()=>{
      u.moral=Math.min(100,u.moral+12);
      if(Math.random()<0.6){
        const tierIndex=JOB_TREES[u.cls].chain.findIndex(c=>c.key===j.key)+1;
        const learned=trySkillUpOnPromotion(u,tierIndex);
        if(learned)unitHistory(u,`昇進を機に「${learned.name}」の心得を得た。`);
      }
      unitHistory(u,`「${j.name}」への昇進を、長から直接祝われた。`);
    },log:`${u.nm}の「${j.name}」昇進が祝われた。`,logCls:"big"}},
    {label:"淡々と受け止める",hint:"控えめ",fx:{log:`${u.nm}の「${j.name}」昇進が、静かに記録された。`}},
   ]};
}
/* ---------- ジョブ分岐(4段階目到達時、3ルートから1つを選ぶ・以降変更不可) ---------- */
function buildRouteBranchEvent(uid){
  const u=S.units.find(x=>x.id===uid);
  if(!u||u.route)return null;
  const routes=JOB_ROUTES[u.cls]||[];
  if(!routes.length)return null;
  const clsLabel=JOB_TREES[u.cls].label;
  const choices=routes.map(r=>({
    label:`${r.label}の道へ(${r.names.elite})`,
    hint:`主軸:${STAT_LABEL_JA[r.main]} ／ 準軸:${STAT_LABEL_JA[r.sub]} ／ 軽め:${STAT_LABEL_JA[r.light]} ／ 二つ名候補:《${r.nickname}》`,
    fx:{call:()=>{
      u.route=r.key;
      if(ageStageOf(u).key!=="young"&&ageStageOf(u).key!=="peak")grantTitle(u,"t_latebloom");
      unitHistory(u,`${clsLabel}としての研鑽の末、己の進む道を見定めた――「${r.label}」を選び、《${r.nickname}》を名乗るにふさわしい力を、その手に掴もうとしている。`);
      chron(`――${u.nm}は「${r.label}」の道を選んだ。以後、${r.names.elite}として歩む。`,"big");
    }}
  }));
  return{tag:"分 岐",title:`${u.nm}、進む道を選ぶ`,
   body:`${u.nm}はこれまでの研鑽により、${clsLabel}としての大きな節目を迎えた。ここから先、どの道を究めるかによって、大きく歩みが変わるだろう。一度選んだ道は、もう後戻りできない。`,
   speaker:"ガレオン「よくお考えください。これは一度きりの選択です」",
   choices};
}
