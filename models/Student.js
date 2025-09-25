const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const stdSchema = new Schema({
  name: { type: String, trim: true },
  email: { type: String, trim: true, lowercase: true },
  password: { type: String },
  role: { type: String, default: 'student' },
  terms: { type: Schema.Types.Mixed }
}, { collection: 'students', timestamps: true });

const stdModel = mongoose.models.Student || mongoose.model('Student', stdSchema, 'students');
module.exports = stdModel;
