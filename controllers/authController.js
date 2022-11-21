const { promisify } = require('util');
const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const sendEmail = require('../utils/email');
const catchAsync = require('../utils/catchAsync');

const User = require('../models/userModel');
const Match = require('../models/matchModel');

const AppError = require('../utils/appError');

const signToken = (id) =>
  jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN,
  });

const createSendToken = (user, statusCode, res) => {
  const token = signToken(user._id);
  const cookieOptions = {
    expires: new Date(
      Date.now() + process.env.JWT_COOKIE_EXPIRES_IN * 24 * 60 * 60 * 1000
    ),
    httpOnly: true,
  };

  if (process.env.NODE_ENV === 'production') {
    cookieOptions.secure = true;
    cookieOptions.domain = '.onrender.com';
    cookieOptions.sameSite = 'none';
  }

  res.cookie('jwt', token, cookieOptions);

  user.password = undefined;

  res.status(statusCode).json({
    status: 'success',
    token,
    data: user,
  });
};

exports.signup = catchAsync(async (req, res, next) => {
  const user = await User.findOne({ email: req.body.email });

  if (user && user.status === 'noConfirmation') {
    return next(
      new AppError(
        'Konto z podanym adresem e-mail oczekuję na potwierdzenie, sprawdź skrzynkę pocztową',
        401
      )
    );
  }

  if (user && user.status === 'blocked') {
    return next(
      new AppError(
        'Konto z podanym adresem e-mail zostało zablokowane, sprawdź skrzynkę pocztową',
        401
      )
    );
  }

  if (user && user.status === 'inactive') {
    return next(
      new AppError('Konto z podanym adresem e-mail zostało usunięte', 401)
    );
  }

  if (user) {
    return next(new AppError('Ten adres e-mail jest już używany', 401));
  }

  const token = crypto.randomBytes(32).toString('hex');

  const accountConfirmedToken = crypto
    .createHash('sha256')
    .update(token)
    .digest('hex');

  try {
    const newUser = await User.create({
      ...req.body,
      status: 'noConfirmation',
      accountConfirmedToken,
      random_point: { type: 'Point', coordinates: [Math.random(), 0] },
    });

    const resetURL = `http://localhost:3000/confirm-account/${token}`;

    const message = `Witaj, ${newUser.name}!\nNiedawno zarejestrował${
      newUser.gender === 'male' ? 'eś' : 'aś'
    } się na DATE-APP, aby zakończyć proces rejestracji, potwierdź swoje konto klikając w poniższy link.\n${resetURL}`;

    await sendEmail({
      email: newUser.email,
      subject: 'Potwierdź założenie konta na DATE-APP',
      message,
    });

    res.status(200).json({
      status: 'success',
      message: 'Token sent to email!',
    });
  } catch (err) {
    return next(
      new AppError('Nie udało się utowrzyć konta. Spróbuj ponownie później'),
      500
    );
  }
});

exports.confirmAccount = catchAsync(async (req, res, next) => {
  const hashedToken = crypto
    .createHash('sha256')
    .update(req.params.token)
    .digest('hex');

  const user = await User.findOne({
    accountConfirmedToken: hashedToken,
  });

  if (!user) {
    return next(new AppError('Konto już zostało potwierdzone', 401));
  }

  user.accountConfirmedToken = undefined;
  user.status = 'active';

  await user.save({
    validateBeforeSave: false,
  });

  createSendToken(user, 200, res);
});

exports.login = catchAsync(async (req, res, next) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return next(new AppError('Podaj login i hasło', 400));
  }

  const user = await User.findOne({ email }).select({
    password: 1,
    role: 1,
    status: 1,
  });

  if (!user || !(await user.correctPassword(password, user.password))) {
    return next(new AppError('Błędny login lub hasło', 401));
  }

  if (user.status === 'noConfirmation' && user.role === 'user') {
    return next(
      new AppError(
        'Konto z podanym adresem e-mail oczekuję na potwierdzenie, sprawdź skrzynkę pocztową',
        401
      )
    );
  }

  if (user && user.status === 'blocked') {
    return next(
      new AppError(
        'Konto z podanym adresem e-mail zostało zablokowane, sprawdź skrzynkę pocztową',
        401
      )
    );
  }

  if (user && user.status === 'inactive') {
    return next(
      new AppError('Konto z podanym adresem e-mail zostało usunięte', 401)
    );
  }

  createSendToken(user, 200, res);
});

exports.logout = (req, res) => {
  res.cookie('jwt', '', {
    expires: new Date(Date.now() + 10 * 1000),
    httpOnly: true,
  });

  res.status(200).json({ status: 'success' });
};

exports.forgotPassword = catchAsync(async (req, res, next) => {
  const user = await User.findOne({
    email: req.body.email,
    status: 'active',
  });

  if (!user) {
    return next(
      new AppError('Użytkownik z takim adresem e-mail nie istnieje.', 404)
    );
  }

  try {
    const resetToken = user.createPasswordResetToken();

    await user.save({ validateBeforeSave: false });

    const resetURL = `http://localhost:3000/reset-password/${resetToken}`;
    const message = `Witaj, ${user.name}!\nOtrzymaliśmy prośbę dotyczącą zresetowania Twojego hasła na DATE-APP.\nAby zresetować hasło kliknij w poniższy link.\n(Link jest aktywny przez kolejne 10 minut)\n${resetURL}`;

    await sendEmail({
      email: user.email,
      subject: 'Odzyskiwania dostępu do konta na DATE-APP',
      message,
    });

    res.status(200).json({
      status: 'success',
      message: 'Token sent to email!',
    });
  } catch (err) {
    user.passwordResetToken = undefined;
    user.passwordResetExpires = undefined;

    await user.save({ validateBeforeSave: false });

    return next(
      new AppError(
        'Nie udało się wysłać wiadomości z linkiem resetującym hasło na podany adres e-mail. Spróbuj ponownie później'
      ),
      500
    );
  }
});

