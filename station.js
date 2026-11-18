window.BGU_CONTENT = {
  title: "Welcome to BGU Radio",
  subtitle: "The official Ben Gurion University internet radio station",
  tagline: "Sit back, relax and enjoy :)",
  aboutTitle: "About BGU Radio",
  about: "Welcome to the official Ben Gurion University internet radio station! We're a vibrant community of students, music lovers, and creators bringing you the best in music, talk shows, and campus culture. Sit back, relax and enjoy :)",
  galleryTitle: "Behind the Scenes",
  gallery: [
    ["BGU Radio studio 1","https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/user_68eeb6ed4dc35dcd85870d6c/b072b77e7_.jpg"],
    ["BGU Radio studio 2","https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/user_68eeb6ed4dc35dcd85870d6c/a19b11c92_WhatsAppImage2025-04-08at233617.jpg"],
    ["BGU Radio studio 3","https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/user_68eeb6ed4dc35dcd85870d6c/2e7ae9e00_WhatsAppImage2025-04-08at232226.jpg"],
    ["BGU Radio studio 4","https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/user_68eeb6ed4dc35dcd85870d6c/005962b17_PodcastinsteadofExam.jpg"],
    ["BGU Radio studio 5","https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/user_68eeb6ed4dc35dcd85870d6c/714e8be9d_SBCampus.jpg"],
    ["BGU Radio studio 6","https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/user_68eeb6ed4dc35dcd85870d6c/946221524_WhatsAppImage2025-03-25at132625.jpg"],
    ["BGU Radio studio 7","https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/user_68eeb6ed4dc35dcd85870d6c/47f2fb858_WhatsAppImage2025-03-17at134437.jpg"],
    ["BGU Radio studio 8","https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/user_68eeb6ed4dc35dcd85870d6c/aa2eab32b_WhatsAppImage2025-03-17at123323.jpg"]
  ],
  email: "bguradio2017@gmail.com",
  newsletter: "Subscribe to our newsletter and never miss updates about shows, events, and special broadcasts!",
  privacy: "We respect your privacy and will never spam you.",
  supporters: [
    ["Yazamut 360","https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/user_68eeb6ed4dc35dcd85870d6c/1f713c05d_Yazamut_logo4x.png"],
    ["Adam Corbin",""],
    ["ACUM","https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/68eebad6d828821440f9a7e3/bc4992fa2_ACUM.png"]
  ]
};
const assetRoot="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/695cb8cdaf769d5c88acb1d9/";
BGU_CONTENT.gallery.unshift(["אולפן הרדיו",assetRoot+"0b3d98af9_.jpg"]);
BGU_CONTENT.gallery.push(["מאחורי הקלעים",assetRoot+"53ad99d5c_.jpg"],["מאחורי הקלעים",assetRoot+"4b5f8bab1_.jpg"]);
BGU_CONTENT.supporters.splice(2,0,["David Breslauer",""]);

