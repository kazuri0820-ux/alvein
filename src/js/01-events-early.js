/* ---------- 殿堂 ---------- */
function isHallWorthy(u){
  const j=jobFor(u.cls,u.lv,u.route);
  if(u.captain)return true;
  if(j.key==="hero"||j.key==="captain")return true;
  if(u.traitTier==="epic"||u.traitTier==="legend")return true;
  if(u.skills.some(k=>{const s=SKILL_DB.find(x=>x.key===k);return s&&(s.tier==="gold"||s.tier==="unique");}))return true;
  if(u.bondWith)return true;
  return false;
}
function addToHallOfFame(u,reason){
  if(!isHallWorthy(u))return;
  const j=jobFor(u.cls,u.lv,u.route);
  const partner=u.bondWith?(S.units.find(x=>x.id===u.bondWith)||S.instructors.find(x=>x.id===u.bondWith)):null;
  const rec={
    nm:u.nm, surname:u.surname||"", cls:u.cls, race:u.race, lv:u.lv, jobName:displayJobName(u),
    traitName:traitInfo(u.trait).name, traitTier:u.traitTier,
    skills:u.skills.map(k=>SKILL_DB.find(s=>s.key===k)).filter(Boolean).map(s=>({name:s.name,tier:s.tier})),
    wasCaptain:u.captain, bondPartner:partner?partner.nm:null,
    reason, day:S.day, age:Math.floor(u.age),
    epitaph: reason==="death"
      ? `天寿を全うし、${Math.floor(u.age)}歳でこの世を去った。`
      : reason==="loss"
      ? `${Math.floor(u.age)}歳、戦いの中でその生涯を終えた。`
      : `${Math.floor(u.age)}歳で静かに現役を退いた。`,
  };
  S.hallOfFame.unshift(rec);
  if(S.hallOfFame.length>80)S.hallOfFame.pop();
}
function handleCaptainLoss(u){
  if(!u.captain)return;
  S.flags.knightOrder=false;S.captainId=null;
  if(STAGES[S.stage].rank>=4){
    (S.scheduled[S.day+10]=S.scheduled[S.day+10]||[]).push("formKnightOrder");
    chron("団長を失った騎士団は、新たな団長が立つまでの間、指揮系統の立て直しを迫られている。","grave");
  }
}
function removeUnitById(id,reason){
  const u=S.units.find(x=>x.id===id);
  if(!u)return;
  handleCaptainLoss(u);
  releaseUniqueIfHolder(u);
  addToHallOfFame(u,reason);
  if(!S.records)S.records={strongestUnit:null,longestLived:null,fastestHero:null,mostTitles:null,richestDay:null};
  if(!S.records.longestLived||u.age>S.records.longestLived.age){
    S.records.longestLived={name:`${u.nm} ${u.surname||""}`.trim(),age:Math.round(u.age),day:S.day};
  }
  if(u.bondWith){
    const partner=S.units.find(x=>x.id===u.bondWith);
    if(partner){partner.bondWith=null;partner.moral=Math.max(0,partner.moral-12);unitHistory(partner,`戦友${u.nm}を失い、しばらく塞ぎ込んでいた。`);chron(`${partner.nm}は戦友${u.nm}のことを、長く忘れられなかったという。`,"grave");}
  }
  S.units=S.units.filter(x=>x.id!==id);
}
function removeUnits(n){
  n=Math.min(n,S.units.length);
  // 頑丈な兵・団長は除外されにくいよう並び替え
  const order=[...S.units].sort((a,b)=>((a.trait==="tough"?1:0)+(a.captain?2:0))-((b.trait==="tough"?1:0)+(b.captain?2:0))||a.lv-b.lv);
  const targets=order.slice(0,n).map(u=>u.id);
  for(const id of targets)removeUnitById(id,"loss");
}
/* ---------- 加齢・引退・自然死・絆 ---------- */
/* 怪我の重症度:軽傷(短期・軽ペナルティ)〜重体(長期・重ペナルティ) */
const INJURY_TIERS={
 light:{label:"軽傷",days:[1,2],pwMult:0.82},
 moderate:{label:"重傷",days:[2,4],pwMult:0.55},
 severe:{label:"重体",days:[4,7],pwMult:0.25},
};
function inflictInjury(u,weights){
  let w=weights||[0.6,0.3,0.1]; // 軽傷/重傷/重体
  const teff=titleEffectsFor(u);
  if(teff.injuryMult<1){
    // 称号の怪我率軽減効果:重傷・重体の比率を減らし、軽傷側に寄せる
    const shift=Math.min(0.5,(1-teff.injuryMult))*(w[1]+w[2]);
    w=[w[0]+shift,Math.max(0,w[1]-shift*0.6),Math.max(0,w[2]-shift*0.4)];
  }
  const r=Math.random();
  const tier=r<w[0]?"light":r<w[0]+w[1]?"moderate":"severe";
  const range=INJURY_TIERS[tier].days;
  u.injured=ri(range[0],range[1]);
  u.injurySeverity=tier;
  u.injuryCount=(u.injuryCount||0)+1;
  if(tier==="severe")u.severeInjuryCount=(u.severeInjuryCount||0)+1;
}
function priestBlessing(){
  const n=Math.min(3,S.units.filter(u=>u.cls==="priest"&&u.injured<=0).length);
  return{moral:n*0.05,loyalty:n*0.03};
}
function checkRecords(){
  if(!S.records)S.records={strongestUnit:null,longestLived:null,fastestHero:null,mostTitles:null,richestDay:null};
  for(const u of S.units){
    const p=unitPower(u);
    if(!S.records.strongestUnit||p>S.records.strongestUnit.power){
      S.records.strongestUnit={name:`${u.nm} ${u.surname||""}`.trim(),power:Math.round(p),day:S.day};
    }
    const titleCount=(u.titles||[]).length;
    if(titleCount>0&&(!S.records.mostTitles||titleCount>S.records.mostTitles.count)){
      S.records.mostTitles={name:`${u.nm} ${u.surname||""}`.trim(),count:titleCount,day:S.day};
    }
  }
  if(!S.records.richestDay||S.gold>S.records.richestDay.gold){
    S.records.richestDay={gold:Math.round(S.gold),day:S.day};
  }
}
function checkDailyTitles(u){
  const stage=ageStageOf(u);
  const race=RACES.find(r=>r.key===u.race);
  if(u.loyalty>=90)grantTitle(u,"t_loyal90");
  if(u.moral>=90)grantTitle(u,"t_morale90");
  if(u.favorite)grantTitle(u,"t_favorite");
  if(u.bondWith){grantTitle(u,"t_bonded");if((u.criticalSurvivalCount||0)>=1)grantTitle(u,"t_guardian");}
  const effLifespan=race?race.lifespan*((traitInfo(u.trait).lifespanMult)||1)*(u.lifespanVariance||1):999;
  if(race&&u.age>=effLifespan)grantTitle(u,"t_longlife");
  if((stage.key==="old"||stage.key==="venerable")&&!u.retired)grantTitle(u,"t_evergreen");
  if((u.injuryCount||0)>=5)grantTitle(u,"t_scarred5");
  if((u.severeInjuryCount||0)>=3)grantTitle(u,"t_scarred3");
  if(S.day-(u.joinDay||1)>=365)grantTitle(u,"t_1year");
  if(u.traitTier==="rare")grantTitle(u,"t_rareborn");
  if(u.traitTier==="epic")grantTitle(u,"t_epicborn");
  if(u.traitTier==="legend")grantTitle(u,"t_legendborn");
}
function checkAging(){
  const bless=priestBlessing();
  for(const u of [...S.units]){
    u.age+=1/AGE_YEAR_DAYS;
    u.fatigue=Math.max(0,(u.fatigue||0)-8);
    if(u.injured>0){
      u.injured--;
      if(u.injured<=0){u.injured=0;u.injurySeverity=null;chron(`${u.nm}の傷が癒え、療養が明けた。`,"");}
    }
    if(S.day%AGE_YEAR_DAYS===(u.birthDay||1)){
      chron(`${u.nm}が${Math.floor(u.age)}歳の誕生日を迎えた。`,"");
    }
    const stage=ageStageOf(u);
    const eff=skillEffects(u);
    const teff=titleEffectsFor(u);
    u.loyalty=Math.max(0,Math.min(100,u.loyalty+eff.loyaltyGrow*0.3+teff.loyaltyGrow*0.3+bless.loyalty));
    u.moral=Math.max(0,Math.min(100,u.moral+eff.moralGrow*0.3+teff.moralGrow*0.3+bless.moral));
    checkDailyTitles(u);
    if((stage.key==="old"||stage.key==="venerable")&&u.retiredAskedStage!==stage.key){
      u.retiredAskedStage=stage.key;
      pushEvent("retire_"+u.id);
    }
    if(stage.key==="venerable"&&Math.random()<0.004*(u.age-stage.cap+15>0?2:1)*eff.deathMult){
      chron(`――${u.nm}が、天寿を全うして静かに息を引き取った。長きにわたる働きに、村中が頭を垂れた。`,"grave");
      removeUnitById(u.id,"death");
    }
  }
  // 絆の形成(ごく低確率、同クラスや同時期加入で親近感)
  if(S.units.length>=2&&Math.random()<0.02){
    const cands=S.units.filter(u=>!u.bondWith&&u.role==="active");
    if(cands.length>=2){
      const a=cands[Math.floor(Math.random()*cands.length)];
      const rest=cands.filter(u=>u.id!==a.id);
      const b=rest[Math.floor(Math.random()*rest.length)];
      a.bondWith=b.id;b.bondWith=a.id;
      a.moral=Math.min(100,a.moral+6);b.moral=Math.min(100,b.moral+6);
      unitHistory(a,`${b.nm}と戦友の契りを交わした。`);unitHistory(b,`${a.nm}と戦友の契りを交わした。`);
      chron(`${a.nm}と${b.nm}が、いつしか戦友と呼び合うようになっていた。`,"sys");
    }
  }
}
function retireUnit(u,asInstructor){
  S.units=S.units.filter(x=>x.id!==u.id);
  handleCaptainLoss(u);
  releaseUniqueIfHolder(u);
  if(!asInstructor)addToHallOfFame(u,"retire"); // 完全に現役を退く場合のみ殿堂対象(教官は名簿に残るため対象外)
  if(u.bondWith){
    const partner=S.units.find(x=>x.id===u.bondWith);
    if(partner){partner.bondWith=null;unitHistory(partner,`戦友${u.nm}の引退を見送った。`);}
    u.bondWith=null;
  }
  if(asInstructor){
    u.role="instructor";
    S.instructors.push(u);
    chron(`${u.nm}が現役を退き、若手の指南役となった。その豊富な経験は、これからも村の力になる。`,"big");
  }else{
    chron(`${u.nm}が静かに現役を退いた。「あとは若い者に任せる」と、穏やかな顔をしていた。`,"big");
  }
}

