const asyncHandler = require('express-async-handler');
const ClassModel = require('../models/class');

exports.getAllClasses = asyncHandler(async (req, res) => {
  const classes = await ClassModel.getAll();
  res.json(classes);
});

exports.getActiveClasses = asyncHandler(async (req, res) => {
  const classes = await ClassModel.getActive();
  res.json(classes);
});

exports.getClass = asyncHandler(async (req, res) => {
  const classData = await ClassModel.getById(req.params.id);
  if (!classData) {
    return res.status(404).json({ error: 'Turma não encontrada' });
  }
  res.json(classData);
});

exports.createClass = asyncHandler(async (req, res) => {
  // Verificar se já existe uma turma com este nome
  const existingClass = await ClassModel.getByName(req.body.name);
  if (existingClass) {
    return res.status(400).json({ error: 'Já existe uma turma com este nome' });
  }
  
  const classData = await ClassModel.create(req.body);
  res.status(201).json(classData);
});

exports.updateClass = asyncHandler(async (req, res) => {
  const classData = await ClassModel.update(req.params.id, req.body);
  if (!classData) {
    return res.status(404).json({ error: 'Turma não encontrada' });
  }
  res.json(classData);
});

exports.deleteClass = asyncHandler(async (req, res) => {
  try {
    await ClassModel.delete(req.params.id);
    res.json({ message: 'Turma removida com sucesso' });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});