/* ---------- ダンジョン・アイテムパネル ---------- */
let dgTab="available";
let dgSelectingDungeonId=null, dgSelectedUnitIds=[];
let expSelecting=false, expSelectedUnitIds=[];
let itemRarityFilter="all";
function renderItemsPanel(){
  const items=S.items||[];
  const totalCount=items.reduce((a,i)=>a+i.count,0);
  $("#itemsSummary").textContent=`所持アイテム:${items.length}種・計${totalCount}個`;
  const rarities=["all","common","uncommon","rare","epic","legendary"];
  const rarityLabels={all:"すべて",common:"コモン",uncommon:"アンコモン",rare:"レア",epic:"エピック",legendary:"レジェンド"};
  $("#itemRarityRow").innerHTML=rarities.map(r=>`<button data-r="${r}" class="${itemRarityFilter===r?"on":""}">${rarityLabels[r]}</button>`).join("");
  $("#itemRarityRow").querySelectorAll("button").forEach(b=>b.onclick=()=>{itemRarityFilter=b.dataset.r;renderItemsPanel();});

  const rarityOrder=["legendary","epic","rare","uncommon","common"];
  let list=[...items].sort((a,b)=>{
    const da=ITEMS.find(i=>i.key===a.key),db=ITEMS.find(i=>i.key===b.key);
    return rarityOrder.indexOf(da?da.rarity:"common")-rarityOrder.indexOf(db?db.rarity:"common");
  });
  if(itemRarityFilter!=="all")list=list.filter(it=>{const def=ITEMS.find(i=>i.key===it.key);return def&&def.rarity===itemRarityFilter;});

  let h="";
  if(!list.length)h=`<div class="udet-empty">${itemRarityFilter==="all"?"まだ何も持っていない。ダンジョンやミッションで手に入ることがある。":"この階級のアイテムは持っていない。"}</div>`;
  for(const it of list){
    const def=ITEMS.find(i=>i.key===it.key);
    if(!def)continue;
    const c=RARITY_COLOR[def.rarity];
    h+=`<div class="pcard" style="border-color:${c}">
      <div class="nm" style="color:${c}"><i class="gemicon gem-${def.rarity}"></i>${def.name} ×${it.count} <span style="font-size:10px;color:var(--dim)">(${RARITY_LABEL[def.rarity]}${def.needsTarget?"・装備品":""})</span></div>
      <div class="ds">${def.desc}</div>
      <button class="item-use-btn" data-key="${it.key}" style="margin-top:8px;width:100%;background:transparent;border:1px solid ${c};color:${c};border-radius:6px;padding:8px;font-family:'Shippori Mincho',serif;font-weight:700;cursor:pointer">${def.needsTarget?"対象を選んで使用":"使用する"}</button>
    </div>`;
  }
  $("#itemsBody").innerHTML=h;
  $("#itemsBody").querySelectorAll(".item-use-btn").forEach(b=>b.onclick=()=>{
    const def=ITEMS.find(i=>i.key===b.dataset.key);
    if(def&&def.needsTarget)openItemTargetSelect(b.dataset.key);
    else{useItem(b.dataset.key);renderItemsPanel();}
  });
}
const STAT_LABEL_JA={str:"腕力",vit:"体力",int:"魔力",agi:"敏捷",wis:"知力",lead:"統率"};
let itemTargetItemKey=null, itemTargetSearch="", itemTargetSort="power";
function renderItemTargetSelect(){
  const itemKey=itemTargetItemKey;
  const def=ITEMS.find(i=>i.key===itemKey);
  if(!def)return;
  $("#itemTargetTitle").textContent=`${def.name}の対象を選ぶ`;
  let list=S.units;
  if(itemTargetSearch.trim())list=list.filter(u=>fullName(u).includes(itemTargetSearch.trim()));
  if(itemTargetSort==="power")list=[...list].sort((a,b)=>unitPower(b)-unitPower(a));
  else if(itemTargetSort==="lv")list=[...list].sort((a,b)=>b.lv-a.lv);
  else if(itemTargetSort==="fatigue")list=[...list].sort((a,b)=>(b.fatigue||0)-(a.fatigue||0));
  const sortBtn=(key,label)=>`<button class="itg-sort-btn" data-s="${key}" style="flex:1;background:${itemTargetSort===key?"var(--gold)":"transparent"};color:${itemTargetSort===key?"var(--ink)":"var(--dim)"};border:1px solid var(--gold2);border-radius:6px;padding:7px;font-family:'Shippori Mincho',serif;font-size:11.5px;cursor:pointer">${label}</button>`;
  let h=`<div class="ds" style="margin-bottom:8px">${def.desc}</div>`;
  h+=`<input id="itemTargetSearchInput" type="text" placeholder="名前で検索..." value="${itemTargetSearch.replace(/"/g,"&quot;")}" style="width:100%;box-sizing:border-box;background:rgba(0,0,0,.25);border:1px solid rgba(201,162,75,.35);color:var(--parch);border-radius:6px;padding:8px 10px;font-family:'Zen Old Mincho',serif;margin-bottom:8px">`;
  h+=`<div style="display:flex;gap:6px;margin-bottom:10px">${sortBtn("power","戦力順")}${sortBtn("lv","Lv順")}${sortBtn("fatigue","疲労順")}</div>`;
  if(!list.length)h+=`<div class="udet-empty">対象となる兵がいない。</div>`;
  for(const u of list){
    h+=`<button class="item-target-pick" data-id="${u.id}" style="display:block;width:100%;text-align:left;background:transparent;border:1px solid rgba(201,162,75,.3);color:var(--parch);border-radius:6px;padding:10px;margin-bottom:6px;font-family:'Zen Old Mincho',serif;cursor:pointer">
      ${fullName(u)} <span style="font-size:11px;color:var(--dim)">${JOB_TREES[u.cls].label}・Lv.${u.lv}・戦力${Math.round(unitPower(u))}・疲労${u.fatigue||0}</span><br>
      ${def.statKey?`<span style="font-size:11px;color:var(--dim)">現在の${STAT_LABEL_JA[def.statKey]||""}:${u[def.statKey]}${def.amount?` → ${u[def.statKey]+def.amount}`:""}</span>`:""}
    </button>`;
  }
  $("#itemTargetBody").innerHTML=h;
  $("#itemTargetBody").querySelectorAll(".item-target-pick").forEach(b=>b.onclick=()=>{
    useItem(itemKey,b.dataset.id);
    $("#panelItemTarget").classList.remove("show");
    renderItemsPanel();
  });
  $("#itemTargetBody").querySelectorAll(".itg-sort-btn").forEach(b=>b.onclick=()=>{itemTargetSort=b.dataset.s;renderItemTargetSelect();});
  const searchInput=$("#itemTargetSearchInput");
  if(searchInput){
    searchInput.oninput=()=>{
      itemTargetSearch=searchInput.value;
      const pos=searchInput.selectionStart;
      renderItemTargetSelect();
      const again=$("#itemTargetSearchInput");
      if(again){again.focus();again.setSelectionRange(pos,pos);}
    };
  }
}
function openItemTargetSelect(itemKey){
  itemTargetItemKey=itemKey;
  itemTargetSearch="";
  renderItemTargetSelect();
  $("#panelItemTarget").classList.add("show");
}

