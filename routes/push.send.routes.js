const express = require("express");
const router = express.Router();
const webpush = require("../push");
const PushSubscription = require("../models/Subscription");

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