/**
 * Inline splash for cold PWA / homescreen launches.
 * Uses only inline CSS so it covers the FOUC until stylesheets apply —
 * Tailwind utilities are not available yet when the broken shell flashes.
 */
const BOOT_CSS = `
#app-boot-splash{
  position:fixed;inset:0;z-index:99999;
  display:flex;align-items:center;justify-content:center;
  background:#071018;color:#eef6f8;
  transition:opacity .4s ease;
}
#app-boot-splash[data-done="1"]{opacity:0;pointer-events:none}
#app-boot-splash .boot-copy{
  text-align:center;
  font-family:system-ui,-apple-system,sans-serif;
}
#app-boot-splash .boot-label{
  font-size:13px;font-weight:700;letter-spacing:.36em;
  text-transform:uppercase;color:#5fe3c0;
  margin:0 0 0 -.36em; /* optical center with letter-spacing */
}
#app-boot-splash .boot-sub{
  margin-top:.7rem;font-size:13px;color:rgba(143,168,181,.9);
  letter-spacing:.02em;
}
#app-boot-splash .boot-dots{
  display:inline-block;min-width:1.1em;text-align:left;
}
#app-boot-splash .boot-dots span{
  opacity:0;
  animation:boot-dot 1.2s infinite;
}
#app-boot-splash .boot-dots span:nth-child(1){animation-delay:0s}
#app-boot-splash .boot-dots span:nth-child(2){animation-delay:.2s}
#app-boot-splash .boot-dots span:nth-child(3){animation-delay:.4s}
@keyframes boot-dot{
  0%,15%{opacity:0}
  30%,70%{opacity:1}
  85%,100%{opacity:0}
}
@media (max-width:1023.98px){
  .control-side-nav{display:none!important}
}
@media (min-width:1024px){
  .control-bottom-nav{display:none!important}
}
`.replace(/\n/g, "");

/** Keep cover until load + fonts, min ~0.8s, safety 4s — reduces white flash. */
const BOOT_SCRIPT = `
(function(){
  var el=document.getElementById("app-boot-splash");
  if(!el)return;
  var done=false;
  var shownAt=Date.now();
  function hide(){
    if(done)return;
    done=true;
    var wait=Math.max(0,800-(Date.now()-shownAt));
    setTimeout(function(){
      el.setAttribute("data-done","1");
      setTimeout(function(){try{el.remove()}catch(e){}},450);
    },wait);
  }
  function go(){
    var fonts=document.fonts&&document.fonts.ready?document.fonts.ready:Promise.resolve();
    fonts.then(function(){
      requestAnimationFrame(function(){requestAnimationFrame(hide)});
    }).catch(hide);
  }
  if(document.readyState==="complete")go();
  else window.addEventListener("load",go,{once:true});
  setTimeout(hide,4000);
})();
`.replace(/\n/g, "");

/** First-paint cover + critical nav visibility before Tailwind loads. */
export function AppBootSplash() {
  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: BOOT_CSS }} />
      <div id="app-boot-splash" aria-hidden="true">
        <div className="boot-copy">
          <div className="boot-label">Peugeot</div>
          <div className="boot-sub">
            wird geladen
            <span className="boot-dots" aria-hidden="true">
              <span>.</span>
              <span>.</span>
              <span>.</span>
            </span>
          </div>
        </div>
      </div>
      <script dangerouslySetInnerHTML={{ __html: BOOT_SCRIPT }} />
    </>
  );
}
