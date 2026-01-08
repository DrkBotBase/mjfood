require("dotenv")
const express = require("express");
const router = express.Router();
const webpush = require("web-push");
const PushSubscription = require("../models/Subscription");

webpush.setVapidDetails(
  "mailto:admin@mjfood.top",
  process.env.VAPID_PUBLIC_KEY,
  process.env.VAPID_PRIVATE_KEY
);

router.post("/subscribe", async (req, res) => {
  try {
    const { endpoint, keys, restaurante } = req.body;

    if (!endpoint || !keys || !restaurante) {
      return res.status(400).json({ message: "Datos inválidos" });
    }

    await PushSubscription.updateOne(
      { endpoint },
      { endpoint, keys, restaurante },
      { upsert: true }
    );

    res.status(201).json({ success: true });
  } catch (error) {
    console.error("❌ Subscribe error:", error);
    res.status(500).json({ error: "Error al guardar suscripción" });
  }
});

router.post("/send", async (req, res) => {
  const { title, message, url, icon, image, restaurante } = req.body;

  if (!restaurante) {
    return res.status(400).json({ message: "Restaurante requerido" });
  }

  const payload = JSON.stringify({
    title,
    message,
    url,
    icon,
    image
  });

  const subscriptions = await PushSubscription.find({ restaurante });
  let sent = 0;

  for (const sub of subscriptions) {
    try {
      await webpush.sendNotification(
        {
          endpoint: sub.endpoint,
          keys: {
            p256dh: sub.keys.p256dh,
            auth: sub.keys.auth
          }
        },
        payload
      );
      sent++;
    } catch (err) {
      console.error("❌ Push error:", err.statusCode);

      if (err.statusCode === 410 || err.statusCode === 404) {
        await PushSubscription.deleteOne({ endpoint: sub.endpoint });
      }
    }
  }

  res.json({
    success: true,
    restaurante,
    sent
  });
});

module.exports = router;