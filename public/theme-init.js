// Apply the saved theme before first paint to avoid a flash.
(function () {
  try {
    var stored = localStorage.getItem("synapsvault-theme");
    var dark =
      stored === "light" || stored === "dark"
        ? stored === "dark"
        : window.matchMedia("(prefers-color-scheme: dark)").matches;
    if (dark) document.documentElement.classList.add("dark");
  } catch (e) {}
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
