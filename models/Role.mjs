// models/Role.mjs
import { DataTypes } from 'sequelize';
import sequelize from '../config/database.mjs';

const Role = sequelize.define('Role', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false,
  },
}, {
  tableName: 'roles',
});

export default Role;
