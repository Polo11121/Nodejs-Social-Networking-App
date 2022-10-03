// eslint-disable-next-line
const ObjectId = require('mongodb').ObjectId;
const catchAsync = require('./../utils/catchAsync');
const subtractYears = require('./../utils/functions');

const City = require('./../models/cityModel');
const User = require('./../models/userModel');
const Match = require('./../models/matchModel');

exports.getMatchingUsers = catchAsync(async (req, res) => {
  const {
    interestedGenders,
    interestedAge,
    interestedCity,
    interestedCityMaxDistance
  } = req.query;

  const ageRange = interestedAge && interestedAge.split('-');

  const swipedUsers = await Match.find({
    statuses: {
      $elemMatch: {
        user: req.user.id,
        status: { $ne: 'none' }
      }
    }
  });

  const swipedUsersIds = (swipedUsers || []).map(
    ({ statuses }) =>
      statuses.find(({ user }) => user.toString() !== req.user.id.toString())
        .user
  );

  const cities = interestedCity
    ? await City.find(
        {
          location: {
            $near: {
              $geometry: {
                type: 'Point',
                coordinates: JSON.parse(interestedCity)
              },
              $maxDistance: interestedCityMaxDistance * 10000
            }
          }
        },
        { _id: 1 }
      )
    : [];

  const citiesIds = cities.map(({ _id }) => ObjectId(_id));

  const user = await User.find(
    {
      $and: [
        ...[
          swipedUsersIds
            ? { _id: { $nin: swipedUsersIds } }
            : { _id: { $exists: true } }
        ],
        { _id: { $ne: req.user.id } },
        ...[
          interestedGenders && interestedGenders !== 'femalesAndMales'
            ? { gender: interestedGenders.slice(0, -1) }
            : { gender: { $exists: true } }
        ],
        ...[
          interestedAge
            ? {
                birthDate: {
                  $gte: subtractYears(ageRange[1]),
                  $lte: subtractYears(ageRange[0])
                }
              }
            : { birthDate: { $exists: true } }
        ],
        ...[
          citiesIds
            ? {
                home: { $in: citiesIds }
              }
            : { home: { $exists: true } }
        ]
      ]
    },
    { name: 1, surname: 1 }
  ).limit(1);

  res.status(200).json({
    status: 'success',
    data: user[0]
  });
});

exports.getMatches = catchAsync(async (req, res) => {
  await Match.updateMany(
    {
      users: { $in: [req.user.id] }
    },
    { $set: { 'statuses.$[elem].new': false } },
    { arrayFilters: [{ 'elem.user': req.user.id }] }
  );

  const matches = await Match.find(
    {
      users: { $in: [req.user.id] }
    },
    { statuses: { $elemMatch: { user: { $ne: req.user.id } } } }
  )
    .populate({
      path: 'statuses.user',
      select: 'name surname profileImage'
    })
    .map(async match => [
      { _id: match[0]._id, match: match[0].statuses[0].user }
    ]);

  res.status(200).json({
    status: 'success',
    data: matches
  });
});

exports.getNewMatches = catchAsync(async (req, res) => {
  const newMatches = await Match.countDocuments({
    statuses: {
      $elemMatch: {
        user: req.user.id,
        new: { $in: [true] }
      }
    }
  });

  res.status(200).json({
    status: 'success',
    data: newMatches
  });
});

exports.swipe = catchAsync(async (req, res) => {
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
            user: req.body.userId
          }
        }
      }
    ]
  });

  const isMatch =
    match &&
    match.statuses.find(
      ({ user }) => user.toString() !== req.user.id.toString()
    ).status === 'right' &&
    req.body.status === 'right';

  if (match) {
    await Match.updateOne(
      {
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
                user: req.body.userId
              }
            }
          }
        ]
      },
      {
        $set: isMatch
          ? {
              'statuses.$[elem].status': 'match',
              'statuses.$[elem2].status': 'match',
              users: [req.user.id, req.body.userId]
            }
          : { 'statuses.$[elem].status': req.body.status }
      },
      {
        arrayFilters: [
          { 'elem.user': req.user.id },
          { 'elem2.user': req.body.userId }
        ]
      }
    );
  } else {
    await Match.create({
      statuses: [
        { user: req.user, status: req.body.status },
        { user: req.body.userId }
      ]
    });
  }

  res.status(200).json({
    status: 'success',
    data: isMatch
  });
});
