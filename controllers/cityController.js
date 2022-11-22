const catchAsync = require('../utils/catchAsync');

const City = require('../models/cityModel');

exports.getCities = catchAsync(async (req, res) => {
  const cities = await City.find({
    city: { $regex: req.params.name, $options: 'i' },
  });

  res.status(200).json({ status: 'success', data: cities });
});
