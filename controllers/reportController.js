const catchAsync = require('../utils/catchAsync');
const sendEmail = require('../utils/email');

const Report = require('../models/reportModel');
const User = require('../models/userModel');
const Match = require('../models/matchModel');

const APIFeatures = require('../utils/apiFeatures');
const AppError = require('../utils/appError');
const images = require('../utils/images');

exports.createReport = catchAsync(async (req, res) => {
  const report = await Report.create({
    status: req.body.admin ? 'inProgress' : 'new',
    reportId: `Z${await Report.countDocuments()}`,
    ...req.body,
  });

  res.status(200).json({
    status: 'success',
    data: report,
  });
});

exports.getNewReports = catchAsync(async (req, res) => {
  const reports = await Report.find({ status: 'new' })
    .populate({
      path: 'reportingUser',
      select: 'name surname profileImage status',
    })
    .populate({
      path: 'reportedUser',
      select: 'name surname profileImage status',
    })
    .populate({
      path: 'admin',
      select: 'name surname profileImage',
    })
    .sort({ createdAt: -1 });

  for (const report of reports) {
    if (report.admin) {
      report.admin.profileImage = await images.getImage(
        report.admin.profileImage
      );
    }

    report.reportedUser.profileImage = await images.getImage(
      report.reportedUser.profileImage
    );
    report.reportingUser.profileImage = await images.getImage(
      report.reportingUser.profileImage
    );
  }

  res.status(200).json({
    status: 'success',
    data: reports,
  });
});

exports.updateReport = catchAsync(async (req, res, next) => {
  const { admin, status, reportSolution, adminComment } = req.body;

  let report;

  if (status === 'solved') {
    report = await Report.findByIdAndUpdate(req.params.id, {
      status,
      reportSolution,
      adminComment,
    }).populate({
      path: 'reportedUser',
      select: 'email name',
    });

    if (reportSolution === 'closeReportAndBlockUser') {
      try {
        const message = `Witaj, ${report.reportedUser.name}!\nTwoje konta na serwisie DATE-APP zostało zablokowane.\nKomentarz od administratora:\n ${adminComment}`;

        await User.findByIdAndUpdate(report.reportedUser.id, {
          status: 'blocked',
        });
        await Match.updateMany(
          {
            statuses: {
              $elemMatch: {
                user: report.reportedUser.id,
              },
            },
          },
          { $set: { status: 'inactive' } }
        );

        await sendEmail({
          email: report.reportedUser.email,
          subject: 'Zablokowanie konta na DATE-APP',
          message,
        });
      } catch (err) {
        return next(
          new AppError(
            'Nie udało się zablokować użytkownika. Spróbuj ponownie później'
          ),
          500
        );
      }
    }
  } else {
    report = await Report.findByIdAndUpdate(req.params.id, {
      admin,
      status,
    });
  }

  res.status(200).json({
    status: 'success',
    data: report,
  });
});

exports.getReports = catchAsync(async (req, res) => {
  const { searchTerm, status, admin } = req.query;

  const filters = [
    ...(status ? [{ status }] : []),
    ...(admin ? [{ admin }] : []),
  ];

  const query = Report.find({
    $and: [
      ...filters,
      {
        $or: [
          {
            reportId: {
              $regex: searchTerm.trim(),
              $options: 'i',
            },
          },
        ],
      },
    ],
  })
    .populate({
      path: 'reportingUser',
      select: 'name surname profileImage status',
    })
    .populate({
      path: 'reportedUser',
      select: 'name surname profileImage status',
    })
    .populate({
      path: 'admin',
      select: 'name surname profileImage',
    })
    .sort({ createdAt: -1 });

  const results = (await query.clone()).length;

  const features = new APIFeatures(query, req.query, results).paginate();

  const reports = await features.query;

  for (const report of reports) {
    if (report.admin) {
      report.admin.profileImage = await images.getImage(
        report.admin.profileImage
      );
    }

    report.reportedUser.profileImage = await images.getImage(
      report.reportedUser.profileImage
    );
    report.reportingUser.profileImage = await images.getImage(
      report.reportingUser.profileImage
    );
  }

  const { hasNextPage } = await features;

  res.status(200).json({
    status: 'success',
    data: reports,
    results,
    hasNextPage,
  });
});

exports.getUserReports = catchAsync(async (req, res) => {
  const reports = await Report.find({ reportedUser: req.params.id })
    .populate({
      path: 'reportingUser',
      select: 'name surname profileImage status',
    })
    .populate({
      path: 'reportedUser',
      select: 'name surname profileImage status',
    })
    .populate({
      path: 'admin',
      select: 'name surname profileImage',
    })
    .sort({ createdAt: -1 });

  for (const report of reports) {
    if (report.admin) {
      report.admin.profileImage = await images.getImage(
        report.admin.profileImage
      );
    }

    report.reportedUser.profileImage = await images.getImage(
      report.reportedUser.profileImage
    );
    report.reportingUser.profileImage = await images.getImage(
      report.reportingUser.profileImage
    );
  }

  res.status(200).json({
    status: 'success',
    data: reports,
  });
});
