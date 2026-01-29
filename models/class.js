const db = require('./database');

class ClassModel {
  static async getAll() {
    const result = await db.query(
      'SELECT * FROM classes ORDER BY name'
    );
    return result.rows;
  }

  static async getActive() {
    const result = await db.query(
      'SELECT * FROM classes WHERE active = true ORDER BY name'
    );
    return result.rows;
  }

  static async getById(id) {
    const result = await db.query('SELECT * FROM classes WHERE id = $1', [id]);
    return result.rows[0];
  }

  static async getByName(name) {
    const result = await db.query('SELECT * FROM classes WHERE name = $1', [name]);
    return result.rows[0];
  }

  static async create(classData) {
    const { name, teacher, description, room, schedule, active } = classData;
    const result = await db.query(
      `INSERT INTO classes (name, teacher, description, room, schedule, active)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [name, teacher, description, room, schedule, active]
    );
    return result.rows[0];
  }

  static async update(id, classData) {
    const { name, teacher, description, room, schedule, active } = classData;
    const result = await db.query(
      `UPDATE classes 
       SET name = $1, teacher = $2, description = $3, 
           room = $4, schedule = $5, active = $6,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $7
       RETURNING *`,
      [name, teacher, description, room, schedule, active, id]
    );
    return result.rows[0];
  }

  static async delete(id) {
    // Verificar se há membros nesta turma
    const members = await db.query(
      'SELECT COUNT(*) FROM members WHERE class = (SELECT name FROM classes WHERE id = $1)',
      [id]
    );
    
    if (parseInt(members.rows[0].count) > 0) {
      throw new Error('Não é possível excluir uma turma que possui membros');
    }
    
    await db.query('DELETE FROM classes WHERE id = $1', [id]);
  }
}

module.exports = ClassModel;