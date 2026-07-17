/* ---------- 日次処理 ---------- */
const TURN_NAMES=["朝","昼","晩"];
const TURN_ICON=["☀","◔","☾"];
/* ---------- 固定イベント(ストーリー・閣議・予約済み)は朝にチェック ---------- */
function weeklyExpeditionCooldownLeft(){return Math.max(0,7-(S.day-(S.lastWeeklyExpDay??-10)));}
function weeklyEventCooldownLeft(){return Math.max(0,7-(S.day-(S.lastWeeklyEvtDay??-10)));}
function councilCooldownLeft(){return Math.max(0,28-(S.day-(S.lastCouncilDay??-30)));}
function checkFixedDayEvents(){
  let fired=false;
  const key="day"+S.day;
  if(EVENTS[key]){pushEvent(key);fired=true;}
  if(S.scheduled[S.day]){for(const id of S.scheduled[S.day])pushEvent(id);fired=true;delete S.scheduled[S.day];}
  if(!fired&&S.day>=8&&S.day%7===1&&!S._weeklyReported){pushEvent("__weekly_report__");S._weeklyReported=true;fired=true;}
  if(S.day%7!==1)S._weeklyReported=false;
  if(!fired&&councilCooldownLeft()<=0){pushEvent("__council__");S.lastCouncilDay=S.day;fired=true;}
  if(!fired&&S.units.length&&trainingCooldownLeft()<=0){pushEvent("__training_grade__");fired=true;}
  if(!fired&&weeklyExpeditionCooldownLeft()<=0){
    S.lastWeeklyExpDay=S.day;
    const eligible=S.units.filter(u=>u.injured<=0&&(u.fatigue||0)<60&&!u.dungeonBusy&&!u.campUntil);
    if(eligible.length>=3){pushEvent("__expedition__");fired=true;}
    else chron("今週はミッションに出せるだけの兵が揃わず、見送られた。","sys");
  }
  if(!fired&&weeklyEventCooldownLeft()<=0){
    S.lastWeeklyEvtDay=S.day;
    const pool=["__recruit__","__random__","__rare__"];
    if(S.day<70)pool.push("__growth__");
    if(Math.random()<0.12)pool.push("__merchant_visit__","__merchant_visit__","__merchant_visit__");
    pushEvent(pool[Math.floor(Math.random()*pool.length)]);
    fired=true;
  }
  checkWeeklyVolunteers();
  return fired;
}
/* ---------- ランダムイベントは毎ターン抽選(1日3回のチャンス) ---------- */
function rollRandomTurnEvent(){
  const earlyPhase=S.day<70;
  // 個別ミッションのみ引き続き低確率のランダム(週次の柱とは別枠の小さな小話)
  if(S.units.filter(u=>u.injured<=0&&(u.fatigue||0)<70&&!u.dungeonBusy&&!u.campUntil).length>=2&&Math.random()<0.05){pushEvent("__mission__");return;}
  checkUniqueEvents();
  checkPendingRouteBranch();
  checkDemonInvasion();
  checkAwakening();
  checkStoryArcs();
  // ミッションとは無関係に、ふとした噂話からダンジョンが見つかることもある
  if(S.day>10&&Math.random()<0.012)checkDungeonDiscovery(1.0);
  if(S.units.length&&Math.random()<0.004){pushEvent("__old_equipment__");return;}
  if(S.units.length&&Math.random()<0.0035){pushEvent("__job_change_surprise__");return;}
  // 日常フレーバー(パラメータに影響しない、ログを賑やかにするためだけの小さな一言)は1日1回程度
  if(Math.random()<0.7){
    const timeMatched=FLAVOR_ONLY.filter(f=>f.t===S.turn);
    const universal=FLAVOR_ONLY.filter(f=>f.t===undefined);
    const pool=Math.random()<0.4&&timeMatched.length?timeMatched:universal;
    const fresh=pool.filter(f=>f.choices[0].fx.log!==S._lastFlavor);
    const f=(fresh.length?fresh:pool)[Math.floor(Math.random()*(fresh.length?fresh.length:pool.length))];
    if(f.choices[0].fx.call)f.choices[0].fx.call();
    else{chron(f.choices[0].fx.log,"");S._lastFlavor=f.choices[0].fx.log;}
    return;
  }
  if(earlyPhase&&Math.random()<0.05){pushEvent("__growth__");}
}
/* ---------- 日常フレーバー:パラメータに影響しない、ログを賑やかにするだけの小さな一言 ---------- */
const FLAVOR_ONLY=[
 {choices:[{label:"",fx:{log:"今日は谷全体が晴天。マーサが「畑が笑っとる」と上機嫌だった。"}}]},
 {choices:[{label:"",fx:{log:"吟遊詩人が谷を訪れ、王の歌を即興で歌った。歌詞はだいぶ盛られていた。"}}]},
 {choices:[{label:"",fx:{log:"子供たちが広場で剣ごっこをしていた。ガレオン役が一番人気らしい。"}}]},
 {choices:[{label:"",fx:{log:"晴れた夜、満天の星の下でささやかな宴が開かれた。"}}]},
 {choices:[{label:"",fx:{log:"旅の商人がもたらした噂話から、隣の集落の様子が少し分かった。"}}]},
 {choices:[{label:"",fx:{log:"些細な諍いが村人の間で起きたが、すぐに収まった。"}}]},
 {choices:[{label:"",fx:{log:"貯蔵庫の裏でネズミを追う猫の姿が見られた。今日も平和なようだ。"}}]},
 {choices:[{label:"",fx:{log:"見張りの兵たちが、他愛のない世間話に花を咲かせていた。"}}]},
 {choices:[{label:"",fx:{log:"井戸端で、今日も洗濯物を巡る立ち話が繰り広げられていた。"}}]},
 {choices:[{label:"",fx:{log:"遠くの山並みに、うっすらと虹がかかっていた。"}}]},
 {choices:[{label:"",fx:{call:()=>{if(!S.units.length)return;const u=S.units[Math.floor(Math.random()*S.units.length)];chron(`${u.nm}が見回り中に落とし物を届けてくれた。ちょっとした評判になっている。`,"");}}}]},
 {choices:[{label:"",fx:{call:()=>{if(S.units.length<2)return;const u=S.units[Math.floor(Math.random()*S.units.length)];chron(`${u.nm}と若手の間で腕相撲大会が起きた。長も知らぬところで、絆が育っている。`,"");}}}]},
 // 朝らしい一言
 {t:0,choices:[{label:"",fx:{log:"朝靄の中、鶏の声とともに一日が始まった。"}}]},
 {t:0,choices:[{label:"",fx:{log:"朝市の準備をする声が、まだ薄暗い通りに響いていた。"}}]},
 {t:0,choices:[{label:"",fx:{log:"見張りの交代が行われた。夜番の兵が、あくびを噛み殺していた。"}}]},
 {t:0,choices:[{label:"",fx:{log:"朝露に濡れた畑を、マーサが満足げに眺めていた。"}}]},
 {t:0,choices:[{label:"",fx:{log:"パン屋の煙突から、香ばしい匂いが漂い始めた。"}}]},
 // 昼らしい一言
 {t:1,choices:[{label:"",fx:{log:"陽が高く昇り、広場は人々の話し声で賑わっていた。"}}]},
 {t:1,choices:[{label:"",fx:{log:"昼餉の匂いが、あちこちの家から漂ってきた。"}}]},
 {t:1,choices:[{label:"",fx:{log:"市場では今日も、威勢のいい掛け声が飛び交っていた。"}}]},
 {t:1,choices:[{label:"",fx:{log:"日差しの下、兵たちが木陰で束の間の休息を取っていた。"}}]},
 {t:1,choices:[{label:"",fx:{log:"子供たちが川辺で水遊びに興じる声が聞こえてきた。"}}]},
 // 晩らしい一言
 {t:2,choices:[{label:"",fx:{log:"夕暮れ、家路につく人々の影が長く伸びていた。"}}]},
 {t:2,choices:[{label:"",fx:{log:"灯りが一つ、また一つと窓に灯り始めた。"}}]},
 {t:2,choices:[{label:"",fx:{log:"夜番の兵が、松明を手に見回りへと出ていった。"}}]},
 {t:2,choices:[{label:"",fx:{log:"酒場から、今日一日の疲れを癒す笑い声が漏れ聞こえた。"}}]},
 {t:2,choices:[{label:"",fx:{log:"静かな夜が谷を包んだ。遠くで梟が鳴いている。"}}]},
 {t:2,choices:[{label:"",fx:{log:"寝物語をせがむ子供の声が、開いた窓から漏れていた。"}}]},
];
/* ---------- 1日ぶんの経済・加齢・敗北判定(晩にまとめて処理) ---------- */
function dailyEconomySettle(){
  S.prev={...S.st};
  const noise=rnd(0.75,1.35);
  const militaryDrag=Math.max(0,S.st.military-S.st.economy-20)*0.03; // 軍事が経済を大きく上回ると、軍事費のしわ寄せで経済がわずかに圧迫される
  const diplomacyTrade=S.st.diplomacy*0.08; // 外交網は交易を通じてわずかに経済を後押しする
  const income=(3+S.st.economy*0.4+diplomacyTrade-militaryDrag+(S.flags.guild==="accept"?4:0))*(S.flags.statS_economy?1.06:1)*noise;
  if(militaryDrag>3&&!S._militaryDragWarned&&Math.random()<0.3){
    S._militaryDragWarned=true;
    chron("軍事にかける費えが経済を圧迫している、と財務官が渋い顔で報告した。","");
  }
  if(militaryDrag<=1)S._militaryDragWarned=false;
  const unitUpkeep=S.units.reduce((a,u)=>a+0.1+u.lv*0.018,0);
  const upkeep=(2+S.st.military*0.12+unitUpkeep+(S.flags.dragonPact?3:0))*(1-Math.min(0.15,S.st.economy*0.0015))*(1-Math.min(0.12,S.st.diplomacy*0.0012))*(S.flags.statS_military?0.94:1)*(S.flags.statS_diplomacy?0.94:1); // 経済・外交(同盟網)が高いほど維持費が軽くなる。軍事/外交がSに達すると恒久的にさらに軽くなる
  S.gold+=income-upkeep;
  S.food+=S.st.agriculture*0.7*noise-S.pop*0.085*(1-Math.min(0.3,S.st.agriculture*0.003))*(S.flags.statS_agriculture?0.95:1); // 農業が高いほど備蓄・分配も効率化し消費が抑えられる。農業Sで恒久的にさらに抑制
  const growChance=0.16+Math.max(0,(S.food-20)/700)+Math.max(0,(S.mood-45)/400)+Math.max(0,(S.st.agriculture-40)/900); // 農業が豊かなほど人口増加率も上がる
  if(S.food>15&&S.mood>38&&Math.random()<Math.min(0.55,growChance))S.pop+=ri(1,3);
  if(S.food<0){S.food=0;S.mood-=2;if(S.day%3===0)chron("食糧が底を突きつつある。配給に長い列ができている。","grave");}
  if(S.gold<0&&S.day%5===0){S.mood-=1.5;chron("蓄えが底を突いている。倹約令が敷かれた。","grave");}
  S.mood+=(S.st.order-50)*0.02+(S.st.agriculture-30)*0.006+(S.st.diplomacy-30)*0.004+rnd(-0.5,0.5); // 農業(食の安定)・外交(国の評判)も民心にわずかに影響
  if(S.policyFocus){
    const cur=S.st[S.policyFocus];
    S.st[S.policyFocus]=Math.min(100,cur+0.13*statDiminish(cur));
  }
  for(const p of S.projects){
    if(p.done)continue;
    p.p+=p.rate*(0.7+Math.random()*0.7);
    if(p.p>=100){p.p=100;p.done=true;p.fx&&p.fx();}
  }
  facilityDailyProduce();
  clamp();
  checkMilestone();
  checkStatSMilestone();
  checkRecords();
  checkAging();
  checkCampReturns();
  // 民心の水準は、兵の忠誠にもじわじわ影響する(高ければ支持基盤として忠誠を後押し、低ければ蝕む)
  if(S.mood>=70||S.mood<30){
    const loyaltyDrift=S.mood>=70?(S.mood-70)*0.006:-(30-S.mood)*0.01;
    for(const u of S.units)u.loyalty=Math.max(0,Math.min(100,u.loyalty+loyaltyDrift));
  }
  if(S.mood>0&&S.mood<18&&!S._unrestWarned&&Math.random()<0.4){
    S._unrestWarned=true;
    chron("民の不満が渦巻いている。このままでは、いずれ立ち行かなくなるだろう。","grave");
  }
  if(S.mood>=30)S._unrestWarned=false;
  if(S.st.order<20&&!S._orderWarned&&Math.random()<0.35){
    S._orderWarned=true;
    chron("治安の乱れから、市中で小さな諍いが目立つようになった。放っておけば、いずれ大事になりかねない。","grave");
  }
  if(S.st.order>=32)S._orderWarned=false;
  if(S.st.order<10&&Math.random()<0.12){
    S.mood-=ri(2,4);
    chron("ついに市中で騒擾が起きた。治安の悪化が、目に見える形で民心を蝕んでいる。","grave");
  }
  if(S.st.agriculture<18&&!S._agriWarned&&Math.random()<0.35){
    S._agriWarned=true;
    chron("畑の実りが年々細っている。このままでは、いずれ蔵を満たせなくなるだろう。","grave");
  }
  if(S.st.agriculture>=30)S._agriWarned=false;
  if(S.st.agriculture<8&&Math.random()<0.12){
    S.food-=ri(8,18);
    chron("不作が続き、蔵の食糧が目に見えて減っている。","grave");
  }
  if(S.st.economy<18&&!S._econWarned&&Math.random()<0.35){
    S._econWarned=true;
    chron("市場に活気がない。商人たちの足も遠のいており、このままでは税収が先細るばかりだ。","grave");
  }
  if(S.st.economy>=30)S._econWarned=false;
  if(S.st.economy<8&&Math.random()<0.12){
    S.gold-=ri(5,15);
    chron("市場の不振が続き、国庫の目減りが止まらない。","grave");
  }
  if(S.mood<=0){gameOver("民心が尽きた。広場に集った民は静かに、しかし固く長の退任を求めた。旗は次の誰かへ託される。");return true;}
  if(S.gold<=-450){gameOver("蓄えは完全に尽きた。配給も俸給も止まり、村としての体すら保てなくなった。");return true;}
  if(S.pop<=0){gameOver("最後の一人が谷を去った。旗だけが、風にはためいている。");return true;}
  return false;
}
/* ---------- ターン進行の本体 ---------- */
function turnTick(){
 try{
  let fixedFired=false;
  if(S.turn===0)fixedFired=checkFixedDayEvents();
  if(!fixedFired)rollRandomTurnEvent();
  if(S.turn===2){
    const ended=dailyEconomySettle();
    if(ended)return;
    S.day++;S.turn=0;
  }else{
    S.turn++;
  }
  render();save();
  refreshOpenPanels();
 }catch(e){console.error("turnTick() failed:",e);}
}
function gameOver(text){
  S.speed=0;updateSpeedUI();
  chron("【王国記・了】"+text,"grave");
  setTimeout(()=>{
    $("#title").classList.remove("hidden");
    $("#title h1").textContent="王国記・了";
    $("#titleText").innerHTML=text+"<br><br>DAY "+S.day+" まで、あなたはこの国の王だった。";
    $("#startBtn").textContent="もう一度 即位する";
    clearSave();
  },1200);
}

