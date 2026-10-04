// Offline readiness and optional storage persistence. No audio playback owner.
const VERSION = "20261004-03";
const status = document.querySelector("#offlineStatus");
const label = document.querySelector("#offlineStatusText");
const help = document.querySelector("#offlineHelp");
const storageLabel = document.querySelector("#offlineStorageStatus");
let shellReady = false;

function showStatus(message) {
  status.dataset.ready = String(shellReady);
  label.textContent = message || (shellReady
    ? (navigator.onLine ? "Pripravené na offline" : "Offline · skladby v zariadení")
    : "Na prípravu offline otvor aplikáciu s internetom");
}

async function storageStatus(request = false) {
  try {
    if (!navigator.storage?.persisted) return;
    let persisted = await navigator.storage.persisted();
    if (request && !persisted && navigator.storage.persist) persisted = await navigator.storage.persist();
    storageLabel.textContent = persisted
      ? "Prehliadač povolil uchovanie dát. Ručné vymazanie údajov aplikácie odstráni aj uloženú hudbu."
      : "O uchovaní dát rozhoduje prehliadač. Záloha knižnice zostáva dostupná v Nastaveniach.";
  } catch {
    // A denied persistence request does not prevent importing or listening.
  }
}
export function requestOfflineStorage() { void storageStatus(true); }

async function checkShell(worker) {
  if (!worker) return;
  const channel = new MessageChannel();
  const reply = new Promise(resolve => {
    const timeout = setTimeout(() => { channel.port1.close(); resolve(null); }, 5000);
    channel.port1.onmessage = event => {
      clearTimeout(timeout);
      channel.port1.close();
      resolve(event.data);
    };
  });
  worker.postMessage({ type: "MUSIC_OFFLINE_STATUS" }, [channel.port2]);
  const result = await reply;
  shellReady = result?.ready === true && result.version === VERSION;
  showStatus(result && result.version !== VERSION ? "Je pripravená novšia verzia. Obnov aplikáciu." : undefined);
}

document.querySelector("#offlineHelpButton").addEventListener("click", () => {
  help.showModal();
  void storageStatus();
});
document.querySelector("#offlineHelpClose").addEventListener("click", () => help.close());
help.addEventListener("click", event => { if (event.target === help) help.close(); });
document.addEventListener("change", event => {
  if ((event.target.id === "filepick" || event.target.id === "backupPick") && event.target.files?.length) void storageStatus(true);
}, true);
window.addEventListener("online", () => {
  showStatus();
  if (navigator.serviceWorker?.controller) void checkShell(navigator.serviceWorker.controller);
});
window.addEventListener("offline", () => showStatus());
document.addEventListener("visibilitychange", () => {
  if (!document.hidden && navigator.serviceWorker?.controller) void checkShell(navigator.serviceWorker.controller);
});

if ("serviceWorker" in navigator && window.isSecureContext) {
  navigator.serviceWorker.addEventListener("controllerchange", () => void checkShell(navigator.serviceWorker.controller));
  navigator.serviceWorker.register("./sw.js", { scope: "./", updateViaCache: "none" })
    .then(() => navigator.serviceWorker.ready)
    .then(registration => checkShell(navigator.serviceWorker.controller || registration.active))
    .catch(() => showStatus("Offline príprava sa nepodarila. Obnov aplikáciu s internetom."));
} else {
  showStatus("Tento prehliadač nepodporuje otvorenie aplikácie offline.");
}
void storageStatus();
