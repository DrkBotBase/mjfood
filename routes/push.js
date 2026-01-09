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
      return res.status(400).json({ error: "Datos inválidos" });
    }

    await PushSubscription.updateOne(
      { endpoint },
      {
        $set: { keys },
        $addToSet: { restaurantes: restaurante }
      },
      { upsert: true }
    );

    res.json({ success: true });
  } catch (err) {
    console.error("❌ Subscribe error:", err);
    res.status(500).json({ error: "Error al guardar suscripción" });
  }
});

router.post("/send", async (req, res) => {
  const { restaurante, title, message, image, url } = req.body;

  const subs = await PushSubscription.find({
    restaurantes: restaurante
  });

  let sent = 0;

  for (const sub of subs) {
    try {
      await webpush.sendNotification(
        sub,
        JSON.stringify({ title, message, image, url })
      );
      sent++;
    } catch (err) {
      if (err.statusCode === 410) {
        await PushSubscription.deleteOne({ endpoint: sub.endpoint });
      }
    }
  }

  res.json({ success: true, sent });
});

module.exports = router;