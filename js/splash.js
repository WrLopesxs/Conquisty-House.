const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

export function initSplashScreen({
  screenId = "appSplash",
  minDuration = 1800,
  fadeDuration = 720
} = {}) {
  const splash = document.getElementById(screenId);
  if (!splash) {
    document.body.classList.remove("splash-active");
    document.body.classList.add("splash-complete");
    return;
  }

  const titleEl = splash.querySelector(".app-splash__title");
  const messageEl = splash.querySelector(".app-splash__message");
  const appName = document.body.dataset.splashAppName || document.title || "Conquist House CRM";
  const appMessage = document.body.dataset.splashMessage || "Carregando painel...";

  if (titleEl) titleEl.textContent = appName;
  if (messageEl) messageEl.textContent = appMessage;

  const duration = prefersReducedMotion.matches ? 320 : minDuration;
  const exitDelay = prefersReducedMotion.matches ? 180 : fadeDuration;

  const closeSplash = () => {
    if (!document.body.classList.contains("splash-active")) return;

    document.body.classList.add("splash-leaving");
    window.setTimeout(() => {
      document.body.classList.remove("splash-active", "splash-leaving");
      document.body.classList.add("splash-complete");
      splash.setAttribute("hidden", "");
    }, exitDelay);
  };

  window.setTimeout(closeSplash, duration);

  if (document.readyState === "complete") {
    splash.classList.add("app-splash--ready");
  } else {
    window.addEventListener("load", () => {
      splash.classList.add("app-splash--ready");
    }, { once: true });
  }
}
