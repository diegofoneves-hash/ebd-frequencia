const db = require('./database');

class Attendance {
  static async mark(memberId, date, status, checkInTime) {
    // Implementar lógica para salvar/atualizar presença
    const result = await db.query(
      `INSERT INTO attendance (member_id, date, status, check_in_time)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (member_id, date) 
       DO UPDATE SET status = $3, check_in_time = $4
       RETURNING *`,
      [memberId, date, status, checkInTime]
    );
    return result.rows[0];
  }

  static async getDailyAttendance(date) {
    const result = await db.query(
      `SELECT a.*, m.name, m.class 
       FROM attendance a
       JOIN members m ON a.member_id = m.id
       WHERE a.date = $1`,
      [date]
    );
    return result.rows;
  }

  static async getSummary(startDate, endDate) {
    const result = await db.query(
      `SELECT 
         date,
         COUNT(*) as total,
         SUM(CASE WHEN status = 'present' THEN 1 ELSE 0 END) as present,
         SUM(CASE WHEN status = 'late' THEN 1 ELSE 0 END) as late,
         SUM(CASE WHEN status = 'absent' THEN 1 ELSE 0 END) as absent
       FROM attendance
       WHERE date BETWEEN $1 AND $2
       GROUP BY date
       ORDER BY date`,
      [startDate, endDate]
    );
    return result.rows;
  }

  static async clearDate(date) {
    await db.query('DELETE FROM attendance WHERE date = $1', [date]);
  }
}

module.exports = Attendance;