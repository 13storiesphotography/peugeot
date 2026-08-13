/** Helpers to capture Peugeot mymap:// OAuth code after manual (Captcha) login. */

function returnSettingsUrl(returnBaseUrl: string, countryCode: string, codeUrl: string) {
  const base = returnBaseUrl.replace(/\/$/, "");
  const country = (countryCode || "DE").toUpperCase();
  return `${base}/control/settings?peugeot_oauth=1&country=${encodeURIComponent(country)}&code=${encodeURIComponent(codeUrl)}`;
}

/** iOS Shortcuts: „JavaScript auf Webseite ausführen“ — calls completion(appUrl|null). */
export function buildIosShortcutJavaScript(input: {
  returnBaseUrl: string;
  countryCode: string;
}): string {
  const returnBase = input.returnBaseUrl.replace(/\/$/, "");
  const country = (input.countryCode || "DE").toUpperCase();
  return `(() => {
  var returnBase = ${JSON.stringify(returnBase)};
  var country = ${JSON.stringify(country)};
  var done = false;
  function finish(u) {
    if (done) return;
    done = true;
    if (!u) { completion(null); return; }
    completion(returnBase + "/control/settings?peugeot_oauth=1&country=" + encodeURIComponent(country) + "&code=" + encodeURIComponent(String(u)));
  }
  function capture(u) {
    var s = String(u || "");
    if (/mymap:/i.test(s) || /[?&#]code=/.test(s)) { finish(s); return true; }
    return false;
  }
  try {
    var d = Object.getOwnPropertyDescriptor(Location.prototype, "href");
    if (d && d.set) {
      Object.defineProperty(Location.prototype, "href", {
        configurable: true,
        enumerable: true,
        get: function () { return d.get.call(this); },
        set: function (v) { if (!capture(v)) d.set.call(this, v); }
      });
    }
  } catch (e) {}
  try {
    var assign = location.assign.bind(location);
    location.assign = function (u) { if (!capture(u)) assign(u); };
    var replace = location.replace.bind(location);
    location.replace = function (u) { if (!capture(u)) replace(u); };
  } catch (e2) {}
  function clickWeiter() {
    var nodes = Array.prototype.slice.call(document.querySelectorAll("button, a, input[type=submit], [role=button]"));
    for (var i = 0; i < nodes.length; i++) {
      var el = nodes[i];
      var t = ((el.innerText || el.value || el.getAttribute("aria-label") || "") + "").replace(/\\s+/g, " ").trim();
      if (/^(weiter|ok|continue|continuer|next)$/i.test(t) || /^weiter$/i.test(t)) {
        el.click();
        return true;
      }
    }
    return false;
  }
  clickWeiter();
  setTimeout(clickWeiter, 400);
  setTimeout(clickWeiter, 1200);
  setTimeout(function () { finish(null); }, 7000);
})();`;
}

/** Legacy bookmarklet (often blocked / awkward on iPhone). */
export function buildCodeCatcherBookmarklet(input: {
  returnBaseUrl: string;
  countryCode: string;
}): string {
  const country = (input.countryCode || "DE").toUpperCase();
  const returnBase = input.returnBaseUrl.replace(/\/$/, "");
  const js = `(()=>{var R=${JSON.stringify(`${returnBase}/control/settings`)},C=${JSON.stringify(country)};function go(u){var s=String(u||"");if(!/mymap:/i.test(s)&&!/[?&#]code=/.test(s))return!1;location.href=R+"?peugeot_oauth=1&country="+encodeURIComponent(C)+"&code="+encodeURIComponent(s);return!0}try{var d=Object.getOwnPropertyDescriptor(Location.prototype,"href");d&&d.set&&Object.defineProperty(Location.prototype,"href",{configurable:!0,enumerable:!0,get:function(){return d.get.call(this)},set:function(v){go(v)||d.set.call(this,v)}})}catch(e){}var a=location.assign.bind(location);location.assign=function(u){go(u)||a(u)};var r=location.replace.bind(location);location.replace=function(u){go(u)||r(u)};document.addEventListener("click",function(e){var t=e.target&&e.target.closest&&e.target.closest("a[href],button,input[type=submit]");if(!t)return;var label=((t.innerText||t.value||t.getAttribute("aria-label")||"")+"").replace(/\\s+/g," ").trim();var href=t.getAttribute&&t.getAttribute("href");if(href&&go(href)){e.preventDefault();e.stopPropagation();return}if(!/^(weiter|ok|continue|continuer|next)$/i.test(label)&&!/weiter/i.test(label))return;var form=t.form||t.closest&&t.closest("form");if(!form)return;e.preventDefault();e.stopPropagation();try{var fd=new FormData(form);var method=(form.method||"GET").toUpperCase();var action=form.action||location.href;if(method==="GET"){var q=new URLSearchParams(fd);var url=action+(action.indexOf("?")>=0?"&":"?")+q.toString();if(go(url))return;location.href=url;return}fetch(action,{method:method,body:fd,credentials:"include",redirect:"manual"}).then(function(res){var loc=res.headers.get("Location")||"";if(go(loc))return;form.submit()}).catch(function(){form.submit()})}catch(err){form.submit()}},!0);alert("Code-Fänger aktiv.\\nJetzt WEITER tippen.");})()`;
  return `javascript:${encodeURIComponent(js)}`;
}

export function buildHandoffSettingsUrl(input: {
  returnBaseUrl: string;
  countryCode: string;
  codeUrl: string;
}): string {
  return returnSettingsUrl(input.returnBaseUrl, input.countryCode, input.codeUrl);
}
