const sharp = require('sharp');
const multer = require('multer');
const catchAsync = require('../utils/catchAsync');

const Post = require('./../models/postModel');

const AppError = require('./../utils/appError');

const multerStorage = multer.memoryStorage();

const multerFilter = (req, file, cb) => {
  if (file.mimetype.startsWith('image')) {
    cb(null, true);
  } else {
    cb(new AppError('Proszę przesłać zdjęcie!', 400), false);
  }
};

const upload = multer({ storage: multerStorage, fileFilter: multerFilter });

exports.uploadPostPhotos = upload.array('images');

exports.resizePostPhotos = catchAsync(async (req, res, next) => {
  if (req.files.length) {
    req.body.images = [];

    await Promise.all(
      req.files.map(async (file, i) => {
        const imagesPath = 'public/img/posts/';
        const filename = `post-${req.user.id}-${Date.now()}-image-${i +
          1}.jpeg`;

        await sharp(file.buffer)
          .toFormat('jpeg')
          .toFile(`${imagesPath}${filename}`);

        req.body.images.push(`${imagesPath}${filename}`);
      })
    );
  }
  next();
});

exports.addPost = catchAsync(async (req, res) => {
  const newPost = await Post.create(req.body);

  res.status(201).json({
    status: 'success',
    data: newPost
  });
});

exports.deletePost = catchAsync(async (req, res, next) => {
  const post = await Post.findByIdAndDelete(req.params.id);

  if (!post) {
    return next(new AppError('Nie znaleziono takiego posta', 404));
  }

  res.status(204).json({
    status: 'success',
    data: null
  });
});

exports.updatePost = catchAsync(async (req, res) => {
  const updatedPost = await Post.findByIdAndUpdate(req.params.id, req.body, {
    new: true,
    runValidators: true
  });

  res.status(200).json({
    status: 'success',
    data: updatedPost
  });
});
