// models/Daily.mjs
import { DataTypes } from 'sequelize';
import sequelize from '../config/database.mjs';

const Daily = sequelize.define('Daily', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  category: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  image: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  levels: {
    type: DataTypes.JSON,
    allowNull: false,
  },
}, {
  tableName: 'dails',
});

export default Daily;
