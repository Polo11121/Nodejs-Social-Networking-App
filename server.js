const mongoose = require('mongoose');
const dotenv = require('dotenv');
const socketio = require('socket.io');
const Message = require('./models/messageModel');
const Match = require('./models/matchModel');

process.on('uncaughtException', err => {
  console.log('UNCAUGHT EXCEPTION! 💥 Shutting down...');
  console.log(err.name, err.message);
  process.exit(1);
});

dotenv.config({ path: './config.env' });
const app = require('./app');

const DB = process.env.DATABASE.replace(
  '<PASSWORD>',
  process.env.DATABASE_PASSWORD
);

mongoose.connect(DB, {
  useUnifiedTopology: true,
  useNewUrlParser: true,
  useCreateIndex: true,
  useFindAndModify: false
});

const port = process.env.PORT || 3000;
const server = app.listen(port, () => {
  console.log(`App running on port ${port}...`);
});

process.on('unhandledRejection', err => {
  console.log('UNHANDLED REJECTION! 💥 Shutting down...');
  console.log(err.name, err.message);
  server.close(() => {
    process.exit(1);
  });
});

const io = socketio(server);
const onlineUsers = new Map();

io.on('connection', socket => {
  socket.on('add-user', userId => onlineUsers.set(userId, socket.id));
});

Match.watch().on('change', data => {
  if (
    data.operationType === 'update' &&
    data.updateDescription.updatedFields.statuses.some(
      ({ status }) => status === 'request'
    )
  ) {
    const { statuses } = data.updateDescription.updatedFields;

    const userId = statuses
      .find(({ status }) => status === 'none')
      .user.toString();

    const sendUserSocket = onlineUsers.get(userId);

    if (sendUserSocket) {
      io.to(sendUserSocket).emit('match-status', {
        text: 'Masz nowa prośbę o dopasowanie',
        users: statuses.map(({ user }) => user)
      });
    }
  }

  if (
    data.operationType === 'update' &&
    data.updateDescription.updatedFields.statuses.some(
      ({ status }) => status === 'reject'
    )
  ) {
    const users = data.updateDescription.updatedFields.statuses.map(
      ({ user }) => user
    );

    users.forEach(user => {
      const sendUserSocket = onlineUsers.get(user.toString());

      if (sendUserSocket) {
        io.to(sendUserSocket).emit('match-status', { users });
      }
    });
  }

  if (
    data.operationType === 'insert' &&
    data.fullDocument.statuses.some(({ status }) => status === 'request')
  ) {
    const { statuses } = data.fullDocument;
    
    const userId = statuses
      .find(({ status }) => status === 'none')
      .user.toString();

    const sendUserSocket = onlineUsers.get(userId);

    if (sendUserSocket) {
      io.to(sendUserSocket).emit('match-status', {
        text: 'Masz nowa prośbę o dopasowanie',
        users: statuses.map(({ user }) => user)
      });
    }
  }

  if (
    data.operationType === 'update' &&
    data.updateDescription.updatedFields.users
  ) {
    const { users } = data.updateDescription.updatedFields;

    users.forEach(user => {
      const sendUserSocket = onlineUsers.get(user.toString());

      if (sendUserSocket) {
        io.to(sendUserSocket).emit('match-status', {
          text: 'Masz nowe dopasowanie',
          users
        });
      }
    });
  }
});

Message.watch().on('change', data => {
  if (data.operationType === 'insert') {
    const sendUserSocket = onlineUsers.get(
      data.fullDocument.receiver.toString()
    );

    if (sendUserSocket) {
      io.to(sendUserSocket).emit('msg-receive', {
        sender: data.fullDocument.sender,
        text: 'Masz nowa wiadomość'
      });
    }
  }
});