function newState(){
  const founders=[makeUnit(),makeUnit(),makeUnit(),makeUnit()];
  for(const u of founders)u.founder=true;
  return{
  day:1, turn:0, speed:1, era:1,
  gold:130, food:180, pop:46, mood:64,
  st:{military:15, economy:18, agriculture:26, magic:6, order:36, diplomacy:11},
  prev:{}, stage:0, troops:0, captainId:null, uniqueHolderId:null, hallOfFame:[], recruitEchoes:[], recentEventTitles:[], lastTrainDay:-10,
  records:{strongestUnit:null,longestLived:null,fastestHero:null,mostTitles:null,richestDay:null},
  lastWeeklyExpDay:-10, lastWeeklyEvtDay:-10, lastCouncilDay:-30, policyFocus:null, weekSnapshot:{gold:130,food:180,pop:46,mood:64,units:4},
  availableDungeons:[], activeDungeons:[], dungeonsCleared:0, demonArmyLevel:0, items:[],
  volunteers:[], lastVolunteerDay:-10,
  facilities:[],
  longExpeditions:[],
  squads:[],
  equipmentInventory:[],
  units:founders,
  instructors:[],
  flags:{}, pendingEvents:[], eventOpen:false,
  scheduled:{}, // day -> [eventId]
  people:[
    {nm:"セラ",rl:"村の書記(後の内務卿)",ds:"冷静沈着。数少ない読み書きできる者として、村の記録を一手に引き受けている。"},
    {nm:"ガレオン・ハルト",rl:"猟師頭(後の軍務卿)",ds:"狼や盗賊から村を守ってきた男。忠誠は厚いが、慎重すぎるきらいがある。"},
    {nm:"ネロ",rl:"元行商人",ds:"隊商から流れ着いた元行商人。金勘定の鬼。「無駄な出費は村を殺す」が口癖。"},
    {nm:"マーサ",rl:"畑番",ds:"村一番の農婦。畑を見る目は誰よりも確か。"},
  ],
  projects:[
    {id:"fence",nm:"村の柵づくり",desc:"完成すると治安が上がる。",p:20,rate:2.4,done:false,fx:()=>{S.st.order+=5*statDiminish(S.st.order);chron("村の周りに柵が完成した。獣除けにも夜警にも役立つ。","big");}},
    {id:"well",nm:"共同井戸の整備",desc:"完成すると食糧が増え、民心も上がる。",p:10,rate:2.0,done:false,fx:()=>{S.food+=40;S.mood+=3;chron("共同井戸が整備された。水汲みの行列が短くなり、村の空気が少し明るくなった。","big");}},
  ],
  log:[]
};}
/* 村→町→自治領→公国→王国 の成長段階(=国家ランク) */
const STAGES=[
 {min:0,   rank:1,name:"アルヴェイン開拓村", era:"開拓期",note:"数十人が身を寄せ合う開拓地。"},
 {min:80,  rank:2,name:"アルヴェイン村",     era:"定住期",note:"柵と井戸を備えた、れっきとした村になった。"},
 {min:200, rank:3,name:"アルヴェインの町",   era:"発展期",note:"市場が立ち、旅人が行き交う町へと育った。"},
 {min:420, rank:4,name:"アルヴェイン自治領", era:"自治期",note:"周辺の集落を束ね、自治領としての体裁を整えた。正式な騎士団を編成できる規模になった。"},
 {min:750, rank:5,name:"アルヴェイン公国",   era:"公国期",note:"公国を名乗るに足る人口と統治機構を持つに至った。"},
 {min:1200,rank:6,name:"アルヴェイン王国",   era:"建国",  note:"ついに王国を名乗る時が来た。"},
];
function stageOf(pop){let i=0;for(let k=0;k<STAGES.length;k++)if(pop>=STAGES[k].min)i=k;return i;}

