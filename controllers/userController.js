const multer = require('multer');
const sharp = require('sharp');
const User = require('./../models/userModel');
const catchAsync = require('./../utils/catchAsync');
const AppError = require('./../utils/appError');

const multerStorage = multer.memoryStorage();

const multerFilter = (req, file, cb) => {
  if (file.mimetype.startsWith('image')) {
    cb(null, true);
  } else {
    cb(new AppError('Not an image! Please upload only images.', 400), false);
  }
};

const upload = multer({ storage: multerStorage, fileFilter: multerFilter });

exports.uploadUserPhotos = upload.fields([
  { name: 'profileImage' },
  { name: 'backgroundImage' }
]);

exports.resizeUserProfilePhotos = catchAsync(async (req, res, next) => {
  if (req.files && req.files.profileImage) {
    req.files.profileImage[0].filename = `user-profile-photo-${
      req.user.id
    }-${Date.now()}.jpeg`;

    await sharp(req.files.profileImage[0].buffer)
      .toFormat('jpeg')
      .toFile(`public/img/users/${req.files.profileImage[0].filename}`);
  } else if (req.files && req.files.backgroundImage) {
    req.files.backgroundImage[0].filename = `user-background-photo-${
      req.user.id
    }-${Date.now()}.jpeg`;

    await sharp(req.files.backgroundImage[0].buffer)
      .toFormat('jpeg')
      .toFile(`public/img/users/${req.files.backgroundImage[0].filename}`);
  }

  next();
});

const filterObj = (obj, ...allowedFields) => {
  const newObj = {};
  Object.keys(obj).forEach(el => {
    if (allowedFields.includes(el)) newObj[el] = obj[el];
  });
  return newObj;
};

exports.getAllUsers = catchAsync(async (req, res, next) => {
  const users = await User.find();

  // SEND RESPONSE
  res.status(200).json({
    status: 'success',
    results: users.length,
    data: {
      users
    }
  });
});

exports.updateMe = catchAsync(async (req, res, next) => {
  // 1) Create error if user POSTs password data
  if (req.body.password || req.body.passwordConfirm) {
    return next(
      new AppError(
        'This route is not for password updates. Please use /updateMyPassword.',
        400
      )
    );
  }

  // 2) Filtered out unwanted fields names that are not allowed to be updated
  const filteredBody = filterObj(req.body, 'description', 'name', 'email');

  const imagesPath = 'public/img/users/';

  if (req.files && req.files.profileImage) {
    filteredBody.profileImage = `${imagesPath}/${req.files.profileImage[0].filename}`;
  } else if (req.files && req.files.backgroundImage) {
    filteredBody.backgroundImage = `${imagesPath}/${req.files.backgroundImage[0].filename}`;
  }

  // 3) Update user document
  const updatedUser = await User.findByIdAndUpdate(req.user.id, filteredBody, {
    new: true,
    runValidators: true
  });

  res.status(200).json({
    status: 'success',
    data: {
      user: updatedUser
    }
  });
});

exports.deleteMe = catchAsync(async (req, res, next) => {
  await User.findByIdAndUpdate(req.user.id, { active: false });

  res.status(204).json({
    status: 'success',
    data: null
  });
});

exports.getUser = catchAsync(async (req, res, next) => {
  const user = await User.findById(req.params.id).populate('posts');

  if (!user) {
    return next(new AppError('Nie znaleziono takiego użytkownika', 404));
  }

  res.status(200).json(user);
});

exports.createUser = (req, res) => {
  res.status(500).json({
    status: 'error',
    message: 'This route is not yet defined!'
  });
};

exports.updateUser = (req, res) => {
  res.status(500).json({
    status: 'error',
    message: 'This route is not yet defined!'
  });
};

exports.deleteUser = (req, res) => {
  res.status(500).json({
    status: 'error',
    message: 'This route is not yet defined!'
  });
};
