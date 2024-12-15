// models/Daily.mjs
import { DataTypes } from 'sequelize';
import sequelize from '../config/database.mjs';

const Daily = sequelize.define(
  'Daily',
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    path: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    title: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    profit: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    price: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    isLock: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
    type: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    levels: {
      type: DataTypes.JSON,
      allowNull: false,
      defaultValue: 0, 
    },
  },
  {
    tableName: 'dailies',
  }
);

export default Daily;
