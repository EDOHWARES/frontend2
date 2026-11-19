// Apply the saved theme before first paint to avoid a flash.
(function () {
  var stored = null;
  try {
    stored = localStorage.getItem("synapsvault-theme");
  } catch (e) {}

  var dark;
  if (stored === "light" || stored === "dark") {
    dark = stored === "dark";
  } else {
    try {
      dark = !!(
        typeof window.matchMedia === "function" &&
        window.matchMedia("(prefers-color-scheme: dark)").matches
      );
    } catch (e) {
      dark = false;
    }
  }

  if (dark) document.documentElement.classList.add("dark");
})();

// Apply the saved language before first paint to avoid a flash.
(function () {
  try {
    var supported = ["en", "es"];
    var storedLang = localStorage.getItem("synapsvault-lang");
    var lang = supported.indexOf(storedLang) !== -1 ? storedLang : null;
    if (!lang) {
      var candidates = (Array.isArray(navigator.languages) ? navigator.languages : []).concat([
        navigator.language,
      ]);
      for (var i = 0; i < candidates.length; i++) {
        var candidate = candidates[i];
        if (typeof candidate === "string") {
          var base = candidate.split("-")[0].toLowerCase();
          if (supported.indexOf(base) !== -1) {
            lang = base;
            break;
          }
        }
      }
    }
    document.documentElement.lang = lang || "en";
  } catch (e) {}
})();
