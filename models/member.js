const db = require('./database');

class Member {
  static async getAll() {
    const result = await db.query('SELECT * FROM members ORDER BY name');
    return result.rows;
  }

  static async getActive() {
    const result = await db.query(
      'SELECT * FROM members WHERE active = true ORDER BY name'
    );
    return result.rows;
  }

  static async getById(id) {
    const result = await db.query('SELECT * FROM members WHERE id = $1', [id]);
    return result.rows[0];
  }

  static async create(memberData) {
    const { name, class: memberClass, phone, email, birthdate, active } = memberData;
    const result = await db.query(
      `INSERT INTO members (name, class, phone, email, birthdate, active)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [name, memberClass, phone, email, birthdate, active]
    );
    return result.rows[0];
  }

  static async update(id, memberData) {
    const { name, class: memberClass, phone, email, birthdate, active } = memberData;
    const result = await db.query(
      `UPDATE members 
       SET name = $1, class = $2, phone = $3, email = $4, 
           birthdate = $5, active = $6, updated_at = CURRENT_TIMESTAMP
       WHERE id = $7
       RETURNING *`,
      [name, memberClass, phone, email, birthdate, active, id]
    );
    return result.rows[0];
  }

  static async delete(id) {
    await db.query('DELETE FROM members WHERE id = $1', [id]);
  }

  static async search(query, classFilter = '') {
  console.log('Parâmetros recebidos no search:', { query, classFilter });
  
  let sql = 'SELECT * FROM members WHERE active = true';
  const params = [];
  let paramCount = 1;
  
  if (query && query.trim() !== '') {
    sql += ` AND (name ILIKE $${paramCount} OR email ILIKE $${paramCount} OR phone ILIKE $${paramCount})`;
    params.push(`%${query.trim()}%`);
    paramCount++;
  }
  
  if (classFilter && classFilter.trim() !== '') {
    sql += ` AND class = $${paramCount}`;
    params.push(classFilter.trim());
    paramCount++;
  }
  
  sql += ' ORDER BY name';
  
  console.log('SQL gerado:', sql);
  console.log('Parâmetros:', params);
  
  try {
    const result = await db.query(sql, params);
    console.log(`Resultados encontrados: ${result.rows.length}`);
    return result.rows;
  } catch (error) {
    console.error('Erro na consulta SQL:', error);
    throw error;
  }
}
}

module.exports = Member;