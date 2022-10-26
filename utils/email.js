const nodemailer = require('nodemailer');

const sendEmail = async options => {
  const transporter = nodemailer.createTransport({
    host: 'smtp.sendgrid.net',
    port: 587,
    auth: {
      user: 'apikey',
      pass: process.env.SENDGRID_API_KEY
    }
  });

  const mailOptions = {
    from: 'Date App <DateAppPL@outlook.com>',
    to: options.email,
    subject: options.subject,
    text: options.message
  };

  await transporter.sendMail(mailOptions);
};

module.exports = sendEmail;
