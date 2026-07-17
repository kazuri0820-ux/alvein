/* ---------- 覚醒(英雄格の先、第7段階)とユニークジョブの自動生成 ---------- */
const AWAKEN_CROWN={reborn:"異界の",legendchild:"伝説の",starchild:"星導きの"};
const AWAKEN_CORE={kenseinoishi:"剣聖",hoshiyomi:"大賢者",hyakushikaichu:"弓聖",haken:"拳神",ryuuketsu:"竜騎士",eiyuunoutsuwa:"大英雄"};
function unitUniqueSkill(u){return (u.skills||[]).map(k=>SKILL_DB.find(s=>s.key===k)).find(s=>s&&s.tier==="unique")||null;}
function awakenTitleFor(u){
  const crown=AWAKEN_CROWN[u.trait]||"";
  const uniq=unitUniqueSkill(u);
  const core=(uniq&&AWAKEN_CORE[uniq.key])||"覚醒者";
  return crown+core;
}
function awakenEligible(u){
  return !u.awakened && u.lv>=80 && u.traitTier==="legend" && S.uniqueHolderId===u.id;
}
function checkAwakening(){
  const cand=S.units.find(awakenEligible);
  if(cand)pushEvent("awaken_"+cand.id);
}
function buildAwakenEvent(uid){
  const u=S.units.find(x=>x.id===uid);
  if(!u||!awakenEligible(u))return null;
  const title=awakenTitleFor(u);
  return{tag:"覚 醒",title:`${u.nm}、覚醒の刻`,
   body:`${u.nm}が、ついに人の身の理を超えようとしている。英雄格――いや、もはやその呼び名すら生ぬるい。覚醒すれば、二度と元の姿には戻れない。`,
   speaker:`大臣一同「これは……もはや我らの知る"英雄格"の話ではありませぬ。陛下、ご決断を」`,
   choices:[
    {label:`覚醒させる――「${title}」へ`,hint:"全ステータス+18% / 唯一無二の称号を得る(不可逆)",fx:{mood:6,call:()=>{
      u.awakened=true;u.awakenTitle=title;grantTitle(u,"t_awakened");
      for(const k of["str","vit","int","agi","wis","lead"])u[k]=Math.round(u[k]*1.18);
      unitHistory(u,`${u.nm}という名はもはや過去のもの。今は「${title}」と呼ばれる。`);
      chron(`――${u.nm}は覚醒し、もはや「${title}」と呼ぶべき存在となった。この日のことは、長くアルヴェインの歴史に刻まれるだろう。`,"big");
    }}},
    {label:"今はまだ見送る",hint:"いつでも挑める",fx:{log:`${u.nm}は覚醒の機会を、まだ見送ることにした。`}},
   ]};
}
/* ==================== ジョブチェンジ機能 ==================== */
function churchJobChangeCost(u){
  return Math.round(500+u.lv*15+unitPower(u)*3);
}
function changeJobCore(u,newCls,note){
  const oldLabel=JOB_TREES[u.cls].label;
  u.cls=newCls;
  u.route=null; // ジョブチェンジでルートはリセット、新しい職で改めて選び直す
  u.hasJobChanged=true;
  u.awakened=false;u.awakenTitle=null; // 転職により覚醒状態はリセットし、新しい職名が表示されるようにする
  grantTitle(u,"t_jobchange");
  // Lv20以上での転職は、新しい道の熟練度としてLv20まで巻き戻す(ステータスの伸びはそのまま維持)。
  // これによりLv25の分岐も自然な形(通常のレベルアップ)で再度発生する
  if(u.lv>20){
    u.lv=20;
    u.exp=0;
    unitHistory(u,note||`${oldLabel}から${JOB_TREES[newCls].label}へ転職した。培った力はそのままに、新たな道の熟練度はLv20から積み直すことになる。`);
  }else{
    unitHistory(u,note||`${oldLabel}から${JOB_TREES[newCls].label}へ転職した。`);
  }
}
let jobChangeUIOpen=false, jobChangeConfirmCls=null, dismissConfirmId=null;
function performChurchJobChange(uid,newCls){
  const u=findAnyUnit(uid);
  if(!u)return;
  const cost=churchJobChangeCost(u);
  if(S.gold<cost){chron(`転職には費用(${cost})が足りない。`,"sys");return;}
  S.gold-=cost;
  const oldLabel=JOB_TREES[u.cls].label;
  changeJobCore(u,newCls,`教会にて${JOB_TREES[newCls].label}へ転職した。`);
  chron(`${u.nm}が教会で${oldLabel}から${JOB_TREES[newCls].label}へ転職した。`,"big");
  jobChangeUIOpen=false;
  clamp();render();renderTroops();renderUnitDetail(uid);save();
}
function displayJobName(u){
  if(u.awakened&&u.awakenTitle)return u.awakenTitle;
  return jobFor(u.cls,u.lv,u.route).name;
}
function openNext(){
  if(S.eventOpen||!S.pendingEvents.length)return;
  const id=S.pendingEvents.shift();render();
  const ev=resolveEventId(id);
  if(!ev){S.eventOpen=false;openNext();return;}
  S.eventOpen=true;
  const L=$("#eventLayer");
  let ch="";
  ev.choices.forEach((c,i)=>{ch+=`<button class="tome-choice" data-i="${i}"><span class="leaf">❧</span><span class="ctext">${c.label}${c.hint?`<span class="hint">${c.hint}</span>`:""}</span>${SEAL}</button>`;});
  L.innerHTML=`<div class="tome-outer"><span class="ribbon">${ev.tag||"勅 令"}</span><button class="logpeek-btn" id="logPeekBtn">ログ</button><div class="tome"><h2>${ev.title}</h2><div class="body">${ev.body||""}</div>${ev.speaker?`<div class="speaker">${ev.speaker}</div>`:""}<div class="tome-choices">${ch}</div></div></div>`;
  L.classList.add("show");
  const logBtn=$("#logPeekBtn");
  if(logBtn)logBtn.onclick=()=>{
    const recent=[...S.log].slice(-8).reverse();
    const body=recent.length?recent.map(l=>`<div class="logpeek-item"><span class="logpeek-day">DAY${l.d}</span>${l.t}</div>`).join(""):`<div class="udet-empty">まだ記録がない。</div>`;
    $("#logPeekBody").innerHTML=body;
    $("#panelLogPeek").classList.add("show");
  };
  L.querySelectorAll(".tome-choice").forEach(btn=>{
    btn.querySelector(".sealmark").style.opacity=0;
    btn.onclick=()=>{
      L.querySelectorAll(".tome-choice").forEach(b=>{b.classList.add("sealed");if(b!==btn)b.style.opacity=.45;});
      btn.querySelector(".sealmark").style.opacity="";
      setTimeout(()=>{
        L.classList.remove("show");S.eventOpen=false;
        apply(ev.choices[+btn.dataset.i].fx);
        save();openNext();
      },S.speed===2?340:S.speed===1?520:680);
    };
  });
}

/* ---------- 施設(商業施設・畑):担当を配置すると日々じわじわ産出する ---------- */
const FACILITY_PRODUCE_MULT=0.13;
const FACILITY_TYPES=[
 {key:"market",name:"商業施設",desc:"担当を置くと、その知力・統率に応じて毎日わずかな国庫収入を生む。",cost:150,produce:"gold",statFn:u=>u.int*0.6+u.lead*0.4},
 {key:"farm",name:"畑",desc:"担当を置くと、その体力・知力に応じて毎日わずかな食糧を生む。",cost:100,produce:"food",statFn:u=>u.vit*0.5+u.wis*0.5},
];
function facilityDailyProduce(){
  for(const f of(S.facilities||[])){
    const ft=FACILITY_TYPES.find(t=>t.key===f.typeKey);
    if(!ft||!f.managerId)continue;
    const u=findAnyUnit(f.managerId);
    if(!u){f.managerId=null;continue;}
    const amount=ft.statFn(u)*FACILITY_PRODUCE_MULT*rnd(0.85,1.15);
    if(ft.produce==="gold")S.gold+=amount;else S.food+=amount;
  }
}
let facilityAssignKey=null;
function renderFacilityAssignSelect(){
  const ft=FACILITY_TYPES.find(f=>f.key===facilityAssignKey);
  if(!ft)return;
  $("#itemTargetTitle").textContent=`${ft.name}の担当を選ぶ`;
  const eligible=S.units.filter(u=>u.injured<=0);
  let h=`<div class="ds" style="margin-bottom:8px">${ft.desc}</div>`;
  if(!eligible.length)h+=`<div class="udet-empty">配置できる兵がいない。</div>`;
  for(const u of eligible){
    h+=`<button class="fac-target-pick" data-id="${u.id}" style="display:block;width:100%;text-align:left;background:transparent;border:1px solid rgba(201,162,75,.3);color:var(--parch);border-radius:6px;padding:10px;margin-bottom:6px;font-family:'Zen Old Mincho',serif;cursor:pointer">
      ${fullName(u)} <span style="font-size:11px;color:var(--dim)">${JOB_TREES[u.cls].label}・Lv.${u.lv}</span><br>
      <span style="font-size:11px;color:var(--dim)">見込み産出:1日あたり${ft.produce==="gold"?"国庫":"食糧"}+${Math.round(ft.statFn(u)*FACILITY_PRODUCE_MULT)}</span>
    </button>`;
  }
  $("#itemTargetBody").innerHTML=h;
  $("#itemTargetBody").querySelectorAll(".fac-target-pick").forEach(b=>b.onclick=()=>{
    let f=S.facilities.find(x=>x.typeKey===facilityAssignKey);
    if(!f){f={typeKey:facilityAssignKey,managerId:null};S.facilities.push(f);}
    f.managerId=b.dataset.id;
    chron(`${fullName(findAnyUnit(b.dataset.id))}が「${ft.name}」の担当に任じられた。`,"");
    $("#panelItemTarget").classList.remove("show");
    renderProjects();save();
  });
  $("#panelItemTarget").classList.add("show");
}
let equipSelectUnitId=null, equipSelectSlot=null;
function equipBonusText(def){
  return Object.entries(def.statBonus).map(([k,v])=>`${(USTAT_DEF[k]||{lbl:k}).lbl}+${v}`).join("・");
}
function renderEquipSelect(){
  const unitId=equipSelectUnitId, slot=equipSelectSlot;
  const u=findAnyUnit(unitId);
  if(!u)return;
  $("#itemTargetTitle").textContent=`${fullName(u)}の${EQUIP_SLOT_LABEL[slot]}を選ぶ`;
  const cands=(S.equipmentInventory||[]).map(inst=>({inst,def:EQUIPMENT_DB.find(d=>d.key===inst.key)})).filter(x=>x.def&&x.def.slot===slot);
  let h=`<div class="ds" style="margin-bottom:8px">所持している${EQUIP_SLOT_LABEL[slot]}から選んで装備させる。既に何か装備している場合は自動的に外され、手持ちに戻る。</div>`;
  if(!cands.length)h+=`<div class="udet-empty">所持している${EQUIP_SLOT_LABEL[slot]}がない。ダンジョンや遠征の報酬で手に入ることがある。</div>`;
  for(const{inst,def}of cands){
    h+=`<button class="eq-target-pick" data-id="${inst.id}" style="display:flex;align-items:center;gap:8px;width:100%;text-align:left;background:transparent;border:1px solid rgba(201,162,75,.3);color:var(--parch);border-radius:6px;padding:10px;margin-bottom:6px;font-family:'Zen Old Mincho',serif;cursor:pointer">
      <i class="ricon eqp-icon-${def.key}" style="width:32px;height:32px;flex:0 0 auto"></i>
      <span>
        <span class="trchip t-${def.rarity==="legendary"?"legend":def.rarity==="epic"?"epic":def.rarity==="rare"?"rare":"normal"}" style="font-size:10px">${def.rarity}</span> ${def.name}<br>
        <span style="font-size:11px;color:var(--dim)">${equipBonusText(def)}</span>
      </span>
    </button>`;
  }
  $("#itemTargetBody").innerHTML=h;
  $("#itemTargetBody").querySelectorAll(".eq-target-pick").forEach(b=>b.onclick=()=>{
    equipItem(unitId,b.dataset.id);
    $("#panelItemTarget").classList.remove("show");
    renderUnitDetail(unitId);refreshOpenPanels();save();
  });
  $("#panelItemTarget").classList.add("show");
}

