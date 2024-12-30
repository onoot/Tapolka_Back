import sequelize from '../config/database.mjs';

class Check {
  static checkDatabase = async (req, res) => {
    try {
      await sequelize.authenticate();
      return res.status(200).json({ success: true, message: 'Database connection is successful.' });
    } catch (error) {
      console.error('Database connection failed:', error);
      return res.status(500).json({ success: false, message: 'Database connection failed.', error: error.message });
    }
  };
}

export default Check;
