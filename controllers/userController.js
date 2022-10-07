const multer = require('multer');
const sharp = require('sharp');
const catchAsync = require('./../utils/catchAsync');
const AppError = require('./../utils/appError');

const User = require('./../models/userModel');
const Post = require('./../models/postModel');
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

exports.updateMe = catchAsync(async (req, res, next) => {
  if (req.body.password || req.body.passwordConfirm) {
    return next(
      new AppError(
        'This route is not for password updates. Please use /updateMyPassword.',
        400
      )
    );
  }

  const interestedBody = filterObj(
    req.body,
    'interestedGenders',
    'birthDate',
    'description',
    'name',
    'email',
    'hobbies',
    'workPlace',
    'middleSchool',
    'upperSchool',
    'home',
    'gender',
    'phoneNumber',
    'childCity',
    'cities',
    'address',
    'filters'
  );

  const imagesPath = 'public/img/users/';

  if (req.files && req.files.profileImage) {
    interestedBody.profileImage = `${imagesPath}/${req.files.profileImage[0].filename}`;

    await Post.create({
      type: 'profile',
      user: req.user.id,
      images: [interestedBody.profileImage],
      description: 'Zaktualizowano zdjęcie profilowe'
    });
  } else if (req.files && req.files.backgroundImage) {
    interestedBody.backgroundImage = `${imagesPath}/${req.files.backgroundImage[0].filename}`;

    await Post.create({
      type: 'background',
      user: req.user.id,
      images: [interestedBody.backgroundImage],
      description: 'Zaktualizowano zdjęcie w tle'
    });
  }

  const updatedUser = await User.findByIdAndUpdate(
    req.user.id,
    interestedBody,
    {
      new: true,
      runValidators: true
    }
  );

  res.status(200).json({
    status: 'success',
    data: updatedUser
  });
});

exports.deleteMe = catchAsync(async (req, res) => {
  await User.findByIdAndUpdate(req.user.id, { active: false });

  res.status(204).json({
    status: 'success',
    data: null
  });
});

exports.getUser = catchAsync(async (req, res, next) => {
  const user = await User.findById(req.params.id, { __v: 0, id: 0 })
    .populate({
      path: 'filters.interestedCity',
      select: 'city location'
    })
    .populate({
      path: 'home',
      select: 'city location'
    })
    .populate({
      path: 'childCity',
      select: 'city'
    })
    .populate({
      path: 'cities',
      select: 'city'
    })
    .populate({ path: 'posts', options: { sort: { createdAt: -1 } } });

  if (!user) {
    return next(new AppError('Nie znaleziono takiego użytkownika', 404));
  }

  let matchStatus;

  if (req.params.id !== req.user.id) {
    const match = await Match.findOne({
      $and: [
        {
          statuses: {
            $elemMatch: {
              user: req.user.id
            }
          }
        },
        {
          statuses: {
            $elemMatch: {
              user: req.params.id
            }
          }
        }
      ]
    });

    matchStatus = match
      ? match.statuses.map(({ status, user: matchUser }) => ({
          status,
          user: matchUser
        }))
      : undefined;
  }

  user.matchStatus = matchStatus;

  res.status(200).json({
    status: 'success',
    data: user
  });
});

exports.getAllUser = catchAsync(async (req, res, next) => {
  const users = await User.find(
    {
      $and: [
        {
          $or: [
            { name: { $regex: req.query.searchTerm, $options: 'i' } },
            { surname: { $regex: req.query.searchTerm, $options: 'i' } }
          ]
        },
        { _id: { $ne: req.user.id } }
      ]
    },
    { name: 1, surname: 1, profileImage: 1 }
  ).limit(5);

  res.status(200).json({
    status: 'success',
    data: users
  });
});
