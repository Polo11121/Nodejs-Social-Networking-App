const mongoose = require('mongoose');
const dotenv = require('dotenv');
const socketio = require('socket.io');

const Message = require('./models/messageModel');
const Match = require('./models/matchModel');
const User = require('./models/userModel');

process.on('uncaughtException', (err) => {
  console.log('UNCAUGHT EXCEPTION! 💥 Shutting down...');
  console.log(err.name, err.message);
  process.exit(1);
});

dotenv.config();

const app = require('./app');

const DB = process.env.DATABASE.replace(
  '<PASSWORD>',
  process.env.DATABASE_PASSWORD
);

mongoose.connect(DB, {
  useUnifiedTopology: true,
  useNewUrlParser: true,
});

const port = process.env.PORT || 3000;
const server = app.listen(port, () => {
  console.log(`App running on port ${port}...`);
});

process.on('unhandledRejection', (err) => {
  console.log('UNHANDLED REJECTION! 💥 Shutting down...');
  console.log(err.name, err.message);
  server.close(() => {
    process.exit(1);
  });
});

const io = socketio(
  server,
  process.env.NODE_ENV === 'production' && {
    cors: {
      origin: 'https://date-app-praca-inzynierska.netlify.app',
      methods: ['GET', 'POST'],
    },
  }
);
const onlineUsers = new Map();

io.on('connection', (socket) => {
  socket.on('add-user', (userId) => onlineUsers.set(userId, socket.id));
});

Match.watch().on('change', async (data) => {
  if (
    !(
      data.operationType === 'update' &&
      data.updateDescription.updatedFields &&
      Object.keys(data.updateDescription.updatedFields)[0].endsWith('new')
    )
  ) {
    const match = await Match.findById(data.documentKey._id);

    if (
      !match.statuses.some(
        ({ status }) => status === 'left' || status === 'right'
      )
    ) {
      const message = (id) => {
        if (match.statuses.every(({ status }) => status === 'match')) {
          return 'Masz nowe dopasowanie';
        }

        if (
          match.statuses.some(({ status }) => status === 'request') &&
          match.statuses.find(({ user }) => user === id).status === 'none'
        ) {
          return 'Masz nowa prośbę o dopasowanie';
        }

        return '';
      };

      match.statuses.forEach(({ user }) => {
        const sendUserSocket = onlineUsers.get(user.toString());

        if (sendUserSocket) {
          io.to(sendUserSocket).emit('match-status', {
            text: message(user),
            users: match.statuses.map(({ user: matchUser }) => matchUser),
          });
        }
      });
    }
  }
});

Message.watch().on('change', async (data) => {
  if (data.operationType === 'insert') {
    const sendUserSocket = onlineUsers.get(
      data.fullDocument.receiver.toString()
    );

    const { name, surname } = await User.findById(data.fullDocument.sender);

    const unreadMessages = await Message.countDocuments({
      $and: [
        { sender: data.fullDocument.sender },
        { receiver: data.fullDocument.receiver },
        { receiverRead: { $ne: true } },
      ],
    });

    if (sendUserSocket) {
      io.to(sendUserSocket).emit('msg-receive', {
        sender: data.fullDocument.sender,
        text: `${name} ${surname} wysyła ci wiadomość ${
          unreadMessages > 1 ? `(${unreadMessages})` : ''
        }`,
      });
    }
  }
});
