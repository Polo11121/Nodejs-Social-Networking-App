const subtractYears = (numOfYears, date = new Date()) => {
  date.setFullYear(date.getFullYear() - numOfYears);

  return date;
};

module.exports = subtractYears;
