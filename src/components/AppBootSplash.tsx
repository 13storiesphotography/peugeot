/**
 * Inline splash for cold PWA / homescreen launches.
 * Uses only inline CSS so it covers the FOUC until stylesheets apply —
 * Tailwind utilities are not available yet when the broken shell flashes.
 */
const BOOT_CSS = `
#app-boot-splash{
  position:fixed;inset:0;z-index:99999;
  display:flex;align-items:center;justify-content:center;
  background:#071018;
  transition:opacity .35s ease;
}
#app-boot-splash[data-done="1"]{opacity:0;pointer-events:none}
#app-boot-splash .boot-mark{
  position:relative;width:72px;height:72px;
  display:grid;place-items:center;
}
#app-boot-splash .boot-ring{
  position:absolute;inset:0;border-radius:9999px;
  border:1.5px solid rgba(95,227,192,.35);
  animation:boot-pulse 1.4s ease-in-out infinite;
}
#app-boot-splash .boot-ring:nth-child(2){
  inset:-10px;border-color:rgba(95,227,192,.18);
  animation-delay:.2s;
}
#app-boot-splash .boot-copy{
  margin-top:1.25rem;text-align:center;
  font-family:system-ui,-apple-system,sans-serif;
}
#app-boot-splash .boot-label{
  font-size:11px;font-weight:700;letter-spacing:.32em;
  text-transform:uppercase;color:#5fe3c0;
}
#app-boot-splash .boot-sub{
  margin-top:.45rem;font-size:12px;color:rgba(143,168,181,.85);
  letter-spacing:.02em;
}
@keyframes boot-pulse{
  0%,100%{transform:scale(1);opacity:.9}
  50%{transform:scale(1.06);opacity:.45}
}
@media (max-width:1023.98px){
  .control-side-nav{display:none!important}
}
@media (min-width:1024px){
  .control-bottom-nav{display:none!important}
}
`.replace(/\n/g, "");

const BOOT_SCRIPT = `
(function(){
  var el=document.getElementById("app-boot-splash");
  if(!el)return;
  var done=false;
  function hide(){
    if(done)return;
    done=true;
    el.setAttribute("data-done","1");
    setTimeout(function(){try{el.remove()}catch(e){}},400);
  }
  function go(){
    requestAnimationFrame(function(){requestAnimationFrame(hide)});
  }
  if(document.readyState==="complete")go();
  else window.addEventListener("load",go,{once:true});
  setTimeout(hide,2500);
})();
`.replace(/\n/g, "");

/** First-paint cover + critical nav visibility before Tailwind loads. */
export function AppBootSplash() {
  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: BOOT_CSS }} />
      <div id="app-boot-splash" aria-hidden="true">
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
          <div className="boot-mark">
            <span className="boot-ring" />
            <span className="boot-ring" />
          </div>
          <div className="boot-copy">
            <div className="boot-label">Peugeot</div>
            <div className="boot-sub">wird geladen…</div>
          </div>
        </div>
      </div>
      <script dangerouslySetInnerHTML={{ __html: BOOT_SCRIPT }} />
    </>
  );
}
