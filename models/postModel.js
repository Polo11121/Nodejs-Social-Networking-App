const mongoose = require('mongoose');

const postSchema = new mongoose.Schema(
  {
    description: String,
    images: [String],
    createdAt: {
      type: Date,
      default: Date.now
    },
    user: {
      type: mongoose.Schema.ObjectId,
      ref: 'User',
      required: [true, 'Post musi być przypisany do użytkownika']
    }
  },
  {
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  }
);

postSchema.pre(/^find/, function(next) {
  this.populate({
    path: 'user',
    select: 'name surname profileImage'
  });

  next();
});

const Post = mongoose.model('Post', postSchema);

module.exports = Post;
