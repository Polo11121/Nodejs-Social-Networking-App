const mongoose = require('mongoose');

const postSchema = new mongoose.Schema(
  {
    type: {
      default: 'post',
      type: String,
      enum: ['post', 'background', 'profile'],
    },
    description: String,
    images: { type: [String], default: [] },
    createdAt: {
      type: Date,
      default: Date.now,
    },
    user: {
      type: mongoose.Schema.ObjectId,
      ref: 'User',
      required: [true, 'Post musi być przypisany do użytkownika'],
    },
  },
  {
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

postSchema.pre(/^find/, function (next) {
  this.populate({
    path: 'user',
    select: 'name surname profileImage',
  });

  next();
});

const Post = mongoose.model('Post', postSchema);

module.exports = Post;