/* ---------- 表示 ---------- */
const STATDEF=[["military","軍事"],["economy","経済"],["agriculture","農業"],["magic","魔導"],["order","治安"],["diplomacy","外交"]];
const STAT_COLOR={military:"#b5646a",economy:"#c9a24b",agriculture:"#74a563",magic:"#8f74c9",order:"#5f8fc4",diplomacy:"#5fb3ac"};
const STAT_ICON={
 military:`<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><path d="M5 19 L11 13 M13 11 L19 5"/><path d="M3 7 L7 3 L9 5 L5 9 Z"/><path d="M15 15 L19 19 L21 17 L17 13 Z"/></svg>`,
 economy:`<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="12" cy="12" r="8"/><path d="M12 7.5 v9 M9.5 9.5 h4.2 a1.8 1.8 0 0 1 0 3.6 h-3.4 a1.8 1.8 0 0 0 0 3.6 h4.2" stroke-linecap="round"/></svg>`,
 agriculture:`<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"><path d="M12 21 V9"/><path d="M12 9 C8 9 6 6 6 3 C10 3 12 6 12 9"/><path d="M12 12 C16 12 18 9 18 6 C14 6 12 9 12 12"/></svg>`,
 magic:`<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linejoin="round"><path d="M12 3 L13.3 9.6 L20 11 L13.3 12.4 L12 19 L10.7 12.4 L4 11 L10.7 9.6 Z"/></svg>`,
 order:`<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round"><path d="M12 3 L19 6 V11 C19 16 16 19.5 12 21 C8 19.5 5 16 5 11 V6 Z"/></svg>`,
 diplomacy:`<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M3 12 L8 12 L10 9 L13 15 L15 12 L21 12"/></svg>`,
};
function grade(v){return v>=90?"S":v>=75?"A":v>=60?"B":v>=45?"C":v>=30?"D":"E";}
function clamp(){for(const k in S.st)S.st[k]=Math.max(0,Math.min(100,S.st[k]));S.mood=Math.max(0,Math.min(100,S.mood));S.pop=Math.max(0,Math.round(S.pop));S.troops=S.units.length;}
const _lastFlashVal={};
function flashIfChanged(sel,val){
  const prev=_lastFlashVal[sel];
  if(prev!==undefined&&prev!==val){
    const el=$(sel);
    if(el){
      const cls=val>prev?"flash-up":"flash-down";
      el.classList.remove("flash-up","flash-down");
      void el.offsetWidth; // リフロー強制で再アニメーションを許可
      el.classList.add(cls);
    }
  }
  _lastFlashVal[sel]=val;
}
function render(){
 try{
  $("#dayNum").textContent=S.day;
  $("#turnIcon").innerHTML=TURN_ICON[S.turn];
  $("#turnLabel").textContent=TURN_NAMES[S.turn];
  for(let i=0;i<3;i++)$("#td"+i).classList.toggle("on",i===S.turn);
  document.body.classList.remove("turn-0","turn-1","turn-2");
  document.body.classList.add("turn-"+S.turn);
  const si=stageOf(S.pop);
  if(si!==S.stage)S.stage=si;
  const stg=STAGES[S.stage];
  $("#eraLabel").textContent="Rank "+stg.rank+"・"+stg.era;
  const knameEl=document.querySelector(".kname");
  if(knameEl)knameEl.textContent=stg.name;
  const heroBannerEl=$("#heroBanner");
  if(heroBannerEl){
    heroBannerEl.className="stage-"+S.stage;
  }
  $("#rGold").textContent=Math.round(S.gold)+"G";
  flashIfChanged("#rGold",Math.round(S.gold));
  $("#rFood").textContent=Math.round(S.food);
  flashIfChanged("#rFood",Math.round(S.food));
  $("#rPop").textContent=S.pop;
  flashIfChanged("#rPop",S.pop);
  $("#rMood").textContent=Math.round(S.mood);
  flashIfChanged("#rMood",Math.round(S.mood));
  $("#rTroop").textContent=S.troops;
  flashIfChanged("#rTroop",S.troops);
  let h="";
  for(const[k,label]of STATDEF){
    const v=Math.round(S.st[k]),pv=Math.round(S.prev[k]??v),d=v-pv;
    const dh=d?`<span class="delta ${d>0?'up':'down'}">${d>0?'▲':'▼'}${Math.abs(d)}</span>`:"";
    h+=`<div class="stat" style="--tone:${STAT_COLOR[k]}"><div class="sthead"><span class="sealwrap"><span class="sticon">${STAT_ICON[k]}</span></span>${label}</div><b>${v}<span style="font-size:10px;color:var(--gold2);margin-left:2px">${grade(v)}</span>${dh}</b><div class="bar"><i style="width:${v}%"></i></div></div>`;
  }
  $("#stats").innerHTML=h;
  const n=S.pendingEvents.length;
  const itemCount=(S.items||[]).reduce((a,i)=>a+i.count,0);
  $("#itemBadge").style.display=itemCount?"inline-block":"none";$("#itemBadge").textContent=itemCount;
  const ap=S.projects.filter(p=>!p.done).length;
  $("#prjBadge").style.display=ap?"inline-block":"none";$("#prjBadge").textContent=ap;
  const dgn=(S.availableDungeons||[]).length;
  $("#dgBadge").style.display=dgn?"inline-block":"none";$("#dgBadge").textContent=dgn;
  const voln=(S.volunteers||[]).length;
  $("#volBadge").style.display=voln?"inline-block":"none";$("#volBadge").textContent=voln;$("#volBadge").classList.toggle("pulse",voln>0);
 }catch(e){console.error("render() failed:",e);}
}
/* 年代記ログの区分アイコン。STAT_ICON/USTAT_DEFと同じ線画SVG様式(stroke=currentColor)で統一 */
const LOG_ICONS={
  big:`<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.3" stroke-linejoin="round"><path d="M8 1.5 L9.8 6 L14.5 6.4 L10.9 9.4 L12 14 L8 11.3 L4 14 L5.1 9.4 L1.5 6.4 L6.2 6 Z"/></svg>`,
  grave:`<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"><path d="M8 2 L14.5 13.5 L1.5 13.5 Z"/><line x1="8" y1="6.5" x2="8" y2="10"/><circle cx="8" cy="11.8" r="0.5" fill="currentColor" stroke="none"/></svg>`,
  sys:`<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.3"><circle cx="8" cy="8" r="2.6"/><path d="M8 2v1.6M8 12.4V14M2 8h1.6M12.4 8H14M4 4l1.1 1.1M10.9 10.9L12 12M12 4l-1.1 1.1M5.1 10.9L4 12"/></svg>`,
  dungeon:`<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"><path d="M3 3 C6 2 10 2 13 5 C10 8 6 8 3 3Z"/><line x1="9" y1="6" x2="14" y2="14"/></svg>`,
  mission:`<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"><line x1="2" y1="2" x2="14" y2="14"/><line x1="14" y1="2" x2="2" y2="14"/><path d="M2 2 L4 2 M2 2 L2 4"/><path d="M14 2 L12 2 M14 2 L14 4"/></svg>`,
  people:`<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.4"><circle cx="8" cy="5" r="2.4"/><path d="M3 14c0-3 2.2-5 5-5s5 2 5 5"/></svg>`,
};
const LOG_ICON_FALLBACK=`<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linejoin="round"><path d="M8 1.5 L14.5 8 L8 14.5 L1.5 8 Z"/></svg>`;
const LOG_CAP=400;
function chron(text,cls){
  S.log.push({d:S.day,t:text,c:cls||""});
  if(S.log.length>LOG_CAP)S.log.shift();
  const el=document.createElement("div");
  el.className="entry "+(cls||"");
  const icon=LOG_ICONS[cls]||LOG_ICON_FALLBACK;
  el.innerHTML=`<span class="eicon">${icon}</span><span class="ed">DAY ${S.day}</span>${text}`;
  $("#chronicle").appendChild(el);
  $("#chronicle").scrollTop=$("#chronicle").scrollHeight;
}

/* ---------- 効果適用 ---------- */
function statDiminish(cur){
  if(cur>=85)return 0.18;
  if(cur>=70)return 0.4;
  if(cur>=50)return 0.65;
  if(cur>=30)return 0.85;
  return 1.0;
}
function apply(fx){
 try{
  if(!fx)return;
  const noise=rnd(0.85,1.2); // 同じ選択でも結果が毎回少し揺れる
  if(fx.gold)S.gold+=fx.gold*(fx.gold>0?noise:1);
  if(fx.food)S.food+=fx.food*(fx.food>0?noise:1);
  if(fx.pop)S.pop+=Math.round(fx.pop*(fx.pop>0?noise:1));
  if(fx.troops)fx.troops>0?addUnits(Math.round(fx.troops)):removeUnits(-fx.troops);
  if(fx.mood)S.mood+=fx.mood*noise;
  if(fx.st)for(const k in fx.st)S.st[k]+=fx.st[k]*(fx.st[k]>0?noise*statDiminish(S.st[k]):1);
  if(fx.flag)Object.assign(S.flags,fx.flag);
  if(fx.log)chron(fx.log,fx.logCls||"");
  if(fx.person)S.people.push(fx.person);
  if(fx.project)S.projects.push(fx.project);
  if(fx.schedule)for(const[off,id]of fx.schedule){const d=S.day+off;(S.scheduled[d]=S.scheduled[d]||[]).push(id);}
  if(fx.call)fx.call();
  clamp();render();
  refreshOpenPanels();
 }catch(e){console.error("apply() failed:",e);}
}
/* イベント選択・ミッション等で状態が変わった時、開いたままのパネルが古い表示に固まらないようにする */
function refreshOpenPanels(){
  try{
    if($("#panelTroops").classList.contains("show"))renderTroops();
    if($("#panelUnitDetail").classList.contains("show")&&openUnitDetailId)renderUnitDetail(openUnitDetailId);
    if($("#panelHall").classList.contains("show"))renderHall();
    if($("#panelStats").classList.contains("show"))renderStatsDetail();
    if($("#panelProjects").classList.contains("show"))renderProjects();
    if($("#panelPeople").classList.contains("show"))renderPeople();
    if($("#panelDungeon").classList.contains("show"))renderDungeonPanel();
    if($("#panelItems").classList.contains("show"))renderItemsPanel();
  }catch(e){/* パネル未生成時などは無視 */}
}

/* ---------- 勅令書(イベントUI) ---------- */
const SEAL=`<svg class="sealmark" viewBox="0 0 46 46"><circle cx="23" cy="23" r="21" fill="#8e2f2f" opacity=".92"/><circle cx="23" cy="23" r="16.5" fill="none" stroke="#e8c9c9" stroke-width="1.2" opacity=".7"/><path d="M14 29 L17 17 L21 24 L23 14 L25 24 L29 17 L32 29 Z" fill="none" stroke="#e8c9c9" stroke-width="1.6" stroke-linejoin="round" opacity=".85"/></svg>`;
function pushEvent(id){S.pendingEvents.push(id);render();if(!S.eventOpen)openNext();}
/* 選択の直接的な続き(2段階イベント)は、他の待機中イベントより先に処理させる */
function pushEventPriority(id){S.pendingEvents.unshift(id);render();if(!S.eventOpen)openNext();}
/* openNextの実体は後方定義(開いた書物型UI) */

