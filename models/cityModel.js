const mongoose = require('mongoose');

const pointSchema = new mongoose.Schema({
  type: {
    type: String,
    enum: ['Point'],
    required: true
  },
  coordinates: {
    type: [Number],
    required: true
  }
});

const citySchema = new mongoose.Schema({
  city: String,
  location: { type: pointSchema, index: '2dsphere' },
  province: String
});

citySchema.index({ location: '2dsphere' });

const City = mongoose.model('City', citySchema);

module.exports = City;
