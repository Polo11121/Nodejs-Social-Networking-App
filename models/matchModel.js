const mongoose = require('mongoose');

const matchSchema = new mongoose.Schema(
  {
    statuses: [
      {
        user: { type: mongoose.Schema.ObjectId, ref: 'User' },
        status: {
          type: String,
          enum: ['left', 'right', 'match', 'none'],
          default: 'none'
        },
        new: { type: Boolean, default: true }
      }
    ],
    users: [{ type: mongoose.Schema.ObjectId, ref: 'User', default: [] }]
  },
  {
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  }
);

const Match = mongoose.model('Match', matchSchema);

module.exports = Match;
