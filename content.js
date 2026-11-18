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
document.addEventListener("DOMContentLoaded", async () => {
 const archive=document.querySelector("#archive");
 if(!archive)return;
 archive.innerHTML='<h2>תכניות ששודרו אצלנו</h2><input type="search" aria-label="חיפוש בארכיון" placeholder="חיפוש תוכנית או שדרן"><p role="status"></p><div class="deck"></div><div class="tracks" style="max-height:430px;overflow:auto"></div><a href="https://hearthis.at/bgu-radio/">לארכיון התחנה ב־hearthis.at ↗</a>';
 const search=archive.querySelector("input"),list=archive.querySelector(".tracks"),deck=archive.querySelector(".deck"),status=archive.querySelector("[role=status]");
 const tracks=new Map();
 let library=[];
 try {const response=await fetch('../library.json');if(response.ok)library=await response.json()}catch{}
 const details=document.createElement('small');details.style.display='block';
 function add(title,url,embed,meta={}){if(!title||!url||!url.startsWith("https://"))return;tracks.set(url.replace(/\/listen\.mp3$/,"/"),{title,url,embed,meta});}
 function draw(){list.replaceChildren();let count=0;for(const t of tracks.values()){if(![t.title,t.meta.series,t.meta.publisher,t.meta.production,t.meta.host,t.meta.editor].join(" ").toLowerCase().includes(search.value.trim().toLowerCase()))continue;count++;const b=document.createElement("button");b.textContent="▶  "+t.title;b.style.cssText="display:block;width:100%;padding:12px 4px;text-align:start;background:transparent;color:inherit;border:0;border-bottom:1px solid #8887;cursor:pointer";const fields=[["סדרה",t.meta.series],["הפקה",t.meta.production],["הגשה",t.meta.host],["עריכה",t.meta.editor],["מפרסם",t.meta.publisher],["מקור",t.meta.platform]].filter(pair=>pair[1]).map(pair=>pair.join(" · ")).join("　");
 if(location.pathname.endsWith('/main/') && t.meta.artwork){const cover=document.createElement('img');cover.loading='lazy';cover.alt='';cover.src=t.meta.artwork;cover.onerror=()=>cover.remove();b.prepend(cover)}
 const caption=document.createElement("small");caption.style.display="block";caption.textContent=fields;b.append(caption);
 b.onclick=()=>{document.querySelector("#live audio").pause();deck.replaceChildren();const name=document.createElement("strong");name.textContent=t.title;const player=document.createElement(t.embed?"iframe":"audio");player.src=t.embed||t.url;player.title=t.title;player.controls=true;deck.append(name,player);if(t.meta.source){const source=document.createElement("a");source.href=t.meta.source;source.textContent="לעמוד המקורי";deck.append(source)}if(!t.embed)player.play().catch(()=>{});};list.append(b)}status.textContent=count+" הקלטות";}
 const prefix="https://hearthis.at/bgu-radio/";
 for(const [title,slug] of [["שירשורים עם כרמל | 25.8 | עושים שכונה","4-caircavrim-em-krml-258-evcaim-cakvnh"],["על דפנות המסטרינה - שידור מיוחד עם יותם שלו ועדן זץ","el-dpnvt-hmstrinh-mskmim-at-hpirvt-hntvn-bviibz"],["מפגש בספרייה - פרק 2","meetingatthelibrary-chapter2"],["ענת לברן | מה שעושה לי טוב | 19.5.26","anat159"],["התכנית החלומית - קידום נוער מחוז דרום","qidvm-nver-mixdown-1"],["תכנית האיחולים של אגף ה-תפעול!","tifullllsholettttt"],["מדברים בגו- אמיר גורם לרוי לנסוע שעה ועשר דקות ברכבת","pod00113"]])add(title,prefix+slug+"/listen.mp3");
 for(const [title,slug] of [["Episode 16: All Made Of Stars","electricom/episode-16-all-made-of-stars"],["Sb Campus Radio Episode 1 - First Episode!","sbradio101/sb-campus-radio-episode-1"]]){const url="https://www.mixcloud.com/"+slug+"/";add(title,url,"https://www.mixcloud.com/widget/iframe/?feed="+encodeURIComponent(url))}
 for(const item of library){const address=item.audio||item.source;if(!address)continue;tracks.delete(item.source.replace(/\/$/,"")+"/");add(item.title,address,item.audio?null:item.embed,item)}
 search.oninput=draw;draw();if(library.some(item=>item.platform==="hearthis.at"))return;
 try{for(let page=1;;page++){const res=await fetch("https://api-v2.hearthis.at/bgu-radio/?type=tracks&count=50&page="+page);if(!res.ok)break;const items=await res.json();if(!Array.isArray(items)||!items.length)break;const before=tracks.size;for(const t of items){if(t.permalink_url)add(t.title,t.permalink_url.replace(/\/$/,"")+"/listen.mp3")}draw();if(items.length<50||tracks.size===before)break}}catch{}
});