/* ---------- イベント定義 ---------- */
const EVENTS={
/* ===== メインアーク ===== */
day2:{tag:"急 報",title:"境界の森に銀狼の群れ",
 body:"開拓中の段々畑近くの森に、銀狼の群れが現れた。既に家畜が二頭やられている。放置すれば開拓民が森に近づけなくなる。",
 speaker:"ガレオン「第一騎士団を出せば三日で片が付きます。ただし、その間の王都の守りは薄くなりますが」",
 choices:[
  {label:"騎士団を派遣し、群れを討伐せよ",hint:"軍事↑ 民心↑ / 費用がかかる",
   fx:{gold:-120,st:{military:3},mood:5,log:"騎士団が銀狼の群れを討伐。開拓民は歓声で騎士たちを迎えた。",flag:{wolf:"hunt"}}},
  {label:"罠と柵で畑を守り、森には手を出すな",hint:"費用小 / 農業に影",
   fx:{gold:-40,st:{agriculture:-2},mood:-2,log:"柵と罠を設置した。被害は減ったが、開拓民の間に不満がくすぶる。",flag:{wolf:"fence"}}},
  {label:"狼を追うのではなく、餌場を森の奥に作れ",hint:"奇策 / 魔導卿の協力が必要",
   fx:{gold:-80,st:{magic:2},mood:3,log:"老師ユグの誘引結界により、狼たちは森の奥へ去った。「殺さぬ王か」と民が囁く。",flag:{wolf:"mercy"}}},
 ]},
day4:{tag:"謁 見",title:"行商ギルド『白帆商会』の申し出",
 body:"大陸を巡る行商ギルドが、アルヴェインを定期交易路に加えたいと申し出てきた。ただし条件は「関税の五年間免除」。",
 speaker:"ネロ「悪くない話です。が、五年は長い。奴ら、こちらが小国と見て吹っかけてますな」",
 choices:[
  {label:"条件を呑む。まずは人と物の流れが要る",hint:"経済↑↑ / 税収は先送り",
   fx:{st:{economy:6,diplomacy:2},mood:2,log:"白帆商会との交易が始まった。谷に見慣れぬ品々が並ぶ。",flag:{guild:"accept"}}},
  {label:"免除は二年まで。それ以上は譲らん",hint:"交渉 / 財務卿の腕次第",
   fx:{gold:150,st:{economy:3},log:"ネロの粘り腰が実り、免除二年で妥結。商会側は「食えない国だ」と苦笑したという。",flag:{guild:"deal"}}},
  {label:"断る。国内の商人を育てるのが先だ",hint:"経済↓ / 独立路線",
   fx:{st:{economy:-2,order:2},log:"申し出を断った。地元の商人たちは胸を撫で下ろしたが、外の風は遠のいた。",flag:{guild:"reject"}}},
 ]},
day6:{tag:"報 告",title:"竜の刻印を持つ少女",
 body:"守備兵が谷の入り口で行き倒れの少女を保護した。歳は十ほど。名は「リコ」。記憶が曖昧だが――左肩に、古文書でしか見たことのない〈竜の刻印〉が浮かんでいる。",
 speaker:"老師ユグ「……間違いありませぬ。これは竜盟紋。千年前、竜と人が盟約を結んでいた時代の印。なぜ今、この子に」",
 choices:[
  {label:"王城で保護し、丁重に扱え",hint:"竜の因縁が動き出す",
   fx:{mood:2,st:{magic:2},flag:{rico:"protect"},person:{nm:"リコ",rl:"王城保護中の少女",ds:"左肩に竜盟紋を持つ。記憶が曖昧。よく食べる。"},log:"少女リコを王城で保護した。刻印の調査を老師ユグに命じる。",logCls:"big"}},
  {label:"保護はするが、監視を付けろ",hint:"慎重策",
   fx:{st:{order:2},flag:{rico:"watch"},person:{nm:"リコ",rl:"監視付き保護",ds:"左肩に竜盟紋を持つ少女。監視されていることに気付いている節がある。"},log:"リコを保護しつつ、フィオナの部下に監視させた。",}},
  {label:"神殿に預けよ。王城に置くには不気味だ",hint:"距離を置く",
   fx:{flag:{rico:"temple"},log:"リコは神殿に預けられた。ドミニクは快く引き受けたが、ユグは何か言いたげだった。"}},
 ]},
day9:{tag:"外 交",title:"ルシエラ皇国の使節",
 body:"東の湖畔国家ルシエラ皇国から正式な使節が到着した。若き女皇の親書には「対等な国交」を望むとある。だが同時に、北の大国グラナート帝国を強く警戒する文言も。",
 speaker:"フィオナ「ルシエラは水運の要衝。組めば富みます。ただし、帝国から見れば『反帝国側についた』と映るでしょうね」",
 choices:[
  {label:"国交を結ぶ。孤立こそ最大の敵だ",hint:"外交↑ 経済↑ / 帝国の目",
   fx:{st:{diplomacy:7,economy:3},flag:{luciela:"friend",elfOpen:true},schedule:[[16,"lucielaEnvoy"]],log:"ルシエラ皇国と国交を樹立。湖の水路がアルヴェインに開かれる。皇国の使節にはエルフの姿もあった。",logCls:"big"}},
  {label:"民間交易のみ認め、政治的には中立を保つ",hint:"バランス外交",
   fx:{st:{diplomacy:3,economy:2},flag:{luciela:"neutral"},log:"政治色を排し、交易のみの協定を結んだ。使節はやや落胆した様子だった。"}},
  {label:"時期尚早と丁重に断る",hint:"帝国を刺激しない",
   fx:{st:{diplomacy:-2},flag:{luciela:"reject"},log:"申し出を保留した。フィオナは「敵を作らず、友も作らず、ですか」と呟いた。"}},
 ]},
day12:{tag:"発 見",title:"地下水路の古代文字",
 body:"ブロムの工兵隊が城の地下水路を拡張中、石壁の奥に人工の空洞を発見した。壁一面に古代文字。ユグの解読によれば――「湖底に眠る祭壇、鍵は竜の血」。",
 speaker:"ブロム「掘り進めるなら本格的な調査隊が要る。だが正直、嫌な予感がするぜ。石が『開けるな』と言ってる」",
 choices:[
  {label:"調査隊を編成し、祭壇を探せ",hint:"新事業:沈んだ祭壇の調査",
   fx:{gold:-200,flag:{altar:"seek"},project:{id:"altar",nm:"沈んだ祭壇の調査",desc:"完了すると特別な出来事が起きる。",p:0,rate:2.2,done:false,fx:()=>{pushEvent("altarFound");}},log:"祭壇調査隊が編成された。ユグとブロムが指揮を執る。",logCls:"big"}},
  {label:"空洞を封鎖せよ。触れてはならんものもある",hint:"安全策",
   fx:{st:{order:2},flag:{altar:"seal"},log:"空洞は石積みで封鎖された。文字の写しだけが魔導塔に残された。"}},
 ]},
day16:{tag:"上 奏",title:"闘技会に現れた無名の剣士",
 body:"建国祭の闘技会で、無名の剣士が騎士団の精鋭三名を立て続けに下した。名は「カイ」。流派不明、出身不明。ガレオンが登用を進言している。",
 speaker:"ガレオン「あの太刀筋、只者ではありません。敵に回すより、懐に入れるべきかと。……ただし、素性の調査は続けます」",
 choices:[
  {label:"登用せよ。能力に身分は問わん",hint:"軍事↑ / 素性は不明のまま",
   fx:{st:{military:5},flag:{kai:"hired"},person:{nm:"カイ",rl:"第一騎士団・特務",ds:"素性不明の剣士。実力は騎士団随一。ガレオン直属で監視も兼ねる。"},log:"剣士カイを第一騎士団特務として登用した。",logCls:"big"}},
  {label:"賞金だけ渡し、登用は見送れ",hint:"リスク回避",
   fx:{gold:-60,flag:{kai:"pass"},log:"カイには賞金のみ授与した。彼は一礼し、谷の宿に留まっている。"}},
 ]},
day20:()=>({tag:"異 変",title:"空を裂く影――竜の使者",
 body:"正午、王都の空に巨大な影が走った。翼長二十間はあろうかという蒼竜が城の上空を三度旋回し、中庭に舞い降りた。竜は人語を話す。「刻印の子を、確かめに来た」"+(S.flags.rico==="temple"?"\n\n(リコは神殿にいる。竜は苛立っているように見える)":""),
 speaker:"蒼竜ヴェズル「千年ぶりに竜盟紋が灯った。その子をどう扱うかで、貴様の国の値打ちを測らせてもらう」",
 choices:[
  {label:"リコ本人に会わせ、堂々と対話する",hint:"誠実 / 竜との関係が動く",
   fx:{st:{diplomacy:4,magic:4},mood:4,flag:{dragon:"talk"},schedule:[[10,"dragonPact"]],log:"王は竜と対話した。リコの刻印を見た竜は長く沈黙し、「十日後、また来る」と言い残して飛び去った。",logCls:"big"}},
  {label:"会わせるが、騎士団を完全武装で並べる",hint:"警戒 / 竜の心証は不明",
   fx:{st:{military:2,diplomacy:-2},flag:{dragon:"guard"},schedule:[[10,"dragonPact"]],log:"武装した騎士団の前で会見が行われた。竜は鼻を鳴らした。「怯える王か」――十日後の再訪を告げ、飛び去った。"}},
  {label:"要求を拒否する。国の子は国が守る",hint:"強硬 / 危険",
   fx:{st:{military:3},mood:-3,flag:{dragon:"refuse"},schedule:[[10,"dragonWrath"]],log:"王は竜の要求を拒んだ。竜の瞳が細まる。「……面白い。ならば力ずくで確かめよう」",logCls:"grave"}},
 ]}),
dragonPact:()=>({tag:"盟 約",title:"竜の答え",
 body:"約束の日、蒼竜ヴェズルが再び舞い降りた。竜は告げる。「刻印の子は、竜と人の盟約の継ぎ手。あの子が育つ場所として、この国は――悪くない」\n\n竜は片翼を広げた。盟約の再締結を持ちかけている。",
 speaker:"老師ユグ「竜の後ろ盾……! 千年前、竜盟国は大陸最強と謳われました。ですが盟約には対価が。年に一度、国庫の一割を竜の山に納めることになります」",
 choices:[
  {label:"盟約を結ぶ。竜と共に歩む道を選ぶ",hint:"魔導↑↑ 軍事↑ / 毎年の納貢",
   fx:{st:{magic:10,military:6,diplomacy:4},mood:6,flag:{dragonPact:true},log:"アルヴェイン王国は蒼竜ヴェズルと竜盟を締結した。空に竜の咆哮が轟き、民は跪いた。歴史が動いた日である。",logCls:"big"}},
  {label:"盟約は結ばず、友誼のみを約す",hint:"自由を保つ",
   fx:{st:{diplomacy:3,magic:3},flag:{dragonPact:false},log:"王は盟約を丁重に辞し、友誼のみを結んだ。竜は「欲のない王だ」と笑い、リコの成長を見守ると約して去った。"}},
 ]}),
dragonWrath:()=>({tag:"急 報",title:"竜の試し",
 body:"蒼竜が王都上空に現れ、城壁の一角に向けて咆哮を放った。石壁が震え、崩れる。だが竜は人を狙ってはいない――これは威嚇であり、「試し」だ。",
 speaker:"ガレオン「城壁南面が損壊! 負傷者は軽傷のみ! 陛下、ご指示を!」",
 choices:[
  {label:"全軍で応戦する",hint:"無謀 / 大損害の危険",
   fx:{st:{military:-8},gold:-300,mood:-8,flag:{dragon:"enemy"},log:"応戦は惨憺たる結果に終わった。竜は「その程度か」と言い残し去った。城壁と軍の再建には時間がかかる。",logCls:"grave"}},
  {label:"王自ら城壁に立ち、竜と対話する",hint:"胆力を示す",
   fx:{mood:8,st:{diplomacy:5},flag:{dragon:"talk"},schedule:[[8,"dragonPact"]],log:"王は単身、崩れた城壁の上に立った。竜は動きを止め――やがて笑った。「よい眼だ」。八日後の再訪を告げ、去った。",logCls:"big"}},
  {label:"リコを竜のもとへ送り出す",hint:"要求に屈する",
   fx:{mood:-6,st:{diplomacy:-3},flag:{rico:"gone",dragon:"took"},log:"リコは竜の背に乗せられ、山へと去った。少女は最後に振り返り、小さく手を振った。城内に重い沈黙が残る。",logCls:"grave"}},
 ]}),
lucielaEnvoy:{tag:"親 書",title:"女皇からの密書",
 body:"ルシエラ女皇より密書が届いた。「グラナート帝国が国境に兵站を集積している。狙いは我が国か、貴国か、あるいは両方か。――備えられよ」",
 speaker:"フィオナ「裏を取りました。事実です。帝国は春までに南進の構えかと」",
 choices:[
  {label:"軍備を増強する",hint:"軍事↑ / 国庫負担",
   fx:{gold:-250,st:{military:6},log:"軍備増強が始まった。鍛冶場の火は夜も消えない。",flag:{prep:"army"}}},
  {label:"ルシエラと共同防衛の密約を結ぶ",hint:"外交↑ / 帝国に知れれば危険",
   fx:{st:{diplomacy:6,military:2},flag:{prep:"pact"},log:"ルシエラと共同防衛の密約を交わした。湖を挟んだ二国は、静かに背中を預け合う。"}},
  {label:"あえて帝国に使者を送り、真意を探る",hint:"虎穴に入る",
   fx:{st:{diplomacy:3},flag:{prep:"probe"},log:"帝国へ使者を送った。返答は儀礼的だが、使者は「帝都の空気は火薬の匂いがした」と報告した。"}},
 ]},
altarFound:{tag:"発 見",title:"沈んだ祭壇",
 body:"調査隊が湖底洞窟の最深部で祭壇を発見した。中央には水晶の封印。ユグの見立てでは、中に封じられているのは「古代の魔導核」――国一つ分の魔力を貯めた心臓部だという。",
 speaker:"老師ユグ「開ければ魔導の力は飛躍します。じゃが、千年物の封印。何が漏れ出すか、わしにも読み切れませぬ」",
 choices:[
  {label:"封印を開く。力なくして未来なし",hint:"魔導↑↑ / 賭け",
   fx:{call:()=>{ if(Math.random()<0.65||S.flags.dragonPact){apply({st:{magic:14,economy:3},mood:4,log:"封印は静かに開いた。魔導核の淡い光が湖面を照らす。アルヴェインの魔導は新時代へ踏み出した。",logCls:"big"});}else{apply({st:{magic:6,order:-5},mood:-5,gold:-150,log:"封印から漏れた瘴気が湖畔に魔物を呼んだ。討伐に三日を要したが、魔導核自体は確保に成功した。",logCls:"grave"});}}}},
  {label:"封印はそのままに、祭壇を研究拠点とする",hint:"堅実 / 魔導↑",
   fx:{st:{magic:6},log:"祭壇は封印されたまま、湖底研究所として整備された。ユグは「賢明な判断ですじゃ」と頷いた。"}},
 ]},
day36:{tag:"閣 議",title:"帝国の影",
 body:"定例閣議。議題はただ一つ――グラナート帝国。国境の商人たちから「帝国が周辺小国に『保護協定』を強要している」との報が相次いでいる。保護協定とは、体のいい属国化だ。",
 speaker:"セラ「遠からず、我が国にも要求が来ます。その時どう答えるか、方針だけでも定めておくべきかと」",
 choices:[
  {label:"徹底抗戦の方針を固め、国防に全振りする",hint:"軍事↑↑ 経済↓",
   fx:{gold:-200,st:{military:8,economy:-3},flag:{stance:"fight"},log:"閣議は抗戦方針を決した。谷の民にも自警訓練が始まる。"}},
  {label:"外交で包囲網を作る。小国連合の盟主となれ",hint:"外交↑↑",
   fx:{st:{diplomacy:8},flag:{stance:"ally"},log:"フィオナが周辺小国を巡る旅に出た。「帝国に呑まれる前に、手を繋ぎましょう」"}},
  {label:"面従腹背。表向きは低姿勢で時間を稼ぐ",hint:"実利 / 民心にやや影",
   fx:{st:{economy:4},mood:-3,flag:{stance:"delay"},log:"閣議は隠忍自重の方針を採った。ネロは満足げだが、若い騎士たちは拳を握った。"}},
 ]},
day48:()=>({tag:"最後通牒",title:"グラナート帝国の使者",
 body:"帝国の使者が到着した。羊皮紙には帝国印。内容は予想通り――「保護協定の締結。返答期限は十日。拒否は敵対と見なす」\n\n閣議室は静まり返っている。全員が、王の言葉を待っている。",
 speaker:"セラ「……陛下。どの道を選ばれても、私たちは最後までお供します」",
 choices:[
  {label:"拒否する。この国は誰の物でもない",hint:"開戦へ / 国の総力が試される",
   fx:{flag:{war:true},schedule:[[8,"warStart"]],mood:5,log:"王は使者の眼前で羊皮紙を卓に置いた。「アルヴェインは、アルヴェインの民のものだ」。使者は無言で退出した。",logCls:"big"}},
  {label:"協定を受け入れ、民の血を流さない道を選ぶ",hint:"属国化 / 戦は避けられる",
   fx:{flag:{war:false,vassal:true},mood:-12,st:{diplomacy:-5,economy:3},log:"王国は保護協定に調印した。戦火は避けられたが、城の旗の隣に帝国旗が掲げられた日、谷は静かだった。",logCls:"grave"}},
  {label:"「条件次第だ」と返し、交渉の席を要求する",hint:"外交力が試される",
   fx:{call:()=>{const dip=S.st.diplomacy;if(dip>=70||S.flags.prep==="pact"){apply({st:{diplomacy:5},mood:4,flag:{war:false,vassal:false},log:"交渉は成立した。ルシエラとの連携と積み上げた外交網を前に、帝国は「相互不可侵」への格下げに応じた。血を流さぬ勝利である。",logCls:"big"});}else{apply({flag:{war:true},schedule:[[8,"warStart"]],log:"交渉は決裂した。帝国側は端から呑む気がなかったのだ。開戦は避けられない。",logCls:"grave"});}}}},
 ]}),
warStart:()=>({tag:"開 戦",title:"グラナート戦役",
 body:"帝国軍二千が国境の峠に現れた。対するアルヴェインは民兵込みで四百足らず。だが峠は狭く、地の利はこちらにある。"+(S.flags.dragonPact?"\n\nそして空には――盟約の蒼竜が、翼を広げている。":"")+(S.flags.kai==="hired"?"\n\nカイが前線指揮を志願した。「この日のために剣を磨いてきた気がする」":""),
 speaker:"ガレオン「布陣は完了。……陛下、開戦のご命令を」",
 choices:[
  {label:"峠で迎え撃つ(正攻法)",hint:"軍事力で決まる",
   fx:{call:()=>resolveWar(0)}},
  {label:"夜襲で敵の兵站を焼く(奇策)",hint:"リスクとリターン大",
   fx:{call:()=>resolveWar(10)}},
 ]}),
};

