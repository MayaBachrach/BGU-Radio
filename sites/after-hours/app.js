/* after-hours: self-contained player, archive, routing, animations, and page behavior. */
(async () => {
  'use strict';
  const byId = id => document.getElementById(id);
  const all = selector => Array.from(document.querySelectorAll(selector));
  const stationResponse = await fetch('../data/station.json');
  if (!stationResponse.ok) throw new Error('Station data unavailable');
  const station = await stationResponse.json();
  const assets = window.BGU_ASSETS || {};
  // Curated station images come from the same JSON as the archive and stream.
  for (const img of all('img[data-program-art]')) {
    const url = station.featuredCovers[img.dataset.programArt];
    if (url) img.src = assets[url] || url.replace(/^http:/, 'https:');
  }
  for (const img of all('img[data-station-photo]')) {
    const item = station.gallery[Number(img.dataset.stationPhoto)];
    if (item) img.src = assets[item[1]] || item[1];
  }
  const streamUrl = station.liveStreamUrl;
  const audio = byId('radio-audio');
  const receiver = byId('receiver');
  const external = byId('external-player');
  const records = new Map();
  const programs = new Map();
  const imageOwners = new Map();
  let catalogue = [];
  let orderedPrograms = [];
  let available = false;
  let catalogFailed = false;
  let pageSize = 32;

  const create = (tag, className, text) => {
    const element = document.createElement(tag);
    if (className) element.className = className;
    if (text != null) element.textContent = text;
    return element;
  };
  function icon(name) {
    const ns = 'http://www.w3.org/2000/svg';
    const svg = document.createElementNS(ns, 'svg');
    svg.setAttribute('class','icon');
    svg.setAttribute('aria-hidden','true');
    svg.setAttribute('viewBox','0 0 24 24');
    const use = document.createElementNS(ns,'use');
    use.setAttribute('href','#ic-' + name);
    svg.append(use);
    return svg;
  }
  function link(label, href, className = 'text-link', symbol = '') {
    const a = create('a',className,label);
    a.href = href;
    if (symbol) a.append(icon(symbol));
    return a;
  }
  function button(label, action, className = 'action', symbol = 'play') {
    const control = create('button',className);
    control.type = 'button';
    control.append(icon(symbol),create('span','',label));
    control.addEventListener('click',action);
    return control;
  }
  const programUrl = name => '#program/' + encodeURIComponent(name);
  const episodeUrl = row => '#episode/' + encodeURIComponent(row.source);
  function programName(row) {
    if (row.series) return row.series.trim();
    const clean = row.title.replace(/^\s*\d{1,2}[./]\d{1,2}(?:[./]\d{2,4})?\s*/,'')
      .replace(/\s*[-|–]?\s*\d{1,2}[./]\d{1,2}(?:[./]\d{2,4})?\s*$/,'')
      .replace(/\s+[-–]?\s*(?:בהגשת|hosted by)\s+.+$/i,'').replace(/^['"״]+|['"״]+$/g,'').trim();
    return clean.split(/\s+[|·–—]\s+|\s+[-–]\s+פרק|\s+פרק\s+\d/i)[0].trim() || row.title;
  }
  function stamp(value) {
    if (!value) return 0;
    if (/^\d+$/.test(value)) return Number(value)*(String(value).length<=10 ? 1000 : 1);
    return Date.parse(value) || 0;
  }
  const dateFormat = new Intl.DateTimeFormat('he-IL',{year:'numeric',month:'short',day:'numeric',timeZone:'Asia/Jerusalem'});
  const dateText = row => stamp(row.date) ? dateFormat.format(stamp(row.date)) : '';
  const validImage = url => url && /^https?:\/\//i.test(url) && !/(image_user\/|default.art|default_avatar|placeholder)/i.test(url);
  function recordArt(row) {
    return [row.artwork,row.show_artwork].find(url => validImage(url) && imageOwners.get(url)===programName(row));
  }
  function cover(title,url) {
    const frame=create('span','cover fallback');
    frame.dataset.art='';
    frame.setAttribute('aria-hidden','true');
    const type=create('span','cover-type',title);
    type.dir='auto';
    frame.append(type);
    if (url) {
      const picture=new Image();
      picture.alt=''; picture.width=320; picture.height=320;
      picture.loading='lazy'; picture.decoding='async';
      const original=url.replace(/^http:/,'https:');
      picture.addEventListener('load',()=>frame.classList.remove('fallback'));
      picture.addEventListener('error',()=>{
        if (picture.getAttribute('src')!==original) picture.src=original;
        else picture.remove();
      });
      picture.src=assets[url] || original;
      frame.append(picture);
    }
    return frame;
  }
  // Server-rendered covers use the same typographic fallback as the catalogue.
  const originals=new Map(Object.entries(assets).map(([url,local])=>[local,url]));
  for(const img of all('[data-art] img')){
    const failed=()=>{
      const remote=originals.get(img.getAttribute('src'));
      if(remote){img.src=remote;return}
      const frame=img.closest('[data-art]');
      if(frame){frame.classList.add('fallback');img.remove()}
    };
    img.addEventListener('error',failed);
    if(img.complete&&!img.naturalWidth)failed();
  }
  function episodesText(p) {
    const n=p.episodes.length;
    return n ? n===1?'הקלטה אחת':n+' הקלטות' : 'סדרה ב־'+(p.series?.platform||'ארכיון');
  }
  function sleeve(p) {
    const a=link('',programUrl(p.name),'sleeve');
    a.append(cover(p.name,p.art));
    const info=create('span','sleeve-info');
    const strong=create('strong','',p.name); strong.dir='auto';
    info.append(strong,create('small','',episodesText(p)));
    a.append(info,icon('arrow'));
    return a;
  }
  function rowLink(row, className, showArt=true) {
    const a=link('',episodeUrl(row),className);
    const name=programName(row);
    if (showArt) a.append(cover(name,recordArt(row)||programs.get(name)?.art));
    const text=create('span','row-copy');
    const title=create('strong','',row.title); title.dir='auto';
    text.append(title,create('small','row-meta',[dateText(row),row.host||row.platform].filter(Boolean).join(' · ')));
    a.append(text,icon('arrow'));
    return a;
  }
  const cleanTerm = value=>String(value||'').normalize('NFKC').toLocaleLowerCase('he').replace(/[\u0591-\u05c7"״׳']/g,'').trim();
  const query=byId('query'), source=byId('source'), groups=byId('groups'), matches=byId('matches');
  function filterArchive() {
    if (!available) return;
    const term=cleanTerm(query.value), platform=source.value;
    const filtered=orderedPrograms.filter(p=>(!platform||p.sources.has(platform)) && (!term || p.rows.some(r=>(!platform||r.platform===platform)&&r.search.includes(term))));
    const hits=term ? catalogue.filter(r=>r.kind!=='series'&&(!platform||r.platform===platform)&&r.search.includes(term)) : [];
    byId('fresh').hidden=Boolean(term||platform);
    matches.replaceChildren(); matches.hidden=!hits.length;
    if (hits.length) {
      matches.append(create('h3','','פרקים שנמצאו'));
      for (const row of hits.slice(0,pageSize)) matches.append(rowLink(row,'episode-row'));
    }
    groups.replaceChildren(...filtered.slice(0,pageSize).map(sleeve));
    byId('total').textContent=filtered.length+' תוכניות ואוספים';
    byId('empty').hidden=Boolean(filtered.length||hits.length);
    byId('more').hidden=pageSize>=Math.max(filtered.length,hits.length);
    byId('more').textContent=term?'תוצאות נוספות':'תוכניות נוספות';
  }
  function indexCatalogue(data) {
    for (const row of data) {
      if (!row.title||!row.source||records.has(row.source)) continue;
      if (String(row.platform).toLowerCase()==='mixcloud') row.platform='Mixcloud';
      const name=programName(row);
      row.search=cleanTerm([row.title,name,row.host,row.production,row.editor,row.publisher].filter(Boolean).join(' '));
      catalogue.push(row); records.set(row.source,row);
      for (const url of [row.artwork,row.show_artwork].filter(validImage)) {
        imageOwners.set(url,imageOwners.has(url)&&imageOwners.get(url)!==name?null:name);
      }
      if (!programs.has(name)) programs.set(name,{name,rows:[],episodes:[],sources:new Set()});
      const p=programs.get(name);
      p.rows.push(row); p.sources.add(row.platform);
      if(row.kind==='series') p.series=row;
      else p.episodes.push(row);
    }
    catalogue.sort((a,b)=>stamp(b.date)-stamp(a.date));
    for(const p of programs.values()){
      p.episodes.sort((a,b)=>stamp(b.date)-stamp(a.date));
      p.art=(p.series&&recordArt(p.series))||p.rows.map(r=>r.show_artwork).find(u=>validImage(u)&&imageOwners.get(u)===p.name)||p.rows.map(recordArt).find(Boolean);
    }
    const rank=p=>p.series?0:p.art&&p.episodes.length>1?1:p.art?2:3;
    orderedPrograms=[...programs.values()].sort((a,b)=>rank(a)-rank(b)||b.episodes.length-a.episodes.length||a.name.localeCompare(b.name,'he'));
    const sources=[...new Set(catalogue.map(r=>r.platform).filter(Boolean))].sort();
    for(const name of sources) source.add(new Option(name,name));
    // Show the newest recording from each collection on the discovery shelves.
    // The station publishes its BoG interviews as separate records in one batch.
    const featuredCollections=new Set();
    const latest=catalogue.filter(row=>{
      if(row.kind==='series'||!stamp(row.date))return false;
      const collection=row.title.match(/^BoG\d{4}(?=\.)/i)?.[0] || programName(row);
      if(featuredCollections.has(collection))return false;
      featuredCollections.add(collection);
      return true;
    });
    for(const shelf of all('[data-latest]')) shelf.replaceChildren(...latest.slice(0,Number(shelf.dataset.latest)).map(r=>rowLink(r,'release-row')));
    available=true;
    filterArchive();
  }
  query.oninput=()=>{pageSize=32;filterArchive()};
  source.onchange=()=>{pageSize=32;filterArchive()};
  byId('more').onclick=()=>{pageSize+=32;filterArchive()};

  let selected=null, mode='idle', state='idle', now='רדיו בן־גוריון · באר שבע', playRequest=0;
  const stateText={idle:'',loading:'מתחבר לשמע…',playing:'בהשמעה',paused:'מושהה',error:'טעינת השמע נכשלה',provider:'האזנה בנגן המקור',ended:'ההקלטה הסתיימה'};
  function setSymbol(control,name) {control.querySelector('use')?.setAttribute('href','#ic-'+name)}
  function setPanel(open) {
    byId('receiver-panel').hidden=!open;
    byId('open-panel').setAttribute('aria-expanded',String(open));
    byId('open-panel').setAttribute('aria-label',open?'מזעור הנגן':'הרחבת הנגן');
  }
  function syncTransport() {
    const active=['playing','loading','provider'].includes(state);
    const livePlaying=mode==='live'&&active;
    document.body.dataset.liveState=mode==='live'?state:'idle';
    for(const control of all('[data-live]')){
      setSymbol(control,livePlaying?'pause':'play');
      control.setAttribute('aria-pressed',String(livePlaying));
      const label=control.querySelector('[data-play-label]');
      label.dataset.idle ||= label.textContent;
      label.textContent=livePlaying?(state==='loading'?'מתחבר…':'עצירת השידור'):label.dataset.idle;
    }
    for(const label of all('[data-now]')) label.textContent=now;
    const detailControl=byId('detail').querySelector('[data-listen]');
    if(detailControl){
      const same=selected?.source===detailControl.dataset.listen;
      setSymbol(detailControl,same&&active?'pause':'play');
      detailControl.lastElementChild.textContent=same&&active?(mode==='embed'?'סגירת נגן המקור':'השהיה'):detailControl.dataset.label;
      detailControl.setAttribute('aria-pressed',String(Boolean(same&&active)));
    }
    receiver.hidden=mode==='idle' && !byId('home').hidden;
    document.body.classList.toggle('has-receiver',!receiver.hidden);
    const headline=selected?.title || (mode==='live'?now:'רדיו בן־גוריון');
    byId('dock-title').textContent=headline;byId('panel-title').textContent=headline;
    byId('dock-state').textContent=[mode==='live'||mode==='idle'?'שידור חי':selected?.platform,stateText[state]].filter(Boolean).join(' · ');
    setSymbol(byId('dock-play'),active?'pause':'play');
    byId('dock-play').setAttribute('aria-label',active?(mode==='embed'?'סגירת נגן המקור':'השהיה'):'הפעלה');
    byId('return-episode').hidden=!selected;
    if(selected) byId('return-episode').href=episodeUrl(selected);
    byId('media-source').hidden=!selected;
    if(selected) byId('media-source').href=selected.source;
    byId('timeline').hidden=mode!=='episode'||!Number.isFinite(audio.duration)||audio.duration<=0;
  }
  function announceState(value) {
    if(state!==value) byId('announce').textContent=stateText[value]||'';
    state=value;syncTransport();
  }
  function clearPlayer() {
    playRequest++;
    audio.pause();audio.removeAttribute('src'); audio.load();
    external.replaceChildren();
  }
  async function startAudio(){
    const request=++playRequest;
    announceState('loading');
    try{await audio.play()}
    catch(err){if(request===playRequest)announceState(err.name==='NotAllowedError'?'paused':'error')}
  }
  function toggleAudio(){
    if(!audio.paused||state==='loading'){playRequest++;audio.pause();announceState('paused')}
    else startAudio();
  }
  function liveToggle(){
    if(mode==='live'){toggleAudio();return}
    clearPlayer();mode='live';selected=null;state='idle';
    audio.src=streamUrl;setPanel(false);startAudio();
  }
  function listen(row){
    if(row.audio){
      if(mode==='episode'&&selected?.source===row.source){toggleAudio();return}
      clearPlayer();mode='episode';selected=row;audio.src=row.audio;
      setPanel(false);startAudio();return;
    }
    if(row.embed){
      if(mode==='embed'&&selected?.source===row.source&&state==='provider'){
        external.replaceChildren();setPanel(false);announceState('paused');return;
      }
      clearPlayer();selected=row;mode='embed';
      const frame=create('iframe');frame.title='נגן '+row.platform+' · '+row.title;
      frame.allow='autoplay; encrypted-media; fullscreen; picture-in-picture';frame.src=row.embed;
      external.append(frame);setPanel(true);announceState('provider');
    }
  }
  for(const control of all('[data-live]')) control.addEventListener('click',liveToggle);
  byId('dock-play').onclick=()=>selected?listen(selected):liveToggle();
  byId('open-panel').onclick=()=>setPanel(byId('receiver-panel').hidden);
  byId('collapse').onclick=()=>{setPanel(false);byId('open-panel').focus()};
  for(const event of ['playing','pause','waiting','error','ended']){
    audio.addEventListener(event,()=>{
      if(mode!=='live'&&mode!=='episode') return;
      if(event==='playing'&&!audio.paused) announceState('playing');
      if(event==='pause'&&audio.paused&&state==='playing') announceState('paused');
      if(event==='waiting'&&!audio.paused) announceState('loading');
      if(event==='error'&&audio.error) announceState('error');
      if(event==='ended'&&audio.ended) announceState('ended');
    });
  }
  const timeLabel=s=>Math.floor(s/60)+':'+String(Math.floor(s%60)).padStart(2,'0');
  audio.addEventListener('durationchange',syncTransport);
  audio.addEventListener('timeupdate',()=>{
    if(mode!=='episode'||!Number.isFinite(audio.duration)||audio.duration<=0)return;
    byId('seek').value=Math.round(1000*audio.currentTime/audio.duration);
    byId('times').textContent=timeLabel(audio.currentTime)+' / '+timeLabel(audio.duration);
  });
  byId('seek').oninput=()=>{if(Number.isFinite(audio.duration))audio.currentTime=audio.duration*Number(byId('seek').value)/1000};
  async function playingNow(){
    try{
      const r=await fetch(station.nowPlayingUrl);
      if(!r.ok)return;
      const data=await r.json(), title=data.now_playing?.song?.text;
      if(title){now=title;syncTransport()}
    }catch{ /* Keep the live station identification while metadata is offline. */ }
  }
  playingNow();
  setInterval(()=>{if(!document.hidden||mode==='live'&&state==='playing')playingNow()},60000);

  const detail=byId('detail');
  const names={home:'ראשי',archive:'תוכניות',gallery:'מהאולפן',contact:'צור קשר'};
  const magazine=true, pixel=false;
  function detailShell(name,art,kind,subtitle,parentLink,parentLabel) {
    const top=create('div','detail-top');
    top.append(link(parentLabel,parentLink,'text-link','back'));
    const hero=create('article','detail-hero'), main=create('div','detail-main');
    const heading=create('h1','',name); heading.dir='auto';
    hero.append(cover(name,art),main);
    main.append(create('small','kicker',kind),heading,create('p','detail-sub',subtitle));
    const body=create('section','detail-body');
    detail.replaceChildren(top,hero,body);
    return {main,body};
  }
  function showMissing(){
    const h=create('h1','',catalogFailed?'טעינת הארכיון נכשלה':available?'העמוד המבוקש לא נמצא':'הארכיון נטען…');
    detail.replaceChildren(h,link('לכל התוכניות','#archive','text-link','arrow'));
  }
  function summaryText(value) {
    if(!value)return '';
    return value.replace(/<br\s*\/?>/gi,'\n').replace(/<\/p>/gi,'\n').replace(/<[^>]+>/g,'').replace(/&amp;/g,'&').replace(/&nbsp;/g,' ').trim();
  }
  function addCredits(container,fields){
    const list=create('ul','detail-credits');
    for(const [role,value] of fields.filter(pair=>pair[1])){
      const credit=create('li');credit.append(create('b','',role),create('span','',value));list.append(credit);
    }
    if(list.childElementCount)container.append(list);
  }
  function listenButton(row) {
    const label=row.audio?'האזנה לפרק':'פתיחת נגן '+row.platform;
    const ctl=button(label,()=>listen(row),'action detail-play');
    ctl.dataset.listen=row.source;ctl.dataset.label=label;
    return ctl;
  }
  function sourceLink(row) {
    const a=link('לעמוד ב־'+row.platform,row.source,'text-link','up');
    a.target='_blank';a.rel='noopener';return a;
  }
  function renderProgram(p) {
    if(!p){showMissing();return}
    const {main,body}=detailShell(p.name,p.art,magazine?'גיליון תוכנית':pixel?'תקליט מהאוסף':'תוכנית בספרייה',
      [episodesText(p),Array.from(p.sources).join(' / ')].join(' · '),'#archive',pixel?'בחזרה לארגז':'לכל התוכניות');
    const description=summaryText(p.series?.description);
    if(description)main.append(create('p','detail-description',description));
    const hosts=[...new Set(p.rows.map(r=>r.host).filter(Boolean))];
    addCredits(main,[['הגשה',hosts.join(', ')]]);
    const actions=create('div','detail-actions');
    if(p.episodes.length){
      actions.append(link('לפרק האחרון',episodeUrl(p.episodes[0]),'action detail-play','arrow'));
    }
    if(p.series){
      if(p.series.audio||p.series.embed)actions.append(listenButton(p.series));
      actions.append(sourceLink(p.series));
    }
    main.append(actions);
    if(p.episodes.length){
      const header=create('div','section-line');
      header.append(create('h2','',magazine?'תוכן הגיליון':pixel?'רצועות בתקליט':'פרקים להאזנה'),create('span','',episodesText(p)));
      const list=create('div','episode-list');for(const row of p.episodes)list.append(rowLink(row,'episode-row'));
      body.append(header,list);
    }else if(p.series){
      body.append(create('h2','','פרקי הסדרה'),create('p','source-note','רשימת הפרקים המלאה זמינה בנגן '+p.series.platform+'.'));
    }
  }
  function renderEpisode(row) {
    if(!row){showMissing();return}
    const p=programs.get(programName(row)), s=row.kind==='series';
    const {main,body}=detailShell(row.title,recordArt(row)||p.art,s?'סדרה':magazine?'מתוך ארכיון ההקלטות':pixel?'רצועה מהארגז':'פרק להאזנה',
      [p.name,dateText(row)].filter(Boolean).join(' · '),programUrl(p.name),'לכל פרקי '+p.name);
    const actions=create('div','detail-actions');
    if(row.audio||row.embed)actions.append(listenButton(row));
    actions.append(sourceLink(row));main.append(actions);
    addCredits(main,[['הגשה',row.host],['הפקה',row.production],['עריכה',row.editor],['פרסום',row.publisher]]);
    const description=summaryText(row.description);
    if(description)body.append(create('h2','','על הפרק'),create('p','detail-description',description));
  }

  let photo=0;
  function changePhoto(step=0) {
    const list=station.gallery;photo=(photo+step+list.length)%list.length;
    const original=list[photo][1], img=byId('photo');
    img.alt='תמונה '+(photo+1)+' מתוך אלבום אולפן רדיו בן־גוריון';
    img.onerror=()=>{if(img.getAttribute('src')!==original)img.src=original};
    img.src=assets[original]||original;
    byId('count').textContent=(photo+1)+' / '+list.length;
  }
  byId('prev').onclick=()=>changePhoto(-1);byId('next').onclick=()=>changePhoto(1);
  for(const [name] of station.supporters)byId('credits').append(create('span','',name));

  const siteTitle=document.title, positions=new Map();
  let rendered='', transition=null;
  if('scrollRestoration' in history) history.scrollRestoration='manual';
  const currentHash=()=>location.hash||'#home';
  const isDetail=h=>h.startsWith('#program/')||h.startsWith('#episode/');
  function destination(hash){
    if(isDetail(hash))return 'detail';
    return Object.hasOwn(names,hash.slice(1))?hash.slice(1):'home';
  }
  function route(hash,restore=false) {
    const screen=destination(hash);
    const previous=rendered;
    rendered=hash;
    for(const s of all('[data-screen]'))s.hidden=s.dataset.screen!==screen;
    const navPage=screen==='detail'?'archive':screen;
    for(const a of all('[data-nav]')){
      if(a.dataset.nav===navPage)a.setAttribute('aria-current','page');else a.removeAttribute('aria-current');
    }
    if(screen==='detail'){
      let id='';try{id=decodeURIComponent(hash.slice(hash.indexOf('/')+1))}catch{}
      if(hash.startsWith('#episode/'))renderEpisode(records.get(id));
      else renderProgram(programs.get(id.trim()));
    }
    if(screen==='gallery'&&!byId('photo').getAttribute('src'))changePhoto();
    document.title=screen==='home'?siteTitle:((screen==='detail'?detail.querySelector('h1')?.textContent:names[screen])||'רדיו בן־גוריון')+' · '+siteTitle;
    syncTransport();
    if(previous!==hash){
      const target=restore?positions.get(hash):null;
      window.scrollTo({top:target?.y||0,behavior:'instant'});
      const visible=byId(screen);
      const focus=target?.href?[...visible.querySelectorAll('a[href]')].find(a=>a.getAttribute('href')===target.href):null;
      if(previous){const node=focus||visible.querySelector('h1')||visible;if(!focus)node.setAttribute('tabindex','-1');node.focus({preventScroll:true})}
    }
  }
  function move(hash,origin,push=true) {
    if(hash===rendered)return;
    const from=rendered;
    const outgoing=origin?.querySelector('[data-art]')||(isDetail(from)?detail.querySelector('.detail-hero>[data-art]'):null);
    const motionAllowed=!matchMedia('(prefers-reduced-motion: reduce)').matches && typeof document.body.animate==='function';
    let start=outgoing?.getBoundingClientRect();
    if(transition){
      if(transition.target===outgoing) start=transition.clone.getBoundingClientRect();
      transition.cancel();
    }
    const copy=outgoing?.cloneNode(true);
    const initialRadius=outgoing?getComputedStyle(outgoing).borderRadius:'0px';
    positions.set(from,{y:window.scrollY,href:origin?.getAttribute('href')});
    if(push)history.pushState(null,'',hash);
    route(hash,!push);
    if(!motionAllowed)return;

    if(magazine && isDetail(hash)){
      detail.querySelector('.detail-main')?.animate(
        [{opacity:.45,transform:'translateY(8px)'},{opacity:1,transform:'translateY(0)'}],
        {duration:240,easing:'cubic-bezier(.2,.7,.25,1)'});
    }
    if(!copy || !start?.width || start.bottom<0 || start.top>innerHeight)return;
    const target=isDetail(hash)?detail.querySelector('.detail-hero>[data-art]'):
      [...byId(destination(hash)).querySelectorAll('a[href]')].find(a=>a.getAttribute('href')===from)?.querySelector('[data-art]');
    if(!target)return;
    const finish=target.getBoundingClientRect();
    if(!finish.width||finish.bottom<0||finish.top>innerHeight)return;
    // Paint one cover between the two measured slots. Routing and transport stay interactive.
    const finalRadius=getComputedStyle(target).borderRadius;
    copy.classList.add('cover-flight');
    copy.setAttribute('aria-hidden','true');
    Object.assign(copy.style,{top:finish.top+'px',left:finish.left+'px',width:finish.width+'px',height:finish.height+'px',borderRadius:finalRadius});
    document.body.append(copy);
    target.style.visibility='hidden';
    const dx=start.left-finish.left, dy=start.top-finish.top;
    const animation=copy.animate([
      {transform:'translate('+dx+'px,'+dy+'px) scale('+start.width/finish.width+','+start.height/finish.height+')',borderRadius:initialRadius},
      {transform:'none',borderRadius:finalRadius}
    ],{duration:pixel?180:magazine?225:340,easing:pixel?'steps(6,end)':'cubic-bezier(.2,.76,.19,1)'});
    function clean(){
      target.style.visibility='';copy.remove();
      if(transition?.clone===copy)transition=null;
    }
    transition={target,clone:copy,cancel(){animation.cancel();clean()}};
    animation.onfinish=clean;
    animation.oncancel=()=>{if(copy.isConnected)clean()};
  }
  window.addEventListener('resize',()=>transition?.cancel());
  window.addEventListener('scroll',()=>{if(transition && Math.abs(transition.target.getBoundingClientRect().top-parseFloat(transition.clone.style.top))>2)transition.cancel()},{passive:true});
  document.addEventListener('click',event=>{
    if(event.button!==0||event.ctrlKey||event.metaKey||event.shiftKey||event.altKey)return;
    const a=event.target.closest('a[href^="#"]');
    if(!a||a.target==='_blank')return;
    const hash=a.getAttribute('href');
    if(hash==='#main-content'){event.preventDefault();byId('main-content').focus();return}
    if(!isDetail(hash)&&!Object.hasOwn(names,hash.slice(1)))return;
    event.preventDefault();move(hash,a);
  });
  window.addEventListener('hashchange',()=>move(currentHash(),null,false));
  for(const control of all('[data-shuffle]')){
    control.disabled=true;
    control.onclick=()=>{
      const playable=catalogue.filter(r=>r.kind!=='series'&&(r.audio||r.embed));
      if(!playable.length)return;
      const others=playable.filter(r=>r.source!==selected?.source);
      const pool=others.length?others:playable, row=pool[Math.floor(Math.random()*pool.length)];
      move(episodeUrl(row),null);listen(row);
    };
  }
  route(currentHash());
  fetch('../data/library.json').then(r=>{
    if(!r.ok)throw Error('Catalogue unavailable');return r.json();
  }).then(rows=>{
    indexCatalogue(rows);
    for(const control of all('[data-shuffle]'))control.disabled=false;
    if(isDetail(currentHash()))route(currentHash());
  }).catch(()=>{
    catalogFailed=true;byId('total').textContent='טעינת הארכיון נכשלה.';
    groups.replaceChildren(link('לארכיון התחנה ב־hearthis.at','https://hearthis.at/bgu-radio/','text-link','up'));
    if(isDetail(currentHash()))route(currentHash());
  });
})();