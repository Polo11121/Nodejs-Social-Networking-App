const sharp = require('sharp');

const catchAsync = require('../utils/catchAsync');

const User = require('../models/userModel');
const Post = require('../models/postModel');
const Match = require('../models/matchModel');

const images = require('../utils/images');
const AppError = require('../utils/appError');

exports.uploadUserPhotos = images.upload.fields([
  { name: 'profileImage' },
  { name: 'backgroundImage' },
]);

exports.resizeUserProfilePhotos = catchAsync(async (req, res, next) => {
  if (req.files && req.files.profileImage) {
    const filename = images.randomImageName();
    req.files.profileImage[0].filename = images.getImage(filename);

    const buffer = await sharp(req.files.profileImage[0].buffer)
      .toFormat('jpeg')
      .toBuffer();

    await images.sendImage(buffer, filename);
  } else if (req.files && req.files.backgroundImage) {
    const filename = images.randomImageName();
    req.files.backgroundImage[0].filename = images.getImage(filename);

    const buffer = await sharp(req.files.backgroundImage[0].buffer)
      .toFormat('jpeg')
      .toBuffer();

    await images.sendImage(buffer, filename);
  }

  next();
});

const filterObj = (obj, ...allowedFields) => {
  const newObj = {};
  Object.keys(obj).forEach((el) => {
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

  if (req.files && req.files.profileImage) {
    interestedBody.profileImage = req.files.profileImage[0].filename;

    await Post.create({
      type: 'profile',
      user: req.user.id,
      images: [interestedBody.profileImage],
      description: 'Zaktualizowano zdjęcie profilowe',
    });
  } else if (req.files && req.files.backgroundImage) {
    interestedBody.backgroundImage = req.files.backgroundImage[0].filename;

    await Post.create({
      type: 'background',
      user: req.user.id,
      images: [interestedBody.backgroundImage],
      description: 'Zaktualizowano zdjęcie w tle',
    });
  }

  const updatedUser = await User.findByIdAndUpdate(
    req.user.id,
    interestedBody,
    {
      new: true,
      runValidators: true,
    }
  );

  res.status(200).json({
    status: 'success',
    data: updatedUser,
  });
});

exports.getUser = catchAsync(async (req, res, next) => {
  if (req.user.role === 'admin' && req.params.id === req.user.id) {
    const user = await User.findById(req.params.id, {
      role: 1,
      email: 1,
      name: 1,
      surname: 1,
      profileImage: 1,
    });

    if (!user) {
      return next(new AppError('Nie znaleziono takiego użytkownika', 404));
    }

    res.status(200).json({
      status: 'success',
      data: user,
    });
  }

  const user = await User.findOne(
    {
      $and: [
        { _id: req.params.id },
        ...(req.user.role === 'user' ? [{ status: 'active' }] : []),
      ],
    },
    {
      __v: 0,
      id: 0,
    }
  )
    .populate({
      path: 'filters.interestedCity',
      select: 'city location',
    })
    .populate({
      path: 'home',
      select: 'city location',
    })
    .populate({
      path: 'childCity',
      select: 'city',
    })
    .populate({
      path: 'cities',
      select: 'city',
    })
    .populate({ path: 'posts', options: { sort: { createdAt: -1 } } });

  if (!user) {
    return next(new AppError('Nie znaleziono takiego użytkownika', 404));
  }

  if (req.params.id !== req.user.id) {
    const match = await Match.findOne({
      $and: [
        {
          statuses: {
            $elemMatch: {
              user: req.user.id,
            },
          },
        },
        {
          statuses: {
            $elemMatch: {
              user: req.params.id,
            },
          },
        },
      ],
    });

    user.matchStatus = match
      ? match.statuses.map(({ status, user: matchUser }) => ({
          status,
          user: matchUser,
        }))
      : [
          { status: 'none', user: req.params.id },
          { status: 'none', user: req.user.id },
        ];

    res.status(200).json({
      status: 'success',
      data: user,
    });
  }

  res.status(200).json({
    status: 'success',
    data: user,
  });
});

exports.getUsers = catchAsync(async (req, res, next) => {
  const trimmedSearchTerm = req.query.searchTerm.trim();
  const splittedSearchTerm = trimmedSearchTerm.split(' ');

  const users = await User.find(
    {
      $and: [
        { status: 'active' },
        {
          $or: [
            {
              name: {
                $regex:
                  splittedSearchTerm.length === 2
                    ? splittedSearchTerm[0]
                    : trimmedSearchTerm,
                $options: 'i',
              },
            },
            {
              surname: {
                $regex:
                  splittedSearchTerm.length === 2
                    ? splittedSearchTerm[1]
                    : trimmedSearchTerm,
                $options: 'i',
              },
            },
          ],
        },
        { _id: { $ne: req.user.id } },
      ],
    },
    { name: 1, surname: 1, profileImage: 1 }
  ).limit(5);

  res.status(200).json({
    status: 'success',
    data: users,
  });
});
