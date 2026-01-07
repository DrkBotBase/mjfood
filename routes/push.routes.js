const express = require("express");
const router = express.Router();
const PushSubscription = require("../models/Subscription");

router.post("/subscribe", async (req, res) => {
  console.log("📥 SUBSCRIBE BODY:", req.body);

  try {
    const { endpoint, keys } = req.body;

    if (!endpoint || !keys) {
      console.log("❌ Datos inválidos");
      return res.status(400).json({ message: "Datos inválidos" });
    }

    await PushSubscription.updateOne(
      { endpoint },
      { endpoint, keys },
      { upsert: true }
    );

    console.log("✅ Suscripción guardada");
    res.status(201).json({ success: true });

  } catch (error) {
    console.error("🔥 ERROR:", error);
    res.status(500).json({ error: "Error al guardar suscripción" });
  }
});

module.exports = router;