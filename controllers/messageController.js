const multer = require('multer');
const sharp = require('sharp');
const catchAsync = require('../utils/catchAsync');
const AppError = require('./../utils/appError');
const APIFeatures = require('./../utils/apiFeatures');

const Message = require('./../models/messageModel');
const Match = require('./../models/matchModel');

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

exports.getLastMessages = catchAsync(async (req, res) => {
  const matches = await Match.find(
    {
      users: { $in: [req.user.id] }
    },
    { statuses: { $elemMatch: { user: { $ne: req.user.id } } } }
  ).populate({
    path: 'statuses.user',
    select: 'name surname profileImage'
  });

  const lastMessages = await Promise.all(
    matches.map(async match => {
      const message = await Message.findOne(
        {
          users: {
            $all: [
              req.user.id.toString(),
              match.statuses[0].user._id.toString()
            ]
          }
        },
        { sender: 1, text: 1, createdAt: 1, receiverRead: 1 }
      )
        .populate({
          path: 'sender',
          select: 'name surname profileImage'
        })
        .sort({ createdAt: -1 });

      return message;
    })
  );

  const matchesWithLastMessage = matches.map((match, index) => ({
    _id: match._id,
    match: match.statuses[0].user,
    lastMessage: lastMessages[index]
  }));

  res.status(200).json({
    status: 'success',
    data: matchesWithLastMessage
  });
});

exports.getAllMessages = catchAsync(async (req, res) => {
  await Message.updateMany(
    {
      $and: [
        { users: { $all: [req.user.id, req.params.id] } },
        { receiver: req.user.id },
        { receiverRead: { $ne: true } }
      ]
    },
    {
      $set: {
        receiverRead: true
      }
    }
  );

  const query = Message.find(
    {
      users: { $all: [req.user.id, req.params.id] }
    },
    { receiverRead: 0, updatedAt: 0, __v: 0 }
  )
    .populate({
      path: 'receiver',
      select: 'name surname profileImage'
    })
    .populate({
      path: 'sender',
      select: 'name surname profileImage'
    })
    .sort({ createdAt: -1 });

  const results = (await query).length;
  const features = new APIFeatures(query, req.query, results).paginate();

  const messages = await features.query;
  const { hasNextPage } = features;

  res.status(200).json({ status: 'success', hasNextPage, data: messages });
});

exports.getUnreadMessages = catchAsync(async (req, res) => {
  const unreadMessages = await Message.countDocuments({
    $and: [{ receiver: req.user.id }, { receiverRead: { $ne: true } }]
  });

  res.status(200).json({ status: 'success', data: unreadMessages });
});

exports.addMessage = catchAsync(async (req, res) => {
  const newMessage = await Message.create({
    text: req.body.text,
    sender: req.user.id,
    receiver: req.body.receiver,
    users: [req.user.id, req.body.receiver],
    images: req.body.images
  });

  res.status(201).json({
    status: 'success',
    data: newMessage
  });
});
