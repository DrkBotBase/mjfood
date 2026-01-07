const express = require("express");
const router = express.Router();
const PushSubscription = require("../models/Subscription");

router.post("/subscribe", async (req, res) => {
  try {
    const { endpoint, keys } = req.body;
    if (!endpoint || !keys) {
      return res.status(400).json({ message: "Datos inválidos" });
    }
    await PushSubscription.updateOne(
      { endpoint },
      { endpoint, keys },
      { upsert: true }
    );
    res.status(201).json({ success: true });
  } catch (error) {
    res.status(500).json({ error: "Error al guardar suscripción" });
  }
});

router.post("/send", async (req, res) => {
  const { title, body, url, icon } = req.body;

  const payload = JSON.stringify({
    title,
    body,
    url,
    icon
  });

  const subscriptions = await PushSubscription.find();

  let sent = 0;

  for (const sub of subscriptions) {
    try {
      await webpush.sendNotification(sub, payload);
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