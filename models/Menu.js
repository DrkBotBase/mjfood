const mongoose = require('mongoose');

const colorSchema = new mongoose.Schema({
  text: String,
  primary: String,
  bg: String,
  light: String,
  dark: String
}, { _id: false });

const iconSchema = new mongoose.Schema({
  src: String,
  sizes: String,
  type: { type: String, default: 'image/png' }
}, { _id: false });

const pwaSchema = new mongoose.Schema({
  short_name: String,
  name: String,
  description: String,
  theme_color: String,
  background_color: String,
  display: String,
  orientation: String,
  icons: [iconSchema],
  categories: [String],
  lang: String
}, { _id: false });

const configSchema = new mongoose.Schema({
  extension: { type: String, required: true },
  orden: { type: String, default: "999" },
  color: colorSchema,
  pwa: pwaSchema,
  nombre: String,
  direccion: String,
  telefonoWhatsApp: String,
  logoUrl: String,
  taxRate: { type: Number, default: 0 }
}, { _id: false });

const scheduleSchema = new mongoose.Schema({
  day: Number,
  open: String,
  close: String
}, { _id: false });

const shippingZoneSchema = new mongoose.Schema({
  name: String,
  price: Number
}, { _id: false });

const transferPaymentSchema = new mongoose.Schema({
  bankName: String,
  accountType: String,
  accountNumber: String,
  accountHolder: String
}, { _id: false });

const paymentInfoSchema = new mongoose.Schema({
  transfer: transferPaymentSchema
}, { _id: false });

const optionSchema = new mongoose.Schema({
  label: String,
  price: Number
}, { _id: false });

const variantSchema = new mongoose.Schema({
  type: { type: String, enum: ['radio', 'checkbox'] },
  name: String,
  options: [optionSchema]
}, { _id: false });

const itemSchema = new mongoose.Schema({
  id: { type: Number },
  name: String,
  description: String,
  basePrice: Number,
  image: String,
  placeholder: String,
  variants: [variantSchema]
}, { _id: false });

const categorySchema = new mongoose.Schema({
  category: String,
  items: [itemSchema]
});

const menuSchema = new mongoose.Schema({
  restauranteId: { type: String, required: true, unique: true },
  config: configSchema,
  schedule: [scheduleSchema],
  shippingZones: [shippingZoneSchema],
  paymentInfo: paymentInfoSchema,
  menu: [categorySchema]
}, { timestamps: true });

module.exports = mongoose.model('Menu', menuSchema);