/* ---------- パネル ---------- */
function renderProjects(){
  let h="";
  const focusLabels={military:"軍事",economy:"経済",agriculture:"農業",magic:"魔導",order:"治安",diplomacy:"外交"};
  h+=`<div class="pcard" style="border-color:var(--gold2);margin-bottom:10px">
    <div class="nm" style="color:var(--gold)"><i class="icon-project"></i>今月の重点方針</div>
    <div class="ds">${S.policyFocus?`「${focusLabels[S.policyFocus]}」に注力中。月末まで毎日じわじわ上昇する。`:"特に方針を定めていない。月次会議で重点分野を選べる。"}</div>
  </div>`;
  const act=S.projects.filter(p=>!p.done),fin=S.projects.filter(p=>p.done);
  if(!act.length)h+=`<div class="pcard"><div class="ds">進行中の事業はない。閣議やイベントで新たな事業が生まれる。</div></div>`;
  for(const p of act){
    const boostCost=Math.max(20,Math.round((100-p.p)*0.8));
    h+=`<div class="pcard prj"><div class="nm"><i class="icon-project"></i>${p.nm}</div>${p.desc?`<div class="ds" style="margin:2px 0 6px">${p.desc}</div>`:""}<div class="pbar"><i style="width:${p.p}%"></i></div><div class="pct">${Math.floor(p.p)}%</div>
      <button class="prj-boost-btn" data-id="${p.id}" style="margin-top:8px;width:100%;background:transparent;border:1px solid var(--gold2);color:var(--gold);border-radius:6px;padding:7px;font-family:'Shippori Mincho',serif;font-size:11.5px;cursor:pointer">資金を投じて早める(${boostCost}G・進捗+15%)</button>
    </div>`;
  }
  if(fin.length){h+=`<div style="font-size:11px;color:var(--dim);margin:12px 0 6px;letter-spacing:.15em">── 完了した事業 ──</div>`;
   for(const p of fin)h+=`<div class="pcard prj" style="opacity:.55"><div class="nm">${p.nm} ✓</div></div>`;}
  h+=`<div style="font-size:11px;color:var(--dim);margin:14px 0 6px;letter-spacing:.15em">── 施設 ──</div>`;
  for(const ft of FACILITY_TYPES){
    const built=S.facilities.find(f=>f.typeKey===ft.key);
    const ficon=ft.key==="market"?"icon-market":ft.key==="farm"?"icon-farm":"icon-project";
    if(!built){
      h+=`<div class="pcard"><div class="nm"><i class="${ficon}"></i>${ft.name}</div><div class="ds" style="margin:2px 0 6px">${ft.desc}</div>
        <button class="fac-build-btn" data-k="${ft.key}" style="width:100%;background:transparent;border:1px solid var(--gold2);color:${S.gold>=ft.cost?"var(--gold)":"var(--dim)"};border-radius:6px;padding:7px;font-family:'Shippori Mincho',serif;font-size:11.5px;cursor:pointer">建設する(${ft.cost}G)</button>
      </div>`;
    }else{
      const manager=built.managerId?findAnyUnit(built.managerId):null;
      const produce=manager?Math.round(ft.statFn(manager)*FACILITY_PRODUCE_MULT):0;
      h+=`<div class="pcard"><div class="nm"><i class="${ficon}"></i>${ft.name}</div><div class="ds" style="margin:2px 0 6px">${ft.desc}</div>
        <div class="ds">担当:${manager?fullName(manager):"未配置"}${manager?` ／ 1日あたり${ft.produce==="gold"?"国庫":"食糧"}+${produce}`:""}</div>
        <button class="fac-assign-btn" data-k="${ft.key}" style="margin-top:6px;width:100%;background:transparent;border:1px solid var(--gold2);color:var(--gold);border-radius:6px;padding:7px;font-family:'Shippori Mincho',serif;font-size:11.5px;cursor:pointer">${manager?"担当を変更する":"担当を配置する"}</button>
      </div>`;
    }
  }
  $("#prjList").innerHTML=h;
  $("#prjList").querySelectorAll(".prj-boost-btn").forEach(b=>b.onclick=()=>{
    const p=S.projects.find(x=>x.id===b.dataset.id);
    if(!p)return;
    const cost=Math.max(20,Math.round((100-p.p)*0.8));
    if(S.gold<cost){chron(`「${p.nm}」への投資には資金(${cost})が足りない。`,"sys");return;}
    S.gold-=cost;
    p.p=Math.min(100,p.p+15);
    chron(`「${p.nm}」に資金を投じ、事業を後押しした。`,"");
    if(p.p>=100){p.p=100;p.done=true;p.fx&&p.fx();}
    clamp();render();renderProjects();save();
  });
  $("#prjList").querySelectorAll(".fac-build-btn").forEach(b=>b.onclick=()=>{
    const ft=FACILITY_TYPES.find(x=>x.key===b.dataset.k);
    if(!ft)return;
    if(S.gold<ft.cost){chron(`「${ft.name}」の建設には資金(${ft.cost})が足りない。`,"sys");return;}
    S.gold-=ft.cost;
    S.facilities.push({typeKey:ft.key,managerId:null});
    chron(`「${ft.name}」が建設された。担当を配置すると産出が始まる。`,"big");
    clamp();render();renderProjects();save();
  });
  $("#prjList").querySelectorAll(".fac-assign-btn").forEach(b=>b.onclick=()=>{
    facilityAssignKey=b.dataset.k;
    renderFacilityAssignSelect();
  });
}
function renderPeople(){
  let h="";
  for(const p of S.people)h+=`<div class="pcard"><div class="nm"><i class="icon-npc"></i>${p.nm}</div><div class="rl">${p.rl}</div><div class="ds">${p.ds}</div></div>`;
  $("#pplList").innerHTML=h;
}
const STAT_DESC={
 military:"兵の練度・装備の質。訓練効果・維持費・ミッションレベルに影響。高いほど戦役に強くなるが、経済を大きく上回ると軍事費が経済を圧迫する。",
 economy:"商業・税収の規模。日々の国庫収入と維持費軽減、訓練効果に影響。",
 agriculture:"食糧生産力。食糧の増加と消費抑制の両方に効き、民心にもわずかに影響。低いと飢饉の危険が増す。",
 magic:"魔導研究の進み具合。ダンジョン・ミッションの経験値効率を大きく左右する。",
 order:"治安・行政の安定度。ダンジョン・ミッションでの戦没率を大きく下げる。低いと民心が徐々に下がる。",
 diplomacy:"他国との交渉力。維持費の軽減、志願書の出現頻度、民心に加え、交易を通じて経済もわずかに後押しする。",
};
function renderStatsDetail(){
  const stg=STAGES[S.stage];
  let h=`<div class="srow"><div class="sh"><div class="nm">現在の段階(Rank ${stg.rank})</div><div class="vl">${stg.name}</div></div><div class="ef">${stg.note} 次の段階まで:${STAGES[S.stage+1]?(STAGES[S.stage+1].min-S.pop>0?STAGES[S.stage+1].min-S.pop+"人":"まもなく"):"最終段階"}</div></div>`;
  h+=`<div class="srow"><div class="sh"><div class="nm">兵士数</div><div class="vl">${S.units.length} 人</div></div><div class="ef">総合戦力:${Math.round(totalTroopPower())}。各兵はジョブ・レベル・特性を持つ個別の存在。「兵士」ボタンから名簿と訓練が行える。</div></div>`;
  h+=`<div class="srow"><div class="sh"><div class="nm">人口</div><div class="vl">${S.pop} 人</div></div><div class="ef">食糧と民心が十分だと自然に増える。戦争や疫病で減ることも。</div></div>`;
  for(const[k,label]of STATDEF){
    const v=Math.round(S.st[k]);
    h+=`<div class="srow"><div class="sh"><div class="nm">${label}</div><div class="vl">${v} / 100 (${grade(v)})</div></div><div class="ef">${STAT_DESC[k]}</div><div class="bar"><i style="width:${v}%"></i></div></div>`;
  }
  h+=`<div class="srow"><div class="sh"><div class="nm">国庫</div><div class="vl">${Math.round(S.gold)}</div></div><div class="ef">毎日 経済に応じた税収が入り、軍事維持費などが出ていく。マイナスが続くと民心が下がる。</div></div>`;
  h+=`<div class="srow"><div class="sh"><div class="nm">食糧</div><div class="vl">${Math.round(S.food)}</div></div><div class="ef">農業に応じて増え、人口に応じて減る。尽きると民心が下がる。</div></div>`;
  h+=`<div class="srow"><div class="sh"><div class="nm">民心</div><div class="vl">${Math.round(S.mood)} / 100</div></div><div class="ef">0になると民の支持を失い、統治が終わる。治安・食糧・国庫の影響を受ける。70以上で兵士の忠誠がじわじわ高まり、30未満では逆に蝕まれていく。</div></div>`;
  $("#statList").innerHTML=h;
}
function skillEffectText(s){
  const parts=[];
  const statLabels={str:"腕力",vit:"体力",int:"魔力",agi:"敏捷",wis:"知力",lead:"統率"};
  for(const k in statLabels)if(s[k])parts.push(`${statLabels[k]}${s[k]>0?"+":""}${s[k]}`);
  if(s.trainMult&&s.trainMult!==1){
    let cond=s.onlyYoung?"(若手時)":s.onlyNotYoung?"(中堅以降)":"";
    parts.push(`訓練効率×${s.trainMult}${cond}`);
  }
  if(s.instructorMult&&s.instructorMult!==1)parts.push(`教官時の指導効果×${s.instructorMult}`);
  if(s.onlyCaptain)parts.push("(団長のみ有効)");
  if(s.condFlag==="dragonPact")parts.push(`竜盟約締結中はさらに体力+${s.condVit}・腕力+${s.condStr}`);
  return parts.length?parts.join(" / "):"目立った効果はない";
}
function traitBadge(u){
  const tr=traitInfo(u.trait);
  const tierMap={normal:"normal",rare:"rare",epic:"epic",legend:"legend"};
  return `<span class="trchip t-${tierMap[u.traitTier]||"normal"}">${tr.name}</span>`;
}
function skillBadges(u){
  if(!u.skills||!u.skills.length)return `<span class="udet-empty">まだ習得したスキルはない</span>`;
  return u.skills.map(k=>{
    const s=SKILL_DB.find(x=>x.key===k);if(!s)return"";
    return `<span class="skchip t-${s.tier}">${s.name}</span>`;
  }).join("");
}
// 称号ごとにtierフィールドを持たせる代わりに、効果の大きさから難易度相当のtierを判定する
function titleTier(t){
  if(t.effect==="expMult"){
    if(t.value>=1.1)return"legend";
    if(t.value>=1.07)return"epic";
    if(t.value>=1.05)return"rare";
    return"common";
  }
  if(t.effect==="loyaltyGrow"||t.effect==="moralGrow"){
    if(t.value>=0.2)return"legend";
    if(t.value>=0.15)return"epic";
    if(t.value>=0.1)return"rare";
    return"common";
  }
  if(t.effect==="injuryMult"){
    if(t.value<=0.8)return"legend";
    if(t.value<=0.85)return"epic";
    if(t.value<=0.9)return"rare";
    return"common";
  }
  return"common";
}
function titleBadges(u){
  if(!u.titles||!u.titles.length)return "";
  return u.titles.map(k=>{
    const t=TITLE_DB.find(x=>x.key===k);if(!t)return"";
    return `<span class="tichip t-${titleTier(t)}">${t.name}</span>`;
  }).join("");
}
function findAnyUnit(uid){return S.units.find(x=>x.id===uid)||S.instructors.find(x=>x.id===uid);}
/* クラス別の肖像アイコン(線画・currentColor) */
/* アイコンをbackground-imageで描画するヘルパー。インラインsvgのレイアウト崩れを構造的に回避する */
function iconUri(svgTemplate,color){
  let svg=svgTemplate.replace(/currentColor/g,color);
  if(!svg.includes("xmlns"))svg=svg.replace("<svg ",'<svg xmlns="http://www.w3.org/2000/svg" ');
  return "data:image/svg+xml,"+encodeURIComponent(svg);
}
function iconSpan(svgTemplate,color,size){
  // 元の属性(stroke-width, stroke-linecap等)は保持し、色とサイズだけ確実に上書きする
  let svg=svgTemplate.replace(/currentColor/g,color);
  svg=svg.replace(/width="24"/,`width="${size}"`).replace(/height="24"/,`height="${size}"`);
  svg=svg.replace(/<svg /,`<svg style="display:block;width:${size}px;height:${size}px;flex:0 0 auto" `);
  return `<span style="display:inline-flex;align-items:center;justify-content:center;flex:0 0 auto;width:${size}px;height:${size}px;overflow:hidden">${svg}</span>`;
}
const ICON_INJURED=`<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"><circle cx="12" cy="12" r="9"/><path d="M12 8v8M8 12h8" stroke-linecap="round"/></svg>`;
const ICON_BOND=`<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"><circle cx="9.5" cy="12" r="5.2"/><circle cx="14.5" cy="12" r="5.2"/></svg>`;
/* 個人ステータス6項目のアイコン・配色(詳細画面の戦闘力欄で使用) */
const USTAT_DEF={
 str:{lbl:"腕力",color:"#d47a7a",icon:`<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"><line x1="5" y1="19" x2="14" y2="10"/><path d="M13 8 L16 5 L19 8 L16 11 Z"/><line x1="4" y1="20" x2="6" y2="18"/></svg>`},
 vit:{lbl:"体力",color:"#7ac98f",icon:`<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round"><path d="M12 20 C6 16 3 12.5 3 8.8 C3 6 5.2 4 7.8 4 C9.6 4 11 5 12 6.5 C13 5 14.4 4 16.2 4 C18.8 4 21 6 21 8.8 C21 12.5 18 16 12 20Z"/></svg>`},
 int:{lbl:"魔力",color:"#7a9ed4",icon:`<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linejoin="round"><path d="M12 3 L13.3 9.6 L20 11 L13.3 12.4 L12 19 L10.7 12.4 L4 11 L10.7 9.6 Z"/></svg>`},
 agi:{lbl:"敏捷",color:"#d4b56a",icon:`<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"><path d="M3 8 h13 M3 12 h17 M3 16 h10"/></svg>`},
 wis:{lbl:"知力",color:"#b08fd9",icon:`<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"><path d="M12 4 C7 4 4 7 4 11 C4 14 6 15.5 6 17.5 V19 h12 v-1.5 c0-2 2-3.5 2-6.5 c0-4-3-7-8-7Z"/><line x1="9.5" y1="19" x2="14.5" y2="19"/></svg>`},
 lead:{lbl:"統率",color:"#c9a24b",icon:`<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"><path d="M6 3 v17 M6 3 L17 6 L6 10 Z"/></svg>`},
};
/* 士気から「調子」を判定(可視化用) */
function conditionInfo(u){
  if(u.injured>0){
    const tier=INJURY_TIERS[u.injurySeverity]||INJURY_TIERS.moderate;
    return{label:`${tier.label}・療養中(あと${u.injured}日)`,color:"#d97a7a",key:"injured",pwMult:1};
  }
  const m=u.moral;
  if(m>=80)return{label:"絶好調",color:"#8fbf6f",key:"great",pwMult:1.08};
  if(m>=60)return{label:"良好",color:"#c9c9d4",key:"good",pwMult:1.03};
  if(m>=40)return{label:"普通",color:"#c9a24b",key:"normal",pwMult:1.0};
  if(m>=20)return{label:"やや沈んでいる",color:"#d99a6a",key:"low",pwMult:0.95};
  return{label:"不調",color:"#d97a7a",key:"bad",pwMult:0.88};
}
/* ---------- 兵士名簿:フィルタ・ソート状態と個性表現 ---------- */
let troopFilter="all", troopSort="power", troopSortDir=1, openUnitDetailId=null, troopSearch="", troopFavOnly=false;
let troopViewMode="roster", volunteerConfirmId=null, volunteerInsufficientId=null;
const CLASS_COLOR={warrior:"#8a4550",mage:"#3a5a85",archer:"#3a7a5a",monk:"#a5793a",priest:"#a8934f",hunter:"#455055"};
const CLASS_TABS=[["all","全員"],["warrior","戦士"],["mage","魔法"],["archer","弓術"],["monk","拳法"],["priest","神官"],["hunter","狩人"]];
const SORT_TABS=[["power","戦力順"],["lv","Lv順"],["age","年齢順"],["tenure","在籍順"]];
const AGE_TONE={young:"#8fbf6f",peak:"#c9a24b",mid:"#c9c9d4",old:"#9aa0ac",venerable:"#76839a"};
const POWER_GAUGE_MAX=140; // 円形ゲージの満タン目安値(演出上の相対値)
const STAR_SVG=`<svg width="24" height="24" viewBox="0 0 24 24"><path d="M12 2 L14.5 9 L22 9.5 L16 14.5 L18 22 L12 17.5 L6 22 L8 14.5 L2 9.5 L9.5 9 Z"/></svg>`;
function cardAccent(u){
  const stage=ageStageOf(u).key;
  const tone=AGE_TONE[stage]||"#c9a24b";
  const chain=JOB_TREES[u.cls].chain;
  const tierIdx=Math.max(0,chain.findIndex(c=>c.key===jobFor(u.cls,u.lv,u.route).key));
  // フレーム素材:純粋に育成段階のみで決まる(新兵/兵士=木、古参兵/精鋭兵=石、隊長格=鉄、英雄格=銀)
  let material="wood";
  if(tierIdx>=5)material="silver";
  else if(tierIdx>=4)material="iron";
  else if(tierIdx>=2)material="stone";
  if(u.awakened)material="awakened"; // 覚醒者は段階を問わず最上位の専用枠
  // 特性のレア度は枠とは別に、肖像の後光(オーラ)で表現
  const aura=(u.traitTier==="epic"||u.traitTier==="legend")?u.traitTier:null;
  const stars=tierIdx+1; // 1〜6
  const pw=unitPower(u);
  const pct=Math.max(3,Math.min(100,pw/POWER_GAUGE_MAX*100));
  const circumference=2*Math.PI*28; // r=28のsvg円周(.pgauge viewBox 0 0 64 64に対応)
  const dashoffset=(circumference*(1-pct/100)).toFixed(1);
  return{tone,material,tierIdx,stars,aura,circumference:circumference.toFixed(1),dashoffset};
}
function rankStars(n){let s="";for(let i=0;i<n;i++)s+=STAR_SVG;return `<span class="rankmark">${s}</span>`;}
/* ---------- 特別訓練場:一定期間ダンジョン/ミッション/遠征に出せなくなる代わりに、帰還時に大きく成長する ---------- */
const CAMP_MIN_DAYS=30, CAMP_MAX_DAYS=60;
function sendToCamp(unitId){
  const u=S.units.find(x=>x.id===unitId);
  if(!u||u.campUntil||u.injured>0||u.dungeonBusy)return;
  const dur=ri(CAMP_MIN_DAYS,CAMP_MAX_DAYS);
  u.campUntil=S.day+dur;
  u.campDuration=dur;
  chron(`${fullName(u)}が特別訓練場へ入った。${dur}日後に戻る予定。`,"big");
}
function checkCampReturns(){
  for(const u of S.units){
    if(u.campUntil&&S.day>=u.campUntil){
      u.campUntil=null;u.campDuration=null;
      const pr=statPriorityFor(u);
      for(const k of["str","vit","int","agi","wis","lead"]){
        const g=(k===pr.main)?ri(10,18):(k===pr.sub)?ri(6,12):ri(3,7);
        u[k]+=g;
      }
      const learned=trySkillUp(u);
      unitHistory(u,"特別訓練場での修練を終え、大きく成長して戻ってきた。");
      chron(`――${fullName(u)}が特別訓練場から帰還した。見違えるほど鍛え上げられている。${learned?`新たに「${learned.name}」を習得した。`:""}`,"big");
    }
  }
}
function renderTrainingCamp(){
  $("#troopSummary").textContent="特別訓練場:兵士を一定期間(30〜60日)預けると、その間ダンジョン・ミッション・遠征には出せなくなるが、帰還時に大きく成長する。";
  $("#troopFilterRow").innerHTML="";
  $("#troopSortRow").innerHTML="";
  const inCamp=S.units.filter(u=>u.campUntil);
  const eligible=S.units.filter(u=>u.injured<=0&&!u.dungeonBusy&&!u.campUntil);
  let h="";
  if(inCamp.length){
    h+=`<div style="font-size:11px;color:var(--dim);margin:4px 0 8px;letter-spacing:.15em"><i class="icon-training"></i>── 訓練場にいる兵 ──</div>`;
    for(const u of inCamp){
      const cc=CLASS_COLOR[u.cls];
      h+=`<div class="pcard"><div style="display:flex;align-items:center;gap:9px">
        <div class="pcard-portrait" style="background:radial-gradient(circle at 35% 30%, ${cc}, ${cc}88 70%, #1c2030)">${classpicHtml(u)}</div>
        <div style="flex:1;min-width:0"><div class="nm">${fullName(u)}</div><div class="ds" style="margin-top:0">${JOB_TREES[u.cls].label}・Lv.${u.lv} ／ 帰還まであと${Math.max(0,u.campUntil-S.day)}日</div></div>
      </div></div>`;
    }
  }
  h+=`<div style="font-size:11px;color:var(--dim);margin:14px 0 8px;letter-spacing:.15em"><i class="icon-training"></i>── 訓練場へ送る ──</div>`;
  if(!eligible.length)h+=`<div class="udet-empty">送れる兵がいない(負傷中・出払い中・既に訓練場にいる兵は対象外)。</div>`;
  for(const u of eligible){
    const cc=CLASS_COLOR[u.cls];
    h+=`<div class="pcard"><div style="display:flex;align-items:center;gap:9px">
      <div class="pcard-portrait" style="background:radial-gradient(circle at 35% 30%, ${cc}, ${cc}88 70%, #1c2030)">${classpicHtml(u)}</div>
      <div style="flex:1;min-width:0"><div class="nm">${fullName(u)}</div><div class="ds" style="margin-top:0">${JOB_TREES[u.cls].label}・Lv.${u.lv}・戦力${Math.round(unitPower(u))}</div></div>
    </div>
      <button class="camp-send-btn" data-id="${u.id}" style="margin-top:8px;width:100%;background:transparent;border:1px solid var(--gold2);color:var(--gold);border-radius:6px;padding:7px;font-family:'Shippori Mincho',serif;font-size:11.5px;cursor:pointer">訓練場へ送る</button>
    </div>`;
  }
  $("#troopList").innerHTML=h;
  $("#troopList").querySelectorAll(".camp-send-btn").forEach(b=>b.onclick=()=>{
    sendToCamp(b.dataset.id);
    clamp();render();renderTrainingCamp();save();
  });
}
/* ---------- 小隊制度:常設の編成を保存し、同じ顔ぶれで出撃を重ねるとシナジーが育つ ---------- */
let squadEditIndex=null, squadEditUnitIds=[];
function renderSquadManager(){
  $("#troopSummary").textContent="小隊:兵士を常設の小隊(最大5人×3枠)に編成できる。同じ小隊で出撃を重ねるとシナジーボーナスが育ち、ダンジョン・遠征の派遣時に一括選択できる。";
  $("#troopFilterRow").innerHTML="";
  $("#troopSortRow").innerHTML="";
  S.squads=S.squads||[];
  while(S.squads.length<3)S.squads.push({id:Math.random().toString(36).slice(2,9),name:`第${S.squads.length+1}小隊`,unitIds:[],sortieCount:0});
  let h="";
  if(squadEditIndex!==null){
    const sq=S.squads[squadEditIndex];
    const eligible=S.units.filter(u=>u.injured<=0);
    h+=`<div class="pcard" style="border-color:var(--gold2)"><div class="nm" style="color:var(--gold)">${sq.name}の編成</div><div class="ds">最大5人まで選べます(タップで選択/解除)</div><div class="ds">選択中:${squadEditUnitIds.length}/5人</div></div>`;
    if(!eligible.length)h+=`<div class="udet-empty">編成できる兵がいない。</div>`;
    for(const u of eligible){
      const picked=squadEditUnitIds.includes(u.id);
      const cc=CLASS_COLOR[u.cls];
      h+=`<div class="pcard" style="${picked?"border-color:var(--gold);background:rgba(201,162,75,.1)":""}">
        <div class="sq-unit-pick" data-id="${u.id}" style="cursor:pointer;display:flex;align-items:center;gap:9px">
          <div class="pcard-portrait" style="background:radial-gradient(circle at 35% 30%, ${cc}, ${cc}88 70%, #1c2030)">${classpicHtml(u)}</div>
          <div class="nm" style="flex:1;min-width:0"><i class="cbicon ${picked?"on":"off"}"></i>${fullName(u)} <span style="font-size:11px;color:var(--dim);font-weight:400">${JOB_TREES[u.cls].label}・Lv.${u.lv}</span></div>
        </div>
      </div>`;
    }
    h+=`<div style="display:flex;gap:6px;margin-top:10px">
      <button id="sqSaveBtn" style="flex:1;background:linear-gradient(180deg,#e0be6f,var(--gold));color:var(--ink);border:none;border-radius:6px;padding:10px;font-family:'Shippori Mincho',serif;font-weight:800;cursor:pointer">この編成で確定</button>
      <button id="sqCancelBtn" style="flex:1;background:transparent;border:1px solid var(--dim);color:var(--dim);border-radius:6px;padding:10px;font-family:'Shippori Mincho',serif;cursor:pointer">戻る</button>
    </div>`;
    $("#troopList").innerHTML=h;
    $("#troopList").querySelectorAll(".sq-unit-pick").forEach(el=>el.onclick=()=>{
      const id=el.dataset.id;
      const i=squadEditUnitIds.indexOf(id);
      if(i>=0)squadEditUnitIds.splice(i,1);
      else if(squadEditUnitIds.length<5)squadEditUnitIds.push(id);
      renderSquadManager();
    });
    $("#sqSaveBtn").onclick=()=>{
      sq.unitIds=[...squadEditUnitIds];
      sq.sortieCount=0;
      squadEditIndex=null;squadEditUnitIds=[];
      chron(`${sq.name}の編成を更新した。`,"");
      renderSquadManager();save();
    };
    $("#sqCancelBtn").onclick=()=>{squadEditIndex=null;squadEditUnitIds=[];renderSquadManager();};
    return;
  }
  for(let i=0;i<S.squads.length;i++){
    const sq=S.squads[i];
    const members=sq.unitIds.map(id=>S.units.find(u=>u.id===id)).filter(Boolean);
    const bonus=Math.min(20,(sq.sortieCount||0)*2);
    h+=`<div class="pcard"><div class="nm">${sq.name}</div>
      <div class="ds">${members.length?members.map(fullName).join("・"):"未編成"}</div>
      <div class="ds">出撃回数:${sq.sortieCount||0}回 ／ シナジーボーナス+${bonus}%</div>
      <button class="sq-edit-btn" data-i="${i}" style="margin-top:6px;width:100%;background:transparent;border:1px solid var(--gold2);color:var(--gold);border-radius:6px;padding:7px;font-family:'Shippori Mincho',serif;font-size:11.5px;cursor:pointer">編成を変更する</button>
    </div>`;
  }
  $("#troopList").innerHTML=h;
  $("#troopList").querySelectorAll(".sq-edit-btn").forEach(b=>b.onclick=()=>{
    const i=+b.dataset.i;
    squadEditIndex=i;squadEditUnitIds=[...S.squads[i].unitIds];
    renderSquadManager();
  });
}
function renderVolunteers(){
  $("#troopSummary").textContent=`志願中:${(S.volunteers||[]).length}名 ／ 週に1〜2名、新たな志願が届く(3ヶ月経つと自然消滅)。ランク(F〜Z)は実力から統計的に推定した目安であり、確定した階級ではない。`;
  $("#troopFilterRow").innerHTML="";
  $("#troopSortRow").innerHTML="";
  const list=S.volunteers||[];
  let h="";
  if(!list.length)h=`<div class="ucard mat-wood"><div class="ustats">今は志願者がいない。しばらく待てば、また誰かが訪れるだろう。</div></div>`;
  for(const v of list){
    const u=v.unit;
    const race=RACES.find(r=>r.key===u.race);
    const origin=ORIGINS.find(o=>o.key===u.origin);
    const rank=v.rank||volunteerRankLabel(u);
    const daysLeft=90-(S.day-v.postedDay);
    const confirming=volunteerConfirmId===v.id;
    const rankStyle={
      Z:{glow:`0 0 22px rgba(255,243,208,.85), inset 0 0 26px rgba(255,243,208,.3)`,bw:"2.5px",bg:`linear-gradient(135deg, rgba(255,243,208,.22), rgba(201,143,232,.12) 45%, rgba(143,208,232,.12) 70%, transparent 90%)`,badge:"★彡"},
      SS:{glow:`0 0 16px ${rank.color}99, inset 0 0 20px ${rank.color}22`,bw:"2px",bg:`linear-gradient(135deg, ${rank.color}18, transparent 60%)`,badge:"◆◆"},
      S:{glow:`0 0 11px ${rank.color}77`,bw:"1.5px",bg:`linear-gradient(135deg, ${rank.color}12, transparent 60%)`,badge:"◆"},
      A:{glow:`0 0 6px ${rank.color}55`,bw:"1.5px",bg:"transparent",badge:""},
      B:{glow:"none",bw:"1px",bg:"transparent",badge:""},
      C:{glow:"none",bw:"1px",bg:"transparent",badge:""},
      D:{glow:"none",bw:"1px",bg:"transparent",badge:""},
      E:{glow:"none",bw:"1px",bg:"transparent",badge:""},
      F:{glow:"none",bw:"1px",bg:"transparent",badge:""},
    }[rank.label]||{glow:"none",bw:"1px",bg:"transparent",badge:""};
    const muted=(rank.label==="D"?"opacity:.8":rank.label==="C"?"opacity:.85":rank.label==="E"?"opacity:.7":rank.label==="F"?"opacity:.6":"");
    const vcc=CLASS_COLOR[u.cls];
    h+=`<div class="pcard${rank.label==="Z"?" mat-awakened-glow":""}" style="border-color:${rank.color};border-width:${rankStyle.bw};box-shadow:${rankStyle.glow};background:${rankStyle.bg};${muted}">
      <div style="display:flex;align-items:center;gap:9px">
        <div class="pcard-portrait" style="background:radial-gradient(circle at 35% 30%, ${vcc}, ${vcc}88 70%, #1c2030)">${classpicHtml(u)}</div>
        <div style="flex:1;min-width:0">
          <div class="nm" style="color:${rank.color}">${rankStyle.badge?rankStyle.badge+" ":""}${u.nm} ${u.surname} <span style="font-size:11px;color:var(--dim);font-weight:400">推定ランク ${rank.label}</span></div>
          <div class="ds" style="margin-top:0">${race.name}・${origin?origin.name:""}・${u.personality} ／ ${JOB_TREES[u.cls].label}志望</div>
        </div>
      </div>
      <div class="ds" style="font-style:italic">${v.comment||recruitAtmosphere(u)}</div>
      ${v.hiddenPotential?`<div class="ds" style="font-style:italic;color:var(--gold)">……見た目以上の器を、秘めているやもしれぬ。</div>`:""}
      <div class="ds">支度金:${v.cost}G ／ 期限まであと${Math.max(0,daysLeft)}日</div>
      ${volunteerInsufficientId===v.id&&v.cost>S.gold?`<div class="ds" style="color:#d97a7a;font-weight:700;margin-top:2px">資金が足りません(あと${Math.round(v.cost-S.gold)}G不足)</div>`:""}
      ${confirming?`
        <div class="ds" style="color:#d97a7a;margin-top:6px">本当に採用しますか?</div>
        <div style="display:flex;gap:6px;margin-top:6px">
          <button class="vol-yes-btn" data-id="${v.id}" style="flex:1;background:linear-gradient(180deg,#e0be6f,var(--gold));color:var(--ink);border:none;border-radius:6px;padding:9px;font-family:'Shippori Mincho',serif;font-weight:800;cursor:pointer">採用する</button>
          <button class="vol-cancel-btn" style="flex:1;background:transparent;border:1px solid var(--dim);color:var(--dim);border-radius:6px;padding:9px;font-family:'Shippori Mincho',serif;cursor:pointer">やめる</button>
        </div>
      `:`
        <div style="display:flex;gap:6px;margin-top:8px">
          <button class="vol-hire-btn" data-id="${v.id}" style="flex:1;background:linear-gradient(180deg,#e0be6f,var(--gold));color:var(--ink);border:none;border-radius:6px;padding:9px;font-family:'Shippori Mincho',serif;font-weight:800;cursor:pointer">採用する</button>
          <button class="vol-decline-btn" data-id="${v.id}" style="flex:1;background:transparent;border:1px solid rgba(217,122,122,.5);color:#d97a7a;border-radius:6px;padding:9px;font-family:'Shippori Mincho',serif;cursor:pointer">見送る</button>
        </div>
      `}
    </div>`;
  }
  $("#troopList").innerHTML=h;
  $("#troopList").querySelectorAll(".vol-hire-btn").forEach(b=>b.onclick=()=>{volunteerConfirmId=b.dataset.id;renderVolunteers();});
  $("#troopList").querySelectorAll(".vol-cancel-btn").forEach(b=>b.onclick=()=>{volunteerConfirmId=null;renderVolunteers();});
  $("#troopList").querySelectorAll(".vol-yes-btn").forEach(b=>b.onclick=()=>{volunteerConfirmId=null;hireVolunteer(b.dataset.id);});
  $("#troopList").querySelectorAll(".vol-decline-btn").forEach(b=>b.onclick=()=>{declineVolunteer(b.dataset.id);});
}
function renderTroopControls(){
  $("#troopFilterRow").innerHTML=CLASS_TABS.map(([k,l])=>`<button data-f="${k}" class="${troopFilter===k?"on":""}">${l}</button>`).join("");
  $("#troopSortRow").innerHTML=SORT_TABS.map(([k,l])=>`<button data-s="${k}" class="${troopSort===k?"on":""}">${l}${troopSort===k?(troopSortDir===1?" ▼":" ▲"):""}</button>`).join("");
  $("#troopFilterRow").querySelectorAll("button").forEach(b=>b.onclick=()=>{troopFilter=b.dataset.f;renderTroops();});
  $("#troopSortRow").querySelectorAll("button").forEach(b=>b.onclick=()=>{
    if(troopSort===b.dataset.s)troopSortDir*=-1; else{troopSort=b.dataset.s;troopSortDir=1;}
    renderTroops();
  });
  const searchEl=$("#troopSearch");
  if(searchEl){searchEl.value=troopSearch;searchEl.oninput=(e)=>{troopSearch=e.target.value;renderTroops();};}
  const favBtn=$("#btnFavFilter");
  if(favBtn){
    favBtn.textContent=troopFavOnly?"★":"☆";
    favBtn.style.color=troopFavOnly?"var(--gold)":"var(--dim)";
    favBtn.style.borderColor=troopFavOnly?"var(--gold)":"rgba(201,162,75,.4)";
    favBtn.onclick=()=>{troopFavOnly=!troopFavOnly;renderTroops();};
  }
}
function unitNickname(u){
  if(u.uniqueJob){
    const uj=UNIQUE_JOBS.find(j=>j.key===u.uniqueJob);
    if(uj)return uj.nickname;
  }
  if(u.route){
    const r=routeInfo(u.cls,u.route);
    if(r)return r.nickname;
  }
  const tr=traitInfo(u.trait);
  if(tr&&(tr.tier==="epic"||tr.tier==="legend"))return tr.name;
  return null;
}
function nicknameSpan(u){
  const nick=unitNickname(u);
  return nick?`<div class="nickname">「${nick}」</div>`:"";
}
function renderTroops(){
  renderTroopControls();
  const cd=trainingCooldownLeft();
  const trainBtn=$("#btnTrain");
  if(trainBtn){
    trainBtn.textContent=cd>0?`次の訓練まであと${cd}日(毎週自動で実施されます)`:`まもなく今週の訓練が始まります`;
  }
  const volBtn=$("#btnVolunteerToggle");
  if(volBtn){
    const vn=(S.volunteers||[]).length;
    volBtn.textContent=troopViewMode==="volunteers"?"兵士名簿に戻る":`志願書を見る${vn?`(${vn})`:""}`;
    volBtn.classList.toggle("pulse",troopViewMode!=="volunteers"&&vn>0);
  }
  const campBtn=$("#btnCampToggle");
  if(campBtn){
    const cn=S.units.filter(u=>u.campUntil).length;
    campBtn.textContent=troopViewMode==="camp"?"兵士名簿に戻る":`特別訓練場を見る${cn?`(${cn})`:""}`;
    campBtn.classList.toggle("pulse",troopViewMode!=="camp"&&cn>0);
  }
  const squadBtn=$("#btnSquadToggle");
  if(squadBtn){
    squadBtn.textContent=troopViewMode==="squad"?"兵士名簿に戻る":"小隊編成を見る";
    const noSquadYet=!(S.squads||[]).some(s=>s.unitIds&&s.unitIds.length>0);
    squadBtn.classList.toggle("pulse",troopViewMode!=="squad"&&noSquadYet);
  }
  if(troopViewMode==="volunteers"){
    renderVolunteers();
    return;
  }
  if(troopViewMode==="camp"){
    renderTrainingCamp();
    return;
  }
  if(troopViewMode==="squad"){
    renderSquadManager();
    return;
  }
  const cap=S.units.find(u=>u.captain);
  $("#troopSummary").textContent=`兵士数 ${S.units.length}人 / 総合戦力 ${Math.round(totalTroopPower())}`+(S.instructors.length?` / 教官${S.instructors.length}名`:"")+(S.flags.knightOrder?` / 騎士団編成済み(団長:${cap?cap.nm:"―"} / 定員${Math.min(S.units.length,rosterCap())}${S.units.length>rosterCap()?"+控え"+(S.units.length-rosterCap()):""}/${rosterCap()})`:"")+(!S.flags.knightOrder&&STAGES[S.stage].rank>=4?" / 騎士団はまだ未編成":"");
  let h="";
  let list=S.units.filter(u=>troopFilter==="all"||u.cls===troopFilter);
  if(troopFavOnly)list=list.filter(u=>u.favorite);
  if(troopSearch.trim())list=list.filter(u=>(u.nm+" "+(u.surname||"")).includes(troopSearch.trim()));
  if(troopSort==="power")list=[...list].sort((a,b)=>((b.captain?1:0)-(a.captain?1:0))*troopSortDir||(unitPower(b)-unitPower(a))*troopSortDir);
  else if(troopSort==="lv")list=[...list].sort((a,b)=>((b.captain?1:0)-(a.captain?1:0))*troopSortDir||(b.lv-a.lv)*troopSortDir);
  else if(troopSort==="age")list=[...list].sort((a,b)=>((b.captain?1:0)-(a.captain?1:0))*troopSortDir||(b.age-a.age)*troopSortDir);
  else if(troopSort==="tenure")list=[...list].sort((a,b)=>((b.captain?1:0)-(a.captain?1:0))*troopSortDir||((a.joinDay||1)-(b.joinDay||1))*troopSortDir);
  if(!S.units.length)h=`<div class="ucard mat-wood"><div class="ustats">まだ兵はいない。徴兵イベントや定例閣議で加わる。</div></div>`;
  else if(!list.length)h=`<div class="ucard mat-wood"><div class="ustats">この職系統の兵はまだいない。</div></div>`;
  for(const u of list){
    const need=u.lv*10;
    const acc=cardAccent(u);
    const tr=traitInfo(u.trait);
    const stage=ageStageOf(u);
    const race=RACES.find(r=>r.key===u.race);
    const cc=CLASS_COLOR[u.cls];
    const j=jobFor(u.cls,u.lv,u.route);
    const cond=conditionInfo(u);
    const statusIcons=(u.favorite?`<span class="uicon" title="お気に入り" style="color:var(--gold)">★</span>`:"")+(u.injured>0?`<span class="uicon" title="療養中">${ICON_INJURED}</span>`:"")+(u.dungeonBusy?`<span class="uicon" title="ダンジョン探索中" style="color:#c98fe8">⛏</span>`:"")+(u.bondWith?`<span class="uicon" title="戦友あり">${ICON_BOND}</span>`:"");
    const reserveTag=(S.flags.knightOrder&&!isInRoster(u))?`<span class="reservetag">控え</span>`:"";
    const nick=nicknameSpan(u);
    const statmax=500;
    const cardSkillEff=skillEffects(u);
    const mini=(key,lbl,v)=>{
      const c=(USTAT_DEF[key]||{}).color||"var(--gold)";
      return `<div class="col"><div class="lbl">${lbl}</div><div class="bar"><i style="width:${Math.min(100,v/statmax*100)}%;background:linear-gradient(90deg,${c}99,${c})"></i></div></div>`;
    };
    h+=`<div class="ucard mat-${acc.material}" data-uid="${u.id}" style="cursor:pointer;--m-tone:${cc};${u.injured>0?"filter:saturate(.55) brightness(.85);":""}">
      ${u.injured>0?`<div class="injbanner">${ICON_INJURED}${(INJURY_TIERS[u.injurySeverity]||INJURY_TIERS.moderate).label}・あと${u.injured}日</div>`:""}
      ${!u.injured&&u.dungeonBusy?`<div class="injbanner" style="background:rgba(150,90,200,.85)">⛏ ダンジョン探索中・あと${Math.max(0,u.dungeonBusy-S.day)}日</div>`:""}
      ${!u.injured&&u.campUntil?`<div class="injbanner" style="background:rgba(90,150,120,.85)">特別訓練場・あと${Math.max(0,u.campUntil-S.day)}日</div>`:""}
      ${acc.material==="silver"||acc.material==="gold"||acc.material==="awakened"?'<div class="sweep"></div>':""}
      <svg class="crestwm" viewBox="0 0 72 72" fill="none"><circle cx="36" cy="36" r="33" stroke="#c9a24b" stroke-width="2"/><path d="M18 46 L22 26 L30 38 L36 20 L42 38 L50 26 L54 46 Z" stroke="#c9a24b" stroke-width="2.5" fill="none" stroke-linejoin="round"/></svg>
      <div class="ucard-band" style="background:linear-gradient(135deg, ${cc}, rgba(20,27,43,.72))">
        <div class="portrait-wrap${acc.aura?" aura-"+acc.aura:""}">
          <div class="iconclip">
            <svg class="pgauge" viewBox="0 0 64 64"><circle class="bg" cx="32" cy="32" r="28"/><circle class="fg" cx="32" cy="32" r="28" stroke="${acc.tone}" stroke-dasharray="${acc.circumference}" stroke-dashoffset="${acc.dashoffset}"/></svg>
            <div class="sealbadge" style="background:radial-gradient(circle at 35% 30%, ${cc}, ${cc}88 70%, #1c2030)">
              ${classpicHtml(u)}
            </div>
            <span class="agegem" style="background:${acc.tone}"></span>
          </div>
        </div>
        <div class="ucard-band-info">
          <div class="ucard-band-nm">
            <span class="untext">${u.captain?"★ ":""}${u.nm}${u.surname?" "+u.surname:""}</span>
            ${rankStars(acc.stars)}
            ${statusIcons?`<span class="ustatus">${statusIcons}</span>`:""}
          </div>
        </div>
        <div class="ucard-power"><span class="ucard-power-lbl">戦力</span><span class="ucard-power-val">${Math.round(unitPower(u))}</span></div>
      </div>
      <div class="ucard-body-pad">
        ${nick}${reserveTag}${u.captain?`<span style="font-size:9.5px;color:#1a1420;background:linear-gradient(135deg,#e8c874,#b8892c);border-radius:3px;padding:0 5px;margin-left:4px;font-weight:800">★ 騎士団長</span>`:""}${u.founder?`<span style="font-size:9.5px;color:var(--gold2);border:1px solid var(--gold2);border-radius:3px;padding:0 4px;margin-left:4px">建国の志士</span>`:""}${(u.titles&&u.titles.length)?`<span style="font-size:9.5px;color:var(--dim);margin-left:4px" title="${u.titles.map(k=>{const t=TITLE_DB.find(x=>x.key===k);return t?t.name:"";}).filter(Boolean).join("・")}">称号×${u.titles.length}</span>`:""}${traitBadge(u)}
        <div class="usub"><span>${JOB_TREES[u.cls].label}・${displayJobName(u)}${u.awakened?"":"Lv."+u.lv}・${stage.label}${stageTimingLabel(u)?`(${stageTimingLabel(u)})`:""}(${Math.floor(u.age)}歳)</span></div>
        <div class="ucard-condrow">
          <div class="ucard-condbox"><span class="ccb-lbl">調子</span><span class="ccb-val" style="color:${cond.color}">${cond.label}</span></div>
          <div class="ucard-condbox"><span class="ccb-lbl">疲労</span><span class="ccb-val" style="color:#d9b56a">${Math.round(u.fatigue||0)}/100</span></div>
        </div>
        <div class="ministat">${mini("str","腕",u.str+cardSkillEff.str)}${mini("vit","体",u.vit+cardSkillEff.vit)}${mini("int","魔",u.int+cardSkillEff.int)}${mini("agi","敏",u.agi+cardSkillEff.agi)}${mini("wis","知",u.wis+cardSkillEff.wis)}${mini("lead","統",u.lead+cardSkillEff.lead)}</div>
        <div class="uexp" title="次の昇進までの経験値"><i style="width:${Math.min(100,u.exp/need*100)}%"></i></div>
      </div>
    </div>`;
  }
  if(S.instructors.length){
    h+=`<div style="font-size:11px;color:var(--dim);margin:12px 0 6px;letter-spacing:.15em">── 指南役(教官) ──</div>`;
    for(const u of S.instructors){
      const acc=cardAccent(u);
      const cc=CLASS_COLOR[u.cls];
      h+=`<div class="ucard mat-${acc.material}" data-uid="${u.id}" style="opacity:.9;cursor:pointer;--m-tone:${cc}">
        <svg class="crestwm" viewBox="0 0 72 72" fill="none"><circle cx="36" cy="36" r="33" stroke="#c9a24b" stroke-width="2"/><path d="M18 46 L22 26 L30 38 L36 20 L42 38 L50 26 L54 46 Z" stroke="#c9a24b" stroke-width="2.5" fill="none" stroke-linejoin="round"/></svg>
        <div class="ucard-band" style="background:linear-gradient(135deg, ${cc}, rgba(20,27,43,.72))">
          <div class="portrait-wrap">
            <div class="sealbadge" style="inset:0;background:radial-gradient(circle at 35% 30%, ${cc}, ${cc}88 70%, #1c2030)">${classpicHtml(u)}</div>
          </div>
          <div class="ucard-band-info">
            <div class="ucard-band-nm"><span class="untext">${u.nm}${u.surname?" "+u.surname:""}</span></div>
          </div>
        </div>
        <div class="ucard-body-pad" style="padding-top:9px;padding-bottom:9px">
          <div class="usub">${JOB_TREES[u.cls].label}出身・教官(元Lv.${u.lv})</div>
        </div>
      </div>`;
    }
  }
  $("#troopList").innerHTML=h;
}
let troopListDelegationBound=false;
function bindTroopListDelegation(){
  if(troopListDelegationBound)return;
  troopListDelegationBound=true;
  $("#troopList").addEventListener("click",e=>{
    const card=e.target.closest(".ucard[data-uid]");
    if(!card)return;
    openUnitDetailId=card.dataset.uid;jobChangeUIOpen=false;jobChangeConfirmCls=null;renderUnitDetail(card.dataset.uid);$("#panelUnitDetail").classList.add("show");
  });
}
const AGE_FLAVOR={
 young:["まだ肩に力が入りがちだが、その分伸びしろがある。","何にでも首を突っ込みたがる年頃。","失敗を恐れず前に出る、危なっかしい若さがある。","誰かの背中を追いかけるような目をしている。","まだ自分の得意不得意をよく分かっていない。"],
 peak:["最も脂の乗った時期。迷いなく槍を振れる。","経験と体力がちょうど噛み合っている。","周囲からの信頼も、実力に見合ってきた。","無駄な力みが抜け、動きに余裕が出てきた。","今が一番、自分を信じられる時期かもしれない。"],
 mid:["若い頃の勢いはないが、代わりに落ち着きがある。","後進の面倒を見ることが増えてきた。","無理をしない立ち回りを覚えた。","経験に裏打ちされた判断が光る。","かつての自分と、今の自分を静かに比べることがある。"],
 old:["体力の衰えを、経験で補っている。","若い者たちには、あえて多くを語らない。","戦場よりも、日々の暮らしに重きを置くようになった。","一つ一つの所作に、長年の癖が滲む。","もう無理はしない、と自分に言い聞かせている。"],
 venerable:["それでも尚、槍を置こうとはしない。","多くを見送ってきた者だけが持つ静けさがある。","今日という日を、大切に過ごしている。","若い頃の武勇伝を、時折ぽつりと語る。","この歳まで生きられたこと自体が、一つの誉れだという。"],
};
function ageFlavorFor(u){
  const stg=ageStageOf(u).key;
  const pool=AGE_FLAVOR[stg]||AGE_FLAVOR.peak;
  return pool[Math.floor(Math.random()*pool.length)];
}
function renderUnitDetail(uid){
  const u=findAnyUnit(uid);
  if(!u){
    $("#unitDetailBody").innerHTML=`<div class="udet-empty">この兵はもう名簿にいない(引退・死没などで名簿を離れた)。殿堂に記録が残っているかもしれない。</div>`;
    openUnitDetailId=null;
    return;
  }
  const j=jobFor(u.cls,u.lv,u.route);
  const tr=traitInfo(u.trait);
  const race=RACES.find(r=>r.key===u.race);
  const stage=ageStageOf(u);
  const chain=JOB_TREES[u.cls].chain;
  const isInstructor=u.role==="instructor";
  const portraitCls=u.traitTier==="legend"?"rare-legend":u.traitTier==="epic"?"rare-epic":"";
  const cond=conditionInfo(u);

  // ── ヘッダー(肖像・名前・ジョブ・種族チップ) ──
  const origin=ORIGINS.find(o=>o.key===u.origin);
  const expNeed=u.lv*10*(tr.expMult||1);
  let h=`<div class="udet-head">
    <div class="udet-portrait ${portraitCls}">${classpicHtml(u)}</div>
    <div>
      <div class="udet-name">${u.captain?'<span class="star">★</span> ':""}${u.nm}${u.surname?" "+u.surname:""}${isInstructor?"(教官)":""}${!isInstructor?`<span id="btnFavHeader" title="お気に入り" style="cursor:pointer;margin-left:6px;color:${u.favorite?"var(--gold)":"var(--dim)"}">${u.favorite?"★":"☆"}</span>`:""}</div>
      ${nicknameSpan(u)}
      <div class="udet-job">${JOB_TREES[u.cls].label}・${displayJobName(u)}${u.awakened?"":" Lv."+u.lv}</div>
      ${!isInstructor&&!u.awakened?`<div class="uexp" style="margin-top:5px;max-width:180px" title="次のレベルまでの経験値"><i style="width:${Math.min(100,u.exp/expNeed*100)}%"></i></div><div style="font-size:10px;color:var(--dim);margin-top:2px">経験値 ${Math.round(u.exp)} / ${Math.round(expNeed)}</div>`:""}
      <div class="udet-chips">
        <span class="udet-chip">${race.name}</span>
        ${origin?`<span class="udet-chip">${origin.name}</span>`:""}
        ${u.personality?`<span class="udet-chip">${u.personality}</span>`:""}
        <span class="udet-chip">${stage.label}${stageTimingLabel(u)?`(${stageTimingLabel(u)})`:""}・${Math.floor(u.age)}歳</span>
        <span class="udet-chip">在籍${Math.max(0,S.day-(u.joinDay||1))}日</span>
        ${u.bondWith?`<span class="udet-chip">戦友あり</span>`:""}
      </div>
    </div>
  </div>`;

  // ── 生い立ち ──
  if(u.backstory)h+=`<div class="udet-sec"><h4>生い立ち</h4><div style="font-size:12px;color:#d8dbe6;line-height:1.85;font-style:italic">${u.backstory}</div></div>`;

  // ── 状態(健康・調子) ──
  if(!isInstructor){
    const cond=conditionInfo(u);
    const injTier=u.injured>0?(INJURY_TIERS[u.injurySeverity]||INJURY_TIERS.moderate):null;
    h+=`<div class="udet-sec"><h4>状態</h4>
      <div class="condrow">
        <span class="condbadge" style="background:${cond.color}22;color:${cond.color};border-color:${cond.color}66">${u.injured>0?ICON_INJURED:""}${cond.label}</span>
        ${u.injured>0?`<span class="condnote">戦力が${Math.round((1-injTier.pwMult)*100)}%低下しています。療養が終わるまであと<b>${u.injured}日</b>。</span>`:`<span class="condnote">戦力への影響:${cond.pwMult>1?"+":""}${Math.round((cond.pwMult-1)*100)}%</span>`}
      </div>
      <div style="font-size:10.5px;color:var(--dim);margin-top:6px">疲労度:${Math.round(u.fatigue||0)}/100${(u.fatigue||0)>=70?"(ミッション不可)":(u.fatigue||0)>=60?"(ミッションに出せません)":""}</div>
      ${u.dungeonBusy?`<div style="font-size:10.5px;color:#c98fe8;margin-top:3px">⛏ ダンジョン探索中(あと${Math.max(0,u.dungeonBusy-S.day)}日で帰還・その間は訓練/ミッションに参加不可)</div>`:""}
      <div style="font-size:10.5px;color:var(--dim);margin-top:3px">得意なダンジョン:<span style="color:${bestDungeonTypeFor(u).color}">${bestDungeonTypeFor(u).label}</span></div>
    </div>`;
  }

  // ── ステータス(アイコン+色分けバー、スキル補正込み) ──
  if(!isInstructor){
    const maxV=500;
    const skillEff=skillEffects(u);
    const statRow=(key,base)=>{
      const d=USTAT_DEF[key];
      const bonus=skillEff[key]||0;
      const total=base+bonus;
      return `<div class="ustatbar"><span class="usicon" style="color:${d.color}">${d.icon}</span><span class="lbl">${d.lbl}</span><div class="bar"><i style="width:${Math.min(100,total/maxV*100)}%;background:linear-gradient(90deg,${d.color}99,${d.color})"></i></div><span class="val">${Math.round(total)}${bonus?`<span style="color:var(--gold2);font-size:10px;font-weight:400">(${base}${bonus>0?"+":""}${bonus})</span>`:""}</span></div>`;
    };
    h+=`<div class="udet-sec">
      <div class="powerplate">
        <div class="pplabel">戦闘力</div>
        <div class="ppvalue">${Math.round(unitPower(u))}</div>
        ${u.injured>0?`<div class="ppnote">療養中:半減中</div>`:""}
      </div>
      ${statRow("str",u.str)}${statRow("vit",u.vit)}${statRow("int",u.int)}${statRow("agi",u.agi)}${statRow("wis",u.wis)}${statRow("lead",u.lead)}
      <div class="hairline"></div>
      <div class="ustatbar"><span class="lbl" style="width:44px">士気</span><div class="bar"><i style="width:${u.moral}%;background:linear-gradient(90deg,#8fbf6f99,#8fbf6f)"></i></div><span class="val">${Math.round(u.moral)}</span></div>
      <div class="ustatbar"><span class="lbl" style="width:44px">忠誠</span><div class="bar"><i style="width:${u.loyalty}%;background:linear-gradient(90deg,#c9a24b99,#c9a24b)"></i></div><span class="val">${Math.round(u.loyalty)}</span></div>
      <div style="font-size:10.5px;color:var(--dim);margin-top:3px">士気は戦力に${cond.pwMult>=1?"+":""}${Math.round((cond.pwMult-1)*100)}%(${cond.label})${u.loyalty<25?` ／ 忠誠が低く戦力-15%`:""}</div>
      <details style="margin-top:6px"><summary style="cursor:pointer;font-size:11px;color:var(--gold2)">戦力の内訳を見る</summary>${(()=>{const b=unitPowerBreakdown(u);return `<div style="font-size:10.5px;color:var(--dim);line-height:1.9;margin-top:4px">
        主軸(${b.mainLabel})×0.45:${b.mainVal.toFixed(1)}<br>
        準軸(${b.subLabel})×0.25:${b.subVal.toFixed(1)}<br>
        軽軸(${b.lightLabel})×0.10:${b.lightVal.toFixed(1)}<br>
        ジョブ補正:${b.jobBonus.toFixed(1)} ／ Lv補正:${b.lvBonus.toFixed(1)} ／ 統率補正:${b.leadBonus.toFixed(1)}<br>
        特性補正:${b.traitBonus.toFixed(1)}${b.captainBonus?` ／ 団長補正:${b.captainBonus.toFixed(1)}`:""}<br>
        年齢係数×${b.ageMult.toFixed(2)}${b.loyaltyMult<1?` ／ 忠誠係数×${b.loyaltyMult}`:""} ／ 調子・負傷係数×${b.condMult.toFixed(2)}
      </div>`;})()}</details>
    </div>`;
  }

  // ── 年齢・寿命 ──
  {
    const variance=u.lifespanVariance||1;
    const tendency=variance>=1.1?"人一倍、健やかな体質のようだ":variance<=0.9?"あまり丈夫な質ではないようだ":"ごく人並みな健やかさのようだ";
    h+=`<div class="udet-sec"><h4>年齢・寿命</h4>
    <div style="font-size:11.5px;color:var(--dim);line-height:1.7">${race.name}――${tendency}。現在「${stage.label}」段階で、全盛期比の実効能力は<b style="color:var(--parch)">${Math.round(effectiveAgeMult(u)*100)}%</b>。</div>
    <div style="font-size:11px;color:var(--gold2);font-style:italic;margin-top:5px">――${ageFlavorFor(u)}</div>
  </div>`;
  }

  // ── ジョブの道のり ──
  {
    const baseChain=chain.slice(0,3); // 新兵/剣士/剛剣士相当(職共通の土台)
    let roadmapHtml=baseChain.map(c=>`<div style="font-size:11.5px;padding:2px 0;color:${u.lv>=c.min?'var(--gold)':'var(--dim)'}">${u.lv>=c.min?"● ":"○ "}${c.name}<span style="opacity:.6">(Lv.${c.min}〜)</span></div>`).join("");
    const eliteMin=chain[3]?.min, captainMin=chain[4]?.min, heroMin=chain[5]?.min;
    const routes=JOB_ROUTES[u.cls]||[];
    if(u.route){
      const r=routes.find(x=>x.key===u.route);
      if(r){
        roadmapHtml+=`<div style="font-size:10px;color:var(--gold2);margin:4px 0 2px;letter-spacing:.1em">――「${r.label}」の道へ――</div>`;
        roadmapHtml+=[["elite",eliteMin],["captain",captainMin],["hero",heroMin]].map(([k,min])=>`<div style="font-size:11.5px;padding:2px 0;color:${u.lv>=min?'var(--gold)':'var(--dim)'}">${u.lv>=min?"● ":"○ "}${r.names[k]}<span style="opacity:.6">(Lv.${min}〜)</span></div>`).join("");
      }
    }else{
      roadmapHtml+=`<div style="font-size:10px;color:var(--dim);margin:4px 0 2px;letter-spacing:.1em">――Lv.${eliteMin}で以下のいずれかへ分岐(選択後は変更不可)――</div>`;
      roadmapHtml+=routes.map(r=>`<div style="font-size:11px;padding:3px 0;color:var(--dim);border-left:2px solid rgba(201,162,75,.25);padding-left:8px;margin-bottom:4px">
        <span style="color:var(--gold2)">◇${r.label}</span>「${r.nickname}」<br>
        <span style="opacity:.75">${r.names.elite} → ${r.names.captain} → ${r.names.hero}</span>
      </div>`).join("");
    }
    h+=`<div class="udet-sec"><h4>ジョブ系統の道のり</h4>${roadmapHtml}</div>`;
  }

  // ── 特性 ──
  const TRAIT_TIER_LABEL={normal:"通常",rare:"レア",epic:"エピック",legend:"レジェンド"};
  h+=`<div class="udet-sec"><h4>特性</h4><div style="margin-bottom:4px">${traitBadge(u)}<span style="font-size:10px;color:var(--dim);margin-left:6px">${TRAIT_TIER_LABEL[u.traitTier]||"通常"}特性</span></div><div style="font-size:12px;color:var(--parch);margin-bottom:3px">${tr.name}</div><div style="font-size:11px;color:var(--dim)">${tr.desc}</div></div>`;

  // ── 称号(バッジは常時表示、詳細はタップで展開) ──
  if(u.titles&&u.titles.length){
    h+=`<div class="udet-sec"><h4>称号(${u.titles.length})</h4><div style="margin-bottom:6px">${titleBadges(u)}</div>`+
      `<details><summary style="cursor:pointer;font-size:11px;color:var(--gold2);margin-bottom:4px">詳しく見る</summary>`+
      u.titles.map(k=>{
        const t=TITLE_DB.find(x=>x.key===k);if(!t)return"";
        const valTxt=t.effect==="injuryMult"||t.effect==="expMult"?`×${t.value}`:`+${t.value}/日`;
        return `<div class="udet-skillrow"><b>${t.name}</b>――${t.desc}<br><span style="color:var(--gold2)">${TITLE_EFFECT_LABEL[t.effect]}${valTxt}</span></div>`;
      }).join("")+`</details></div>`;
  }

  // ── スキル(塗りバッジは常時表示、効果詳細はタップで展開) ──
  h+=`<div class="udet-sec"><h4>所有スキル(${(u.skills||[]).length}/${skillCap(u)})</h4>
    <div>${skillBadges(u)}</div>`+
    (u.skills&&u.skills.length?`<details><summary style="cursor:pointer;font-size:11px;color:var(--gold2);margin:4px 0">詳しく見る</summary>`+u.skills.map(k=>{
      const s=SKILL_DB.find(x=>x.key===k);if(!s)return"";
      return `<div class="udet-skillrow"><b>${s.name}</b>――${s.desc}<br><span style="color:var(--gold2)">${skillEffectText(s)}</span></div>`;
    }).join("")+`</details>`:"");
  h+=`</div>`;

  // ── 戦友 ──
  if(u.bondWith){const p=S.units.find(x=>x.id===u.bondWith);if(p)h+=`<div class="udet-sec"><h4>戦友</h4><div style="font-size:12px;color:var(--parch)">${p.nm}</div></div>`;}

  // ── 個人史(タイムライン、これも長くなりがちなので折りたたみ) ──
  h+=`<div class="udet-sec"><h4>個人史</h4>`+
    (u.history.length?`<details${u.history.length<=3?" open":""}><summary style="cursor:pointer;font-size:11px;color:var(--gold2);margin-bottom:6px">${u.history.length}件の記録${u.history.length<=3?"":"(タップで表示)"}</summary><div class="udet-timeline">`+[...u.history].reverse().map(e=>`<div class="titem"><span class="td">DAY ${e.day}</span>${e.text}</div>`).join("")+`</div></details>`
      :`<div class="udet-empty">まだ特筆すべき出来事はない。</div>`)+
    `</div>`;

  // ── 装備 ──
  if(!isInstructor){
    h+=`<div class="udet-sec"><h4>装備</h4>`;
    for(const slot of["weapon","armor","accessory"]){
      const inst=u.equipment&&u.equipment[slot];
      const def=inst?EQUIPMENT_DB.find(d=>d.key===inst.key):null;
      h+=`<div class="pcard" style="margin-bottom:6px">
        <div class="nm" style="font-size:12.5px"><i class="ricon ${def?`eqp-icon-${def.key}`:`eqicon-${slot}`}" style="width:16px;height:16px;margin-right:3px"></i>${EQUIP_SLOT_LABEL[slot]}</div>
        <div class="ds">${def?`${def.name}(${equipBonusText(def)})`:"未装備"}</div>
        <div style="display:flex;gap:6px;margin-top:6px">
          <button class="eq-open-btn" data-slot="${slot}" style="flex:1;background:transparent;border:1px solid var(--gold2);color:var(--gold);border-radius:6px;padding:6px;font-family:'Shippori Mincho',serif;font-size:11.5px;cursor:pointer">${def?"付け替える":"装備する"}</button>
          ${def?`<button class="eq-remove-btn" data-slot="${slot}" style="flex:1;background:transparent;border:1px solid rgba(217,122,122,.5);color:#d97a7a;border-radius:6px;padding:6px;font-family:'Shippori Mincho',serif;font-size:11.5px;cursor:pointer">外す</button>`:""}
        </div>
      </div>`;
    }
    h+=`</div>`;
  }

  // ── 会話記録 ──
  if(!isInstructor){
    const talks=u.talks||[];
    h+=`<div class="udet-sec"><h4>会話記録</h4>`+
      (talks.length?`<details><summary style="cursor:pointer;font-size:11px;color:var(--gold2);margin-bottom:6px">${talks.length}件の記録(タップで表示)</summary><div class="udet-timeline">`+[...talks].reverse().map(t=>`<div class="titem"><span class="td">DAY ${t.day}</span>${t.text}</div>`).join("")+`</div></details>`
        :`<div class="udet-empty">まだ話しかけたことはない。</div>`)+
      `<button id="btnTalk" style="margin-top:8px;width:100%;background:transparent;border:1px solid var(--gold2);color:var(--gold);border-radius:6px;padding:8px;font-family:'Shippori Mincho',serif;font-size:12px;cursor:pointer">話しかける</button>`+
      `</div>`;
  }

  // ── 操作(お気に入り・現役復帰・解雇・転職) ──
  h+=`<div class="udet-sec" style="display:flex;gap:8px;flex-wrap:wrap">`;
  h+=`<button id="btnFav" style="flex:1;min-width:120px;background:${u.favorite?"linear-gradient(180deg,#e6c579,var(--gold))":"transparent"};color:${u.favorite?"#2a2000":"var(--gold)"};border:1px solid var(--gold2);border-radius:6px;padding:9px;font-family:'Shippori Mincho',serif;font-weight:700;font-size:12.5px;cursor:pointer">${u.favorite?"★ お気に入り中":"☆ お気に入りにする"}</button>`;
  if(isInstructor){
    h+=`<button id="btnReactivate" style="flex:1;min-width:120px;background:transparent;color:var(--parch);border:1px solid rgba(201,162,75,.5);border-radius:6px;padding:9px;font-family:'Shippori Mincho',serif;font-weight:700;font-size:12.5px;cursor:pointer">現役に復帰させる</button>`;
  }else{
    const dc=dismissCost(u);
    const jc=churchJobChangeCost(u);
    h+=`<button id="btnJobChange" style="flex:1;min-width:120px;background:transparent;color:${S.gold>=jc?"var(--gold)":"var(--dim)"};border:1px solid ${S.gold>=jc?"var(--gold2)":"rgba(255,255,255,.15)"};border-radius:6px;padding:9px;font-family:'Shippori Mincho',serif;font-weight:700;font-size:12px;cursor:pointer">教会で転職させる(費用${jc})</button>`;
    if(dismissConfirmId!==u.id)h+=`<button id="btnDismiss" style="flex:1;min-width:120px;background:transparent;color:#d97a7a;border:1px solid rgba(217,122,122,.5);border-radius:6px;padding:9px;font-family:'Shippori Mincho',serif;font-weight:700;font-size:12px;cursor:pointer">解雇する(解雇金${dc}・民心-)</button>`;
    if(jobChangeUIOpen&&!jobChangeConfirmCls){
      const others=Object.keys(JOB_TREES).filter(k=>k!==u.cls);
      h+=`<div style="width:100%;display:flex;gap:6px;flex-wrap:wrap;margin-top:2px">`+
        others.map(k=>`<button class="jc-pick-btn" data-cls="${k}" style="flex:1;min-width:90px;background:transparent;border:1px solid var(--gold2);color:var(--parch);border-radius:6px;padding:8px;font-family:'Shippori Mincho',serif;font-size:12px;cursor:pointer">${JOB_TREES[k].label}へ</button>`).join("")+
        `</div>`;
    }else if(jobChangeConfirmCls){
      const willRewind=u.lv>20;
      h+=`<div class="pcard" style="width:100%;border-color:#d9b56a;margin-top:4px">
        <div class="nm" style="color:#d9b56a">本当に${JOB_TREES[u.cls].label}から${JOB_TREES[jobChangeConfirmCls].label}へ転職させますか?</div>
        <div class="ds">この操作は取り消せません。所持スキル・特性・忠誠・年齢などはそのまま引き継がれます。</div>
        ${willRewind?`<div class="ds" style="color:#d97a7a;font-weight:700;margin-top:4px">現在Lv.${u.lv}ですが、転職により新しい道の熟練度としてLv.20まで巻き戻ります(ステータスの伸びそのものは失われません)。</div>`:`<div class="ds" style="margin-top:4px">現在Lv.${u.lv}のため、レベルはそのまま引き継がれます。</div>`}
        <div style="display:flex;gap:6px;margin-top:8px">
          <button id="jcConfirmYes" style="flex:1;background:linear-gradient(180deg,#e0be6f,var(--gold));color:var(--ink);border:none;border-radius:6px;padding:9px;font-family:'Shippori Mincho',serif;font-weight:800;cursor:pointer">承知の上で転職させる</button>
          <button id="jcConfirmNo" style="flex:1;background:transparent;border:1px solid var(--dim);color:var(--dim);border-radius:6px;padding:9px;font-family:'Shippori Mincho',serif;cursor:pointer">やめておく</button>
        </div>
      </div>`;
    }
    if(dismissConfirmId===u.id){
      h+=`<div class="pcard" style="width:100%;border-color:#d97a7a;margin-top:4px">
        <div class="nm" style="color:#d97a7a">本当に${u.nm} ${u.surname||""}を解雇しますか?</div>
        <div class="ds">この操作は取り消せません。解雇金${dc}Gがかかり、民心も下がります。</div>
        <div style="display:flex;gap:6px;margin-top:8px">
          <button id="dismissConfirmYes" style="flex:1;background:linear-gradient(180deg,#d97a7a,#a85454);color:#fff;border:none;border-radius:6px;padding:9px;font-family:'Shippori Mincho',serif;font-weight:800;cursor:pointer">解雇する</button>
          <button id="dismissConfirmNo" style="flex:1;background:transparent;border:1px solid var(--dim);color:var(--dim);border-radius:6px;padding:9px;font-family:'Shippori Mincho',serif;cursor:pointer">やめておく</button>
        </div>
      </div>`;
    }
  }
  h+=`</div>`;
  $("#unitDetailBody").innerHTML=h;
  const favBtn=$("#btnFav");
  if(favBtn)favBtn.onclick=()=>{u.favorite=!u.favorite;renderUnitDetail(uid);refreshOpenPanels();};
  const favBtnHeader=$("#btnFavHeader");
  if(favBtnHeader)favBtnHeader.onclick=()=>{u.favorite=!u.favorite;renderUnitDetail(uid);refreshOpenPanels();};
  const talkBtn=$("#btnTalk");
  if(talkBtn)talkBtn.onclick=()=>{talkToUnit(u);renderUnitDetail(uid);save();};
  $("#unitDetailBody").querySelectorAll(".eq-open-btn").forEach(b=>b.onclick=()=>{
    equipSelectUnitId=uid;equipSelectSlot=b.dataset.slot;renderEquipSelect();
  });
  $("#unitDetailBody").querySelectorAll(".eq-remove-btn").forEach(b=>b.onclick=()=>{
    unequipItem(uid,b.dataset.slot);renderUnitDetail(uid);refreshOpenPanels();save();
  });
  const reBtn=$("#btnReactivate");
  if(reBtn)reBtn.onclick=()=>{reactivateInstructor(u);$("#panelUnitDetail").classList.remove("show");};
  const dismissBtn=$("#btnDismiss");
  if(dismissBtn)dismissBtn.onclick=()=>{dismissConfirmId=u.id;renderUnitDetail(uid);};
  const dismissYes=$("#dismissConfirmYes");
  if(dismissYes)dismissYes.onclick=()=>{dismissConfirmId=null;dismissUnit(u);$("#panelUnitDetail").classList.remove("show");};
  const dismissNo=$("#dismissConfirmNo");
  if(dismissNo)dismissNo.onclick=()=>{dismissConfirmId=null;renderUnitDetail(uid);};
  const jcBtn=$("#btnJobChange");
  if(jcBtn)jcBtn.onclick=()=>{jobChangeUIOpen=!jobChangeUIOpen;jobChangeConfirmCls=null;renderUnitDetail(uid);};
  $("#unitDetailBody").querySelectorAll(".jc-pick-btn").forEach(b=>b.onclick=()=>{jobChangeConfirmCls=b.dataset.cls;renderUnitDetail(uid);});
  const jcYes=$("#jcConfirmYes");
  if(jcYes)jcYes.onclick=()=>{const cls=jobChangeConfirmCls;jobChangeConfirmCls=null;performChurchJobChange(uid,cls);};
  const jcNo=$("#jcConfirmNo");
  if(jcNo)jcNo.onclick=()=>{jobChangeConfirmCls=null;renderUnitDetail(uid);};
}
function dismissCost(u){return Math.round(15+unitPower(u)*0.6);}
function dismissUnit(u){
  const cost=dismissCost(u);
  const moodHit=u.lv>=22?3:u.lv>=12?2:1;
  S.gold-=cost;
  S.mood=Math.max(0,S.mood-moodHit);
  if(u.captain){S.flags.knightOrder=false;S.captainId=null;}
  releaseUniqueIfHolder(u);
  if(u.bondWith){const p=S.units.find(x=>x.id===u.bondWith);if(p){p.bondWith=null;p.moral=Math.max(0,p.moral-10);unitHistory(p,`戦友${u.nm}が解雇されたと知り、しばらく塞ぎ込んでいた。`);}}
  S.units=S.units.filter(x=>x.id!==u.id);
  chron(`――${u.nm}は解雇された。解雇金${cost}が支払われ、静かに村を去っていった。`,"grave");
  clamp();render();renderTroops();save();
}
function reactivateInstructor(u){
  S.instructors=S.instructors.filter(x=>x.id!==u.id);
  u.role="active";u.retiredAskedStage=null;
  S.units.push(u);
  chron(`――${u.nm}が指南役から現役に復帰した。「まだまだ、体は動きます」`,"big");
  clamp();render();renderTroops();save();
}
