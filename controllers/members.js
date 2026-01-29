const asyncHandler = require('express-async-handler');
const Member = require('../models/member.js');

exports.getAllMembers = asyncHandler(async (req, res) => {
  const members = await Member.getAll();
  res.json(members);
});

exports.getActiveMembers = asyncHandler(async (req, res) => {
  const { search, class: classFilter } = req.query;
  
  console.log('Filtros recebidos no controller:', { 
    search, 
    classFilter,
    query: req.query 
  });
  
  try {
    // Limpar espaços em branco e garantir valores undefined/vazios sejam tratados
    const cleanSearch = search && search.trim() !== '' ? search.trim() : '';
    const cleanClassFilter = classFilter && classFilter.trim() !== '' ? classFilter.trim() : '';
    
    console.log('Filtros limpos:', { cleanSearch, cleanClassFilter });
    
    const members = await Member.search(cleanSearch, cleanClassFilter);
    
    console.log('Número de membros retornados:', members.length);
    
    // Se não encontrou membros, retornar array vazio em vez de erro
    res.json(members);
    
  } catch (error) {
    console.error('Erro no controller getActiveMembers:', error);
    res.status(500).json({ 
      error: 'Erro interno ao buscar membros',
      details: error.message 
    });
  }
});

exports.getMember = asyncHandler(async (req, res) => {
  const member = await Member.getById(req.params.id);
  if (!member) {
    return res.status(404).json({ error: 'Membro não encontrado' });
  }
  res.json(member);
});

exports.createMember = asyncHandler(async (req, res) => {
  try {
    const { name, class: memberClass, phone, email, birthdate, active } = req.body;
    
    // Verificar se membro já existe (mais rigoroso)
    const existingMembers = await Member.search(name, memberClass);
    const exactMatch = existingMembers.find(m => 
      m.name.toLowerCase() === name.toLowerCase() && 
      m.class === memberClass
    );
    
    if (exactMatch) {
      return res.status(400).json({ 
        error: 'Membro já cadastrado',
        existingMember: exactMatch 
      });
    }
    
    const member = await Member.create(req.body);
    res.status(201).json(member);
  } catch (error) {
    console.error('Erro no controller createMember:', error);
    
    // Verificar se é erro de duplicação do PostgreSQL
    if (error.code === '23505') {
      return res.status(400).json({ 
        error: 'Membro já cadastrado (violação de chave única)' 
      });
    }
    
    res.status(500).json({ 
      error: 'Erro interno ao criar membro',
      details: error.message 
    });
  }
});

exports.updateMember = asyncHandler(async (req, res) => {
  const member = await Member.update(req.params.id, req.body);
  if (!member) {
    return res.status(404).json({ error: 'Membro não encontrado' });
  }
  res.json(member);
});

exports.deleteMember = asyncHandler(async (req, res) => {
  await Member.delete(req.params.id);
  res.json({ message: 'Membro removido com sucesso' });
});