/* ---------- 戦役解決 ---------- */
function resolveWar(bonus){
  // 初陣の記録(戦う前の在籍者に印を付ける)
  const firstTimers=S.units.filter(u=>!u.history.some(h=>h.text.includes("初陣")));
  if(firstTimers.length){
    const picked=firstTimers[Math.floor(Math.random()*firstTimers.length)];
    unitHistory(picked,"グラナート戦役で初陣を飾った。");
  }
  for(const u of S.units)if(!u.history.some(h=>h.text.includes("戦役")))unitHistory(u,"グラナート戦役に参陣した。");
  // 戦力 = 個別兵士の合計戦力 + 国全体の軍事(質)補正 + 各種イベント補正
  let power=totalTroopPower()*1.1+S.st.military*0.5+bonus;
  if(S.flags.dragonPact)power+=25;
  if(S.flags.kai==="hired")power+=8;
  if(S.flags.prep==="pact")power+=10;
  if(S.flags.prep==="army")power+=6;
  power+=rnd(-10,18);
  if(power>=80){
    apply({mood:15,st:{military:8,diplomacy:8},troops:-Math.max(0,Math.round(S.units.length*0.04)),flag:{war:false,victory:true},
      log:"【グラナート戦役・大勝】峠は死守された。"+(S.flags.dragonPact?"蒼竜の咆哮が帝国軍の戦意を粉々に砕き、":"")+"帝国軍は算を乱して退却。小さきアルヴェインの名は、一夜にして大陸中に轟いた。",logCls:"big"});
  }else if(power>=55){
    apply({mood:6,gold:-150,pop:-ri(3,8),troops:-Math.max(1,Math.round(S.units.length*0.18)),st:{military:3},flag:{war:false,victory:true},
      log:"【グラナート戦役・辛勝】三日三晩の攻防の末、帝国軍は撤退した。犠牲は小さくない。だが村は守られた。長は戦没者の名を一人ずつ石碑に刻ませた。",logCls:"big"});
  }else{
    apply({mood:-10,gold:-250,pop:-ri(10,20),troops:-Math.max(1,Math.round(S.units.length*0.4)),st:{military:-10},flag:{war:false,victory:false},
      log:"【グラナート戦役・敗北】峠は破られ、降伏交渉となった。重い賠償と引き換えに命脈は保たれたが、再起には長い歳月が要る。それでも――民は生きている。",logCls:"grave"});
  }
}

