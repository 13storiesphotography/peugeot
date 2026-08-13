/** Bookmarklet that intercepts mymap:// after manual Peugeot login (Captcha by user). */

export function buildCodeCatcherBookmarklet(input: {
  returnBaseUrl: string;
  countryCode: string;
}): string {
  const country = (input.countryCode || "DE").toUpperCase();
  const returnBase = input.returnBaseUrl.replace(/\/$/, "");
  // Keep bookmarklet compact — runs on Peugeot pages after user solved Captcha.
  const js = `(()=>{var R=${JSON.stringify(`${returnBase}/control/settings`)},C=${JSON.stringify(country)};function go(u){var s=String(u||"");if(!/mymap:/i.test(s)&&!/[?&#]code=/.test(s))return!1;location.href=R+"?peugeot_oauth=1&country="+encodeURIComponent(C)+"&code="+encodeURIComponent(s);return!0}try{var d=Object.getOwnPropertyDescriptor(Location.prototype,"href");d&&d.set&&Object.defineProperty(Location.prototype,"href",{configurable:!0,enumerable:!0,get:function(){return d.get.call(this)},set:function(v){go(v)||d.set.call(this,v)}})}catch(e){}var a=location.assign.bind(location);location.assign=function(u){go(u)||a(u)};var r=location.replace.bind(location);location.replace=function(u){go(u)||r(u)};document.addEventListener("click",function(e){var t=e.target&&e.target.closest&&e.target.closest("a[href],button,input[type=submit]");if(!t)return;var label=((t.innerText||t.value||t.getAttribute("aria-label")||"")+"").replace(/\\s+/g," ").trim();var href=t.getAttribute&&t.getAttribute("href");if(href&&go(href)){e.preventDefault();e.stopPropagation();return}if(!/^(weiter|ok|continue|continuer|next)$/i.test(label)&&!/weiter/i.test(label))return;var form=t.form||t.closest&&t.closest("form");if(!form)return;e.preventDefault();e.stopPropagation();try{var fd=new FormData(form);var method=(form.method||"GET").toUpperCase();var action=form.action||location.href;if(method==="GET"){var q=new URLSearchParams(fd);var url=action+(action.indexOf("?")>=0?"&":"?")+q.toString();if(go(url))return;location.href=url;return}fetch(action,{method:method,body:fd,credentials:"include",redirect:"manual"}).then(function(res){var loc=res.headers.get("Location")||"";if(go(loc))return;if(res.type==="opaqueredirect"||res.status===0){alert("Redirect nicht lesbar — tippe WEITER erneut oder nutze Desktop.");return}form.submit()}).catch(function(){form.submit()})}catch(err){form.submit()}},!0);alert("Code-Fänger aktiv.\\nJetzt bei Peugeot auf WEITER tippen — du landest zurück in der App.");})()`;
  return `javascript:${encodeURIComponent(js)}`;
}

/** Human-readable (decoded) script for copy/edit on iOS Safari bookmarks. */
export function buildCodeCatcherBookmarkletReadable(input: {
  returnBaseUrl: string;
  countryCode: string;
}): string {
  const encoded = buildCodeCatcherBookmarklet(input);
  try {
    return decodeURIComponent(encoded.replace(/^javascript:/i, ""));
  } catch {
    return encoded;
  }
}
