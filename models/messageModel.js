const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema(
  {
    text: { type: String, required: false },
    receiver: {
      type: mongoose.Schema.ObjectId,
      ref: 'User',
      required: [true, 'Post musi być przypisany do użytkownika']
    },
    images: { type: [String], default: [] },
    users: { type: Array, select: false },
    sender: {
      type: mongoose.Schema.ObjectId,
      ref: 'User',
      required: [true, 'Post musi być przypisany do użytkownika']
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

messageSchema.pre(/^find/, function(next) {
  this.populate({
    path: 'receiver',
    select: 'name surname profileImage'
  });

  this.populate({
    path: 'sender',
    select: 'name surname profileImage'
  });

  next();
});

const Message = mongoose.model('Message', messageSchema);

module.exports = Message;