/* ===== 成長段階の節目 ===== */
EVENTS.milestone1={tag:"節 目",title:"村になった日",
 body:"開拓地の人口が八十を超えた。柵と井戸がある、誰の目にも「村」と呼べる姿になった。セラが記録の書に、初めて名を書き記したいと申し出ている。",
 speaker:"セラ「長よ、そろそろこの場所に名を付けませんか。旗にも書ける、ちゃんとした名を」",
 choices:[
  {label:"『アルヴェイン』と名付ける",hint:"民心+4",fx:{mood:4,log:"開拓地は正式に『アルヴェイン』と名付けられた。旗に初めて文字が刺繍された日である。",logCls:"big"}},
  {label:"名付けは民に委ねる",hint:"民心+6 / 時間がかかる",fx:{mood:6,gold:-10,log:"名付けは村人たちの投票に委ねられた。三日三晩の議論の末、『アルヴェイン』に決した。存外、長の思っていた名と同じだった。",logCls:"big"}},
 ]};
EVENTS.milestone2={tag:"節 目",title:"町になった日",
 body:"人口二百を超え、広場には常設の市が立つようになった。旅人がアルヴェインを「町」と呼ぶようになって久しい。ネロが本格的な行政の仕組みを整えたいと言い出した。",
 speaker:"ネロ「そろそろ帳面だけでは回りません。役割を分けた『役場』のようなものが要ります」",
 choices:[
  {label:"役場を作り、役割を分担させる",hint:"経済+4 治安+2",fx:{gold:-60,st:{economy:4,order:2},log:"簡素な役場が置かれ、税・治安・普請の係が分けられた。町としての体裁が整い始めた。",logCls:"big"}},
  {label:"まだ長一人で目が届くと様子を見る",hint:"見送り",fx:{mood:1,log:"役場の話は先送りにされた。ネロはため息をつきつつ、また帳面に向かった。"}},
 ]};
EVENTS.milestone3={tag:"節 目",title:"自治領になった日",
 body:"人口四百二十を超え、周辺のいくつかの集落がアルヴェインを頼るようになった。もはや一つの村の範疇を超えている。「自治領」を名乗るべき時が来た、と大臣格の面々が口を揃える。",
 speaker:"ガレオン「周りの集落を守るなら、それなりの陣容が要ります。第一の隊を編成すべきかと」",
 choices:[
  {label:"自治領を宣言し、常備の守備隊を組織する",hint:"軍事+5 兵+6",fx:{gold:-100,st:{military:5},troops:6,schedule:[[4,"formKnightOrder"]],log:"アルヴェインは自治領を宣言した。常備の守備隊が組織され、周辺集落にも安堵が広がった。",logCls:"big"}},
  {label:"宣言は控え、緩やかな連合にとどめる",hint:"外交+4",fx:{st:{diplomacy:4},schedule:[[8,"formKnightOrder"]],log:"正式な宣言はせず、緩やかな互助の連合として周辺集落と結んだ。"}},
 ]};
EVENTS.milestone4={tag:"節 目",title:"公国になった日",
 body:"人口七百五十を超えた。統治機構も整い、もはや小さな国と呼んで差し支えない規模になった。「公国」を名乗るかどうか、閣議で議論が起きている。",
 speaker:"セラ「公国を名乗れば、他国からの扱いも変わります。良くも悪くも、目立つことになりますが」",
 choices:[
  {label:"公国を宣言する",hint:"外交+6 / 各国の目を引く",fx:{st:{diplomacy:6},mood:3,log:"アルヴェイン公国が正式に宣言された。近隣諸国からいくつもの使者が送られてきた。",logCls:"big"}},
  {label:"実質は変えず、名乗りだけ控える",hint:"穏健策",fx:{st:{order:3},log:"名乗りは控えめにしたまま、実務だけを公国並みに整えた。"}},
 ]};
EVENTS.formKnightOrder=()=>{
  const cands=[...S.units].filter(u=>u.lv>=4&&!u.captain).sort((a,b)=>unitPower(b)-unitPower(a)).slice(0,4);
  if(S.flags.knightOrder){
    return{tag:"報 告",title:"騎士団、健在なり",body:"騎士団は既に編成され、日々の訓練を重ねている。",choices:[{label:"うむ、大儀である",fx:{log:"騎士団の様子を視察した。誰もが引き締まった顔をしている。"}}]};
  }
  if(cands.length<2){
    return{tag:"編成準備",title:"騎士団編成、時期尚早",
     body:"自治領を名乗ったものの、団長を任せられるほど育った兵はまだ少ない。今しばらく訓練を重ねる必要がありそうだ。",
     speaker:"ガレオン「今しばらくのご猶予を。私が鍛えておきます」",
     choices:[{label:"承知した(しばらくして再検討する)",fx:{call:()=>{(S.scheduled[S.day+14]=S.scheduled[S.day+14]||[]).push("formKnightOrder");},log:"団長の選定は先送りとなった。訓練場に活気が増す。"}}]};
  }
  const choices=cands.map(u=>({
    label:`${u.nm}(${JOB_TREES[u.cls].label}・${jobFor(u.cls,u.lv,u.route).name} Lv.${u.lv})を団長に任じる`,
    hint:"個人戦力 "+Math.round(unitPower(u)),
    fx:{call:()=>{
      u.captain=true;u.wasCaptain=true;grantTitle(u,"t_captainexp");S.flags.knightOrder=true;S.captainId=u.id;
      u.str+=3;u.vit+=3;
      chron(`${u.nm}が初代騎士団長に任じられた。「アルヴェイン騎士団、謹んで拝命いたします」`,"big");
    }}
  }));
  return{tag:"任 命",title:"騎士団、編成さる",
   body:"自治領としての体裁が整い、ついに正式な『騎士団』を編成する運びとなった。誰を団長に任じるか――長の裁量にかかっている。",
   speaker:"ガレオン「誰であれ、陛下がお選びになった者に従います」",
   choices};
};
EVENTS.milestone5={tag:"建 国",title:"王国になった日",
 body:"人口千二百を超えた。もはや誰の目にも疑いようがない――アルヴェインは王国である。長きにわたり長と呼ばれてきたあなたに、大臣たちが揃って戴冠を願い出た。",
 speaker:"大臣一同「陛下。……いえ、もうそうお呼びしても差し支えないでしょう。我らが王よ」",
 choices:[
  {label:"戴冠を受け、正式に王を名乗る",hint:"全ステータスにわずかな恩恵",fx:{mood:10,st:{military:2,economy:2,agriculture:2,magic:2,order:2,diplomacy:2},log:"戴冠式が執り行われた。四十六人の開拓地は、こうして一つの王国となった。旗の色は、あの日の布のままだった。",logCls:"big"}},
 ]};

/* ---------- ランダムイベント ---------- */
EVENTS.day24={tag:"来 訪",title:"旅の吟遊詩人",
 body:"竪琴を背負った吟遊詩人が村を訪れた。「良い話には、良い歌を。悪い話は……聞かなかったことにしましょう」と、意味深に笑う。",
 speaker:"ネロ「噂というのは馬鹿にできません。使いようで、金より効きます」",
 choices:[
  {label:"謝礼を弾み、良い歌を広めてもらう",hint:"外交+3 民心+2",fx:{gold:-ri(20,40),st:{diplomacy:3},mood:2,log:"詩人はアルヴェインを称える歌を作り、旅先で歌って回った。噂は思いのほか遠くまで届いたようだ。"}},
  {label:"謝礼はほどほどにする",hint:"倹約",fx:{gold:-ri(5,15),log:"詩人はそこそこの謝礼を受け取り、次の町へと旅立っていった。"}},
 ]};