/* ---------- __動的イベントの解決 ---------- */
const _origEVENTS_get=id=>EVENTS[id];
function pickFresh(pool){
  const available=pool.filter(e=>!e.cond||e.cond(S));
  const fresh=available.filter(e=>!S.recentEventTitles.includes(e.title));
  const src=fresh.length?fresh:available;
  const chosen=src[Math.floor(Math.random()*src.length)];
  S.recentEventTitles.push(chosen.title);
  if(S.recentEventTitles.length>8)S.recentEventTitles.shift();
  return chosen;
}
const EVENT_ID_EXACT={
  "__council__":()=>councilEvent(),
  "__council_action__":()=>councilAction(),
  "__weekly_report__":()=>buildWeeklyReportEvent(),
  "__random__":()=>pickFresh(RANDOM_CHOICE),
  "__rare__":()=>pickFresh(RANDOM_RARE),
  "__cave_rescue_result__":()=>buildCaveRescueResult(),
  "__border_deadline__":()=>buildBorderDeadlineResult(),
  "__outbreak_deadline__":()=>buildOutbreakDeadlineResult(),
  "__merchant_visit__":()=>buildMerchantVisitEvent(),
  "__growth__":()=>pickFresh(EARLY_GROWTH),
  "__mission__":()=>buildMissionEvent(),
  "__old_equipment__":()=>buildOldEquipmentEvent(),
  "__job_change_surprise__":()=>buildJobChangeSurpriseEvent(),
  "__expedition__":()=>buildExpeditionEvent(),
  "__expedition_risk__":()=>buildExpeditionRiskEvent(),
  "__demon_invasion__":()=>buildDemonInvasionEvent(),
  "__training_grade__":()=>buildTrainingGradeEvent(),
  "__training_pick__":()=>buildTrainingPickEvent(),
  "__recruit__":()=>buildRecruitEvent(),
  "__recruit2__":()=>buildRecruit2Event(),
  "arc_heir_1":()=>buildHeirArc1(),
  "arc_heir_2":()=>buildHeirArc2(),
  "arc_heir_3":()=>buildHeirArc3(),
};
const EVENT_ID_PREFIX=[
  ["__item_result__",id=>buildItemResultEvent(+id.slice("__item_result__".length))],
  ["__dungeon_resolve_",id=>{resolveDungeonRun(id.slice(18));return null;}],
  ["__expedition_long_resolve__",id=>{resolveLongExpedition(id.slice("__expedition_long_resolve__".length));return null;}],
  ["__faith_reveal__",id=>buildFaithRevealEvent(id.slice("__faith_reveal__".length))],
  ["__longexp_result__",id=>buildLongExpeditionResultEvent(+id.slice("__longexp_result__".length))],
  ["statmilestone_",id=>buildStatSMilestoneEvent(id.slice(14))],
  ["__unique_",id=>{const ue=UNIQUE_EVENTS.find(x=>x.key===id.slice(9));return ue?ue.build():null;}],
  ["retire_",id=>buildRetireEvent(id.slice(7))],
  ["hero_",id=>buildHeroEvent(id.slice(5))],
  ["captainpromo_",id=>buildCaptainPromoEvent(id.slice(13))],
  ["routebranch_",id=>buildRouteBranchEvent(id.slice(12))],
  ["awaken_",id=>buildAwakenEvent(id.slice(7))],
];
function resolveEventId(id){
  if(EVENT_ID_EXACT[id])return EVENT_ID_EXACT[id]();
  for(const[prefix,handler]of EVENT_ID_PREFIX){
    if(id.startsWith(prefix))return handler(id);
  }
  const e=EVENTS[id];return typeof e==="function"?e():e;
}
/* ---------- 固有(ユニーク)イベント:条件を満たすと一度だけ発生 ---------- */
const UNIQUE_EVENTS=[
 {key:"dragonkinJoin",
  cond:()=>S.units.some(u=>u.race==="dragonkin")&&!S.flags.uq_dragonkinJoin,
  build:()=>({tag:"固 有",title:"竜の血を引く者",
   body:"竜人の兵が加わったと聞き、長老たちがざわついた。「竜人が人里に下るなど、幾百年ぶりのことか」。その者を特別に扱うべきか、他の兵と分け隔てなく扱うべきか。",
   choices:[
    {label:"特別に迎え入れ、丁重に扱う",hint:"民心+4 外交+2",fx:{mood:4,st:{diplomacy:2},flag:{uq_dragonkinJoin:true},log:"竜人の兵は丁重に迎えられた。その存在だけで、村の格が一段上がったように感じられた。",logCls:"big"}},
    {label:"他の兵と分け隔てなく扱う",hint:"忠誠に良い影響",fx:{flag:{uq_dragonkinJoin:true},call:()=>{const u=S.units.find(x=>x.race==="dragonkin");if(u){u.loyalty=Math.min(100,u.loyalty+15);unitHistory(u,"特別扱いを固辞し、他の兵と同じ道を選んだ。");}},log:"竜人の兵は「他の者と同じように」と望み、それが叶えられた。静かな信頼が生まれた。",logCls:"big"}},
   ]})},
 {key:"threeBonds",
  cond:()=>{const c=S.units.filter(u=>u.bondWith).length;return c>=4&&!S.flags.uq_threeBonds;},
  build:()=>({tag:"固 有",title:"結束の輪",
   body:"見張りも訓練も、いつしか兵たちは自然と助け合うようになっていた。誰が言い出したでもなく、彼らは互いを「戦友」と呼び合っている。長として、この結束をどう見るか。",
   choices:[
    {label:"結束を称える式典を開く",hint:"民心+5 士気全体+",fx:{mood:5,flag:{uq_threeBonds:true},call:()=>{for(const u of S.units)u.moral=Math.min(100,u.moral+8);},log:"結束を称える小さな式典が開かれた。兵たちの顔には、いつになく誇らしげな色があった。",logCls:"big"}},
    {label:"何も言わず、静かに見守る",hint:"忠誠全体+",fx:{flag:{uq_threeBonds:true},call:()=>{for(const u of S.units)u.loyalty=Math.min(100,u.loyalty+5);},log:"長は何も言わなかった。だが、その眼差しは兵たちにしっかりと届いていたようだ。"}},
   ]})},
 {key:"richTreasury",
  cond:()=>S.gold>=1200&&!S.flags.uq_richTreasury,
  build:()=>({tag:"固 有",title:"満ちた蔵",
   body:"国庫に千を超える蓄えが積まれた。ネロが分厚い帳面を抱え、珍しく興奮した様子でやってきた。「陛下、これをどう使うか、そろそろお決めください」",
   speaker:"ネロ「貯め込むだけが能ではありません。……とはいえ、使いすぎも考えものです」",
   choices:[
    {label:"大規模な投資に回す",hint:"経済+6 / 国庫の半分を投入",fx:{call:()=>{const spend=Math.round(S.gold*0.5);S.gold-=spend;S.st.economy+=6*statDiminish(S.st.economy);chron(`国庫から${spend}が大規模投資に回された。ネロは「これでこそ」と満足げだった。`,"big");},flag:{uq_richTreasury:true}}},
    {label:"備蓄として蔵に眠らせておく",hint:"民心+2 / 手堅く温存",fx:{mood:2,flag:{uq_richTreasury:true},log:"蓄えはそのまま蔵に眠ることになった。もしもの時への備えである。"}},
   ]})},
 {key:"allClasses",
  cond:()=>{const set=new Set(S.units.map(u=>u.cls));return set.size>=4&&!S.flags.uq_allClasses;},
  build:()=>({tag:"固 有",title:"四つの道、揃う",
   body:"戦士・魔法・弓術・拳法――四つの異なる道を歩む者たちが、初めて全て揃った。訓練場に集った彼らを眺め、ガレオンが感慨深げに呟いた。",
   speaker:"ガレオン「これで、どんな戦でも戦い方を選べます。良い日です」",
   choices:[
    {label:"合同演習を行わせる",hint:"軍事+3",fx:{st:{military:3},flag:{uq_allClasses:true},log:"四系統合同の演習が行われた。互いの戦い方を知ることで、連携がぐっと良くなった。",logCls:"big"}},
   ]})},
 {key:"knightFull",
  cond:()=>S.flags.knightOrder&&S.units.length>=14&&!S.flags.uq_knightFull,
  build:()=>({tag:"固 有",title:"騎士団、威容を示す",
   body:"騎士団の陣容が十分に整った。城下で初めての大規模な閲兵式を行ってはどうか、との声が上がっている。",
   choices:[
    {label:"閲兵式を行う",hint:"民心+4 外交+2 / 出費あり",fx:{gold:-40,mood:4,st:{diplomacy:2},flag:{uq_knightFull:true},log:"城下で盛大な閲兵式が行われた。整然と並ぶ兵たちの姿に、民は安堵と誇らしさを覚えたようだ。",logCls:"big"}},
    {label:"見送り、実戦の備えに専念させる",hint:"軍事+2",fx:{st:{military:2},flag:{uq_knightFull:true},log:"閲兵式は見送られた。「見世物より、備えを」とガレオンは言った。"}},
   ]})},
 {key:"eliteVeteran",
  cond:()=>S.units.some(u=>u.lv>=35)&&!S.flags.uq_eliteVeteran,
  build:()=>{
   const u=S.units.find(x=>x.lv>=35);
   return{tag:"固 有",title:`${u?u.nm:"ある古参兵"}、隊長格に至る`,
    body:`長年鍛えてきた兵の一人が、隊長格と呼べる域に達した。若い兵たちが、こぞってその指導を仰ぎたがっている。`,
    choices:[
     {label:"若手の指導を正式に任せる",hint:"訓練効果が一時的に上昇",fx:{flag:{uq_eliteVeteran:true},call:()=>{for(const uu of S.units){uu.exp+=ri(3,8);processLevelUps(uu);}if(u)unitHistory(u,"若手の指導を正式に任された。");},log:`${u?u.nm:"古参兵"}が若手の指導にあたることになった。訓練場の空気が引き締まった。`,logCls:"big"}},
    ]};
  }},
 {key:"threeRoutesFull",
  cond:()=>{const cls=new Set(Object.values(JOB_ROUTES).flat().map(()=>1));const routesSeen=new Set(S.units.filter(u=>u.route).map(u=>u.cls+":"+u.route));return routesSeen.size>=6&&!S.flags.uq_threeRoutesFull;},
  build:()=>({tag:"固 有",title:"六つの道、それぞれに",
   body:"戦士・魔法・弓術・拳法・神官・狩人――それぞれの職において、異なる道を選んだ者たちが揃うようになった。同じ出自でも、進む道によってこれほど違うものかと、ガレオンが感心している。",
   speaker:"ガレオン「同じ剣を握っても、行き着く先は一つではない。良いことです」",
   choices:[{label:"それぞれの流儀を尊重する触れを出す",hint:"全兵士の士気+3",fx:{flag:{uq_threeRoutesFull:true},call:()=>{for(const u of S.units)u.moral=Math.min(100,u.moral+3);},log:"それぞれの流儀を尊重する旨の触れが出された。兵たちは、自らの選んだ道に誇りを持ったようだ。",logCls:"big"}}]})},
 {key:"firstUniqueJob",
  cond:()=>S.units.some(u=>u.uniqueJob)&&!S.flags.uq_firstUniqueJob,
  build:()=>{
   const u=S.units.find(x=>x.uniqueJob);
   const info=u?UNIQUE_JOBS.find(j=>j.key===u.uniqueJob):null;
   return{tag:"固 有",title:`《${info?info.nickname:"名もなき者"}》、王国に立つ`,
    body:`${u?u.nm:"ある者"}の在り方が、もはや尋常のそれではないと、誰もが気づき始めている。《${info?info.nickname:""}》――その二つ名は、いずれ王国の歴史に刻まれることになるだろう。`,
    speaker:"セラ「このような者が現れるとは……陛下の治世、確かなものと存じます」",
    choices:[{label:"王国の宝として遇する",hint:"民心+6 / その者の忠誠が大きく上がる",fx:{mood:6,flag:{uq_firstUniqueJob:true},call:()=>{if(u)u.loyalty=Math.min(100,u.loyalty+20);},log:`《${info?info.nickname:""}》は王国の宝として遇されることとなった。`,logCls:"big"}}]};
  }},
 {key:"tenTitles",
  cond:()=>S.units.some(u=>(u.titles||[]).length>=5)&&!S.flags.uq_tenTitles,
  build:()=>{
   const u=S.units.find(x=>(x.titles||[]).length>=5);
   return{tag:"固 有",title:`${u?u.nm:"ある兵"}、数多の栄誉を背負う`,
    body:`${u?u.nm:"ある兵"}は、いつしか五つもの称号を得ていた。踏破した戦績、積み重ねた歳月、生き様――その一つ一つが、この者の物語を物語っている。`,
    choices:[{label:"その功績を年代記に残す",hint:"民心+3",fx:{mood:3,flag:{uq_tenTitles:true},log:`${u?u.nm:"ある兵"}の功績が、王国の記録に残されることとなった。`,logCls:"big"}}]};
  }},
 {key:"routeAbandonReflection",
  cond:()=>S.units.some(u=>u.hasJobChanged&&u.route)&&!S.flags.uq_routeAbandonReflection,
  build:()=>{
   const u=S.units.find(x=>x.hasJobChanged&&x.route);
   return{tag:"固 有",title:"転じた道の果てに",
    body:`${u?u.nm:"ある兵"}は、かつて別の道を歩んでいたが、転職を経て今の道に至った。過去を悔いてはいないかと問うと、静かに首を振ったという。`,
    choices:[{label:"「これでよかったか」と声をかける",hint:"忠誠+8",fx:{flag:{uq_routeAbandonReflection:true},call:()=>{if(u)u.loyalty=Math.min(100,u.loyalty+8);},log:`${u?u.nm:"ある兵"}は「後悔などありません」と、はっきり答えたという。`,logCls:"big"}}]};
  }},
 {key:"allSixRoutesTypes",
  cond:()=>{const set=new Set(S.units.filter(u=>u.route).map(u=>u.route));return set.size>=8&&!S.flags.uq_allSixRoutesTypes;},
  build:()=>({tag:"固 有",title:"多彩な軍勢",
   body:"実に多くの流儀を持つ者たちが、この王国には集うようになった。もはや、どんな任務・ダンジョンにも対応できる陣容だと、ガレオンが誇らしげに語る。",
   choices:[{label:"多様性を誇る布告を出す",hint:"外交+3",fx:{st:{diplomacy:3},flag:{uq_allSixRoutesTypes:true},log:"王国の多彩な陣容を誇る布告が出された。諸国からの評判も上々のようだ。",logCls:"big"}}]})},
];
function checkUniqueEvents(){
  for(const ue of UNIQUE_EVENTS){
    if(ue.cond()&&Math.random()<0.18){pushEvent("__unique_"+ue.key);return;}
  }
}
/* 既存セーブなどでLv25以上なのにルート未選択の兵士を検出し、分岐イベントを発火させる */
function checkPendingRouteBranch(){
  const u=S.units.find(x=>!x.route&&jobFor(x.cls,x.lv,null).key!=="recruit"&&jobFor(x.cls,x.lv,null).key!=="soldier"&&jobFor(x.cls,x.lv,null).key!=="vet");
  if(u)pushEvent("routebranch_"+u.id);
}
/* ---------- 連作ストーリー:隣村の跡継ぎ争い(選択で分岐する3話構成) ---------- */
function checkStoryArcs(){
  if(!S.flags.arc_heir&&S.day>=15&&Math.random()<0.02){
    S.flags.arc_heir="pending";
    pushEvent("arc_heir_1");
  }
}
function buildHeirArc1(){
  return{tag:"隣 村",title:"隣村の跡継ぎ争い(一)",
   body:"隣接する小さな集落の長が急逝した。跡目を巡り、穏健な人柄で知られる長女と、実力主義で若手に慕われる副長格の二人が対立していると報せが入った。",
   speaker:"セラ「どちらに肩入れするかで、あの集落との今後の関係が変わってきます。あるいは、関わらないという手も」",
   choices:[
    {label:"穏健派(長女)を推す",hint:"6日後に続報",fx:{flag:{arc_heir:"moderate"},schedule:[[6,"arc_heir_2"]],log:"穏健派を推す意向を密かに伝えた。集落の様子を見守ることにする。"}},
    {label:"実力派(副長格)を推す",hint:"6日後に続報",fx:{flag:{arc_heir:"strong"},schedule:[[6,"arc_heir_2"]],log:"実力派を推す意向を密かに伝えた。集落の様子を見守ることにする。"}},
    {label:"介入せず、静観する",hint:"6日後に続報",fx:{flag:{arc_heir:"neutral"},schedule:[[6,"arc_heir_2"]],log:"この件には介入しないことにした。集落の自治に任せる。"}},
   ]};
}
function buildHeirArc2(){
  const branch=S.flags.arc_heir;
  if(branch==="moderate")return{tag:"隣村・中編",title:"隣村の跡継ぎ争い(二)",
   body:"長女が跡目を継ぎ、集落は落ち着きを取り戻しつつある。だが、退けられた副長格の周辺がきな臭い動きを見せているという報せも届いている。",
   choices:[
    {label:"祝いの使者を送り、関係を固める",hint:"6日後に完結",fx:{flag:{arc_heir:"moderate_good"},schedule:[[6,"arc_heir_3"]],gold:-30,log:"祝いの使者を送った。集落との結び付きが強まった。"}},
    {label:"念のため、周辺の警戒を強める",hint:"6日後に完結",fx:{flag:{arc_heir:"moderate_wary"},schedule:[[6,"arc_heir_3"]],st:{order:1},log:"表立った動きは見せず、静かに警戒を強めた。"}},
   ]};
  if(branch==="strong")return{tag:"隣村・中編",title:"隣村の跡継ぎ争い(二)",
   body:"副長格が実権を握り、集落は活気づいている。交易の申し出も増えたが、その強引なやり方に周辺の集落から苦情も届き始めた。",
   choices:[
    {label:"交易を積極的に受け入れる",hint:"6日後に完結",fx:{flag:{arc_heir:"strong_trade"},schedule:[[6,"arc_heir_3"]],st:{economy:2},log:"交易の話を積極的に受け入れた。実入りが増えている。"}},
    {label:"やり方に苦言を呈し、穏健さを求める",hint:"6日後に完結",fx:{flag:{arc_heir:"strong_warn"},schedule:[[6,"arc_heir_3"]],st:{diplomacy:1},log:"長として、やんわりと苦言を呈した。"}},
   ]};
  return{tag:"隣村・中編",title:"隣村の跡継ぎ争い(二)",
   body:"アルヴェインの介入なしに、集落は独自に長女を跡目として選んだ。特に混乱もなかったが、あの集落からの使者の足取りは、心なしか以前より遠い。",
   choices:[
    {label:"今からでも関係修復に動く",hint:"6日後に完結",fx:{flag:{arc_heir:"neutral_fix"},schedule:[[6,"arc_heir_3"]],gold:-20,log:"今からでもと、関係修復のための使者を送った。"}},
    {label:"このままの距離感でいい",hint:"6日後に完結",fx:{flag:{arc_heir:"neutral_stay"},schedule:[[6,"arc_heir_3"]],log:"特に何もせず、今の距離感を保つことにした。"}},
   ]};
}
function buildHeirArc3(){
  const branch=S.flags.arc_heir;
  const endings={
   moderate_good:{title:"隣村の跡継ぎ争い(完)結ばれた縁",body:"祝いの使者がきっかけとなり、隣村とアルヴェインは正式な友好関係を結んだ。以来、あの集落との交易は途切れることがない。",fx:{st:{diplomacy:3,economy:1},mood:2}},
   moderate_wary:{title:"隣村の跡継ぎ争い(完)静かな安定",body:"警戒が功を奏し、副長格による小さな騒動は未然に防がれた。集落は落ち着きを取り戻し、穏やかな関係が続いている。",fx:{st:{order:2,diplomacy:1}}},
   strong_trade:{title:"隣村の跡継ぎ争い(完)活況の代償",body:"交易は大いに栄えたが、副長格のやり方に耐えかねた一部の民が集落を離れ、アルヴェインに流れてきた。",fx:{st:{economy:3},pop:8,mood:-1}},
   strong_warn:{title:"隣村の跡継ぎ争い(完)引かれた一線",body:"長としての苦言は、意外にも副長格に響いたようだ。強引さは鳴りを潜め、集落は落ち着いた発展を続けている。",fx:{st:{diplomacy:2,economy:1}}},
   neutral_fix:{title:"隣村の跡継ぎ争い(完)取り戻した距離",body:"遅ればせながらの歩み寄りは、時間をかけて実を結んだ。かつてほどではないが、隣村との関係は少しずつ温かさを取り戻している。",fx:{st:{diplomacy:1},mood:1}},
   neutral_stay:{title:"隣村の跡継ぎ争い(完)遠い隣人",body:"隣村とは、良くも悪くも一定の距離を保ったままだ。困った時に頼り合う仲ではなくなったが、それもまた一つの在り方だろう。",fx:{}},
  };
  const e=endings[branch]||endings.neutral_stay;
  return{tag:"隣村・完結",title:e.title,body:e.body,
   choices:[{label:"承知した",fx:Object.assign({},e.fx,{flag:{arc_heir:"done"},log:"隣村を巡る一件は、こうして一つの結末を迎えた。",logCls:"big"})}]};
}
const MISSIONS=[
 {key:"scout",tag:"偵察",title:"物見に人をやる",
  body:"北の峠に不審な影が見えるとの報せがあった。誰かに様子を見てきてもらいたい。",
  statFn:u=>u.agi*0.55+u.wis*0.45,
  great:{fx:(u)=>({st:{diplomacy:2,order:2},mood:2,log:`${u.nm}が見事な物見働きを見せ、事なきを得た上に周辺の情勢まで掴んできた。`,logCls:"big"}),exp:15},
  success:{fx:(u)=>({st:{order:1},log:`${u.nm}が無事に物見を終え、特に異常なしと報告した。`}),exp:8},
  fail:{fx:(u)=>({mood:-1,log:`${u.nm}は物見の最中に足を滑らせ、怪我をして帰ってきた。`}),exp:2,injure:true}},
 {key:"envoy",tag:"使節",title:"折衝に人をやる",
  body:"近隣との折衝ごとに、誰かを代表として送り出したい。",
  statFn:u=>u.lead*0.6+u.wis*0.4,
  great:{fx:(u)=>({st:{diplomacy:4},gold:40,log:`${u.nm}の巧みな弁舌で、望外の好条件を引き出してきた。`,logCls:"big"}),exp:15},
  success:{fx:(u)=>({st:{diplomacy:2},log:`${u.nm}が折衝をまとめてきた。`}),exp:8},
  fail:{fx:(u)=>({st:{diplomacy:-2},mood:-1,log:`${u.nm}の交渉は不調に終わった。気まずい沈黙が流れたという。`}),exp:2,loyaltyHit:3}},
 {key:"escort",tag:"護衛",title:"隊商の護衛を頼む",
  body:"商人が護衛を求めている。腕の立つ者を貸してほしいとのことだ。",
  statFn:u=>u.str*0.5+u.vit*0.5,
  great:{fx:(u)=>({gold:50,log:`${u.nm}が盗賊の襲撃を退け、謝礼を弾んでもらった。`,logCls:"big"}),exp:15},
  success:{fx:(u)=>({gold:25,log:`${u.nm}が無事に隊商を送り届けた。`}),exp:8},
  fail:{fx:(u)=>({gold:-10,log:`${u.nm}は道中で怪我を負い、隊商にも被害が出た。`}),exp:2,injure:true}},
 {key:"survey",tag:"測量",title:"土地の測量を任せる",
  body:"新たに開拓する土地の測量が必要になった。几帳面な者に任せたい。",
  statFn:u=>u.wis*0.5+u.int*0.5,
  great:{fx:(u)=>({st:{agriculture:3},log:`${u.nm}の精緻な測量図のおかげで、無駄のない開拓計画が立った。`,logCls:"big"}),exp:15},
  success:{fx:(u)=>({st:{agriculture:1},log:`${u.nm}が測量を終え、図面を提出した。`}),exp:8},
  fail:{fx:(u)=>({mood:-1,log:`${u.nm}の測量には誤りが多く、やり直しになった。`}),exp:2}},
 {key:"healer",tag:"施療",title:"病人の手当てを頼む",
  body:"隣村で流行り病が出ているという。手当てのできる者を送りたい。",
  statFn:u=>u.wis*0.5+u.vit*0.4+u.int*0.1,
  great:{fx:(u)=>({mood:5,st:{order:1},log:`${u.nm}の懸命な手当てで、隣村の病人たちはすっかり快復した。`,logCls:"big"}),exp:15},
  success:{fx:(u)=>({mood:2,log:`${u.nm}が手当てを終え、病状は落ち着いたという。`}),exp:8},
  fail:{fx:(u)=>({mood:-2,log:`${u.nm}の手当ても及ばず、病はなお広がっているという。`}),exp:2,injure:true}},
 {key:"patrol",tag:"巡回",title:"夜警の増員を頼む",
  body:"近頃、夜な夜な怪しい人影が見られるという。見回りを強化したい。",
  statFn:u=>u.agi*0.4+u.str*0.3+u.wis*0.3,
  great:{fx:(u)=>({st:{order:4},log:`${u.nm}が怪しい影の正体を突き止め、治安は大きく改善した。`,logCls:"big"}),exp:15},
  success:{fx:(u)=>({st:{order:2},log:`${u.nm}の見回りにより、夜の治安が保たれた。`}),exp:8},
  fail:{fx:(u)=>({st:{order:-1},mood:-1,log:`${u.nm}は見回り中に不審者を取り逃がしてしまった。`}),exp:2,injure:true}},
 {key:"appraiser",tag:"鑑定",title:"出土品の鑑定を頼む",
  body:"畑から古い品が掘り出されたという。詳しい者に見てもらいたい。",
  statFn:u=>u.int*0.55+u.wis*0.45,
  great:{fx:(u)=>({gold:60,st:{magic:2},log:`${u.nm}の鑑定により、思わぬ値打ち物であることが判明した。`,logCls:"big"}),exp:15},
  success:{fx:(u)=>({gold:15,log:`${u.nm}が鑑定を終え、多少の値がつくとのことだった。`}),exp:8},
  fail:{fx:(u)=>({log:`${u.nm}には判じかね、正体は分からずじまいだった。`}),exp:2}},
 {key:"messenger",tag:"急使",title:"急ぎの使いを頼む",
  body:"至急、遠方へ書状を届けねばならない。足の速い者を送りたい。",
  statFn:u=>u.agi*0.7+u.vit*0.3,
  great:{fx:(u)=>({st:{diplomacy:3},mood:1,log:`${u.nm}が驚くべき速さで書状を届け、先方を大いに感心させた。`,logCls:"big"}),exp:15},
  success:{fx:(u)=>({st:{diplomacy:1},log:`${u.nm}が無事、書状を届けてきた。`}),exp:8},
  fail:{fx:(u)=>({st:{diplomacy:-1},log:`${u.nm}は道中で足を痛め、到着が大幅に遅れてしまった。`}),exp:2,injure:true}},
 {key:"mediator",tag:"仲裁",title:"揉め事の仲裁を頼む",
  body:"村人同士の揉め事がこじれているという。誰かに仲裁を頼みたい。",
  statFn:u=>u.lead*0.5+u.wis*0.5,
  great:{fx:(u)=>({mood:4,log:`${u.nm}の見事な仲裁で、両者はすっかり和解したという。`,logCls:"big"}),exp:15},
  success:{fx:(u)=>({mood:1,log:`${u.nm}の仲裁で、揉め事は一応の収まりを見せた。`}),exp:8},
  fail:{fx:(u)=>({mood:-2,log:`${u.nm}の仲裁も虚しく、揉め事はさらにこじれてしまった。`}),exp:2,loyaltyHit:2}},
 {key:"prospector",tag:"探鉱",title:"鉱脈探しを頼む",
  body:"近くの山に鉱脈があるらしいという噂がある。腕に覚えのある者に探らせたい。",
  statFn:u=>u.vit*0.4+u.wis*0.3+u.str*0.3,
  great:{fx:(u)=>({gold:70,st:{economy:2},log:`${u.nm}が有望な鉱脈を発見した。商人たちが色めき立っている。`,logCls:"big"}),exp:15},
  success:{fx:(u)=>({gold:20,log:`${u.nm}がささやかながら鉱石を持ち帰った。`}),exp:8},
  fail:{fx:(u)=>({log:`${u.nm}は山中で道に迷い、手ぶらで戻ってきた。`}),exp:2,injure:true}},
 {key:"tutor",tag:"教導",title:"子らの手習いを頼む",
  body:"村の子供たちに読み書きを教えてくれる者を探しているという。",
  statFn:u=>u.wis*0.6+u.lead*0.4,
  great:{fx:(u)=>({mood:5,st:{diplomacy:1},log:`${u.nm}の教え方が評判を呼び、村の子供たちがすっかり懐いている。`,logCls:"big"}),exp:15},
  success:{fx:(u)=>({mood:2,log:`${u.nm}が手習いの相手を無事に務め上げた。`}),exp:8},
  fail:{fx:(u)=>({mood:-1,log:`${u.nm}の教え方はどうも子供たちに不評だったらしい。`}),exp:2}},
 {key:"escort",tag:"護衛",title:"商隊の護衛を頼む",
  body:"隣街へ向かう商隊が、山賊を警戒して護衛を求めている。",
  statFn:u=>u.str*0.5+u.agi*0.5,
  great:{fx:(u)=>({gold:25,st:{economy:1},log:`${u.nm}の護衛のおかげで、商隊は無事に、しかも予定より早く到着した。`,logCls:"big"}),exp:15},
  success:{fx:(u)=>({gold:12,log:`${u.nm}が商隊を無事に送り届けた。`}),exp:8},
  fail:{fx:(u)=>({mood:-1,log:`${u.nm}は道中で商隊とはぐれてしまった。`}),exp:2,injure:true}},
 {key:"herb",tag:"薬草",title:"薬草採りを頼む",
  body:"神殿の薬が底を尽きかけている。山で薬草を摘んできてほしいとのことだ。",
  statFn:u=>u.wis*0.5+u.vit*0.5,
  great:{fx:(u)=>({st:{order:1},mood:2,log:`${u.nm}が上質な薬草を大量に持ち帰った。神殿の蔵は当分安泰だ。`,logCls:"big"}),exp:15},
  success:{fx:(u)=>({log:`${u.nm}が必要な分の薬草を採ってきた。`}),exp:8},
  fail:{fx:(u)=>({log:`${u.nm}は毒草と見分けがつかず、手ぶらで戻ってきた。`}),exp:2}},
 {key:"census",tag:"戸籍",title:"戸籍調べを頼む",
  body:"新しく移り住んだ者たちの戸籍を整理する必要がある。几帳面な人材が求められている。",
  statFn:u=>u.wis*0.55+u.int*0.45,
  great:{fx:(u)=>({pop:2,st:{order:1},log:`${u.nm}の丁寧な調べにより、これまで漏れていた住民の存在も明らかになった。`,logCls:"big"}),exp:15},
  success:{fx:(u)=>({st:{order:1},log:`${u.nm}が戸籍の整理を無事に終えた。`}),exp:8},
  fail:{fx:(u)=>({log:`${u.nm}の調べには抜けが多く、やり直しが必要になった。`}),exp:2}},
 {key:"fireguard",tag:"火消",title:"火の見張りを頼む",
  body:"乾燥した日が続き、火事の危険が高まっている。夜通しの見張りを頼みたい。",
  statFn:u=>u.vit*0.5+u.agi*0.5,
  great:{fx:(u)=>({st:{order:2},mood:2,log:`${u.nm}の見張りにより、小火を大事に至る前に消し止めることができた。`,logCls:"big"}),exp:15},
  success:{fx:(u)=>({st:{order:1},log:`${u.nm}が一晩、変わりなく見張りを務めた。`}),exp:8},
  fail:{fx:(u)=>({mood:-2,log:`${u.nm}はうたた寝をしてしまい、見張りの役目を果たせなかった。`}),exp:2}},
 {key:"tradepost",tag:"交渉",title:"商会との価格交渉を頼む",
  body:"取引先の商会が、強気の値上げを持ちかけてきた。交渉できる者を送りたい。",
  statFn:u=>u.wis*0.5+u.lead*0.5,
  great:{fx:(u)=>({gold:30,st:{economy:2},log:`${u.nm}の巧みな交渉により、逆に有利な条件を引き出すことに成功した。`,logCls:"big"}),exp:15},
  success:{fx:(u)=>({gold:10,log:`${u.nm}が交渉をまとめ、値上げ幅を最小限に抑えた。`}),exp:8},
  fail:{fx:(u)=>({gold:-15,log:`${u.nm}の交渉は不調に終わり、商会の言い値をのむ羽目になった。`}),exp:2}},
 {key:"beastcull",tag:"獣害",title:"畑を荒らす獣の駆除を頼む",
  body:"畑を荒らす獣が出ているという。狩りの心得がある者に対処してほしい。",
  statFn:u=>u.str*0.45+u.agi*0.55,
  great:{fx:(u)=>({st:{agriculture:2},gold:15,log:`${u.nm}が獣を仕留め、毛皮まで持ち帰ってきた。`,logCls:"big"}),exp:15},
  success:{fx:(u)=>({st:{agriculture:1},log:`${u.nm}が獣を追い払い、畑の被害を止めた。`}),exp:8},
  fail:{fx:(u)=>({mood:-1,log:`${u.nm}は獣を取り逃がし、逆に手傷を負った。`}),exp:2,injure:true}},
 {key:"ritual",tag:"儀式",title:"季節の祭儀を任せる",
  body:"季節の変わり目の祭儀を執り行う者が必要だという。作法に明るい者が求められている。",
  statFn:u=>u.wis*0.5+u.int*0.5,
  great:{fx:(u)=>({mood:6,st:{order:1},log:`${u.nm}の執り行った祭儀は見事なもので、民の心を大いに和ませた。`,logCls:"big"}),exp:15},
  success:{fx:(u)=>({mood:2,log:`${u.nm}が祭儀を滞りなく執り行った。`}),exp:8},
  fail:{fx:(u)=>({mood:-2,log:`${u.nm}は祭儀の作法を間違え、少々気まずい空気が流れた。`}),exp:2}},
 {key:"mapmaking",tag:"測量",title:"未踏の地の測量を頼む",
  body:"国境近くの未踏の地を測量し、地図に記す必要がある。根気強い者が求められている。",
  statFn:u=>u.wis*0.5+u.vit*0.5,
  great:{fx:(u)=>({st:{diplomacy:1,order:1},log:`${u.nm}の測量により、これまで曖昧だった国境が正確に定められた。`,logCls:"big"}),exp:15},
  success:{fx:(u)=>({log:`${u.nm}が測量を無事にやり遂げた。`}),exp:8},
  fail:{fx:(u)=>({log:`${u.nm}は地形の険しさに阻まれ、測量を終えられなかった。`}),exp:2,injure:true}},
];
function missionRarity(){
  const kRank=STAGES[S.stage].rank;
  const r=Math.random();
  const epicCut=Math.max(0.01,0.02+(kRank-1)*0.035);
  const rareCut=epicCut+Math.max(0.08,0.18+(kRank-1)*0.07);
  if(r<epicCut)return{key:"epic",label:"エピック任務",mult:2.0,color:"#c98fe8"};
  if(r<rareCut)return{key:"rare",label:"レア任務",mult:1.4,color:"#8fd0e8"};
  return{key:"common",label:"",mult:1,color:null};
}
function missionLevel(){
  const cap=Math.min(100,8+(S.dungeonsCleared||0)*2+Math.floor((S.st.military+S.st.economy)/5));
  return ri(1,Math.max(3,cap));
}
function resolveMission(m,u,level,rarity){
  level=level||10;rarity=rarity||{key:"common",mult:1};
  const threshold=6+level*0.13;
  const score=m.statFn(u)+rnd(-6,6);
  const tier=score>=threshold*1.7?"great":score>=threshold?"success":"fail";
  const outcome=m[tier];
  const fx=outcome.fx(u);
  fx.call=()=>{
    u.exp+=Math.round(outcome.exp*rarity.mult*(1+level/50)*(1+Math.min(0.45,S.st.magic*0.0045)));processLevelUps(u);
    u.fatigue=Math.min(100,(u.fatigue||0)+ri(14,22));
    if(outcome.injure)inflictInjury(u,[0.65,0.3,0.05]);
    if(outcome.loyaltyHit)u.loyalty=Math.max(0,u.loyalty-outcome.loyaltyHit);
    unitHistory(u,`「${m.title}」に赴き、${tier==="great"?"大きな成果を上げた":tier==="success"?"任務を果たした":"苦い結果に終わった"}。`);
    if(tier==="great"){
      if(u.lv>=15)grantTitle(u,"t_soloace");
      checkDungeonDiscovery(0.7,u);
      if(rarity.key!=="common"&&Math.random()<0.3){
        const item=rollItemDrop(rarity.key);
        if(item){addItem(item.key);unitHistory(u,`「${m.title}」の褒賞として「${item.name}」を持ち帰った。`);chron(`${u.nm}が「${m.title}」の褒賞として「${item.name}」を持ち帰った。`,"big");}
      }
    }
  };
  apply(fx);
}
/* ---------- 兵士募集イベント:候補を提示して選抜する ---------- */
let recruitPool=[]; // 選抜待ちの候補(未加入ユニット。セーブ不要な一時状態)
function recruitAtmosphere(u){
  const top=Math.max(u.str,u.vit,u.int,u.agi,u.wis,u.lead);
  const strPhr=["屈強な体つきをしている","岩のように硬い拳をしている","並外れた膂力を感じさせる"];
  const vitPhr=["頑健そうな体格をしている","どんな悪路も苦にしなそうだ","打たれ強そうな面構えだ"];
  const intPhr=["どこか聡明な目をしている","独特な間合いの読み方をする","不思議な気配を纏っている"];
  const agiPhr=["身のこなしが軽やかだ","足取りに一切の無駄がない","猫のように静かに歩く"];
  const wisPhr=["物事をよく見ている","周りの様子に敏いようだ","落ち着いた思考の持ち主らしい"];
  const leadPhr=["自然と人が集まってくる雰囲気がある","声に不思議な説得力がある","放っておいても周りがついてくるらしい"];
  const neutralPhr=["特に目立った様子はない","どこにでもいそうな、ありふれた佇まいだ","これといった特徴は見当たらない"];
  const pick=arr=>arr[Math.floor(Math.random()*arr.length)];
  let phrase;
  if(top===u.str)phrase=pick(strPhr);
  else if(top===u.vit)phrase=pick(vitPhr);
  else if(top===u.int)phrase=pick(intPhr);
  else if(top===u.agi)phrase=pick(agiPhr);
  else if(top===u.wis)phrase=pick(wisPhr);
  else if(top===u.lead)phrase=pick(leadPhr);
  else phrase=pick(neutralPhr);
  const personalityHint={
   熱血:["、目に強い意志が宿っている","、話す端々に熱がこもる"],
   冷静:["、物腰は静かで落ち着いている","、多くを語らないが芯は強そうだ"],
   温厚:["、人当たりの良い笑顔が印象的だ","、誰に対しても丁寧に接する"],
   野心家:["、どこか野心を秘めた眼差しだ","、上を目指す気概が感じられる"],
   楽天家:["、気さくで屈託のない様子だ","、多少のことでは動じなそうだ"],
   慎重:["、言葉を選びながら丁寧に話す","、石橋を叩いて渡る性分らしい"],
  }[u.personality];
  if(personalityHint)phrase+=pick(personalityHint);
  if(u.traitTier==="epic"||u.traitTier==="legend")phrase+="。……只者ではない気配が色濃く漂う";
  else if(u.traitTier==="rare"&&Math.random()<0.4)phrase+="。多少、腕に覚えがあるようだ";
  return phrase+"。";
}
function recruitCost(u){return Math.round(18+unitPower(u)*1.4);}
/* 募集候補:国力(軍事・経済)に応じてレベルが伸び、稀に高ステータスの逸材が混じる */
function makeRecruitCandidate(){
  const u=makeUnit();
  const powerIdx=(S.st.military+S.st.economy)/2;
  const avgPartyLv=S.units.length?S.units.reduce((a,x)=>a+x.lv,0)/S.units.length:1;
  // 国力基準(序盤〜中盤の伸び)と、部隊平均Lvの55%(終盤の追いつき)のうち高い方を採用
  const maxBonusLv=Math.max(Math.floor(powerIdx/8),Math.round(avgPartyLv*0.55));
  const bonusLv=ri(0,Math.max(0,maxBonusLv));
  for(let i=0;i<bonusLv;i++){
    u.exp+=u.lv*10;
    processLevelUps(u,true);
  }
  // ごく稀に「逸材」:各ステータスに追加ボーナス
  if(Math.random()<0.06){
    const bonus=ri(6,14);
    u.str+=bonus;u.vit+=bonus;u.int+=bonus;u.agi+=bonus;u.wis+=bonus;u.lead+=bonus;
    u.talented=true;
  }
  return u;
}
/* ==================== 志願書システム(自分のタイミングで採用できるガチャ的募集) ==================== */
const VOL_RANKS=[
 {label:"F",color:"#5a5548",costMult:0.7},
 {label:"E",color:"#787e8c",costMult:0.9},
 {label:"D",color:"#9aa0ac",costMult:1.1},
 {label:"C",color:"#d9b56a",costMult:1.3},
 {label:"B",color:"#8fbf6f",costMult:1.9},
 {label:"A",color:"#8fd0e8",costMult:2.8},
 {label:"S",color:"#c98fe8",costMult:4.5},
 {label:"SS",color:"#e8c874",costMult:7.0},
 {label:"Z",color:"#fff3d0",costMult:13.0},
];
/* 国家ランクに応じたランク別出現確率(重み)。序盤はS以上がごく僅かしか出ない設計 */
function volunteerRankWeights(kRank){
  return{
    F:Math.max(0.3,9-kRank*1.4),
    E:Math.max(1.5,18-kRank*2.6),
    D:Math.max(6,27-kRank*2.5),
    C:26,
    B:5+kRank*3.2,
    A:0.3+(kRank-1)*3.5,
    S:0.1+(kRank-1)*1.8,
    SS:0.05+(kRank-1)*1.0,
    Z:0.02+(kRank-1)*0.5,
  };
}
function pickVolunteerRank(){
  const kRank=STAGES[S.stage].rank;
  const weights=volunteerRankWeights(kRank);
  const tot=Object.values(weights).reduce((a,b)=>a+b,0);
  let r=Math.random()*tot;
  for(const label of Object.keys(weights)){
    if(r<weights[label])return VOL_RANKS.find(x=>x.label===label);
    r-=weights[label];
  }
  return VOL_RANKS.find(x=>x.label==="C");
}
/* 抽選したランクに実際のステータスが見合うよう調整する目標比率(パーティ平均比) */
const RANK_TARGET_RATIO={F:0.35,E:0.6,D:0.85,C:1.05,B:1.4,A:1.9,S:2.6,SS:3.5,Z:5.0};
function fitUnitToRank(u,rankLabel){
  const avg=S.units.length?S.units.reduce((a,x)=>a+unitPower(x),0)/S.units.length:11;
  const targetPower=Math.max(4,avg)*(RANK_TARGET_RATIO[rankLabel]||1);
  const currentPower=unitPower(u);
  if(currentPower>0.5){
    const scale=Math.max(0.4,Math.min(3.5,targetPower/currentPower));
    for(const k of["str","vit","int","agi","wis","lead"])u[k]=Math.max(1,Math.round(u[k]*scale));
  }
  if(rankLabel==="SS")u.talented=true;
  if(rankLabel==="Z"&&u.traitTier!=="legend"){
    const t=TRAIT_LEGEND[Math.floor(Math.random()*TRAIT_LEGEND.length)];
    u.trait=t.key;u.traitTier="legend";u.pw=t.pw;u.gm=t.gm;
  }
}
function volunteerRankIndex(u){
  const p=unitPower(u);
  const avg=S.units.length?S.units.reduce((a,x)=>a+unitPower(x),0)/S.units.length:11;
  const sigma=Math.max(2,avg*0.37); // 戦力の変動係数(実測≒0.365)を基準にした標準偏差の目安
  const z=(p-avg)/sigma;
  if(u.traitTier==="legend")return 8;
  if(u.talented||u.traitTier==="epic")return 7;
  if(z>=2.0)return 6;
  if(z>=1.2)return 5;
  if(z>=0.5)return 4;
  if(z>=-0.3)return 3;
  if(z>=-1.0)return 2;
  if(z>=-1.8)return 1;
  return 0;
}
function volunteerRankLabel(u){
  return VOL_RANKS[volunteerRankIndex(u)];
}
function makeVolunteer(){
  const rank=pickVolunteerRank();
  const u=makeRecruitCandidate();
  fitUnitToRank(u,rank.label);
  const cost=Math.round(recruitCost(u)*rank.costMult);
  const hiddenPotential=Math.random()<0.03; // 3%でこの一言が付く
  const comment=recruitAtmosphere(u);
  return{id:u.id,unit:u,postedDay:S.day,cost,rank,hiddenPotential,comment};
}
function checkWeeklyVolunteers(){
  if(S.day-(S.lastVolunteerDay||-10)>=7){
    S.lastVolunteerDay=S.day;
    const kRank=STAGES[S.stage].rank;
    const twoChance=Math.min(0.7,0.2+kRank*0.07+S.st.diplomacy*0.002); // 国家ランク・外交が上がるほど2人出現しやすい
    const n=Math.random()<twoChance?2:1;
    const newNames=[];
    for(let i=0;i<n;i++){
      if((S.volunteers||[]).length>=8)break;
      S.volunteers=S.volunteers||[];
      const v=makeVolunteer();
      S.volunteers.push(v);
      newNames.push(v);
    }
    if(newNames.length===1)chron(`${newNames[0].unit.nm} ${newNames[0].unit.surname}が志願書を出してきた。`,"big");
    else if(newNames.length>1)chron(`${newNames.map(v=>fullName(v.unit)).join("・")}が志願書を出してきた。`,"big");
  }
  S.volunteers=(S.volunteers||[]).filter(v=>{
    if(S.day-v.postedDay>=90){
      chron(`志願していた${v.unit.nm} ${v.unit.surname}は、待ちきれず他所へ去っていった。`,"sys");
      return false;
    }
    return true;
  });
}
function rollHiddenPotential(u){
  const r=Math.random();
  let bonus;
  if(r<0.05)bonus=10;
  else if(r<0.25)bonus=5;
  else if(r<0.75)bonus=1;
  else bonus=0;
  if(bonus>0)for(const k of["str","vit","int","agi","wis","lead"])u[k]+=bonus;
  if(bonus>=10)grantTitle(u,"t_starchosen");
  return bonus;
}
function hireVolunteer(volId){
  const idx=(S.volunteers||[]).findIndex(v=>v.id===volId);
  if(idx<0)return;
  const v=S.volunteers[idx];
  if(S.units.length>=unitCap()){chron("兵舎が満員のため、採用できなかった。","sys");volunteerConfirmId=null;renderTroops();return;}
  if(S.gold<v.cost){
    chron(`${v.unit.nm}を採用したかったが、支度金(${v.cost})が足りなかった。`,"grave");
    volunteerConfirmId=null;
    volunteerInsufficientId=volId;
    renderTroops();
    return;
  }
  S.gold-=v.cost;
  v.unit.joinDay=S.day;
  let potentialBonus=null;
  if(v.hiddenPotential)potentialBonus=rollHiddenPotential(v.unit);
  S.units.push(v.unit);
  S.volunteers.splice(idx,1);
  unitHistory(v.unit,"志願書を通じて、アルヴェインの一員となった。");
  chron(`${v.unit.nm} ${v.unit.surname}が志願書を経て正式に入団した。「よろしくお願いします」`,"big");
  if(potentialBonus>0){
    unitHistory(v.unit,`入団早々、噂通りの並外れた素質を見せた(全ステータス+${potentialBonus})。`);
    chron(`――${v.unit.nm}は、噂通りの逸材だった。全ステータスが+${potentialBonus}された。`,"big");
  }else if(potentialBonus===0){
    unitHistory(v.unit,"期待されていたようだが、今のところ目立った成果はない。");
  }
  showVolunteerHireResult(v.unit,potentialBonus);
  clamp();render();renderTroops();refreshOpenPanels();save();
}
function declineVolunteer(volId){
  const idx=(S.volunteers||[]).findIndex(v=>v.id===volId);
  if(idx<0)return;
  const v=S.volunteers[idx];
  chron(`${v.unit.nm} ${v.unit.surname}の志願を見送った。`,"sys");
  S.volunteers.splice(idx,1);
  renderTroops();save();
}
function showVolunteerHireResult(u,potentialBonus){
  const acc=cardAccent(u);
  const race=RACES.find(r=>r.key===u.race);
  const origin=ORIGINS.find(o=>o.key===u.origin);
  let h=`<div class="resultplate"><div class="rplabel">採用完了</div><div class="rpsummary">${u.nm} ${u.surname}が仲間になった</div></div>`;
  if(potentialBonus!==null&&potentialBonus!==undefined){
    const good=potentialBonus>0;
    h+=`<div class="pcard" style="border-color:${good?"var(--gold)":"rgba(154,122,47,.3)"};${potentialBonus>=10?"box-shadow:0 0 14px rgba(201,162,75,.5)":""}">
      <div class="nm" style="color:${good?"var(--gold)":"var(--dim)"}">${good?"◆期待株、開花":"期待株……だったが"}</div>
      <div class="ds">${potentialBonus>0?`全ステータス+${potentialBonus}`:"目立った上乗せはなかった"}</div>
    </div>`;
  }
  h+=`<div class="pcard" style="border-color:${acc.tone}">
    <div class="nm" style="color:${acc.tone}">${u.nm} ${u.surname}</div>
    <div class="ds">${race.name}・${origin?origin.name:""}・${u.personality} ／ ${JOB_TREES[u.cls].label}・${displayJobName(u)} Lv.${u.lv}</div>
    <div class="ds">戦力 ${Math.round(unitPower(u))} ／ ${u.backstory||""}</div>
  </div>`;
  $("#volunteerResultBody").innerHTML=h;
  $("#panelVolunteerResult").classList.add("show");
}

