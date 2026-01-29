const asyncHandler = require('express-async-handler');
const Setting = require('../models/Setting');

exports.getSettings = asyncHandler(async (req, res) => {
  const settings = await Setting.getAll();
  res.json(settings);
});

exports.updateSettings = asyncHandler(async (req, res) => {
  const { key, value } = req.body;
  await Setting.set(key, value);
  res.json({ message: 'Configuração atualizada' });
});

exports.getSetting = asyncHandler(async (req, res) => {
  const value = await Setting.get(req.params.key);
  res.json({ key: req.params.key, value });
});