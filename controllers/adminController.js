const catchAsync = require('../utils/catchAsync');
const sendEmail = require('../utils/email');

const Report = require('../models/reportModel');
const User = require('../models/userModel');

const APIFeatures = require('../utils/apiFeatures');
const AppError = require('../utils/appError');

exports.getDashboardCounters = catchAsync(async (req, res) => {
  const allReports = await Report.countDocuments();
  const newReports = await Report.countDocuments({ status: 'new' });
  const solvedReports = await Report.countDocuments({
    status: 'solved',
  });
  const myReports = await Report.countDocuments({
    admin: req.user.id,
  });

  const users = await User.countDocuments({
    role: 'user',
  });
  const administrators = await User.countDocuments({
    role: 'admin',
  });

  res.status(200).json({
    status: 'success',
    data: {
      allReports,
      newReports,
      solvedReports,
      myReports,
      users,
      administrators,
    },
  });
});

exports.getUsers = catchAsync(async (req, res) => {
  const { searchTerm, status } = req.query;
  const splittedSearchTerm = searchTerm && searchTerm.trim().split(' ');

  const filters = [{ role: 'user' }, ...(status ? [{ status }] : [])];

  const query = User.find(
    {
      $and: [
        ...filters,
        {
          $or: [
            {
              name: {
                $regex:
                  splittedSearchTerm.length === 2
                    ? splittedSearchTerm[0]
                    : searchTerm,
                $options: 'i',
              },
            },
            {
              email: {
                $regex: searchTerm,
                $options: 'i',
              },
            },
            {
              surname: {
                $regex:
                  splittedSearchTerm.length === 2
                    ? splittedSearchTerm[1]
                    : searchTerm,
                $options: 'i',
              },
            },
          ],
        },
      ],
    },
    {
      email: 1,
      name: 1,
      surname: 1,
      profileImage: 1,
      createdAt: 1,
      status: 1,
    }
  );

  const results = (await query.clone()).length;
  const features = new APIFeatures(query, req.query, results).paginate();

  const users = await features.query;

  const { hasNextPage } = await features;

  res.status(200).json({
    status: 'success',
    data: users,
    results,
    hasNextPage,
  });
});

exports.unblockUser = catchAsync(async (req, res, next) => {
  try {
    const user = await User.findByIdAndUpdate(req.params.id, {
      status: 'active',
    });

    const message = 'Twoje konta na serwisie DATE-APP zostało odblokowane.';

    await sendEmail({
      email: user.email,
      subject: 'Odblokowanie konto na DATE-APP',
      message,
    });
  } catch (err) {
    return next(
      new AppError('Nie udało się usunąć konta. Spróbuj ponownie później'),
      500
    );
  }

  res.status(200).json({
    status: 'success',
  });
});

exports.getAdministrators = catchAsync(async (req, res) => {
  const administrators = await User.find(
    {
      role: 'admin',
    },
    {
      email: 1,
      name: 1,
      surname: 1,
      profileImage: 1,
      createdAt: 1,
    }
  );

  res.status(200).json({
    status: 'success',
    data: administrators,
  });
});

exports.getAdminReportsCounters = catchAsync(async (req, res) => {
  const allReports = await Report.countDocuments({ admin: req.params.id });
  const newReports = await Report.countDocuments({
    $and: [{ admin: req.params.id }, { status: 'new' }],
  });
  const solvedReports = await Report.countDocuments({
    $and: [{ admin: req.params.id }, { status: 'solved' }],
  });

  res.status(200).json({
    status: 'success',
    data: {
      allReports,
      newReports,
      solvedReports,
    },
  });
});
