const db = require('./database');

class Setting {
  static async get(key) {
    const result = await db.query(
      'SELECT value FROM settings WHERE key = $1',
      [key]
    );
    return result.rows[0]?.value;
  }

  static async set(key, value) {
    await db.query(
      `INSERT INTO settings (key, value) 
       VALUES ($1, $2)
       ON CONFLICT (key) 
       DO UPDATE SET value = $2, updated_at = CURRENT_TIMESTAMP`,
      [key, value]
    );
  }

  static async getAll() {
    const result = await db.query('SELECT * FROM settings');
    const settings = {};
    result.rows.forEach(row => {
      settings[row.key] = row.value;
    });
    return settings;
  }
}

module.exports = Setting;