const assetRoot="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/695cb8cdaf769d5c88acb1d9/";
BGU_CONTENT.gallery.unshift(["אולפן הרדיו",assetRoot+"0b3d98af9_.jpg"]);
BGU_CONTENT.gallery.push(["מאחורי הקלעים",assetRoot+"53ad99d5c_.jpg"],["מאחורי הקלעים",assetRoot+"4b5f8bab1_.jpg"]);
BGU_CONTENT.supporters.splice(2,0,["David Breslauer",""]);
document.addEventListener("DOMContentLoaded",()=>{
const about=[...document.querySelectorAll("section")].find(s=>s.querySelector("h2")?.textContent==="על התחנה");
if(about){about.replaceChildren();const h=document.createElement("h2");h.textContent="אודות BGU Radio";about.append(h,"ברוכים הבאים לתחנת הרדיו הרשמית של אוניברסיטת בן-גוריון בנגב! אנחנו קהילה תוססת של אקדמאים, יזמים ויוצרים שמביאים לכם את הטוב ביותר במוזיקה, תוכניות אירוח, העשרה ותרבות בקמפוס ובנגב. אנחנו חלק ממרכז יזמות 360 והתחנה שלנו היא אקדמיה למיומנויות שונות מעולמות היזמות, היצירה והניהול - והמקום הכי וואו לייצר בו תיק עבודות תוך כדי התואר. בזמן שאתם כאן - אנחנו כבר באוויר, לחצו כדי לשמוע (:")}
const contact=document.querySelector("#contact");const link=contact?.querySelector('a[href*="base44"]');if(link){link.href="https://bgu-radio.base44.app/#:~:text="+encodeURIComponent("יש לכם רעיון לתכנית");link.textContent="לטופס יצירת הקשר של התחנה";const invite=document.createElement("p");invite.textContent="יש לכם רעיון לתכנית? יש לכם מה להגיד? סקרנים ורוצים להצטרף? האולפן שלנו פתוח, בואו לשדר איתנו!";link.parentElement.before(invite)}
const license=contact?.querySelector('a[href*="acum.org"]');if(license){const e=document.createElement("a");e.href="https://eshkolot.co.il/";e.textContent="אשכולות";license.after(" ו",e)}
});
document.addEventListener("DOMContentLoaded",()=>{const section=document.createElement("section");section.innerHTML='<h2>סדרות להאזנה</h2><div class="shelf"></div><div class="podplayer"></div><p><a href="https://www.mixcloud.com/sbradio101/">כל שידורי קמפוס שדה בוקר ↗</a> · <a href="https://www.mixcloud.com/Boozie_Raviv/">BGU Radio ב־Mixcloud ↗</a></p>';document.querySelector("#archive").append(section);for(const [title,id] of [["שלייקעס","6W9fB2m8aEYXE6iFvvtNPY"],["יוצרים את העתיד · نخلق المستقبل","6Rfu8H4bAb6IYsoNHyRGGJ"],["ליניארית To go","0Gc2fS7W8eNKuFiJeF0ijy"],["התכנית שלי להפוך לרופא","4sVDhGjDI8OK5Aq5FCzUT5"],["הזקן והיום","3J6wPbHkRb6QsP3as9jXNq"],["בחברה טובה","0fL5yqOpSdpeycyu48F5Zx"]]){const b=document.createElement("button");b.textContent=title;b.onclick=()=>{document.querySelectorAll("audio").forEach(a=>a.pause());const frame=document.createElement("iframe");frame.title=title;frame.src="https://open.spotify.com/embed/show/"+id;frame.allow="encrypted-media; autoplay";section.querySelector(".podplayer").replaceChildren(frame)};section.querySelector(".shelf").append(b)}});
document.head.insertAdjacentHTML("beforeend","<style>body{font-family:Rubik,Arial,sans-serif}.shelf{display:grid;grid-template-columns:repeat(auto-fit,minmax(145px,1fr));gap:10px}.shelf button{min-height:92px;padding:16px;text-align:start;background:#33334d;color:#fff;border:0;border-radius:8px;font-size:20px;font-weight:bold}.shelf button:nth-child(3n+2){background:#76543e}.shelf button:nth-child(3n){background:#305956}.tracks button:hover{background:#aaa2!important}#archive input{padding:12px 16px;border-radius:30px;border:1px solid #888;width:min(100%,440px)}.hero img{object-position:center 40%}body:has(.hero h1) section{min-width:0}</style>");