// models/Subscription.js
const mongoose = require("mongoose");

const PushSubscriptionSchema = new mongoose.Schema({
  endpoint: { type: String, unique: true },
  keys: {
    p256dh: String,
    auth: String
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model(
  "PushSubscription",
  PushSubscriptionSchema
);