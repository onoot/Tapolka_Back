// models/Task.mjs
import { DataTypes } from 'sequelize';
import sequelize from '../config/database.mjs';

const Task = sequelize.define('Task', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  type:{
    type: DataTypes.DECIMAL,
    allowNull: false,
  },
  link:{
    type: DataTypes.STRING,
    allowNull: false,
  }  ,
  category: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  image: {
    type: DataTypes.STRING,
    allowNull: false,
  },
}, {
  tableName: 'tasks',
});

export default Task;
