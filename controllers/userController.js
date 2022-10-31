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
    cb(new AppError('Proszę przesłać zdjęcie!', 400), false);
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

exports.updateUser = catchAsync(async (req, res, next) => {
  const interestedBody = filterObj(
    req.body,
    'interestedGenders',
    'birthDate',
    'description',
    'name',
    'surname',
    'contactEmail',
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

exports.deleteUser = catchAsync(async (req, res) => {
  await User.findByIdAndUpdate(req.user.id, { active: false });

  await Match.updateMany(
    {
      statuses: {
        $elemMatch: {
          user: req.user.id
        }
      }
    },
    { $set: { active: false } }
  );

  res.status(204).json({
    status: 'success',
    data: null
  });
});

exports.getUser = catchAsync(async (req, res, next) => {
  const user = await User.findOne(
    {
      $and: [
        { _id: req.params.id },
        { active: { $eq: true } },
        { accountConfirmed: { $eq: true } }
      ]
    },
    {
      __v: 0,
      id: 0
    }
  )
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
      : [
          { status: 'none', user: req.params.id },
          { status: 'none', user: req.user.id }
        ];
  }

  user.matchStatus = matchStatus;

  res.status(200).json({
    status: 'success',
    data: user
  });
});

exports.getUsers = catchAsync(async (req, res, next) => {
  const splittedSearchTerm = req.query.searchTerm.split(' ');

  const users = await User.find(
    {
      $and: [
        { active: { $eq: true } },
        { accountConfirmed: { $eq: true } },
        {
          $or: [
            {
              name: {
                $regex:
                  splittedSearchTerm.length === 2
                    ? splittedSearchTerm[0]
                    : req.query.searchTerm,
                $options: 'i'
              }
            },
            {
              surname: {
                $regex:
                  splittedSearchTerm.length === 2
                    ? splittedSearchTerm[1]
                    : req.query.searchTerm,
                $options: 'i'
              }
            }
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
