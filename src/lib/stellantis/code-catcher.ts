/** Helpers to capture Peugeot mymap:// OAuth code after manual (Captcha) login. */

function returnSettingsUrl(returnBaseUrl: string, countryCode: string, codeUrl: string) {
  const base = returnBaseUrl.replace(/\/$/, "");
  const country = (countryCode || "DE").toUpperCase();
  return `${base}/control/settings?peugeot_oauth=1&country=${encodeURIComponent(country)}&code=${encodeURIComponent(codeUrl)}`;
}

function returnErrorUrl(returnBaseUrl: string, message: string) {
  const base = returnBaseUrl.replace(/\/$/, "");
  return `${base}/control/settings?peugeot_oauth=error&msg=${encodeURIComponent(message)}`;
}

/**
 * iOS Shortcuts: „JavaScript auf Webseite ausführen“.
 * Always calls completion(httpsUrl) so „URLs öffnen“ never gets empty input.
 * Intercepts mymap:// and follows HTTPS redirect chains with redirect:manual.
 */
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
  function appOk(codeUrl) {
    return returnBase + "/control/settings?peugeot_oauth=1&country=" + encodeURIComponent(country) + "&code=" + encodeURIComponent(String(codeUrl));
  }
  function appErr(msg) {
    return returnBase + "/control/settings?peugeot_oauth=error&msg=" + encodeURIComponent(String(msg || "Kein Code"));
  }
  function finishOk(u) {
    if (done) return;
    done = true;
    completion(appOk(u));
  }
  function finishErr(msg) {
    if (done) return;
    done = true;
    completion(appErr(msg));
  }
  function isCodeUrl(u) {
    var s = String(u || "");
    return /mymap:/i.test(s) || /[?&#]code=([^&#]+)/i.test(s);
  }
  function absUrl(u, base) {
    try { return new URL(String(u), base || location.href).href; } catch (e) { return String(u || ""); }
  }
  function followRedirects(startUrl, cb) {
    var url = String(startUrl || "");
    var hops = 0;
    function step() {
      if (isCodeUrl(url)) { cb(null, url); return; }
      if (hops++ > 8) { cb("Zu viele Redirects", null); return; }
      if (!/^https?:/i.test(url)) { cb("Unerwartete URL", null); return; }
      fetch(url, { method: "GET", credentials: "include", redirect: "manual", cache: "no-store" })
        .then(function (res) {
          var loc = res.headers.get("Location") || res.headers.get("location") || "";
          if (loc) {
            url = absUrl(loc, url);
            if (isCodeUrl(url)) { cb(null, url); return; }
            step();
            return;
          }
          if (res.type === "opaqueredirect" || res.status === 0) {
            cb("Redirect nicht lesbar (Safari). Bitte am Computer anmelden.", null);
            return;
          }
          cb("Kein OAuth-Code in Redirect.", null);
        })
        .catch(function () {
          cb("Fetch fehlgeschlagen. Bitte am Computer anmelden.", null);
        });
    }
    step();
  }
  function handleNav(u) {
    var s = absUrl(u, location.href);
    if (isCodeUrl(s)) { finishOk(s); return true; }
    if (/^https?:/i.test(s) && /oauth|authorize|redirect|consent|oidc|gigya|idpcvs|id-dcr/i.test(s)) {
      followRedirects(s, function (err, codeUrl) {
        if (codeUrl) finishOk(codeUrl);
        else finishErr(err || "Kein Code gefunden");
      });
      return true;
    }
    return false;
  }
  try {
    var d = Object.getOwnPropertyDescriptor(Location.prototype, "href");
    if (d && d.set) {
      Object.defineProperty(Location.prototype, "href", {
        configurable: true,
        enumerable: true,
        get: function () { return d.get.call(this); },
        set: function (v) { if (!handleNav(v)) d.set.call(this, v); }
      });
    }
  } catch (e) {}
  try {
    var assign = location.assign.bind(location);
    location.assign = function (u) { if (!handleNav(u)) assign(u); };
    var replace = location.replace.bind(location);
    location.replace = function (u) { if (!handleNav(u)) replace(u); };
  } catch (e2) {}

  function tryForm(form) {
    try {
      var method = (form.method || "GET").toUpperCase();
      var action = form.action || location.href;
      var fd = new FormData(form);
      if (method === "GET") {
        var q = new URLSearchParams(fd);
        var url = action + (action.indexOf("?") >= 0 ? "&" : "?") + q.toString();
        if (handleNav(url)) return true;
        return false;
      }
      fetch(action, { method: method, body: fd, credentials: "include", redirect: "manual", cache: "no-store" })
        .then(function (res) {
          var loc = res.headers.get("Location") || res.headers.get("location") || "";
          if (loc && handleNav(absUrl(loc, action))) return;
          if (isCodeUrl(action)) { finishOk(action); return; }
          finishErr("WEITER-Redirect ohne lesbaren Code. Bitte am Computer anmelden.");
        })
        .catch(function () {
          finishErr("Formular-Submit blockiert. Bitte am Computer anmelden.");
        });
      return true;
    } catch (err) {
      return false;
    }
  }

  function findWeiter() {
    var nodes = Array.prototype.slice.call(document.querySelectorAll("button, a, input[type=submit], [role=button]"));
    for (var i = 0; i < nodes.length; i++) {
      var el = nodes[i];
      var t = ((el.innerText || el.value || el.getAttribute("aria-label") || "") + "").replace(/\\s+/g, " ").trim();
      if (/^(weiter|ok|continue|continuer|next)$/i.test(t) || /^weiter$/i.test(t)) return el;
    }
    return null;
  }

  var weiter = findWeiter();
  if (!weiter) {
    finishErr("Kein WEITER-Button gefunden. Erst bis zur Erfolgsseite anmelden, dann Kurzbefehl.");
    return;
  }
  var href = weiter.getAttribute && weiter.getAttribute("href");
  if (href && handleNav(href)) return;
  var form = weiter.form || (weiter.closest && weiter.closest("form"));
  if (form && tryForm(form)) return;

  // Last resort: click and hope location hooks catch navigation.
  try { weiter.click(); } catch (e3) {}
  setTimeout(function () {
    if (!done) finishErr("Kein Code nach WEITER. Am iPhone bitte Login-Link am Computer nutzen.");
  }, 6500);
})();`;
}

/** Legacy bookmarklet (often blocked / awkward on iPhone). */
export function buildCodeCatcherBookmarklet(input: {
  returnBaseUrl: string;
  countryCode: string;
}): string {
  const country = (input.countryCode || "DE").toUpperCase();
  const returnBase = input.returnBaseUrl.replace(/\/$/, "");
  const js = `(()=>{var R=${JSON.stringify(`${returnBase}/control/settings`)},C=${JSON.stringify(country)};function go(u){var s=String(u||"");if(!/mymap:/i.test(s)&&!/[?&#]code=/.test(s))return!1;location.href=R+"?peugeot_oauth=1&country="+encodeURIComponent(C)+"&code="+encodeURIComponent(s);return!0}try{var d=Object.getOwnPropertyDescriptor(Location.prototype,"href");d&&d.set&&Object.defineProperty(Location.prototype,"href",{configurable:!0,enumerable:!0,get:function(){return d.get.call(this)},set:function(v){go(v)||d.set.call(this,v)}})}catch(e){}alert("Code-Fänger aktiv.");})()`;
  return `javascript:${encodeURIComponent(js)}`;
}

export function buildHandoffSettingsUrl(input: {
  returnBaseUrl: string;
  countryCode: string;
  codeUrl: string;
}): string {
  return returnSettingsUrl(input.returnBaseUrl, input.countryCode, input.codeUrl);
}

export function buildHandoffErrorUrl(returnBaseUrl: string, message: string): string {
  return returnErrorUrl(returnBaseUrl, message);
}