EVENTS.day33={tag:"陳 情",title:"隣村との境界争い",
 body:"畑の境界を巡って、隣の小さな集落と揉め事が起きた。双方が「ここは元々自分たちの土地だ」と譲らない。",
 speaker:"セラ「昔からの言い伝えが食い違っているだけです。……とはいえ、放っておくと本当に諍いになりかねません」",
 choices:[
  {label:"長自ら現地に赴き、境界線を引き直す",hint:"治安+2 民心+2 / 時間を使う",fx:{st:{order:2},mood:2,log:"長自ら現地で裁定を下した。両者とも渋々ながら納得し、境界には新しい石が置かれた。"}},
  {label:"境界の集落ごと併合を持ちかける",hint:"人口+ / 反発の可能性",fx:{call:()=>{if(Math.random()<0.6){apply({pop:ri(15,30),st:{diplomacy:1},log:"併合の申し出は受け入れられた。小さな集落がアルヴェインの一部になった。"});}else{apply({mood:-3,log:"併合の申し出は反発を招いた。「乗っ取りか」という声が聞こえてきたという。"});}}}},
 ]};
EVENTS.day42={tag:"申 出",title:"老いた賢者の弟子入り志願",
 body:"各地を放浪してきたという老いた学者が、魔導塔での研究に加わりたいと申し出てきた。年齢を理由に断る者もいるが、知識は本物のようだ。",
 speaker:"老学者「若さでは敵わぬが、積んできた書物の数なら誰にも負けぬ」",
 choices:[
  {label:"迎え入れる",hint:"魔導+3",fx:{st:{magic:3},log:"老学者は魔導塔の片隅に居を構えた。夜な夜な灯りが消えない部屋がまた一つ増えた。"}},
  {label:"若い研究生を優先すると丁重に断る",hint:"見送り",fx:{log:"老学者は気を悪くした様子もなく、また旅に出た。"}},
 ]};
EVENTS.day54={tag:"密 告",title:"商人ギルドの内部対立",
 body:"市場を仕切る商人たちの間で、価格を巡る対立が起きている。放置すれば市場そのものが荒れかねない。",
 speaker:"ネロ「言い分はどちらにも一理あります。……が、長が一声かければ収まるものも収まりましょう」",
 choices:[
  {label:"公定の取引ルールを定める",hint:"経済+3 治安+1",fx:{gold:-ri(15,30),st:{economy:3,order:1},log:"簡素な取引ルールが定められた。しばらくは不満も出たが、市場は落ち着きを取り戻した。"}},
  {label:"商人たちの自治に任せる",hint:"経済↓ わずか / 自由放任",fx:{st:{economy:-1},log:"長は介入を避けた。対立はやがて自然に収まったが、しこりは少し残った。"}},
 ]};
EVENTS.day66={tag:"密 書",title:"不穏な噂――反乱の芽",
 body:"フィオナ役を兼ねるセラの耳に、「長の裁定に不満を持つ一派が集まっている」との噂が届いた。実態はまだ掴めていない。",
 speaker:"セラ「大事にする前に手を打つべきかと。ただし、やり方を誤れば火に油を注ぎます」",
 choices:[
  {label:"内々に話し合いの場を設ける",hint:"民心+4 / 手間がかかる",fx:{mood:4,gold:-ri(10,20),log:"長自ら不満を持つ者たちと膝を突き合わせた。ほとんどは些細な行き違いだったようだ。"}},
  {label:"厳格に取り締まる",hint:"治安+3 民心-3",fx:{st:{order:3},mood:-3,log:"見せしめ的に取り締まりが強化された。表向きの秩序は保たれたが、どこか空気が張り詰めている。"}},
  {label:"噂を静観する",hint:"賭け",fx:{call:()=>{if(Math.random()<0.5){apply({log:"噂はいつの間にか立ち消えになった。杞憂だったようだ。"});}else{apply({mood:-6,st:{order:-3},log:"不満はくすぶり続け、ついに小さな抗議騒ぎに発展した。長は対応に追われることになった。",logCls:"grave"});}}}},
 ]};

