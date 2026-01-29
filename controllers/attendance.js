const asyncHandler = require('express-async-handler');
const Attendance = require('../models/attendance');

exports.markAttendance = asyncHandler(async (req, res) => {
  const { memberId, date, status, checkInTime } = req.body;
  const attendance = await Attendance.mark(memberId, date, status, checkInTime);
  res.json(attendance);
});

exports.getDailyAttendance = asyncHandler(async (req, res) => {
  const { date } = req.params;
  const attendance = await Attendance.getDailyAttendance(date);
  res.json(attendance);
});

exports.getSummary = asyncHandler(async (req, res) => {
  const { startDate, endDate } = req.params;
  const summary = await Attendance.getSummary(startDate, endDate);
  res.json(summary);
});

exports.clearDate = asyncHandler(async (req, res) => {
  const { date } = req.params;
  await Attendance.clearDate(date);
  res.json({ message: 'Presença do dia removida' });
});