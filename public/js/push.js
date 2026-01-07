async function enableNotifications() {
  console.log("🔔 Click en activar notificaciones");

  if (!("Notification" in window)) {
    console.log("❌ Notificaciones no soportadas");
    return;
  }

  // Si ya están concedidas, NO volver a pedir permiso
  if (Notification.permission === "granted") {
    console.log("✅ Permiso ya concedido");
    return await subscribeUser();
  }

  // Solo aquí se pide permiso
  const permission = await Notification.requestPermission();
  console.log("📢 Permiso:", permission);

  if (permission !== "granted") {
    hideNotifyBanner();
    return;
  }

  await subscribeUser();
}

async function subscribeUser() {
  console.log("📤 Creando suscripción push");

  const registration = await navigator.serviceWorker.ready;
  let subscription = await registration.pushManager.getSubscription();

  if (!subscription) {
    subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(
        "BLd5uZznWTEPLYTEec_mMkTehYN6V_5qsFXXkgtXLbRB4sGqTWxX2QaWZX20HTDkWjBcmB3BZbtDeSl17fulVh8"
      )
    });
  }

  console.log("📦 Subscription:", subscription);

  const res = await fetch("/push/subscribe", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(subscription)
  });

  console.log("📨 Backend status:", res.status);

  if (res.ok) {
    hideNotifyBanner();
    showWelcomeNotification();
  }
}

function showWelcomeNotification() {
  if (localStorage.getItem('welcomeNotificationShown')) return;

  if (!('serviceWorker' in navigator)) return;

  navigator.serviceWorker.ready.then(registration => {
    registration.showNotification('¡Bienvenido!', {
      body: 'Ahora recibirás actualizaciones de nuestros menús 🍔🔥',
      icon: '/assets/icon.png',
      badge: '/assets/icon.png',
      vibrate: [200, 100, 200],
      tag: 'welcome-notification'
    });

    localStorage.setItem('welcomeNotificationShown', 'true');
  });
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
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding)
    .replace(/-/g, '+')
    .replace(/_/g, '/');

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

document.addEventListener("DOMContentLoaded", () => {
  if (shouldShowBanner()) {
    document.getElementById("notifyBanner")?.classList.remove("hidden");
  }
});