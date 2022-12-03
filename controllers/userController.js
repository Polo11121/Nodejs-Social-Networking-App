const sharp = require('sharp');

const User = require('../models/userModel');
const Post = require('../models/postModel');
const Match = require('../models/matchModel');

const AppError = require('../utils/appError');
const catchAsync = require('../utils/catchAsync');
const images = require('../utils/images');

exports.uploadUserPhotos = images.upload.fields([
  { name: 'profileImage' },
  { name: 'backgroundImage' },
]);

exports.formatUserProfilePhotos = catchAsync(async (req, res, next) => {
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

exports.updateUser = catchAsync(async (req, res, next) => {
  if (req.files && req.files.profileImage) {
    req.body.profileImage = req.files.profileImage[0].filename;

    await Post.create({
      type: 'profile',
      user: req.user.id,
      images: [req.body.profileImage],
      description: 'Zaktualizowano zdjęcie profilowe',
    });
  } else if (req.files && req.files.backgroundImage) {
    req.body.backgroundImage = req.files.backgroundImage[0].filename;

    await Post.create({
      type: 'background',
      user: req.user.id,
      images: [req.body.backgroundImage],
      description: 'Zaktualizowano zdjęcie w tle',
    });
  }

  const updatedUser = await User.findByIdAndUpdate(req.user.id, req.body, {
    new: true,
    runValidators: true,
  });

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
