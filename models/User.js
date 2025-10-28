const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  restauranteId: { type: String, required: true },
  role: { type: String, required: true, default: 'admin' }
});

const User = mongoose.model('User', userSchema);

module.exports = User;
