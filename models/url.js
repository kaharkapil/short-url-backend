const mongoose = require("mongoose");

const urlSchema = new mongoose.Schema({
    enc_url: { type: String, default: null },
    shortCode: { type: String, default: null },
    token: { type: String },
});

module.exports = mongoose.model("url", urlSchema);