exports.changeEmail = catchAsync(async (req, res, next) => {
  const isEmailUsed = await User.findOne({
    email: req.body.email,
  });

  if (isEmailUsed) {
    return next(new AppError('Ten adres e-mail jest już używany', 401));
  }

  const user = await User.findById(req.user.id);

  try {
    const resetToken = user.createEmailResetToken();
    user.newEmail = req.body.email;

    await user.save({ validateBeforeSave: false });

    const resetURL = `http://localhost:3000/change-email/${resetToken}`;
    const message = `Witaj, ${user.name}!\nOtrzymaliśmy prośbę dotyczącą zmiany adresu e-mail na DATE-APP.\nAby zmienić e-mail kliknij w poniższy link.\n(Link jest aktywny przez kolejne 10 minut)\n${resetURL}`;

    await sendEmail({
      email: req.body.email,
      subject: 'Zmiana adresu e-mail konta na DATE-APP',
      message,
    });

    res.status(200).json({
      status: 'success',
      message: 'Token sent to email!',
    });
  } catch (err) {
    user.emailResetToken = undefined;
    user.emailResetExpires = undefined;

    await user.save({ validateBeforeSave: false });

    return next(
      new AppError(
        'Nie udało się wysłać wiadomości z linkiem resetującym hasło na podany adres e-mail. Spróbuj ponownie później'
      ),
      500
    );
  }
});

exports.confirmEmail = catchAsync(async (req, res, next) => {
  const hashedToken = crypto
    .createHash('sha256')
    .update(req.params.token)
    .digest('hex');

  const user = await User.findOne({
    emailResetToken: hashedToken,
  }).select('+newEmail +emailResetExpires');

  if (!user) {
    return next(new AppError('Link zmiany adresu e-mail stracił ważność', 400));
  }

  if (user && Date.parse(user.emailResetExpires) < Date.parse(new Date())) {
    user.newEmail = undefined;
    user.emailResetToken = undefined;
    user.emailResetExpires = undefined;

    await user.save({ validateBeforeSave: false });

    return next(new AppError('Link zmiany adresu e-mail stracił ważność', 400));
  }

  const isEmailUsed = await User.findOne({
    email: user.newEmail,
  });

  if (isEmailUsed) {
    user.newEmail = undefined;
    user.emailResetToken = undefined;
    user.emailResetExpires = undefined;

    await user.save({ validateBeforeSave: false });

    return next(new AppError('Ten adres e-mail jest już używany', 400));
  }

  user.email = user.newEmail;
  user.newEmail = undefined;
  user.emailResetToken = undefined;
  user.emailResetExpires = undefined;

  await user.save({ validateBeforeSave: false });

  res.status(200).json({
    status: 'success',
    message: 'Email changed',
  });
});

exports.resetPassword = catchAsync(async (req, res, next) => {
  const hashedToken = crypto
    .createHash('sha256')
    .update(req.params.token)
    .digest('hex');

  const user = await User.findOne({
    passwordResetToken: hashedToken,
    passwordResetExpires: { $gt: Date.now() },
  });

  if (!user) {
    return next(new AppError('Link resetu hasła stracił ważność', 400));
  }

  user.password = req.body.password;
  user.passwordConfirm = req.body.passwordConfirm;
  user.passwordResetToken = undefined;
  user.passwordResetExpires = undefined;

  await user.save();

  res.status(200).json({
    status: 'success',
    message: 'Password changed',
  });
});

exports.updatePassword = catchAsync(async (req, res, next) => {
  const user = await User.findById(req.user.id).select({ password: 1 });

  if (!(await user.correctPassword(req.body.passwordCurrent, user.password))) {
    return next(new AppError('Aktualne hasło jest nieprawidłowe', 401));
  }

  user.password = req.body.password;
  user.passwordConfirm = req.body.passwordConfirm;

  await user.save();

  createSendToken(user, 200, res);
});

exports.deleteUser = catchAsync(async (req, res) => {
  await User.findByIdAndUpdate(req.user.id, { status: 'inactive' });

  await Match.updateMany(
    {
      statuses: {
        $elemMatch: {
          user: req.user.id,
        },
      },
    },
    { $set: { status: 'inactive' } }
  );

  res.status(204).json({
    status: 'success',
  });
});

exports.protect = catchAsync(async (req, res, next) => {
  let token;

  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer')
  ) {
    token = req.headers.authorization.split(' ')[1];
  } else if (req.cookies.jwt) {
    token = req.cookies.jwt;
  }

  if (!token) {
    return next(
      new AppError(
        'Nie jesteś zalogowany, zaloguj się żeby uzyskać dostęp.',
        401
      )
    );
  }

  const decoded = await promisify(jwt.verify)(token, process.env.JWT_SECRET);
  const currentUser = await User.findById(decoded.id, { id: 1, role: 1 });

  if (!currentUser) {
    return next(new AppError('Konto z tym tokenem nie istnieje.', 401));
  }

  if (currentUser.changedPasswordAfter(decoded.iat)) {
    return next(
      new AppError(
        'Użtykownik ostatnio zmienił hasło, proszę się przelogować.',
        401
      )
    );
  }

  req.user = currentUser;

  next();
});

exports.restrictTo =
  (...roles) =>
  (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return next(new AppError('Nie masz dostępu do wykonania tej akcji', 403));
    }

    next();
  };
