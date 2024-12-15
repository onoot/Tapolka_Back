import sequelize from '../config/database.mjs';

class Check {
  // Проверка связи с базой данных
  static checkDatabase = async (req, res) => {
    try {
      await sequelize.authenticate();
      console.log('Database connection is successful.');
      return res.status(200).json({ success: true, message: 'Database connection is successful.' });
    } catch (error) {
      console.error('Database connection failed:', error);
      return res.status(500).json({ success: false, message: 'Database connection failed.', error: error.message });
    }
  };
}

export default Check;
