const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const apiRoutes = require('./routes/api');

const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname)));

// Rotas API
app.use('/api', apiRoutes);

// Rota para verificar saúde do servidor
app.get('/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date() });
});

// Servir o frontend
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

const PORT = process.env.PORT || 3215;
app.listen(PORT, () => {
  console.log(`✅ Servidor rodando na porta ${PORT}`);
  console.log(`📊 Acesse: http://localhost:${PORT}`);
});