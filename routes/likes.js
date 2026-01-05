const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const User = require('../models/User');

// Utils
const hashIp = (ip) =>
  crypto.createHash('sha256').update(ip).digest('hex');

const getClientIp = (req) => {
  const forwarded = req.headers['x-forwarded-for'];
  return forwarded ? forwarded.split(',')[0].trim() : req.ip;
};

/* ===============================
   POST → DAR LIKE (solo menú)
   =============================== */
router.post('/:restauranteId', async (req, res) => {
  try {
    const { restauranteId } = req.params;
    const ipHash = hashIp(getClientIp(req));

    const updated = await User.findOneAndUpdate(
      {
        restauranteId,
        'likes.ips': { $ne: ipHash }
      },
      {
        $inc: { 'likes.count': 1 },
        $push: {
          'likes.ips': {
            $each: [ipHash],
            $slice: -5000
          }
        }
      },
      { new: true }
    );

    // Ya había dado like
    if (!updated) {
      const current = await User.findOne(
        { restauranteId },
        { 'likes.count': 1 }
      );

      return res.json({
        liked: false,
        likes: current?.likes?.count || 0
      });
    }

    res.json({
      liked: true,
      likes: updated.likes.count
    });

  } catch (err) {
    console.error('LIKE ERROR:', err);
    res.status(500).json({ liked: false, likes: 0 });
  }
});

/* ===============================
   GET → ESTADO DEL LIKE (menú)
   =============================== */
router.get('/:restauranteId/status', async (req, res) => {
  try {
    const { restauranteId } = req.params;
    const ipHash = hashIp(getClientIp(req));

    const user = await User.findOne(
      { restauranteId },
      { 'likes.ips': 1, 'likes.count': 1 }
    );

    if (!user) {
      return res.json({ liked: false, likes: 0 });
    }

    res.json({
      liked: user.likes.ips.includes(ipHash),
      likes: user.likes.count
    });

  } catch (err) {
    console.error('LIKE STATUS ERROR:', err);
    res.status(500).json({ liked: false, likes: 0 });
  }
});

module.exports = router;