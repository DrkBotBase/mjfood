async function enableNotifications() {
  const permission = await Notification.requestPermission();
  if (permission !== "granted") return hideNotifyBanner();

  const registration = await navigator.serviceWorker.ready;

  const subscription = await registration.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: urlBase64ToUint8Array("BLd5uZznWTEPLYTEec_mMkTehYN6V_5qsFXXkgtXLbRB4sGqTWxX2QaWZX20HTDkWjBcmB3BZbtDeSl17fulVh8")
  });

  await fetch("/api/push/subscribe", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(subscription)
  });

  hideNotifyBanner();
}

function hideNotifyBanner() {
  document.getElementById("notifyBanner")?.classList.add("hidden");
  localStorage.setItem("notifyBannerHidden", "1");
}

function shouldShowBanner() {
  if (!("Notification" in window)) return false;
  if (Notification.permission === "granted") return false;
  if (Notification.permission === "denied") return false;
  if (localStorage.getItem("notifyBannerHidden")) return false;
  return true;
}

function urlBase64ToUint8Array(base64String) {
  const padding = "=".repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding)
    .replace(/-/g, "+")
    .replace(/_/g, "/");

  return Uint8Array.from(atob(base64), c => c.charCodeAt(0));
}

document.addEventListener("DOMContentLoaded", () => {
  if (shouldShowBanner()) {
    document.getElementById("notifyBanner")?.classList.remove("hidden");
  }
});