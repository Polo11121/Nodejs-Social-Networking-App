const express = require('express');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const helmet = require('helmet');
const mongoSanitize = require('express-mongo-sanitize');
const xss = require('xss-clean');
const cookieParser = require('cookie-parser');
const cors = require('cors');

const AppError = require('./utils/appError');
const globalErrorHandler = require('./controllers/errorController');
const userRouter = require('./routes/userRoutes');
const postRouter = require('./routes/postRoutes');
const messageRouter = require('./routes/messageRoutes');
const matchRouter = require('./routes/matchRoutes');
const cityRouter = require('./routes/cityRoutes');
const reportRouter = require('./routes/reportRoutes');
const adminRouter = require('./routes/adminRoutes');

const app = express();

if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
}

const limiter = rateLimit({
  max: 1000000,
  windowMs: 60 * 60 * 1000,
  message: 'Too many requests from this IP, please try again in an hour!'
});

app.use(
  cors({
    origin: [
      'http://localhost:3000',
      'https://date-app-praca-inzynierska.netlify.app'
    ]
  })
);
app.use(helmet());
app.use(cookieParser());
app.use(mongoSanitize());
app.use(xss());
app.use('/api', limiter);
app.use(express.json({ limit: '10kb' }));
app.use('*/public/img/', express.static('public/img/'));
app.use((req, res, next) => {
  req.requestTime = new Date().toISOString();
  next();
});

app.use('/api/v1/users', userRouter);
app.use('/api/v1/posts', postRouter);
app.use('/api/v1/messages', messageRouter);
app.use('/api/v1/cities', cityRouter);
app.use('/api/v1/matches', matchRouter);
app.use('/api/v1/report', reportRouter);
app.use('/api/v1/admin', adminRouter);

app.all('*', (req, res, next) => {
  next(new AppError(`Can't find ${req.originalUrl} on this server!`, 404));
});

app.use(globalErrorHandler);

module.exports = app;
