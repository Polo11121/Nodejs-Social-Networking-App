const multer = require('multer');
const sharp = require('sharp');
const catchAsync = require('../utils/catchAsync');
const AppError = require('./../utils/appError');
const Post = require('./../models/postModel');

const multerStorage = multer.memoryStorage();

const multerFilter = (req, file, cb) => {
  if (file.mimetype.startsWith('image')) {
    cb(null, true);
  } else {
    cb(new AppError('Not an image! Please upload only images.', 400), false);
  }
};

const upload = multer({ storage: multerStorage, fileFilter: multerFilter });

exports.uploadPostPhotos = upload.array('images');

exports.resizePostPhotos = catchAsync(async (req, res, next) => {
  if (req.files) {
    req.body.images = [];

    await Promise.all(
      req.files.map(async (file, i) => {
        const imagesPath = 'public/img/posts/';
        const filename = `post-${req.user.id}-${Date.now()}-image-${i +
          1}.jpeg`;

        await sharp(file.buffer)
          .resize(2000, 1333)
          .toFormat('jpeg')
          .jpeg({ quality: 90 })
          .toFile(`${imagesPath}${filename}`);

        req.body.images.push(`${imagesPath}${filename}`);
      })
    );

    next();
  }
});

exports.getAllPosts = catchAsync(async (req, res, next) => {
  const posts = await Post.find();

  res.status(200).json({
    status: 'success',
    results: posts.length,
    data: {
      posts
    }
  });
});

exports.addPost = catchAsync(async (req, res, next) => {
  const newPosts = await Post.create(req.body);

  res.status(201).json({
    status: 'success',
    data: {
      newPosts
    }
  });
});

exports.deletePost = catchAsync(async (req, res, next) => {
  const post = await Post.findByIdAndDelete(req.params.id);

  if (!post) {
    return next(new AppError('No tour post with that ID', 404));
  }

  res.status(204).json({
    status: 'success',
    data: null
  });
});
