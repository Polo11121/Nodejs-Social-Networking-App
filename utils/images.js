const multer = require('multer');
const crypto = require('crypto');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');
const {
  S3Client,
  GetObjectCommand,
  PutObjectCommand,
} = require('@aws-sdk/client-s3');

const AppError = require('./appError');

const multerStorage = multer.memoryStorage();

const multerFilter = (req, file, cb) => {
  if (file.mimetype.startsWith('image')) {
    cb(null, true);
  } else {
    cb(new AppError('Proszę przesłać zdjęcie!', 400), false);
  }
};

exports.upload = multer({ storage: multerStorage, fileFilter: multerFilter });

const s3 = new S3Client({
  credentials: {
    accessKeyId: process.env.ACCESS_KEY,
    secretAccessKey: process.env.SECRET_ACCESS_KEY,
  },
  region: process.env.BUCKET_REGION,
});

exports.sendImage = (imageBuffer, imageName) => {
  const command = new PutObjectCommand({
    Bucket: process.env.BUCKET_NAME,
    Key: imageName,
    Body: imageBuffer,
  });

  return s3.send(command);
};

exports.getImage = (imageName) => {
  const command = new GetObjectCommand({
    Bucket: process.env.BUCKET_NAME,
    Key: imageName,
  });

  return getSignedUrl(s3, command, {
    expiresIn: 3600,
  });
};

exports.randomImageName = () => crypto.randomBytes(32).toString('hex');
