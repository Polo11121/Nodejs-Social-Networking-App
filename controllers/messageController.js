const multer = require('multer');
const sharp = require('sharp');
const catchAsync = require('../utils/catchAsync');
const Message = require('./../models/messageModel');
const AppError = require('./../utils/appError');
const APIFeatures = require('./../utils/apiFeatures');

const multerStorage = multer.memoryStorage();

const multerFilter = (req, file, cb) => {
  if (file.mimetype.startsWith('image')) {
    cb(null, true);
  } else {
    cb(new AppError('Not an image! Please upload only images.', 400), false);
  }
};

const upload = multer({ storage: multerStorage, fileFilter: multerFilter });

exports.uploadMessagePhotos = upload.array('images');

exports.resizeMessagePhotos = catchAsync(async (req, res, next) => {
  if (req.files.length) {
    req.body.images = [];

    await Promise.all(
      req.files.map(async (file, i) => {
        const imagesPath = 'public/img/messages/';
        const filename = `message-${req.user.id}-${Date.now()}-image-${i +
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

exports.getAllMessages = catchAsync(async (req, res, next) => {
  const query = Message.find({
    users: { $all: [req.user.id, req.params.id] }
  }).sort({ updatedAt: -1 });

  const results = (await query).length;
  const features = new APIFeatures(query, req.query, results).paginate();

  const messages = await features.query;
  const { hasNextPage } = features;

  res.status(200).json({ hasNextPage, data: messages });
});

exports.addMessage = catchAsync(async (req, res, next) => {
  const newMessage = await Message.create({
    text: req.body.text,
    sender: req.user.id,
    receiver: req.body.receiver,
    users: [req.user.id, req.body.receiver],
    images: req.body.images
  });

  res.status(201).json({
    status: 'success',
    data: {
      newMessage
    }
  });
});