const RANDOM_AUTO=[
 ()=>({mood:2,food:40,log:"今日は谷全体が晴天。マーサが「畑が笑っとる」と上機嫌だった。"}),
 ()=>({gold:60,log:"白帆商会の隊商が到着し、市場が賑わった。"}),
 ()=>({st:{magic:1},log:"魔導塔の研究生が新しい灯火の術式を開発。夜道が明るくなった。"}),
 ()=>({mood:1,log:"吟遊詩人が谷を訪れ、王の歌を即興で歌った。歌詞はだいぶ盛られていた。"}),
 ()=>({st:{order:1},log:"守備隊の巡回が功を奏し、今月の窃盗件数はゼロ。ドミニクが感謝の祈りを捧げた。"}),
 ()=>({food:-30,log:"夜半の雹で作物の一部が傷んだ。マーサは「これしきで泣く畑じゃない」と補修に走った。"}),
 ()=>({pop:2,mood:1,log:"谷で二組の結婚式が行われた。国王名義で祝いの樽酒が贈られた。"}),
 ()=>({gold:-40,log:"水車小屋の修理費が発生した。ブロムいわく「壊れる前に呼べ」とのこと。"}),
 ()=>(S.flags.rico==="protect"?{st:{magic:1},mood:1,log:"リコが厨房を手伝い、なぜかその日のパンだけ異様にふっくら焼き上がった。刻印と関係あるのかは不明。"}:{mood:1,log:"子供たちが広場で剣ごっこをしていた。ガレオン役が一番人気らしい。"}),
 ()=>({troops:1,log:"猟師の一人が「俺も守りに回りたい」と志願し、見張りに加わった。"}),
 ()=>({gold:-ri(10,30),troops:-1,log:"見張りの若者が怪我をして、しばらく前線を離れることになった。"}),
 ()=>({st:{diplomacy:1},log:"旅の商人がもたらした噂話から、隣の集落の様子が少し分かった。"}),
 ()=>({food:ri(10,25),log:"狩りが上手くいき、食卓に肉が並んだ。今日ばかりは誰も腹を空かせていない。"}),
 ()=>({mood:-2,log:"些細な諍いが村人の間で起きた。長としての裁定が地味に効いてくる場面だ。"}),
 ()=>({gold:ri(15,45),log:"隣村との物々交換がうまくいき、思わぬ利が出た。"}),
 ()=>({st:{order:-1},log:"夜中に家畜小屋が荒らされた。獣か、人か。見張りを増やす必要がありそうだ。"}),
 ()=>({troops:ri(1,2),pop:1,log:"旅の傭兵くずれが村に流れ着き、そのまま居着いて見張りを手伝い始めた。"}),
 ()=>{if(S.units.length){const u=S.units[Math.floor(Math.random()*S.units.length)];return{mood:1,log:`${u.nm}が見回り中に落とし物を届けてくれた。ちょっとした評判になっている。`};}return{mood:1,log:"特に変わったことのない、穏やかな一日だった。"};},
 ()=>{if(S.units.length>=2){const u=S.units[Math.floor(Math.random()*S.units.length)];return{log:`${u.nm}と若手の間で腕相撲大会が起きた。長も知らぬところで、絆が育っている。`};}return{food:ri(5,15),log:"畑仕事が捗った一日だった。"};},
 ()=>({gold:-ri(5,20),log:"雨漏りの修理に思わぬ出費があった。"}),
 ()=>({st:{agriculture:ri(1,2)},log:"マーサが新しい輪作の仕方を試し、手応えを感じているようだ。"}),
 ()=>({food:-ri(5,15),mood:-1,log:"貯蔵庫にネズミが出た。被害は小さいが、皆が気味悪がっている。"}),
 ()=>({gold:ri(10,25),log:"旅の鑑定士が立ち寄り、蔵にあった古道具に思わぬ値がついた。"}),
 ()=>({mood:2,log:"晴れた夜、満天の星の下でささやかな宴が開かれた。"}),
 ()=>{if(S.units.length){const u=S.units[Math.floor(Math.random()*S.units.length)];return{st:{order:1},log:`${u.nm}が不審者を見咎め、事なきを得た。`};}return{st:{order:1},log:"特に何事もなく、静かな夜だった。"};},
 ()=>({st:{magic:-1},log:"魔導塔の書庫が少々荒れているらしい。整理する者が足りないようだ。"}),
 ()=>({pop:1,log:"旅人が一人、この村を気に入って住み着くことにしたという。"}),
 ()=>{if(!S.units.length)return{mood:1,log:"特に変わったことのない一日だった。"};const u=S.units[Math.floor(Math.random()*S.units.length)];const before=u.moral;u.moral=Math.min(100,u.moral+ri(8,15));return{log:`${u.nm}に何か良いことがあったらしく、このところ調子が良さそうだ。`};},
 ()=>{if(!S.units.length)return{mood:1,log:"特に変わったことのない一日だった。"};const u=S.units[Math.floor(Math.random()*S.units.length)];u.moral=Math.max(0,u.moral-ri(8,15));return{log:`${u.nm}は少し元気がない様子だ。何か思うところがあるのかもしれない。`};},
 ()=>{if(!S.units.length)return{mood:1,log:"特に変わったことのない一日だった。"};const u=S.units[Math.floor(Math.random()*S.units.length)];u.loyalty=Math.min(100,u.loyalty+ri(5,10));return{log:`${u.nm}が長への信頼をより一層深めた様子だ。`};},
 ()=>{const cands=S.units.filter(u=>u.injured<=0);if(!cands.length)return{mood:1,log:"特に変わったことのない一日だった。"};const u=cands[Math.floor(Math.random()*cands.length)];u.fatigue=Math.max(0,(u.fatigue||0)-ri(10,20));return{log:`${u.nm}がゆっくり体を休めていた。疲れが少し抜けたようだ。`};},
];
/* ---------- 序盤専用:小さな成長の頼み ---------- */
const EARLY_GROWTH=[
 {tag:"陳 情",title:"隣村からの移住希望",
  body:"隣の谷を追われた一家(五人)が、村への受け入れを願い出てきた。働き手は増えるが、その分の食い扶持も要る。",
  choices:[
   {label:"受け入れる",hint:"人口+5 食糧消費増",fx:{pop:5,food:-20,mood:2,log:"一家五人を受け入れた。子供たちの声が村に増えた。"}},
   {label:"食糧に余裕がないと断る",hint:"現状維持",fx:{mood:-1,log:"心苦しいが受け入れを断った。一家は肩を落として去っていった。"}},
  ]},
 {tag:"陳 情",title:"見張り小屋を建てたい",
  body:"猟師頭ガレオンが、村の入り口に簡素な見張り小屋を建てることを提案してきた。「常に誰かが目を光らせているだけで、獣も盗人も減ります」",
  choices:[
   {label:"許可する",hint:"治安+3 兵+1",fx:{gold:-ri(15,25),st:{order:3},troops:1,log:"見張り小屋が建った。交代で誰かが常に目を光らせている。"}},
   {label:"今はまだ人手が足りないと保留する",hint:"見送り",fx:{log:"提案は保留された。ガレオンは少し残念そうだったが、頷いた。"}},
  ]},
 {tag:"陳 情",title:"最初の市を開きたい",
  body:"ネロが「小さくてもいい、決まった日に物を売り買いできる場所を作りたい」と申し出た。",
  choices:[
   {label:"広場の一角を市場にする",hint:"経済+3",fx:{st:{economy:3},mood:1,log:"広場の一角に筵が敷かれ、簡素な市が立つようになった。"}},
   {label:"まだ早いと見送る",hint:"見送り",fx:{log:"市の話は先送りになった。ネロは帳面を睨みながら唸っていた。"}},
  ]},
 {tag:"陳 情",title:"若者を見張りに志願させたい",
  body:"村の若者数名が「剣を持って村を守りたい」と申し出てきた。訓練の場と、多少の武具が要る。",
  choices:[
   {label:"訓練を始めさせる",hint:"兵+3 費用小",fx:{gold:-ri(10,20),troops:3,log:"若者たちの訓練が始まった。最初は棒切れでの打ち合いからだ。"}},
   {label:"まだ子供だと止める",hint:"見送り",fx:{mood:-1,log:"若者たちは不満げだったが、長の判断には従った。"}},
  ]},
 {tag:"陳 情",title:"水路を延ばしたい",
  body:"マーサが、畑まで水路を延ばせば収穫が安定すると訴えてきた。",
  choices:[
   {label:"水路工事を許可する",hint:"農業+3",fx:{gold:-ri(15,30),st:{agriculture:3},log:"水路が畑まで延び、水やりの苦労が減った。"}},
   {label:"今の蓄えでは厳しいと断る",hint:"見送り",fx:{log:"マーサは肩を落としたが、「仕方ないね」と桶を担ぎ直した。"}},
  ]},
 {tag:"陳 情",title:"旅の鍛冶屋が居着きたいと",
  body:"腕はまずまずの旅の鍛冶屋が、道具の手入れをする代わりに村に置いてほしいと願い出てきた。",
  choices:[
   {label:"受け入れる",hint:"人口+1 軍事+2",fx:{pop:1,st:{military:2},log:"鍛冶屋が村はずれに炉を構えた。刃物の切れ味が目に見えて良くなった。"}},
   {label:"通りすがりでいいと断る",hint:"見送り",fx:{log:"鍛冶屋は道具を一通り直すと、村を去っていった。"}},
  ]},
 {tag:"陳 情",title:"祠を建てたい",
  body:"何人かの村人が「収穫と安寧を祈る小さな祠が欲しい」と言い出した。",
  choices:[
   {label:"祠を建てる",hint:"民心+3",fx:{gold:-ri(10,20),mood:3,log:"小さな祠が建てられた。朝夕、誰かしらが手を合わせている。"}},
   {label:"今は実利を優先する",hint:"見送り",fx:{gold:ri(5,15),log:"祠の話は後回しにされた。ネロだけがほっとした顔をしていた。"}},
  ]},
 {tag:"陳 情",title:"炭焼き小屋を作りたい",
  body:"冬支度のため、炭焼き小屋を作ってはどうかという声が上がった。",
  choices:[
   {label:"作らせる",hint:"経済+2 食糧維持に貢献",fx:{gold:-ri(10,20),st:{economy:2},log:"炭焼き小屋ができた。冬を越す備えが一つ増えた。"}},
   {label:"薪を集めるだけで済ませる",hint:"節約",fx:{log:"今年は薪を集めるだけにとどめた。来年また考えることになりそうだ。"}},
  ]},
 {tag:"陳 情",title:"共同の物置を作りたい",
  body:"収穫物や道具を個々にしまうより、共同の物置を作った方が効率が良いのではという声が上がった。",
  choices:[
   {label:"共同物置を建てる",hint:"食糧の無駄が減る",fx:{gold:-ri(10,18),food:ri(10,20),log:"共同の物置ができた。腐らせてしまう食糧が目に見えて減った。"}},
   {label:"各自に任せる",hint:"見送り",fx:{log:"物置の話は各自の判断に任された。"}},
  ]},
 {tag:"陳 情",title:"橋を架けたい",
  body:"川向こうの畑に行くのに、いちいち遠回りをしている。簡単な橋を架けられないかという相談があった。",
  choices:[
   {label:"橋を架ける",hint:"農業+2 経済+1",fx:{gold:-ri(20,35),st:{agriculture:2,economy:1},log:"丸太を組んだ簡素な橋が架けられた。畑仕事も市への行き来も、ぐっと楽になった。"}},
   {label:"今は見送る",hint:"節約",fx:{log:"橋の話は先送りになった。遠回りは続くが、蓄えは守られた。"}},
  ]},
 {tag:"陳 情",title:"子供たちに読み書きを教えたい",
  body:"セラが「せめて数人でいい、読み書きを教える場を作りたい」と申し出た。",
  choices:[
   {label:"寺子屋のようなものを作る",hint:"外交+1 魔導+1 / 長い目で効いてくる",fx:{gold:-ri(10,20),st:{diplomacy:1,magic:1},mood:2,log:"納屋の一角を借りて、簡単な手習いの場ができた。子供たちの声が村に響く。"}},
   {label:"今は手が回らないと断る",hint:"見送り",fx:{log:"セラは残念そうだったが、「いずれ、また」と頷いた。"}},
  ]},
 {tag:"陳 情",title:"共同浴場を作りたい",
  body:"「せめて体を温める場所くらい欲しい」と、素朴な願いが村人から上がった。",
  choices:[
   {label:"簡素な共同浴場を作る",hint:"民心+3",fx:{gold:-ri(15,25),mood:3,log:"薪で湯を沸かす簡素な浴場ができた。冬の夜、湯気の立つ小屋に笑い声が絶えない。"}},
   {label:"今は贅沢だと見送る",hint:"節約",fx:{log:"浴場の話は先送りになった。村人たちは川で我慢することにした。"}},
  ]},
 {tag:"陳 情",title:"狩人を増やしたい",
  body:"ガレオンが「もう数人、狩りの手が欲しい」と申し出てきた。",
  choices:[
   {label:"若手を狩りに回す",hint:"食糧+ 安定",fx:{food:ri(15,30),log:"何人かの若者が狩りに加わった。食卓に肉が並ぶ日が増えた。"}},
   {label:"今は畑仕事を優先させる",hint:"農業寄り",fx:{st:{agriculture:1},log:"若者たちは畑に回された。マーサが喜んでいた。"}},
  ]},
 {tag:"陳 情",title:"井戸をもう一つ掘りたい",
  body:"村が少し大きくなり、井戸が一つでは心もとなくなってきた。",
  choices:[
   {label:"新しい井戸を掘る",hint:"食糧+ 民心+1",fx:{gold:-ri(15,25),food:ri(15,25),mood:1,log:"二つ目の井戸が完成した。水汲みの列がさらに短くなった。"}},
   {label:"今の井戸で工夫する",hint:"節約",fx:{log:"当面は今の井戸をやりくりすることになった。"}},
  ]},
 {tag:"陳 情",title:"旅籠を作りたい",
  body:"旅人が増えてきたことから、ネロが「泊まれる場所があれば、もっと金が落ちる」と提案してきた。",
  choices:[
   {label:"簡素な旅籠を作る",hint:"経済+3",fx:{gold:-ri(25,40),st:{economy:3},log:"納屋を改装した旅籠ができた。旅人たちの評判は上々のようだ。"}},
   {label:"まだ早いと見送る",hint:"見送り",fx:{log:"旅籠の話は先送りになった。ネロは帳面に「後日」と書き加えた。"}},
  ]},
];
