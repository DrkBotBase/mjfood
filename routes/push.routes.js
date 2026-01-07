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

module.exports = router;