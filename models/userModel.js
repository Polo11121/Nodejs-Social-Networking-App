const crypto = require('crypto');
const mongoose = require('mongoose');
const validator = require('validator');
const bcrypt = require('bcryptjs');

const pointSchema = new mongoose.Schema({
  type: {
    type: String,
    enum: ['Point']
  },
  coordinates: {
    type: [Number]
  }
});

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Please tell us your name']
    },
    surname: {
      type: String,
      required: [true, 'Please tell us your surname']
    },
    email: {
      type: String,
      required: [true, 'Please provide your email'],
      unique: [true, 'siema'],
      lowercase: true,
      validate: [validator.isEmail, 'Please provide a valid email']
    },
    role: {
      type: String,
      enum: ['user', 'admin'],
      default: 'user'
    },
    profileImage: {
      type: String,
      default:
        'https://icon-library.com/images/anonymous-avatar-icon/anonymous-avatar-icon-25.jpg'
    },
    backgroundImage: {
      type: String,
      default: ''
    },
    description: { type: String, default: '' },
    contactEmail: {
      type: String,
      default: ''
    },
    address: { default: '', type: String },
    phoneNumber: { default: '', type: String, maxLength: 9 },
    interestedGenders: {
      type: String,
      default: '',
      enum: ['males', 'females', 'femalesAndMales', '']
    },
    gender: {
      required: [true, 'Please provide your gender'],
      type: String,
      enum: ['male', 'female']
    },
    hobbies: {
      type: [{ text: String, icon: String }],
      default: []
    },
    workPlace: { type: String, default: '' },
    middleSchool: { type: String, default: '' },
    upperSchool: { type: String, default: '' },
    home: {
      type: mongoose.Schema.ObjectId,
      ref: 'City',
      required: false
    },
    childCity: {
      type: mongoose.Schema.ObjectId,
      ref: 'City',
      required: false
    },
    cities: {
      type: [mongoose.Schema.ObjectId],
      ref: 'City',
      required: false,
      default: []
    },
    birthDate: {
      required: [true, 'Please provide your birth date'],
      type: Date
    },
    matchStatus: {
      type: [
        {
          user: { type: mongoose.Schema.ObjectId, ref: 'User' },
          status: {
            type: String,
            enum: ['left', 'right', 'match', 'request', 'reject', 'none']
          }
        }
      ],
      required: false
    },
    filters: {
      interestedGenders: String,
      interestedAge: String,
      interestedCityMaxDistance: {
        type: String,
        enum: ['0', '10', '50', '100', '200', '300']
      },
      interestedCity: { type: mongoose.Schema.ObjectId, ref: 'City' },
      required: false
    },
    password: {
      type: String,
      required: [true, 'Please provide a password'],
      minlength: 8,
      select: false
    },
    passwordConfirm: {
      type: String,
      required: [true, 'Please confirm your password'],
      validate: {
        validator: function(el) {
          return el === this.password;
        },
        message: 'Passwords are not the same!'
      }
    },
    active: {
      type: Boolean,
      default: true,
      select: false
    },
    accountConfirmed: {
      type: Boolean,
      default: false,
      select: false
    },
    accountConfirmedToken: { type: String, select: false },
    passwordChangedAt: { type: Date, select: false },
    passwordResetToken: { type: String, select: false },
    passwordResetExpires: { type: Date, select: false },
    emailResetToken: { type: String, select: false },
    emailResetExpires: { type: Date, select: false },
    newEmail: {
      type: String,
      select: false
    },
    random_point: { type: pointSchema, index: '2dsphere', select: false }
  },
  {
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  }
);

userSchema.index({ random_point: '2dsphere' });

userSchema.virtual('posts', {
  ref: 'Post',
  foreignField: 'user',
  localField: '_id'
});

userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) {
    return next();
  }

  this.password = await bcrypt.hash(this.password, 12);
  this.passwordConfirm = undefined;

  next();
});

userSchema.pre('save', function(next) {
  if (!this.isModified('password') || this.isNew) {
    return next();
  }

  this.passwordChangedAt = Date.now() - 1000;

  next();
});

userSchema.pre(/^find/, function(next) {
  this.find({ active: { $ne: false } });

  next();
});

userSchema.methods.correctPassword = async function(
  candidatePassword,
  userPassword
) {
  return await bcrypt.compare(candidatePassword, userPassword);
};

userSchema.methods.changedPasswordAfter = function(JWTTimestamp) {
  if (this.passwordChangedAt) {
    const changedTimestamp = parseInt(
      this.passwordChangedAt.getTime() / 1000,
      10
    );

    return JWTTimestamp < changedTimestamp;
  }

  return false;
};

userSchema.methods.createPasswordResetToken = function() {
  const resetToken = crypto.randomBytes(32).toString('hex');

  this.passwordResetToken = crypto
    .createHash('sha256')
    .update(resetToken)
    .digest('hex');

  this.passwordResetExpires = Date.now() + 10 * 60 * 1000;

  return resetToken;
};

userSchema.methods.createEmailResetToken = function() {
  const resetToken = crypto.randomBytes(32).toString('hex');

  this.emailResetToken = crypto
    .createHash('sha256')
    .update(resetToken)
    .digest('hex');

  this.emailResetExpires = Date.now() + 10 * 60 * 1000;

  return resetToken;
};

const User = mongoose.model('User', userSchema);

module.exports = User;
