const City = require('../models/cityModel');

const catchAsync = require('../utils/catchAsync');

exports.getCities = catchAsync(async (req, res) => {
  const cities = await City.find({
    city: { $regex: req.params.name, $options: 'i' },
  }).sort({ city: 1 });

  res.status(200).json({ status: 'success', data: cities });
});
