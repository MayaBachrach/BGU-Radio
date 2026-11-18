const C=window.BGU_CONTENT;
document.getElementById("subtitle").textContent=C.subtitle;
document.getElementById("tagline").textContent=C.tagline;
document.getElementById("aboutTitle").textContent=C.aboutTitle;
document.getElementById("aboutText").textContent=C.about;
document.getElementById("galleryTitle").textContent=C.galleryTitle;
document.getElementById("email").textContent=C.email;
document.getElementById("contactLink").href="mailto:"+C.email+"?subject=BGU%20Radio";
document.getElementById("subscribeLink").href="mailto:"+C.email+"?subject=Subscribe%20to%20BGU%20Radio";
document.getElementById("newsletter").textContent=C.newsletter;
document.getElementById("privacy").textContent=C.privacy;
document.getElementById("gallery").innerHTML=C.gallery.map(([alt,src])=>'<figure class="photo"><img src="'+src+'" alt="'+alt+'" loading="lazy"><figcaption>'+alt+'</figcaption></figure>').join("");
document.getElementById("supporters").innerHTML=C.supporters.map(([name,src])=>src?'<img src="'+src+'" alt="'+name+'">':'<span>'+name+'</span>').join("");
const bars=[14,23,12,31,19,27,11,34,18,26,13,30,20,10,28,16,33,12,24,18,31,15,27,11,21,34,16,25,13,30,18,23,12,28,16,32];
document.querySelector(".wave").innerHTML=bars.map(h=>'<i style="--h:'+h+'px"></i>').join("");
const API="https://bguradio.co/api/nowplaying/bguradio";
const STREAM="https://bguradio.co/listen/bguradio/radio.mp3";
const audio=document.getElementById("audio"), play=document.getElementById("play");
audio.src=STREAM;
function paint(){const on=!audio.paused;play.textContent=on?"Ⅱ":"▶";play.setAttribute("aria-label",on?"Pause live radio":"Play live radio");}
play.addEventListener("click",async()=>{if(audio.paused){try{await audio.play();document.getElementById("streamState").textContent="You're listening to BGU Radio";}catch{document.getElementById("streamState").textContent="The live stream could not start. Try again.";}}else audio.pause();paint();});
audio.addEventListener("play",paint);audio.addEventListener("pause",paint);audio.addEventListener("error",()=>{document.getElementById("streamState").textContent="Live stream temporarily unavailable.";paint();});
async function updateNowPlaying(){try{const r=await fetch(API,{cache:"no-store"});if(!r.ok)throw new Error("status");const d=await r.json();const s=d.now_playing?.song;document.getElementById("status").textContent=d.station?.is_public?"STREAM ONLINE":"OFFLINE";if(s){document.getElementById("song").textContent=s.title||s.text||"BGU Radio";document.getElementById("artist").textContent=s.artist||d.now_playing.playlist||"BGU Radio";if(s.art)document.getElementById("cover").src=s.art;}document.getElementById("streamState").textContent=d.live?.is_live&&d.live?.streamer_name?"LIVE WITH "+d.live.streamer_name:(d.now_playing?.playlist||"Ready to start streaming");}catch{document.getElementById("status").textContent="BGU RADIO";document.getElementById("song").textContent="Listen to BGU Radio";document.getElementById("artist").textContent="Live from the Negev";}}
updateNowPlaying();setInterval(updateNowPlaying,20000);