const mongoose = require('mongoose');

const reportSchema = new mongoose.Schema(
  {
    admin: { type: mongoose.Schema.ObjectId, ref: 'User' },
    reportedUser: { type: mongoose.Schema.ObjectId, ref: 'User' },
    reportingUser: { type: mongoose.Schema.ObjectId, ref: 'User' },
    userComment: String,
    adminComment: String,
    reportSolution: {
      type: String,
      enum: ['closeReport', 'closeReportAndBlockUser']
    },
    status: { type: String, enum: ['new', 'inProgress', 'solved'] },
    reportId: String,
    reason: {
      type: String,
      enum: [
        'impersonation',
        'fakeAccount',
        'fakeName',
        'inappropriateContent',
        'cyberbullying',
        'otherReason'
      ]
    }
  },
  {
    timestamps: true
  },
  {
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  }
);

const Report = mongoose.model('Report', reportSchema);

module.exports = Report;
