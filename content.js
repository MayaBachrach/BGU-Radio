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
 function add(title,url,embed){if(!title||!url||!url.startsWith("https://"))return;tracks.set(url.replace(/\/listen\.mp3$/,"/"),{title,url,embed});}
 function draw(){list.replaceChildren();let count=0;for(const t of tracks.values()){if(!t.title.toLowerCase().includes(search.value.trim().toLowerCase()))continue;count++;const b=document.createElement("button");b.textContent="▶  "+t.title;b.style.cssText="display:block;width:100%;padding:12px 4px;text-align:start;background:transparent;color:inherit;border:0;border-bottom:1px solid #8887;cursor:pointer";b.onclick=()=>{document.querySelector("#live audio").pause();deck.replaceChildren();const name=document.createElement("strong");name.textContent=t.title;const player=document.createElement(t.embed?"iframe":"audio");player.src=t.embed||t.url;player.title=t.title;player.controls=true;deck.append(name,player);if(!t.embed)player.play().catch(()=>{});};list.append(b)}status.textContent=count+" הקלטות";}
 const prefix="https://hearthis.at/bgu-radio/";
 for(const [title,slug] of [["שירשורים עם כרמל | 25.8 | עושים שכונה","4-caircavrim-em-krml-258-evcaim-cakvnh"],["על דפנות המסטרינה - שידור מיוחד עם יותם שלו ועדן זץ","el-dpnvt-hmstrinh-mskmim-at-hpirvt-hntvn-bviibz"],["מפגש בספרייה - פרק 2","meetingatthelibrary-chapter2"],["ענת לברן | מה שעושה לי טוב | 19.5.26","anat159"],["התכנית החלומית - קידום נוער מחוז דרום","qidvm-nver-mixdown-1"],["תכנית האיחולים של אגף ה-תפעול!","tifullllsholettttt"],["מדברים בגו- אמיר גורם לרוי לנסוע שעה ועשר דקות ברכבת","pod00113"]])add(title,prefix+slug+"/listen.mp3");
 for(const [title,slug] of [["Episode 16: All Made Of Stars","electricom/episode-16-all-made-of-stars"],["Sb Campus Radio Episode 1 - First Episode!","sbradio101/sb-campus-radio-episode-1"]]){const url="https://www.mixcloud.com/"+slug+"/";add(title,url,"https://www.mixcloud.com/widget/iframe/?feed="+encodeURIComponent(url))}
 search.oninput=draw;draw();
 try{for(let page=1;;page++){const res=await fetch("https://api-v2.hearthis.at/bgu-radio/?type=tracks&count=50&page="+page);if(!res.ok)break;const items=await res.json();if(!Array.isArray(items)||!items.length)break;const before=tracks.size;for(const t of items){if(t.permalink_url)add(t.title,t.permalink_url.replace(/\/$/,"")+"/listen.mp3")}draw();if(items.length<50||tracks.size===before)break}}catch{}
});
