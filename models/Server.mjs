import { DataTypes } from 'sequelize';
import sequelize from '../config/database.mjs';

const Server = sequelize.define('Server', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },
  address: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
  },
  active: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
  },
  reason: {
    type: DataTypes.STRING,
    allowNull: true,
  },
});

export default Server;
