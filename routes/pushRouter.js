const express = require('express');
const router = express.Router();
const webpush = require('web-push');
const Subscription = require('../models/Subscription');

webpush.setVapidDetails(
  'mailto:tu-correo@mjfood.top',
  process.env.VAPID_PUBLIC_KEY,
  process.env.VAPID_PRIVATE_KEY
);

// Guardar suscripción del cliente
router.post('/subscribe', async (req, res) => {
  try {
    const subscription = req.body;
    await Subscription.create(subscription);
    res.status(201).json({});
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Enviar notificación a todos los suscriptores
router.post('/notify', async (req, res) => {
  const { title, message } = req.body;
  const payload = JSON.stringify({ title, message });

  const subs = await Subscription.find();
  for (const sub of subs) {
    try {
      await webpush.sendNotification(sub, payload);
    } catch (err) {
      console.error('Error al enviar notificación:', err);
    }
  }

  res.json({ ok: true });
});

module.exports = router;