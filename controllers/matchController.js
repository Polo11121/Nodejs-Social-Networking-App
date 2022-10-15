// eslint-disable-next-line
const ObjectId = require('mongodb').ObjectId;
const catchAsync = require('./../utils/catchAsync');
const subtractYears = require('./../utils/functions');

const City = require('./../models/cityModel');
const User = require('./../models/userModel');
const Match = require('./../models/matchModel');

exports.getSuggestions = catchAsync(async (req, res) => {
  const {
    interestedGenders,
    interestedAge,
    interestedCity,
    interestedCityMaxDistance
  } = req.query;

  const ageRange = interestedAge && interestedAge.split('-');

  const swipedUsers = await Match.find(
    {
      statuses: {
        $elemMatch: {
          user: req.user.id
        }
      }
    },
    {
      statuses: { $elemMatch: { user: { $ne: req.user.id } } }
    }
  );

  const swipedUsersIds = swipedUsers.length
    ? swipedUsers.map(({ statuses }) => statuses[0].user)
    : [];

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
  console.log(citiesIds);
  const users = await User.find(
    {
      $and: [
        ...[
          swipedUsersIds
            ? { _id: { $nin: swipedUsersIds } }
            : { _id: { $exists: true } }
        ],
        { _id: { $ne: req.user.id } }
        // ...[
        //   interestedGenders && interestedGenders !== 'femalesAndMales'
        //     ? { gender: interestedGenders.slice(0, -1) }
        //     : { gender: { $exists: true } }
        // ],
        // ...[
        //   interestedAge
        //     ? {
        //         birthDate: {
        //           $gte: subtractYears(ageRange[1]),
        //           $lte: subtractYears(ageRange[0])
        //         }
        //       }
        //     : { birthDate: { $exists: true } }
        // ],
        // ...[
        //   citiesIds
        //     ? {
        //         home: { $in: citiesIds }
        //       }
        //     : { home: { $exists: true } }
        // ]
      ]
    },
    { name: 1, surname: 1, birthDate: 1, profileImage: 1, home: 1 }
  ).populate({
    path: 'home',
    select: 'city location'
  });

  res.status(200).json({
    status: 'success',
    data: users
  });
});

exports.getMatches = catchAsync(async (req, res) => {
  const findQuery = {
    $or: [
      { users: { $in: [req.user.id] } },
      {
        $and: [
          {
            statuses: {
              $elemMatch: {
                user: req.user.id,
                status: 'none'
              }
            }
          },
          {
            statuses: {
              $elemMatch: {
                user: { $ne: req.user.id },
                status: { $ne: 'reject' }
              }
            }
          }
        ]
      },
      {
        statuses: {
          $elemMatch: {
            user: req.user.id,
            status: 'request'
          }
        }
      }
    ]
  };
  await Match.updateMany(
    findQuery,
    { $set: { 'statuses.$[elem].new': false } },
    { arrayFilters: [{ 'elem.user': req.user.id }] }
  );

  const matches = await Match.find(findQuery, {
    statuses: { $elemMatch: { user: { $ne: req.user.id } } }
  }).populate({
    path: 'statuses.user',
    select: 'name surname profileImage'
  });

  const allMatches = await matches.map(match => ({
    _id: match._id,
    match: match.statuses[0].user,
    status: match.statuses[0].status
  }));

  res.status(200).json({
    status: 'success',
    data: {
      matches: allMatches,
      allCount: allMatches.length,
      receiveCount: allMatches.filter(({ status }) => status === 'request')
        .length,
      sendCount: allMatches.filter(({ status }) => status === 'none').length,
      matchCount: allMatches.filter(({ status }) => status === 'match').length
    }
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

exports.match = catchAsync(async (req, res) => {
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

  const userStatus =
    match &&
    match.statuses.find(
      ({ user }) => user.toString() !== req.user.id.toString()
    ).status;

  const isMatch =
    (userStatus === 'request' && req.body.status === 'request') ||
    (userStatus === 'right' && req.body.status === 'right');

  const updateMatch = () => {
    if (isMatch) {
      return {
        'statuses.$[elem].status': 'match',
        'statuses.$[elem2].status': 'match',
        'statuses.$[elem].new': 'true',
        'statuses.$[elem2].new': 'true',
        users: [req.user.id, req.body.userId]
      };
    }
    if (req.body.status === 'reject') {
      return {
        'statuses.$[elem].status': 'reject',
        'statuses.$[elem2].status': 'none',
        'statuses.$[elem].new': 'false',
        'statuses.$[elem2].new': 'false',
        users: []
      };
    }
    if (req.body.status === 'request') {
      return {
        'statuses.$[elem].status': req.body.status,
        'statuses.$[elem2].new': 'true'
      };
    }

    return {
      'statuses.$[elem].status': req.body.status
    };
  };

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
        $set: updateMatch()
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
        { user: req.user, status: req.body.status, new: false },
        { user: req.body.userId }
      ]
    });
  }

  res.status(200).json({
    status: 'success',
    data: isMatch
  });
});