/* ---------- 遠征(長期派遣):5人編成で60〜90日派遣し、道中日誌と共にまとまった報酬を得る ---------- */
const EXPEDITION_LONG_MIN_DAYS=60, EXPEDITION_LONG_MAX_DAYS=90;
const EXPEDITION_JOURNAL_LINES=[
 "見知らぬ街道を進み、小さな宿場町で一晩を明かした。","山越えの途中、思わぬ近道を見つけて時間を稼いだ。",
 "旅の商人と道連れになり、道中の話に花が咲いた。","急な雨に見舞われたが、洞窟で雨宿りをしてやり過ごした。",
 "廃墟となった旧街道の跡地で、奇妙な遺物を目にした。","国境の関所で足止めを食らったが、無事に通過できた。",
 "野営の夜、遠くから獣の遠吠えが聞こえてきた。","地元の猟師から、この先の道について助言をもらった。",
 "橋が流されており、迂回路を探すことになった。","見晴らしのいい丘に出て、しばし旅の疲れを癒やした。",
 "見知らぬ集落で、思いがけず歓待を受けた。","荷が重くなり、交代しながら担いで進んだ。",
];
let longExpResultQueue=[];
function dispatchLongExpedition(unitIds){
  const eligible=S.units.filter(u=>u.injured<=0&&(u.fatigue||0)<60&&!u.dungeonBusy&&!u.campUntil);
  const squad=unitIds.map(id=>eligible.find(u=>u.id===id)).filter(Boolean).slice(0,5);
  if(squad.length<5){chron("遠征には5人の部隊が必要。","sys");return;}
  const dur=ri(EXPEDITION_LONG_MIN_DAYS,EXPEDITION_LONG_MAX_DAYS);
  const id=Math.random().toString(36).slice(2,9);
  const resolveDay=S.day+dur;
  for(const u of squad)u.dungeonBusy=resolveDay;
  recordSquadSortie(squad);
  S.longExpeditions=S.longExpeditions||[];
  S.longExpeditions.push({id,squadIds:squad.map(u=>u.id),resolveDay,duration:dur});
  (S.scheduled[resolveDay]=S.scheduled[resolveDay]||[]).push("__expedition_long_resolve__"+id);
  chron(`${squad.map(fullName).join("・")}が遠征に出発した。${dur}日後に戻る予定。`,"big");
  clamp();render();renderTroops();refreshOpenPanels();save();
}
function resolveLongExpedition(id){
  const idx=(S.longExpeditions||[]).findIndex(x=>x.id===id);
  if(idx<0)return;
  const exp=S.longExpeditions[idx];
  const squad=(exp.squadIds||[]).map(uid=>S.units.find(u=>u.id===uid)).filter(Boolean);
  for(const u of squad)u.dungeonBusy=null;
  S.longExpeditions.splice(idx,1);
  if(!squad.length){chron("遠征に出た部隊と、連絡が取れなくなっている。","grave");save();return;}
  const power=squadEffectivePower(squad,null);
  const avgLv=squad.reduce((a,u)=>a+u.lv,0)/squad.length;
  const threshold=40+avgLv*3.2;
  const roll=power/threshold*100+rnd(-20,20);
  const tier=roll>=165?"great":roll>=105?"success":roll>=60?"fail":"critical";
  const jpool=[...EXPEDITION_JOURNAL_LINES];
  const journal=[];
  const jn=ri(3,4);
  for(let i=0;i<jn&&jpool.length;i++)journal.push(jpool.splice(Math.floor(Math.random()*jpool.length),1)[0]);
  let goldGain=0,itemGained=null,equipGained=null,dungeonFound=null,died=null;
  if(tier==="great"||tier==="success"){
    goldGain=Math.round((tier==="great"?ri(180,320):ri(90,180))*(1+avgLv/80));
    apply({gold:goldGain,st:{economy:1},mood:2});
    for(const u of squad){const g=Math.round((tier==="great"?ri(20,32):ri(10,18))*(1+avgLv/60));u.exp+=g;processLevelUps(u);}
    const dropCount=tier==="great"?ri(1,2):(Math.random()<0.5?1:0);
    for(let i=0;i<dropCount;i++){const it=rollItemDrop(tier==="great"?"rare":"uncommon");if(it){addItem(it.key);itemGained=it;}}
    if(Math.random()<(tier==="great"?0.35:0.15)){const eq=rollEquipmentDrop(tier==="great"?"rare":"uncommon");if(eq){addEquipment(eq.key);equipGained=eq;}}
    if(Math.random()<(tier==="great"?0.5:0.25))dungeonFound=checkDungeonDiscovery(1.4,squad[0]);
    chron(`――遠征部隊が無事に帰還した。${squad.map(fullName).join("・")}が、${goldGain}Gと共に戻ってきた。`,"big");
  }else{
    goldGain=Math.round(ri(10,30));
    apply({gold:goldGain,mood:-2});
    const hurtOnes=[...squad].sort(()=>Math.random()-.5).slice(0,Math.max(1,Math.round(squad.length*(tier==="critical"?0.6:0.3))));
    for(const u of hurtOnes)inflictInjury(u,tier==="critical"?[0.2,0.4,0.4]:[0.6,0.3,0.1]);
    if(tier==="critical"){
      const deathChance=0.12*(1-Math.min(0.55,S.st.order*0.0055));
      if(Math.random()<deathChance){
        const victim=squad[Math.floor(Math.random()*squad.length)];
        died=victim;removeUnitById(victim.id,"loss");
        chron(`――遠征部隊に悲報が届いた。${fullName(victim)}は、ついに帰らぬ人となった。`,"grave");
      }
    }
    chron(`遠征部隊が苦難の末に帰還した。${tier==="critical"?"多くの犠牲を払うこととなった。":"当初の見込みほどの成果は得られなかった。"}`,"grave");
  }
  const rIdx=longExpResultQueue.length;
  longExpResultQueue.push({squad,tier,goldGain,itemGained,equipGained,dungeonFound,journal,died});
  pushEvent("__longexp_result__"+rIdx);
  clamp();render();renderTroops();refreshOpenPanels();save();
}
function buildLongExpeditionResultEvent(idx){
  const r=longExpResultQueue[idx];
  if(!r)return null;
  const tierLabel={great:"大成功",success:"成功",fail:"苦戦",critical:"大失敗"}[r.tier];
  let body=`道中日誌:\n${r.journal.map(j=>"・"+j).join("\n")}\n\n結果:${tierLabel}\n獲得ゴールド:${r.goldGain}G`;
  if(r.itemGained)body+=`\n持ち帰ったアイテム:「${r.itemGained.name}」`;
  if(r.equipGained)body+=`\n持ち帰った装備:「${r.equipGained.name}」`;
  if(r.dungeonFound)body+=`\n道中、新たな「${r.dungeonFound.name}」への入口も見つけたという。`;
  if(r.died)body+=`\n――${fullName(r.died)}は、ついに帰らぬ人となった。`;
  return{tag:"遠征帰還",title:`遠征部隊、帰還(${tierLabel})`,body,choices:[{label:"分かった",fx:{}}]};
}
function renderDungeonPanel(){
  const cleared=S.dungeonsCleared||0;
  let summary=`累計踏破:${cleared}件`;
  if(S.flags.demonLordDefeated)summary+=` ／ <span style="color:#e8c874">魔王討伐済み</span>`;
  else if(S.flags.demonLordDungeonUnlocked)summary+=` ／ <span style="color:#d97a7a">「魔王の玉座」出現中</span>`;
  else if(S.flags.demonNoticed)summary+=` ／ 魔王軍対応Lv.${S.demonArmyLevel||0}`;
  $("#dgSummary").innerHTML=summary;
  const tabs=[["available","探索可能"],["active","進行中"],["expedition","遠征"]];
  $("#dgTabRow").innerHTML=tabs.map(([k,l])=>{
    const n=k==="available"?(S.availableDungeons||[]).length:k==="active"?(S.activeDungeons||[]).length:(S.longExpeditions||[]).length;
    return `<button data-t="${k}" class="${dgTab===k?"on":""}">${l}${n?`(${n})`:""}</button>`;
  }).join("");
  $("#dgTabRow").querySelectorAll("button").forEach(b=>b.onclick=()=>{dgTab=b.dataset.t;renderDungeonPanel();});
  let h="";
  if(dgTab==="expedition"&&!dgSelectingDungeonId){
    if(expSelecting){
      const eligible=S.units.filter(u=>u.injured<=0&&(u.fatigue||0)<60&&!u.dungeonBusy&&!u.campUntil);
      const selSquad=expSelectedUnitIds.map(id=>eligible.find(u=>u.id===id)).filter(Boolean);
      h+=`<div class="pcard" style="border-color:var(--gold2)">
        <div class="nm" style="color:var(--gold)">遠征部隊の編成</div>
        <div class="ds">5人ちょうどで編成し、60〜90日の長期派遣に出す。ゴールド・アイテム・新規ダンジョン発見を狙う。期間中は他の任務に出せない。</div>
        <div class="ds">選択中:${selSquad.length}/5人</div>
      </div>`;
      if((S.squads||[]).some(s=>s.unitIds&&s.unitIds.length===5)){
        h+=`<div style="display:flex;gap:6px;margin-bottom:8px;flex-wrap:wrap">`+
          S.squads.filter(s=>s.unitIds&&s.unitIds.length===5).map(s=>`<button class="exp-squad-quick" data-i="${s.id}" style="flex:1;min-width:90px;background:transparent;border:1px solid var(--gold2);color:var(--gold);border-radius:6px;padding:7px;font-family:'Shippori Mincho',serif;font-size:11.5px;cursor:pointer">${s.name}を選択</button>`).join("")+
          `</div>`;
      }
      if(!eligible.length)h+=`<div class="udet-empty">派遣できる兵がいない(全員が負傷中・疲労・出払い中)。</div>`;
      for(const u of eligible){
        const picked=expSelectedUnitIds.includes(u.id);
        const cc=CLASS_COLOR[u.cls];
        h+=`<div class="pcard" style="${picked?`border-color:var(--gold);background:rgba(201,162,75,.1)`:""}">
          <div class="exp-unit-pick" data-id="${u.id}" style="cursor:pointer;display:flex;align-items:center;gap:9px">
            <div class="pcard-portrait" style="background:radial-gradient(circle at 35% 30%, ${cc}, ${cc}88 70%, #1c2030)">${classpicHtml(u)}</div>
            <div style="flex:1;min-width:0">
              <div class="nm"><i class="cbicon ${picked?"on":"off"}"></i>${fullName(u)} <span style="font-size:11px;color:var(--dim);font-weight:400">${JOB_TREES[u.cls].label}・Lv.${u.lv}</span></div>
              <div class="ds">戦力${Math.round(unitPower(u))}</div>
            </div>
          </div>
        </div>`;
      }
      h+=`<div style="display:flex;gap:6px;margin-top:10px">
        <button id="expDispatchConfirm" ${selSquad.length===5?"":"disabled"} style="flex:1;background:${selSquad.length===5?"linear-gradient(180deg,#e0be6f,var(--gold))":"rgba(255,255,255,.08)"};color:${selSquad.length===5?"var(--ink)":"var(--dim)"};border:none;border-radius:6px;padding:10px;font-family:'Shippori Mincho',serif;font-weight:800;cursor:${selSquad.length===5?"pointer":"default"}">この5人で遠征に出す</button>
        <button id="expDispatchCancel" style="flex:1;background:transparent;border:1px solid var(--dim);color:var(--dim);border-radius:6px;padding:10px;font-family:'Shippori Mincho',serif;cursor:pointer">戻る</button>
      </div>`;
      $("#dgBody").innerHTML=h;
      $("#dgBody").querySelectorAll(".exp-unit-pick").forEach(el=>el.onclick=()=>{
        const id=el.dataset.id;
        const i=expSelectedUnitIds.indexOf(id);
        if(i>=0)expSelectedUnitIds.splice(i,1);
        else if(expSelectedUnitIds.length<5)expSelectedUnitIds.push(id);
        renderDungeonPanel();
      });
      $("#dgBody").querySelectorAll(".exp-squad-quick").forEach(el=>el.onclick=()=>{
        const sq=(S.squads||[]).find(s=>s.id===el.dataset.i);
        if(!sq)return;
        expSelectedUnitIds=sq.unitIds.filter(id=>eligible.some(u=>u.id===id));
        renderDungeonPanel();
      });
      const confirmBtn=$("#expDispatchConfirm");
      if(confirmBtn)confirmBtn.onclick=()=>{
        const ids=[...expSelectedUnitIds];
        expSelecting=false;expSelectedUnitIds=[];
        dispatchLongExpedition(ids);
        renderDungeonPanel();
      };
      $("#expDispatchCancel").onclick=()=>{expSelecting=false;expSelectedUnitIds=[];renderDungeonPanel();};
      return;
    }
    const list=S.longExpeditions||[];
    const eligibleCount=S.units.filter(u=>u.injured<=0&&(u.fatigue||0)<60&&!u.dungeonBusy&&!u.campUntil).length;
    h+=`<div class="pcard" style="border-color:var(--gold2)">
      <div class="nm" style="color:var(--gold)"><i class="icon-expedition"></i>遠征</div>
      <div class="ds">5人編成で60〜90日の長期派遣に出し、ゴールド・アイテム・新規ダンジョン発見を狙う。期間中、部隊は他の任務に出せない。</div>
      <button id="expStartBtn" ${eligibleCount>=5?"":"disabled"} style="margin-top:8px;width:100%;background:${eligibleCount>=5?"linear-gradient(180deg,#e0be6f,var(--gold))":"rgba(255,255,255,.08)"};color:${eligibleCount>=5?"var(--ink)":"var(--dim)"};border:none;border-radius:6px;padding:9px;font-family:'Shippori Mincho',serif;font-weight:800;cursor:${eligibleCount>=5?"pointer":"default"}">5人編成で遠征に出す${eligibleCount<5?"(派遣可能な兵が5人未満)":""}</button>
    </div>`;
    if(!list.length)h+=`<div class="udet-empty">現在、遠征中の部隊はいない。</div>`;
    for(const ex of list){
      const squad=(ex.squadIds||[]).map(id=>S.units.find(u=>u.id===id)).filter(Boolean);
      const total=ex.duration||1;
      const left=Math.max(0,ex.resolveDay-S.day);
      const pct=Math.min(100,Math.round((total-left)/total*100));
      h+=`<div class="pcard">
        <div class="nm"><i class="icon-expedition"></i>遠征部隊</div>
        <div class="ds">帰還まであと${left}日 ／ 派遣部隊:${squad.map(fullName).join("・")||"(不明)"}</div>
        <div class="uexp" style="margin-top:8px"><i style="width:${pct}%;background:linear-gradient(90deg,#8fbf6f99,#8fbf6f)"></i></div>
      </div>`;
    }
    $("#dgBody").innerHTML=h;
    const startBtn=$("#expStartBtn");
    if(startBtn)startBtn.onclick=()=>{expSelecting=true;expSelectedUnitIds=[];renderDungeonPanel();};
    return;
  }
  if(dgSelectingDungeonId){
    const d=(S.availableDungeons||[]).find(x=>x.id===dgSelectingDungeonId);
    if(!d){dgSelectingDungeonId=null;renderDungeonPanel();return;}
    const eligible=S.units.filter(u=>u.injured<=0&&(u.fatigue||0)<70&&!u.dungeonBusy&&!u.campUntil);
    const selSquad=dgSelectedUnitIds.map(id=>eligible.find(u=>u.id===id)).filter(Boolean);
    const synergy=squadSynergyMult(selSquad);
    const selCombined=squadEffectivePower(selSquad,d.type);
    const estPct=selSquad.length?Math.max(0,Math.min(100,Math.round((selCombined/d.requiredPower*100-105+20)/40*100))):0;
    h+=`<div class="pcard" style="border-color:${d.rarity.color||"var(--gold2)"}">
      <div class="nm" style="color:${d.rarity.color||"var(--gold)"}"><i class="icon-dungeon"></i>${d.rarity.label?`【${d.rarity.label}】`:""}${d.name}</div>
      <div class="ds">${d.type?`<span style="color:${d.type.color};font-weight:700">${d.type.label}</span> ／ `:""}目安戦力:${d.requiredPower} ／ 所要日数:${d.duration}日</div>
      <div class="ds">選択中:${selSquad.length}/5人 ${selSquad.length?`／ この編成での<span style="color:${estPct>=50?"#8fbf6f":"#d9b56a"}">推定成功率 約${estPct}%</span>`:""}${synergy>1.001?` <span style="color:var(--gold)">(連携+${Math.round((synergy-1)*100)}%)</span>`:synergy<0.999?` <span style="color:#d97a7a">(連携乱れ${Math.round((synergy-1)*100)}%)</span>`:""}</div>
    </div>`;
    h+=`<div style="font-size:11px;color:var(--dim);margin:4px 0 8px">派遣する兵を最大5人まで選べます(タップで選択/解除)</div>`;
    if((S.squads||[]).some(s=>s.unitIds&&s.unitIds.length)){
      h+=`<div style="display:flex;gap:6px;margin-bottom:8px;flex-wrap:wrap">`+
        S.squads.filter(s=>s.unitIds&&s.unitIds.length).map(s=>`<button class="dg-squad-quick" data-i="${s.id}" style="flex:1;min-width:90px;background:transparent;border:1px solid var(--gold2);color:var(--gold);border-radius:6px;padding:7px;font-family:'Shippori Mincho',serif;font-size:11.5px;cursor:pointer">${s.name}を選択</button>`).join("")+
        `</div>`;
    }
    if(!eligible.length)h+=`<div class="udet-empty">派遣できる兵がいない(全員が負傷中・疲労・出払い中)。</div>`;
    for(const u of eligible){
      const picked=dgSelectedUnitIds.includes(u.id);
      const aff=d.type?d.type.statFn(u):unitPower(u);
      const cc=CLASS_COLOR[u.cls];
      h+=`<div class="pcard" style="${picked?`border-color:var(--gold);background:rgba(201,162,75,.1)`:""}">
        <div class="dg-unit-pick" data-id="${u.id}" style="cursor:pointer;display:flex;align-items:center;gap:9px">
          <div class="pcard-portrait" style="background:radial-gradient(circle at 35% 30%, ${cc}, ${cc}88 70%, #1c2030)">${classpicHtml(u)}</div>
          <div style="flex:1;min-width:0">
            <div class="nm"><i class="cbicon ${picked?"on":"off"}"></i>${u.nm} ${u.surname||""} <span style="font-size:11px;color:var(--dim);font-weight:400">${JOB_TREES[u.cls].label}・Lv.${u.lv}</span></div>
            <div class="ds">戦力${Math.round(unitPower(u))}${d.type?` ／ ${d.type.label}適性${Math.round(aff)}`:""}</div>
          </div>
        </div>
        <button class="dg-unit-detail" data-id="${u.id}" style="margin-top:6px;width:100%;background:transparent;border:1px solid rgba(201,162,75,.35);color:var(--dim);border-radius:6px;padding:6px;font-size:11.5px;font-family:'Zen Old Mincho',serif;cursor:pointer">能力の詳細を見る</button>
      </div>`;
    }
    h+=`<div style="display:flex;gap:6px;margin-top:10px">
      <button id="dgDispatchConfirm" ${selSquad.length?"":"disabled"} style="flex:1;background:${selSquad.length?"linear-gradient(180deg,#e0be6f,var(--gold))":"rgba(255,255,255,.08)"};color:${selSquad.length?"var(--ink)":"var(--dim)"};border:none;border-radius:6px;padding:10px;font-family:'Shippori Mincho',serif;font-weight:800;cursor:${selSquad.length?"pointer":"default"}">この編成で派遣する</button>
      <button id="dgDispatchCancel" style="flex:1;background:transparent;border:1px solid var(--dim);color:var(--dim);border-radius:6px;padding:10px;font-family:'Shippori Mincho',serif;cursor:pointer">戻る</button>
    </div>`;
    $("#dgBody").innerHTML=h;
    $("#dgBody").querySelectorAll(".dg-unit-pick").forEach(el=>el.onclick=()=>{
      const id=el.dataset.id;
      const i=dgSelectedUnitIds.indexOf(id);
      if(i>=0)dgSelectedUnitIds.splice(i,1);
      else if(dgSelectedUnitIds.length<5)dgSelectedUnitIds.push(id);
      renderDungeonPanel();
    });
    $("#dgBody").querySelectorAll(".dg-squad-quick").forEach(el=>el.onclick=()=>{
      const sq=(S.squads||[]).find(s=>s.id===el.dataset.i);
      if(!sq)return;
      dgSelectedUnitIds=sq.unitIds.filter(id=>eligible.some(u=>u.id===id));
      renderDungeonPanel();
    });
    $("#dgBody").querySelectorAll(".dg-unit-detail").forEach(el=>el.onclick=(ev)=>{
      ev.stopPropagation();
      openUnitDetailId=el.dataset.id;
      renderUnitDetail(el.dataset.id);
      $("#panelUnitDetail").classList.add("show");
    });
    const confirmBtn=$("#dgDispatchConfirm");
    if(confirmBtn)confirmBtn.onclick=()=>{
      const id=dgSelectingDungeonId;const ids=[...dgSelectedUnitIds];
      dgSelectingDungeonId=null;dgSelectedUnitIds=[];
      dispatchDungeon(id,ids);
      dgTab="active";renderDungeonPanel();
    };
    $("#dgDispatchCancel").onclick=()=>{dgSelectingDungeonId=null;dgSelectedUnitIds=[];renderDungeonPanel();};
    return;
  }
  if(dgTab==="available"){
    const list=S.availableDungeons||[];
    if(!list.length)h=`<div class="udet-empty">今のところ、噂に聞くダンジョンはない。ミッションに出れば見つかるかもしれない。</div>`;
    for(const d of list){
      const c=d.rarity.color;
      const est=estimateDungeonSuccess(d);
      const rateColor=est.pct>=60?"#8fbf6f":est.pct>=35?"#d9b56a":"#d97a7a";
      h+=`<div class="pcard" style="${c?`border-color:${c};box-shadow:0 0 10px ${c}55`:""}">
        <div class="nm" style="${c?`color:${c}`:""}"><i class="icon-dungeon"></i>${d.rarity.label?`【${d.rarity.label}】`:""}${d.name}</div>
        <div class="ds">${d.type?`<span style="color:${d.type.color};font-weight:700">${d.type.label}</span> ／ `:""}推奨レベル目安:${d.level} ／ 目安戦力:${d.requiredPower} ／ 所要日数:${d.duration}日</div>
        <div class="ds"><i class="icon-boss"></i>ボス:${d.bossName}(戦力${d.bossPower})</div>
        ${est.squad.length?`<div class="ds" style="margin-top:4px;padding-top:6px;border-top:1px dotted rgba(154,122,47,.25)">派遣候補(自動選抜時):${est.squad.map(fullName).join("・")}<br><span style="color:${rateColor};font-weight:700">推定成功率 約${est.pct}%</span>${est.pctGreat>5?` <span style="color:var(--gold)">(大成功 約${est.pctGreat}%)</span>`:""}${est.pctCriticalFail>10?` <span style="color:#d97a7a">(大失敗 約${est.pctCriticalFail}%)</span>`:""}</div>`:`<div class="ds" style="color:#d97a7a;margin-top:4px">派遣できる兵がいない</div>`}
        <button class="dg-go-btn" data-id="${d.id}" ${est.squad.length?"":"disabled"} style="margin-top:8px;width:100%;background:${est.squad.length?"linear-gradient(180deg,#e0be6f,var(--gold))":"rgba(255,255,255,.08)"};color:${est.squad.length?"var(--ink)":"var(--dim)"};border:none;border-radius:6px;padding:9px;font-family:'Shippori Mincho',serif;font-weight:800;cursor:${est.squad.length?"pointer":"default"}">派遣する兵を選ぶ</button>
      </div>`;
    }
  }else{
    const list=S.activeDungeons||[];
    if(!list.length)h=`<div class="udet-empty">現在、探索中の部隊はいない。</div>`;
    for(const d of list){
      const squad=(d.squadIds||[]).map(id=>S.units.find(u=>u.id===id)).filter(Boolean);
      const total=d.duration||1;
      const left=Math.max(0,d.resolveDay-S.day);
      const pct=Math.min(100,Math.round((total-left)/total*100));
      const c=d.rarity&&d.rarity.color;
      h+=`<div class="pcard" style="${c?`border-color:${c}`:""}">
        <div class="nm" style="${c?`color:${c}`:""}"><i class="icon-dungeon"></i>${d.rarity&&d.rarity.label?`【${d.rarity.label}】`:""}${d.name}</div>
        <div class="ds">${d.type?`<span style="color:${d.type.color};font-weight:700">${d.type.label}</span> ／ `:""}帰還まであと${left}日 ／ 派遣部隊:${squad.map(fullName).join("・")||"(不明)"}</div>
        <div class="uexp" style="margin-top:8px"><i style="width:${pct}%;background:linear-gradient(90deg,${c||"#8fbf6f"}99,${c||"#8fbf6f"})"></i></div>
      </div>`;
    }
  }
  $("#dgBody").innerHTML=h;
  $("#dgBody").querySelectorAll(".dg-go-btn").forEach(b=>b.onclick=()=>{
    dgSelectingDungeonId=b.dataset.id;
    const d=(S.availableDungeons||[]).find(x=>x.id===b.dataset.id);
    const eligible=S.units.filter(u=>u.injured<=0&&(u.fatigue||0)<70&&!u.dungeonBusy&&!u.campUntil);
    const size=Math.min(5,eligible.length);
    dgSelectedUnitIds=d?[...eligible].sort((a,b2)=>(d.type?d.type.statFn(b2):unitPower(b2))-(d.type?d.type.statFn(a):unitPower(a))).slice(0,size).map(u=>u.id):[];
    renderDungeonPanel();
  });
}
function renderHall(){
  const n=S.hallOfFame.length;
  const rec=S.records||{};
  let recHtml=`<div class="udet-sec"><h4><i class="icon-laurel"></i>歴代記録</h4>`;
  recHtml+=`<div class="ds">歴代最強:${rec.strongestUnit?`${rec.strongestUnit.name}(戦力${rec.strongestUnit.power}・DAY${rec.strongestUnit.day})`:"まだ記録なし"}</div>`;
  recHtml+=`<div class="ds">歴代最長寿:${rec.longestLived?`${rec.longestLived.name}(${rec.longestLived.age}歳・DAY${rec.longestLived.day})`:"まだ記録なし"}</div>`;
  recHtml+=`<div class="ds">最速英雄格到達:${rec.fastestHero?`${rec.fastestHero.name}(${rec.fastestHero.days}日・DAY${rec.fastestHero.day})`:"まだ記録なし"}</div>`;
  recHtml+=`<div class="ds">歴代最多称号:${rec.mostTitles?`${rec.mostTitles.name}(${rec.mostTitles.count}個・DAY${rec.mostTitles.day})`:"まだ記録なし"}</div>`;
  recHtml+=`<div class="ds">歴代最高国庫:${rec.richestDay?`${rec.richestDay.gold}G(DAY${rec.richestDay.day})`:"まだ記録なし"}</div>`;
  recHtml+=`</div>`;
  $("#hallSummary").innerHTML=(n?`これまでに ${n} 名が名を残した。`:"まだ殿堂入りした者はいない。隊長格以上、金・固有スキル持ち、あるいは深く戦友と結ばれた者などが、その名を刻む。")+recHtml;
  if(!n){$("#hallList").innerHTML="";return;}
  const REASON_LABEL={death:"死没",retire:"引退",loss:"戦没"};
  let h="";
  for(const r of S.hallOfFame){
    const race=RACES.find(x=>x.key===r.race);
    const hasUnique=r.skills.some(s=>s.tier==="unique");
    const hasGold=r.skills.some(s=>s.tier==="gold");
    h+=`<div class="hallcard ${hasUnique?"legend":""}">
      <div class="hh"><span class="hn">${r.wasCaptain?"★ ":""}${r.nm}${r.surname?" "+r.surname:""}</span><span class="hreason">DAY${r.day}・${REASON_LABEL[r.reason]||r.reason}</span></div>
      <div class="hjob">${JOB_TREES[r.cls].label}・${r.jobName} Lv.${r.lv}${race.key!=="human"?"・"+race.name:""}${r.wasCaptain?"・元騎士団長":""}</div>
      <div class="hepi">${r.epitaph}${r.bondPartner?` 戦友${r.bondPartner}との日々を最期まで忘れなかったという。`:""}</div>
      <div class="htags">${r.skills.filter(s=>s.tier==="unique"||s.tier==="gold"||s.tier==="silver").map(s=>`<span class="skchip t-${s.tier}">${s.name}</span>`).join("")}${(r.traitTier==="epic"||r.traitTier==="legend")?`<span class="skchip t-${r.traitTier==="legend"?"unique":"gold"}">${r.traitName}</span>`:""}</div>
    </div>`;
  }
  $("#hallList").innerHTML=h;
}
/* 経験値からレベルアップ判定を行う共通関数。exp付与箇所は必ずこれを通すこと(ミッション経験値の二重付与等のバグ修正) */
function processLevelUps(u,silent){
  const tr=traitInfo(u.trait);
  const titleExpMult=titleEffectsFor(u).expMult;
  let guard=0;
  while(guard++<30){
    const need=u.lv*10*(tr.expMult||1)/titleExpMult;
    if(u.exp<need)break;
    u.exp-=need;
    u.totalExpEarned=(u.totalExpEarned||0)+need;
    const oldTier=jobFor(u.cls,u.lv,u.route).key;
    u.lv++;
    const sb=tr.statBonus||0;
    const pr=statPriorityFor(u);
    for(const k of["str","vit","int","agi","wis","lead"]){
      const g=(k===pr.main)?ri(2,4):(k===pr.sub)?ri(1,3):ri(0,2);
      u[k]+=g+sb;
    }
    const newJob=jobFor(u.cls,u.lv,u.route);
    if(oldTier!==newJob.key){
      u.skillCapBase=Math.min(20,(u.skillCapBase||3)+ri(1,2)); // 昇格ごとに必ずスキル上限が伸びるよう強化
      if(!silent){
        const tierIndex=JOB_TREES[u.cls].chain.findIndex(c=>c.key===newJob.key)+1;
        const goldReward=Math.round(15*tierIndex*rnd(0.85,1.2));
        S.gold+=goldReward;
        u.moral=Math.min(100,u.moral+ri(3,6));
      }
      if(silent){
        // まだ仲間になっていない候補(募集候補・志願者)の生成中は、通知やポップアップを一切出さない。
        // スキル習得の抽選自体は行い、経歴として静かに積む(習得の演出は本人が仲間になってから)。
        if(newJob.key==="elite"&&!u.route){
          const routes=JOB_ROUTES[u.cls]||[];
          if(routes.length)u.route=routes[Math.floor(Math.random()*routes.length)].key;
        }
        if(newJob.key!=="hero"&&newJob.key!=="captain"&&Math.random()<(tr.skillUpChance||0.7)){
          const tierIndex=JOB_TREES[u.cls].chain.findIndex(c=>c.key===newJob.key)+1;
          trySkillUpOnPromotion(u,tierIndex);
        }
      }else if(newJob.key==="hero"){checkUniqueJobOnHero(u);grantTitle(u,"t_hero");if((u.injuryCount||0)===0)grantTitle(u,"t_unscathed");if(!u.hasJobChanged)grantTitle(u,"t_pureroute");
        if(!S.records)S.records={strongestUnit:null,longestLived:null,fastestHero:null,mostTitles:null,richestDay:null};
        const daysToHero=S.day-(u.joinDay||1);
        if(!S.records.fastestHero||daysToHero<S.records.fastestHero.days){
          S.records.fastestHero={name:`${u.nm} ${u.surname||""}`.trim(),days:daysToHero,day:S.day};
        }
        const pillarCount=(u.awakened?1:0)+1/*英雄格は今まさに達成*/+(S.uniqueHolderId===u.id?1:0);
        if(pillarCount>=2)grantTitle(u,"t_pillar");
        pushEvent("hero_"+u.id);}
      else if(newJob.key==="captain"){grantTitle(u,"t_almosthall");pushEvent("captainpromo_"+u.id);}
      else if(newJob.key==="elite"&&!u.route){if(u.age<20)grantTitle(u,"t_youngelite");pushEvent("routebranch_"+u.id);}
      else{
        chron(`${u.nm}が${newJob.name}に昇進した。`,"big");
        if(Math.random()<(tr.skillUpChance||0.7)){
          const tierIndex=JOB_TREES[u.cls].chain.findIndex(c=>c.key===newJob.key)+1;
          const learned=trySkillUpOnPromotion(u,tierIndex);
          if(learned&&(learned.tier==="gold"||learned.tier==="silver"))chron(`${u.nm}が「${learned.name}」(${SKILL_TIER_LABEL[learned.tier]})を身につけた。`,"big");
          else if(learned)unitHistory(u,`新たに「${learned.name}」の心得を得た。`);
        }
      }
    }
  }
}
/* ---------- 訓練システム(週1回・全体適用・ピックアップ選抜・大成功) ---------- */
/* ---------- 訓練システム(週1回・自動発生・グレード選択→ピックアップ→リザルト) ---------- */
const TRAIN_GRADES=[
 {key:"modest",label:"質素な訓練",costMult:0.5,gainMult:0.7},
 {key:"normal",label:"通常の訓練",costMult:1.0,gainMult:1.0},
 {key:"intense",label:"徹底した訓練",costMult:2.4,gainMult:1.7},
];
const TRAIN_SPECIAL_GRADE={key:"special",label:"特別指導(指南役同席)",costMult:3.4,gainMult:2.4};
const TRAIN_FREE_GRADE={key:"free",label:"自主訓練",costMult:0,gainMult:0.3};
function trainingCooldownLeft(){return Math.max(0,7-(S.day-(S.lastTrainDay||0)));}
function trainingBaseCost(){return 22+S.units.length*6;}
let trainingGradeChoice=null;
function buildTrainingGradeEvent(){
  if(!S.units.length)return null;
  const base=trainingBaseCost();
  const grades=[...TRAIN_GRADES];
  if(S.instructors.length)grades.push(TRAIN_SPECIAL_GRADE);
  const affordable=grades.filter(g=>S.gold>=Math.round(base*g.costMult));
  const choices=affordable.map(g=>{
    const cost=Math.round(base*g.costMult);
    return{
      label:g.label,
      hint:`費用${cost} / 効果${Math.round(g.gainMult*100)}%${g.key==="special"?`(教官${S.instructors.length}名の指導)`:""}`,
      fx:{call:()=>{
        S.gold-=cost;trainingGradeChoice=g;trainingCostPaid=cost;pushEventPriority("__training_pick__");
      }}
    };
  });
  choices.push({
    label:TRAIN_FREE_GRADE.label,hint:"費用0 / 効果35%(自分たちだけで鍛える)",
    fx:{call:()=>{trainingGradeChoice=TRAIN_FREE_GRADE;trainingCostPaid=0;pushEventPriority("__training_pick__");}}
  });
  choices.push({label:"今週は見送る",hint:"訓練を行わない",fx:{log:"今週は訓練を見送った。",call:()=>{S.lastTrainDay=S.day;}}});
  return{tag:"訓 練",title:"週次訓練:方針を決める",
   body:`今週の訓練方針を決める(兵士数:${S.units.length}名)。${affordable.length<grades.length?"国庫に余裕がなく、一部の訓練は選べない。":""}`,
   speaker:S.instructors.length?`ガレオン「指南役もおりますし、望まれるなら特別な指導もできますが」`:`ガレオン「今週も鍛えさせましょう」`,
   choices};
}
let trainingCostPaid=0;
function buildTrainingPickEvent(){
  if(!trainingGradeChoice){S.lastTrainDay=S.day;return null;}
  const eligible=S.units.filter(u=>u.injured<=0&&!u.dungeonBusy&&!u.campUntil);
  const pool=[...eligible];
  const cands=[];
  while(cands.length<5&&pool.length)cands.push(pool.splice(Math.floor(Math.random()*pool.length),1)[0]); // 重点指導の候補は毎回抽選(特定の兵に偏らないように)
  const choices=cands.map(u=>({
    label:`${u.nm} ${u.surname||""}を重点的に指導する`,
    hint:`${JOB_TREES[u.cls].label}・Lv.${u.lv}・戦力${Math.round(unitPower(u))}`,
    fx:{call:()=>resolveTraining(u,trainingGradeChoice,trainingCostPaid)}
  }));
  choices.push({label:"特定の一人は選ばない",hint:"全体訓練のみ",fx:{call:()=>resolveTraining(null,trainingGradeChoice,trainingCostPaid)}});
  return{tag:"訓練:人選",title:`${trainingGradeChoice.label}――重点指導する一人を選ぶ`,
   body:"特に鍛えたい一人がいれば選ぶ。選ばれた者は経験値が大きく伸びる。",
   choices};
}
function resolveTraining(pickUnit,grade,costPaid){
  S.lastTrainDay=S.day;
  const g=grade||TRAIN_GRADES[1];
  if(g.key==="special"){
    for(const ins of S.instructors){
      ins.mentorCount=(ins.mentorCount||0)+1;
      if(ins.mentorCount>=5)grantTitle(ins,"t_mentor5");
    }
  }
  const instructorEff=S.instructors.reduce((a,u)=>a*(skillEffects(u).instructorMult||1)*(1+(u.lead||0)*0.006),1);
  const instructorBonus=(1+Math.min(0.3,S.instructors.length*0.08))*instructorEff;
  const nationBonus=1+Math.min(0.6,(S.st.military+S.st.economy)/2*0.006); // 国力・軍事力が高いほど訓練効果が伸びる
  const results=[];
  for(const u of S.units){
    if(u.injured>0||u.dungeonBusy||u.campUntil)continue;
    const eff=skillEffects(u);
    const tr=traitInfo(u.trait);
    const isPick=pickUnit&&u.id===pickUnit.id;
    let gain=ri(3,4)*(u.gm||1)*effectiveTrainMult(u)*instructorBonus*eff.trainMult*g.gainMult*nationBonus; // 基礎乱数の幅を狭め、乗数の積み重ねによる極端なムラを抑える(平均値は維持)
    if(isPick)gain*=3.2;
    if(u.trait==="quick")gain*=1.15;
    if(u.trait==="clumsy")gain*=0.65;
    if(u.trait==="lucky"&&Math.random()<0.25)gain*=2;
    const greatChance=(isPick?0.05:0.01)*(g.key==="special"?1.5:1);
    let great=false, learnedSkill=null;
    if(Math.random()<greatChance){
      great=true;
      gain*=3.5;
      const skillChance=isPick?0.4:0.15; // 大成功してもスキル習得までは選抜対象を優遇し、非選抜はさらに絞る
      if(Math.random()<skillChance)learnedSkill=trySkillUp(u);
    }
    u.exp+=gain;
    const beforeLv=u.lv;
    const beforeJobKey=jobFor(u.cls,u.lv,u.route).key;
    processLevelUps(u);
    const afterJobKey=jobFor(u.cls,u.lv,u.route).key;
    const promotedTo=beforeJobKey!==afterJobKey?jobFor(u.cls,u.lv,u.route).name:null;
    const hurtChance=0.05*(tr.injuryMult||1)*eff.injuryMult;
    let hurt=false;
    if(!great&&Math.random()<hurtChance){inflictInjury(u,[0.8,0.18,0.02]);hurt=true;}
    results.push({u,gain:Math.round(gain),great,learnedSkill,leveled:u.lv>beforeLv,newLv:u.lv,promotedTo,hurt,isPick});
  }
  trainingGradeChoice=null;
  clamp();render();renderTroops();refreshOpenPanels();save();
  showTrainingResult(results,g,costPaid);
}
function showTrainingResult(results,grade,costPaid){
  const sorted=[...results].sort((a,b)=>(b.isPick?2:0)+(b.great?1:0)-((a.isPick?2:0)+(a.great?1:0)));
  const greatCount=results.filter(r=>r.great).length;
  const promoteCount=results.filter(r=>r.promotedTo).length;
  const levelUpCount=results.filter(r=>r.leveled&&!r.promotedTo).length;
  let h=`<div class="resultplate">
    <div class="rplabel">${grade.label}</div>
    <div class="rpsummary">${results.length}名参加${costPaid?` ／ 費用${costPaid}`:""}${greatCount?` ／ 大成功${greatCount}件`:""}${promoteCount?` ／ 昇進${promoteCount}件`:""}${levelUpCount?` ／ レベル到達${levelUpCount}件`:""}</div>
  </div>`;
  if(!sorted.length)h+=`<div class="udet-empty">今回、訓練に参加できる兵士がいなかった。</div>`;
  for(const r of sorted){
    const acc=cardAccent(r.u);
    h+=`<div class="pcard" style="${r.great?"border-color:var(--gold);box-shadow:0 0 10px rgba(201,162,75,.3)":r.hurt?"border-color:rgba(217,122,122,.5)":""}">
      <div class="nm">${r.isPick?`<span style="color:var(--gold)">★</span> `:""}${r.u.nm} ${r.u.surname||""}${r.great?`<span style="color:var(--gold);font-size:11px;margin-left:6px">◆大成功</span>`:""}</div>
      <div class="ds" style="font-size:10.5px;color:${acc.tone};margin-top:1px">${displayJobName(r.u)}${r.u.awakened?"":" Lv."+r.newLv}</div>
      <div class="ds">経験値+${r.gain}${r.leveled?(r.promotedTo?` ／ <b style="color:var(--gold)">${r.promotedTo}に昇進</b>`:` ／ Lv.${r.newLv}に到達`):""}${r.learnedSkill?` ／ スキル「${r.learnedSkill.name}」を習得`:""}${r.hurt?` ／ <span style="color:#d97a7a">軽い怪我を負った</span>`:""}</div>
    </div>`;
  }
  $("#trainResultBody").innerHTML=h;
  $("#panelTrainResult").classList.add("show");
}

/* ---------- セーブ ---------- */
const SAVE_KEY="arvein-save";
async function save(){
  const s={...S};
  const json=JSON.stringify(s);
  try{if(window.storage){await window.storage.set(SAVE_KEY,json);return;}}catch(e){}
  try{localStorage.setItem(SAVE_KEY,json);}catch(e){}
}
async function load(){
  try{if(window.storage){const r=await window.storage.get(SAVE_KEY);if(r&&r.value)return JSON.parse(r.value);}}catch(e){}
  try{const raw=localStorage.getItem(SAVE_KEY);if(raw)return JSON.parse(raw);}catch(e){}
  return null;
}
async function clearSave(){
  try{if(window.storage)await window.storage.delete(SAVE_KEY);}catch(e){}
  try{localStorage.removeItem(SAVE_KEY);}catch(e){}
}

/* ---------- タイマー ---------- */
let timer=null;
function setSpeed(sp){S.speed=sp;updateSpeedUI();restartTimer();}
function updateSpeedUI(){
  $("#spPause").classList.toggle("on",S.speed===0);
  $("#sp1").classList.toggle("on",S.speed===1);
  $("#sp2").classList.toggle("on",S.speed===2);
}
function restartTimer(){
  clearInterval(timer);
  if(S.speed===0)return;
  timer=setInterval(()=>{if(!S.eventOpen&&!document.querySelector(".panel.show"))turnTick();},S.speed===2?900:1800);
}

/* ---------- 起動 ---------- */
function boot(fromSave){
  $("#title").classList.add("hidden");
  $("#chronicle").innerHTML="";
  if(fromSave){
    while(S.log.length>LOG_CAP)S.log.shift();
    for(const e of S.log.slice(-40)){
      const el=document.createElement("div");el.className="entry "+(e.c||"");
      const icon=LOG_ICONS[e.c]||LOG_ICON_FALLBACK;
      el.innerHTML=`<span class="eicon">${icon}</span><span class="ed">DAY ${e.d}</span>${e.t}`;$("#chronicle").appendChild(el);
    }
    chron("――王国記を再開する。","sys");
  }else{
    chron("開拓歴元年。辺境の谷に、四十六人の民とともに旗代わりの布が立てられた。","big");
    chron("村の理念は一つ。「今日を生き延び、明日を望めること」。","big");
    chron("時は流れ始めた。数少ない村人たちが、それぞれの持ち場に就く。右上の ▶▶ で時を早められ、⏸ で止められる。","sys");
    chron("兵は「志願書」で迎え入れ、「ダンジョン」「遠征」「特別訓練場」へ送り出すことで育つ。下部のタブから、それぞれの様子を確かめられる。","sys");
    /* 注意:メインストーリーの day2, day4, day6... は turnTick() 内の checkFixedDayEvents で
       「day+日付」キーの自動一致により発火する。ここで重複登録しない。 */
  }
  render();updateSpeedUI();restartTimer();
  if(S.pendingEvents.length)openNext();
}
$("#startBtn").onclick=()=>{S=newState();troopFilter="all";troopSort="power";boot(false);save();};
$("#spPause").onclick=()=>setSpeed(0);
$("#sp1").onclick=()=>setSpeed(1);
$("#sp2").onclick=()=>setSpeed(2);
$("#btnProjects").onclick=()=>{renderProjects();$("#panelProjects").classList.add("show");};
$("#btnPeople").onclick=()=>{renderPeople();$("#panelPeople").classList.add("show");};
$("#btnStats").onclick=()=>{renderStatsDetail();$("#panelStats").classList.add("show");};
$("#stats").onclick=()=>{renderStatsDetail();$("#panelStats").classList.add("show");};
$("#btnTroops").onclick=()=>{renderTroops();$("#panelTroops").classList.add("show");};
bindTroopListDelegation();
$("#btnHall").onclick=()=>{renderHall();$("#panelHall").classList.add("show");};
$("#btnDungeon").onclick=()=>{renderDungeonPanel();$("#panelDungeon").classList.add("show");};
$("#btnVolunteerToggle").onclick=()=>{troopViewMode=troopViewMode==="volunteers"?"roster":"volunteers";volunteerConfirmId=null;volunteerInsufficientId=null;renderTroops();};
$("#btnCampToggle").onclick=()=>{troopViewMode=troopViewMode==="camp"?"roster":"camp";renderTroops();};
$("#btnSquadToggle").onclick=()=>{troopViewMode=troopViewMode==="squad"?"roster":"squad";renderTroops();};
$("#btnItems").onclick=()=>{renderItemsPanel();$("#panelItems").classList.add("show");};
document.querySelectorAll("[data-close]").forEach(x=>x.onclick=()=>{
  $("#"+x.dataset.close).classList.remove("show");
  if(x.dataset.close==="panelDungeonResult")setTimeout(()=>showNextDungeonResult(),350);
});

// セーブがあれば再開ボタン化
(async()=>{
  const sv=await load();
  if(sv&&sv.day>1&&sv.mood>0){
    S=sv;S.eventOpen=false;
    $("#startBtn").textContent="王国記を再開する(DAY "+sv.day+")";
    const nb=document.createElement("button");
    nb.textContent="最初から";nb.className="altbtn";
    $(".titlecard").appendChild(nb);
    nb.onclick=()=>{clearSave();S=newState();troopFilter="all";troopSort="power";boot(false);};
    $("#startBtn").onclick=()=>boot(true);
  }
})();

