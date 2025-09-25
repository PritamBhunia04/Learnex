const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const instSchema = new Schema({
  id: { type: String, trim: true, lowercase: true },
  password: { type: String },
  confirmpassword: { type: String }
}, { collection: 'instructors', timestamps: true });

const instModel = mongoose.models.Instructor || mongoose.model('Instructor', instSchema, 'instructors');
module.exports = instModel;