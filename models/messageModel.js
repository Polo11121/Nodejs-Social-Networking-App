const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema(
  {
    text: { type: String, required: false },
    receiver: {
      type: mongoose.Schema.ObjectId,
      ref: 'User'
    },
    receiverRead: { type: Boolean, default: false },
    images: { type: [String], default: [] },
    users: { type: Array, select: false },
    sender: {
      type: mongoose.Schema.ObjectId,
      ref: 'User'
    }
  },
  {
    timestamps: true
  },
  {
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  }
);

const Message = mongoose.model('Message', messageSchema);

module.exports = Message;