const $=id=>document.getElementById(id);
const el=(tag,txt)=>Object.assign(document.createElement(tag),{textContent:txt||''});
const live=$('stream'), play=$('onair'), deck=$('deck');
play.onclick=()=>{if(!live.paused)return live.pause();deck.replaceChildren();live.play().catch(()=>{$('song').textContent='השידור אינו זמין כרגע. אפשר לנסות שוב.'})};
function liveState(){play.textContent=live.paused?'▶  לשידור החי':'■  עצירת השידור';document.body.classList.toggle('playing',!live.paused)}
live.onplaying=live.onpause=liveState;
const mediaStyle=el('style');mediaStyle.textContent='select{font:inherit;padding:.65em;background:var(--panel);color:var(--ink);max-width:100%}#deck a{display:inline-block;margin:.7em 0}#deck p{white-space:pre-line;max-height:18em;overflow:auto}';document.head.append(mediaStyle);
fetch('https://bguradio.co/api/nowplaying/bguradio').then(r=>r.json()).then(x=>$('song').textContent=x.now_playing.song.text).catch(()=>{});
let photo=0;
function picture(step){const pics=BGU_CONTENT.gallery;photo=(photo+step+pics.length)%pics.length;$('photo').src=pics[photo][1];$('count').textContent=(photo+1)+' / '+pics.length}
picture(0);$('prev').onclick=()=>picture(-1);$('next').onclick=()=>picture(1);
for(const [name] of BGU_CONTENT.supporters){$('credits').append(el('span',name))}
let rows=[];
function listen(item){history.replaceState(null,'','#episode/'+encodeURIComponent(item.source)); revealArchive();live.pause();deck.replaceChildren(cover(group(item),artFor(item)),el('h3',item.title));if(item.description)deck.append(el('p',item.description));const back=el('a','לכל פרקי התוכנית ←');back.href='#program/'+encodeURIComponent(group(item));deck.append(back);if(timestamp(item.date))deck.append(el('small',new Date(timestamp(item.date)).toLocaleDateString('he-IL')));const fields=[['הגשה',item.host],['הפקה',item.production],['עריכה',item.editor]].filter(p=>p[1]);if(fields.length)deck.append(el('p',fields.map(p=>p.join(' · ')).join('  /  ')));
if(item.audio||item.embed){const player=el(item.audio?'audio':'iframe');player.src=item.audio||item.embed;player.title=item.title;player.controls=true;player.allow='autoplay; encrypted-media';deck.append(player);if(item.audio){const status=el('small');status.setAttribute('role','status');deck.append(status);for(const [event,label] of Object.entries({waiting:'טוען שמע…',playing:'בהשמעה',pause:'מושהה',error:'הטעינה נכשלה. אפשר להאזין דרך הקישור למקור.'}))player.addEventListener(event,()=>status.textContent=label);player.play().catch(()=>status.textContent='לחצו להפעלה בנגן')}}
const a=el('a','האזנה במקור ↗');a.href=item.source;deck.append(a);deck.scrollIntoView({block:'center'})}
function timestamp(v){if(!v)return 0;if(/^\d+$/.test(v))return Number(v)*(String(v).length<=10?1000:1);return Date.parse(v)||0}
function group(r){if(r.series)return r.series;const cleaned=r.title.replace(/^\s*\d{1,2}[./]\d{1,2}(?:[./]\d{2,4})?\s*/,'').replace(/\s*[-|–]?\s*\d{1,2}[./]\d{1,2}(?:[./]\d{2,4})?\s*$/,'').replace(/\s+[-–]?\s*(?:בהגשת|hosted by)\s+.+$/i,'').replace(/^['"״]+|['"״]+$/g,'').trim();return cleaned.split(/\s+[|·–—]\s+|\s+[-–]\s+פרק|\s+פרק\s+\d/i)[0].trim()||r.title}
const archiveSkin={'main':'broadcast','design-campus':'cinema','design-studio':'machine','design-poolsuite':'desktop','design-shuffle':'index'};
$('archive').dataset.skin=archiveSkin[location.pathname.split('/').filter(Boolean).pop()]||'broadcast';
const sheet=document.createElement('link');sheet.rel='stylesheet';sheet.href='../main/archive.css';if(!document.body.dataset.edition)document.head.append(sheet);
const owners=new Map();
function indexArt(data){
 for(const r of data){for(const url of [r.artwork,r.show_artwork].filter(Boolean)){const name=group(r);owners.set(url,owners.has(url)&&owners.get(url)!==name?null:name)}}
}
function artFor(row){return [row.artwork,row.show_artwork].find(url=>url&&owners.get(url)===group(row)&&/^https?:/.test(url)&&!/(image_user\/|default.art|default_avatar|placeholder)/i.test(url))}
function cover(title,url){
 const wrap=el('figure');wrap.className='sleeve-art';wrap.setAttribute('aria-hidden','true');
 const palette=[['#ec763d','#302119'],['#254849','#efedc7'],['#dccdb1','#372641'],['#e9b9ba','#501633'],['#b0cce0','#192d48']];
 const hash=Array.from(title).reduce((n,c)=>(n*31+c.charCodeAt(0))>>>0,0);
 const [paper,ink]=palette[hash%palette.length];wrap.style.setProperty('--paper',paper);wrap.style.setProperty('--type',ink);
 const type=el('div');type.className='letterpress';type.append(el('small','BGU / RADIO'),el('strong',title),el('small','עטיפת ארכיון'));wrap.append(type);
 if(url){const img=el('img');img.alt='';img.loading='lazy';img.decoding='async';img.onerror=()=>img.remove();img.src=url.replace(/^http:/,'https:');wrap.append(img)}return wrap
}
function dateLabel(row){const value=timestamp(row.date);return value?new Date(value).toLocaleDateString('he-IL'):''}
function programSleeve(title,items){
 const details=el('details');details.dataset.program=title;const summary=el('summary');const name=el('strong',title);name.className='cover-name';
 const series=items.find(i=>i.kind==='series'), episodes=items.filter(i=>i.kind!=='series');
 const url=series&&artFor(series)||items.map(i=>i.show_artwork).find(u=>u&&owners.get(u)===title)||items.map(artFor).find(Boolean);
 summary.append(cover(title,url),name,el('small',episodes.length===1?'הקלטה אחת':episodes.length?episodes.length+' הקלטות':'לפרקי הסדרה'));details.append(summary);
 details.ontoggle=()=>{if(!details.open||details.children.length>1)return;
 const link=el('a','קישור לתוכנית');link.href='#program/'+encodeURIComponent(title);details.append(link);
 if(series?.description)details.append(el('p',series.description));const hosts=[...new Set(items.map(i=>i.host).filter(Boolean))];if(hosts.length)details.append(el('p','הגשה · '+hosts.join(', ')));
 for(const row of items){const button=el('button');button.className='episode-line';const label=el('span',row.kind==='series'?'כל הפרקים ב־'+row.platform:row.title);label.append(el('small',[dateLabel(row),row.host].filter(Boolean).join(' · ')));button.append(cover(title,artFor(row)||url),label);button.onclick=()=>listen(row);details.append(button)}};
 return details
}
function recentReleases(data){
 const section=el('section');section.className='recent';section.append(el('h3','הקלטות אחרונות'));const strip=el('div');strip.className='recent-strip';
 for(const row of data.filter(r=>r.kind!=='series'&&timestamp(r.date)).slice(0,10)){const button=el('button');button.append(cover(group(row),artFor(row)),el('span',row.title),el('small',dateLabel(row)));button.onclick=()=>listen(row);strip.append(button)}
 section.append(strip);if(strip.childElementCount)$('groups').before(section)
}
let groupLimit=36;
function render(){const q=$('query').value.trim().toLocaleLowerCase();const shelf=document.querySelector('.recent');if(shelf)shelf.hidden=Boolean(q||sourceFilter.value);
const groups=new Map();
for(const row of rows){if(sourceFilter.value&&row.platform!==sourceFilter.value)continue;if(![row.title,row.series,row.host,row.production,row.editor,row.publisher].join(' ').toLocaleLowerCase().includes(q))continue;const key=group(row);if(!groups.has(key))groups.set(key,[]);groups.get(key).push(row)}
$('groups').replaceChildren();$('total').textContent=groups.size+' תוכניות ואוספים';
const ordered=[...groups].sort((a,b)=>b[1].length-a[1].length||a[0].localeCompare(b[0],'he'));for(const [title,items] of ordered.slice(0,groupLimit)){$('groups').append(programSleeve(title,items))}if(groups.size>groupLimit){const more=el('button','תוכניות נוספות');more.onclick=()=>{groupLimit+=36;render()};$('groups').append(more)}}
const sourceFilter=el('select');sourceFilter.setAttribute('aria-label','סינון לפי מקור');const allSources=el('option','כל המקורות');allSources.value='';sourceFilter.append(allSources);$('query').after(sourceFilter);sourceFilter.onchange=render;
fetch('../library.json').then(r=>{if(!r.ok)throw Error();return r.json()}).then(data=>{for(const row of data){if(row.platform?.toLowerCase()==='mixcloud')row.platform='Mixcloud'}for(const source of [...new Set(data.map(r=>r.platform).filter(Boolean))].sort())sourceFilter.append(el('option',source));indexArt(data);rows=data.sort((a,b)=>timestamp(b.date)-timestamp(a.date));recentReleases(rows);render();route()}).catch(()=>{$('total').textContent='טעינת הארכיון נכשלה';const a=el('a','פתיחת ארכיון התחנה');a.href='https://hearthis.at/bgu-radio/';$('groups').append(a)});
$('query').oninput=()=>{groupLimit=36;render()};
if($('shuffle'))$('shuffle').onclick=()=>{const pool=rows.filter(r=>r.kind!=='series'&&(r.audio||r.embed));if(pool.length){location.hash='archive';route();listen(pool[Math.floor(Math.random()*pool.length)])}};
function revealArchive(){for(const p of document.querySelectorAll('[data-page]'))p.hidden=p.dataset.page!=='archive'}
function route(){const key=location.hash.slice(1)||'home';
if(key.startsWith('episode/')){revealArchive();const item=rows.find(r=>encodeURIComponent(r.source)===key.slice(8));if(item&&!deck.childElementCount)listen(item);return}
if(key.startsWith('program/')){revealArchive();if(!Array.from($('groups').children).some(node=>encodeURIComponent(node.dataset.program)===key.slice(8))&&rows.length){groupLimit=rows.length;sourceFilter.value='';$('query').value='';render()}for(const node of $('groups').children){if(encodeURIComponent(node.dataset.program)===key.slice(8)){node.open=true;node.scrollIntoView();break}}return}
for(const p of document.querySelectorAll('[data-page]'))p.hidden=p.dataset.page!==key;if(document.querySelector('[data-page]'))window.scrollTo(0,0)}
window.addEventListener('hashchange',route);route();

const archive=$('archive');
if(document.body.dataset.edition){
 const bar=el('div');bar.className='mini-receiver';
 const control=el('button','▶ שידור חי');control.onclick=()=>play.click();
 const current=el('span','רדיו בן־גוריון');bar.append(control,current);document.body.append(bar);
 const style=el('style');style.textContent='.mini-receiver{position:fixed;z-index:9;inset:auto 0 0;background:var(--ink);color:var(--bg);display:flex;align-items:center;gap:12px;padding:6px max(16px,4vw) max(6px,env(safe-area-inset-bottom))}.mini-receiver button{background:var(--accent);color:var(--btn);border:0;padding:8px 15px}.mini-receiver span{overflow:hidden;white-space:nowrap;text-overflow:ellipsis}.mini-receiver[hidden]{display:none}.episode-line{cursor:pointer}#deck:has(audio),#deck:has(iframe){scroll-margin-top:12px}';document.head.append(style);
 function syncReceiver(){bar.hidden=!document.querySelector('[data-page=home]').hidden;control.textContent=live.paused?'▶ שידור חי':'■ עצירת השידור';current.textContent=$('song').textContent}
 for(const event of ['playing','pause','error'])live.addEventListener(event,syncReceiver);
 window.addEventListener('hashchange',syncReceiver);new MutationObserver(syncReceiver).observe(document.querySelector('[data-page=home]'),{attributes:true,attributeFilter:['hidden']});new MutationObserver(syncReceiver).observe($('song'),{childList:true,characterData:true,subtree:true});syncReceiver()
}

if(!$('shuffle')){const shuffle=el('button','⚄ פרק בהפתעה');shuffle.onclick=()=>{const pool=rows.filter(r=>r.kind!=='series'&&(r.audio||r.embed));if(pool.length)listen(pool[Math.floor(Math.random()*pool.length)])};archive.querySelector('input').after(shuffle)}
const floating=el('button','■ עצירת השידור');floating.hidden=true;floating.style.cssText='position:fixed;bottom:max(12px,env(safe-area-inset-bottom));left:12px;z-index:12;background:#191919;color:white;border:1px solid white;border-radius:30px';document.body.append(floating);floating.onclick=()=>live.pause();
live.addEventListener('playing',()=>floating.hidden=Boolean(document.body.dataset.edition));live.addEventListener('pause',()=>floating.hidden=true);
live.addEventListener('waiting',()=>play.textContent='מתחבר לשידור…');live.addEventListener('error',()=>{play.textContent='ניסיון נוסף';$('song').textContent='החיבור לשידור נכשל'});
