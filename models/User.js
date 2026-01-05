// models/User.js
const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  restauranteId: { type: String, required: true },
  role: { type: String, default: 'admin' },
  likes: {
    count: { type: Number, default: 0 },
    ips: { type: [String], default: [] }
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('User', userSchema);