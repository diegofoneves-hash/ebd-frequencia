const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  database: 'postgres', // Conectar ao banco padrão primeiro
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
});

async function createDatabase() {
  try {
    console.log('🔧 Criando banco de dados...');
    
    // Criar banco se não existir
    await pool.query(`CREATE DATABASE ${process.env.DB_NAME}`);
    console.log(`✅ Banco ${process.env.DB_NAME} criado.`);
  } catch (error) {
    if (error.code === '42P04') {
      console.log(`ℹ️ Banco ${process.env.DB_NAME} já existe.`);
    } else {
      console.error('❌ Erro ao criar banco:', error.message);
    }
  }
}

async function createTables() {
  const dbPool = new Pool({
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    database: process.env.DB_NAME,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
  });

  try {
    console.log('🔧 Criando tabelas...');
    
    // Tabela de membros
    await dbPool.query(`
      CREATE TABLE IF NOT EXISTS members (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        class VARCHAR(100),
        phone VARCHAR(20),
        email VARCHAR(255),
        birthdate DATE,
        active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('✅ Tabela members criada.');

    // Tabela de frequência
    await dbPool.query(`
      CREATE TABLE IF NOT EXISTS attendance (
        id SERIAL PRIMARY KEY,
        member_id INTEGER REFERENCES members(id) ON DELETE CASCADE,
        date DATE NOT NULL,
        status VARCHAR(20) NOT NULL,
        check_in_time TIME,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(member_id, date)
      )
    `);
    console.log('✅ Tabela attendance criada.');

    // Tabela de classes
    await dbPool.query(`
      CREATE TABLE IF NOT EXISTS classes (
        id SERIAL PRIMARY KEY,
        name VARCHAR(100) UNIQUE NOT NULL,
        teacher VARCHAR(255),
        description TEXT,
        room VARCHAR(100),
        schedule VARCHAR(100),
        active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('✅ Tabela classes criada.');
    
    // Tabela de configurações
    await dbPool.query(`
      CREATE TABLE IF NOT EXISTS settings (
        key VARCHAR(100) PRIMARY KEY,
        value TEXT,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('✅ Tabela settings criada.');
    
    // Configurações padrão
    await dbPool.query(`
      INSERT INTO settings (key, value) VALUES 
        ('classHour', '9'),
        ('classMinute', '0'),
        ('classDuration', '60'),
        ('toleranceMinutes', '15')
      ON CONFLICT (key) DO NOTHING
    `);
    console.log('✅ Configurações padrão inseridas.');
    
    console.log('🎉 Migração concluída com sucesso!');
    
  } catch (error) {
    console.error('❌ Erro ao criar tabelas:', error);
  } finally {
    await dbPool.end();
  }
}



async function runMigration() {
  await createDatabase();
  await createTables();
  await pool.end();
}

runMigration().catch(console.error);