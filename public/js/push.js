async function enableNotifications() {
  if (!("Notification" in window)) return;

  if (Notification.permission === "granted") {
    await subscribeUser(true);
    return;
  }

  const permission = await Notification.requestPermission();

  if (permission !== "granted") {
    hideNotifyBanner();
    return;
  }

  localStorage.setItem("push-notifications-enabled", "true");
  await subscribeUser(true);
}

async function subscribeUser(showWelcome = false) {
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

  await sendSubscription(subscription);

  if (showWelcome) {
    hideNotifyBanner();
    showWelcomeNotification();
  }
}

async function sendSubscription(subscription) {
  const pathSegments = window.location.pathname.split("/").filter(Boolean);
  const restaurante = pathSegments[0] || "lista";

  try {
    await fetch("/push/subscribe", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...subscription.toJSON(),
        restaurante
      })
    });
  } catch (err) {
    console.error("❌ Error enviando suscripción:", err);
  }
}

function showWelcomeNotification() {
  if (localStorage.getItem("welcomeNotificationShown")) return;
  if (!("serviceWorker" in navigator)) return;

  navigator.serviceWorker.ready.then(registration => {
    registration.showNotification("¡Bienvenido!", {
      body: "Ahora recibirás promociones y novedades 🍔🔥",
      icon: "/assets/icon.png",
      badge: "/assets/icon.png",
      vibrate: [200, 100, 200],
      tag: "welcome"
    });

    localStorage.setItem("welcomeNotificationShown", "1");
  });
}

/* Banner */
function showBannerAnimation() {
  const banner = document.getElementById("notifyBanner");
  if (!banner) return;

  // Quitamos el bloqueo de eventos y aplicamos estado visible
  banner.classList.remove("pointer-events-none", "opacity-0", "translate-y-[-20px]", "scale-95");
  banner.classList.add("pointer-events-auto", "opacity-100", "translate-y-0", "scale-100");
}
function hideNotifyBanner() {
  const banner = document.getElementById("notifyBanner");
  if (!banner) return;

  // Volvemos al estado inicial (se desliza hacia arriba y desaparece)
  banner.classList.replace("opacity-100", "opacity-0");
  banner.classList.replace("translate-y-0", "translate-y-[-20px]");
  banner.classList.replace("scale-100", "scale-95");
  banner.classList.add("pointer-events-none");

  //localStorage.setItem("notifyBannerHidden", "1");
  
  // Opcional: eliminar del DOM después de la animación
  setTimeout(() => { banner.style.display = 'none'; }, 500);
}

function shouldShowBanner() {
  if (!("Notification" in window)) return false;
  if (Notification.permission === "granted") return false;
  if (Notification.permission === "denied") return false;
  if (localStorage.getItem("push-notifications-enabled")) return false;
  if (localStorage.getItem("notifyBannerHidden")) return false;
  return true;
}

function urlBase64ToUint8Array(base64String) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding)
    .replace(/-/g, "+")
    .replace(/_/g, "/");

  const rawData = window.atob(base64);
  return Uint8Array.from([...rawData].map(char => char.charCodeAt(0)));
}

document.addEventListener("DOMContentLoaded", async () => {
  if (shouldShowBanner()) {
    setTimeout(showBannerAnimation, 800);
  }

  if (Notification.permission === "granted") {
    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.getSubscription();
    if (subscription) {
      sendSubscription(subscription);
    }
  }
});