function buildRecruitEvent(){
  let cands,fromEcho=false;
  if(S.recruitEchoes.length&&Math.random()<0.35){
    cands=[S.recruitEchoes.shift()];
    while(cands.length<2)cands.push(makeRecruitCandidate());
    fromEcho=true;
  }else{
    cands=[makeRecruitCandidate()];
    if(Math.random()<0.5)cands.push(makeRecruitCandidate());
  }
  recruitPool=cands;
  const choices=cands.map((u,i)=>{
    const race=RACES.find(r=>r.key===u.race);
    const origin=ORIGINS.find(o=>o.key===u.origin);
    const cost=recruitCost(u);
    return{
      label:`${u.nm} ${u.surname}(${race.name}・${origin?origin.name:""}/${u.personality})Lv.${u.lv}${u.talented?"・逸材":""}を迎える`,
      hint:`${recruitAtmosphere(u)} 支度金:${cost}`,
      fx:{call:()=>recruitPick(i)}
    };
  });
  choices.push({label:"今回は全員見送る",hint:"様子を見る",fx:{call:()=>{stashEchoes(recruitPool);recruitPool=[];}}});
  const freshVariants=[
   {title:"新兵の応募",body:"村の噂を聞きつけたという者たちが、入団を志願してきた。誰を迎えるか、長の裁量にかかっている。"},
   {title:"市場での出会い",body:"市場で腕っぷしを見込まれたという者たちが、長への目通りを願い出た。品定めをする良い機会かもしれない。"},
   {title:"街道からの一団",body:"街道を渡り歩いてきたという一団が、この地に腰を据えたいと申し出てきた。人となりはガレオンが軽く調べている。"},
   {title:"酒場での噂話",body:"酒場で腕自慢をしていた者たちが、酔った勢いか正気か、入団を願い出てきた。話半分に聞いておくのがよさそうだ。"},
   {title:"隣村からの紹介",body:"隣村の顔役から、腕に覚えのある者を紹介したいという文が届いた。わざわざの紹介とあれば、無下にもしがたい。"},
  ];
  const variant=fromEcho?null:freshVariants[Math.floor(Math.random()*freshVariants.length)];
  return{tag:"募 集",title:fromEcho?"見覚えのある顔":variant.title,
   body:fromEcho?"以前、支度金が足りず見送った顔ぶれの中に見覚えのある者がいる。あの時の若者が、また村を訪れたようだ。":variant.body,
   choices};
}
function stashEchoes(list){
  for(const u of list){
    if(S.recruitEchoes.length<3&&Math.random()<0.2)S.recruitEchoes.push(u);
  }
}
function recruitPick(idx){
  const u=recruitPool[idx];
  if(!u)return;
  if(S.units.length>=unitCap()){
    chron(`兵舎が満員のため、${u.nm} ${u.surname}を迎えられなかった(定員${unitCap()}名)。`,"grave");
    recruitPool=[];
    return;
  }
  const cost=recruitCost(u);
  if(S.gold<cost){
    chron(`${u.nm} ${u.surname}を迎えたかったが、支度金(${cost})が足りなかった。`,"grave");
    stashEchoes([u,...recruitPool.filter((x,i)=>i!==idx)]);
    recruitPool=[];
    return;
  }
  S.gold-=cost;
  S.units.push(u);
  chron(`${u.nm} ${u.surname}が新たに入団した。「よろしくお願いします」`,"big");
  unitHistory(u,"募集に応じ、アルヴェインの一員となった。");
  const remaining=recruitPool.filter((x,i)=>i!==idx);
  recruitPool=[];
  if(S.st.economy>=60&&remaining.length&&Math.random()<0.7){
    recruitPool=remaining;
    pushEventPriority("__recruit2__");
  }else{
    stashEchoes(remaining);
  }
}
function buildRecruit2Event(){
  const cands=recruitPool;
  if(!cands.length)return null;
  const choices=cands.map((u,i)=>{
    const race=RACES.find(r=>r.key===u.race);
    const cost=recruitCost(u);
    return{
      label:`${u.nm} ${u.surname}(${race.name}/${u.personality})も迎える`,
      hint:`${recruitAtmosphere(u)} 支度金:${cost}`,
      fx:{call:()=>{
        if(S.units.length>=unitCap()){chron(`兵舎が満員のため、${u.nm} ${u.surname}を迎えられなかった。`,"grave");recruitPool=[];return;}
        if(S.gold<cost){chron(`${u.nm} ${u.surname}も迎えたかったが、蓄えが足りなかった。`,"grave");stashEchoes([u]);recruitPool=[];return;}
        S.gold-=cost;S.units.push(u);
        chron(`${u.nm} ${u.surname}も続けて入団した。今回は懐に余裕があったようだ。`,"big");
        unitHistory(u,"募集に応じ、アルヴェインの一員となった。");
        recruitPool=[];
      }}
    };
  });
  choices.push({label:"今回はここまでにする",hint:"見送る",fx:{call:()=>{stashEchoes(recruitPool);recruitPool=[];}}});
  return{tag:"募 集",title:"もう一人、迎えるか",
   body:"懐に余裕があるうちにと、もう一人だけ迎える余地が残っている。",
   choices};
}
function buildOldEquipmentEvent(){
  const eligible=S.units.filter(u=>u.injured<=0);
  if(!eligible.length)return null;
  const cands=[...eligible].sort(()=>Math.random()-.5).slice(0,4);
  const choices=cands.map(u=>({
    label:`${u.nm} ${u.surname||""}に授ける`,
    hint:`${JOB_TREES[u.cls].label}・Lv.${u.lv}・戦力${Math.round(unitPower(u))}`,
    fx:{gold:-30,call:()=>{
      u.str+=4;u.vit+=2;
      unitHistory(u,"畑から掘り出された古い武具を託された。");
      chron(`${u.nm}が、畑から出た古い武具を託された。手入れをすれば、まだまだ使えそうだ。`,"big");
    }}
  }));
  choices.push({label:"由来を調べさせてから判断する",hint:"魔導+1 / 時間がかかる",fx:{st:{magic:1},log:"武具は魔導塔に運ばれ、由来の調査が始まった。結論が出るまでには、しばらくかかりそうだ。"}});
  return{tag:"レ ア",title:"埋もれた武具の発見",
   body:"畑を耕していた者が、土の中から古い武具一式を掘り当てた。錆びてはいるが、明らかに只者の持ち物ではない造りをしている。誰に授けるか。",
   choices};
}
function buildMissionEvent(){
  const eligible=S.units.filter(u=>u.injured<=0&&(u.fatigue||0)<70&&!u.dungeonBusy&&!u.campUntil);
  if(eligible.length<1)return null;
  const m=MISSIONS[Math.floor(Math.random()*MISSIONS.length)];
  const rarity=missionRarity();
  const level=missionLevel();
  const cands=[...eligible].sort(()=>Math.random()-.5).slice(0,4);
  const choices=cands.map(u=>({
    label:`${u.nm}(${JOB_TREES[u.cls].label}・${jobFor(u.cls,u.lv,u.route).name} Lv.${u.lv})を送る`,
    hint:`適性目安:${Math.round(m.statFn(u))} ／ 難度目安Lv.${level} ／ 腕${u.str}・体${u.vit}・魔${u.int}・敏${u.agi}・知${u.wis}・統${u.lead}${(u.fatigue||0)>=40?" / やや疲労気味":""}`,
    fx:{call:()=>resolveMission(m,u,level,rarity)}
  }));
  choices.push({label:"今回は辞退する",hint:"民心がわずかに下がる",fx:{mood:-1,log:"今回の依頼は辞退した。村の評判にわずかに影を落とした。"}});
  return{tag:rarity.label?`${rarity.label}・${m.tag}`:m.tag,title:m.title,body:m.body,choices};
}
