import { DataTypes } from 'sequelize';
import sequelize from '../config/database.mjs';

const History = sequelize.define('History', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  type: {
    type: DataTypes.ENUM('deposit', 'withdraw', 'transfer', 'reward'),
    allowNull: false
  },
  amount: {
    type: DataTypes.DECIMAL(20, 9),
    allowNull: false
  },
  currency: {
    type: DataTypes.STRING(10),
    defaultValue: 'TON'
  },
  from_address: {
    type: DataTypes.STRING(128),
    allowNull: true
  },
  to_address: {
    type: DataTypes.STRING(128),
    allowNull: true
  },
  tx_hash: {
    type: DataTypes.STRING(128),
    unique: true,
    allowNull: false
  },
  status: {
    type: DataTypes.ENUM('pending', 'completed', 'failed'),
    defaultValue: 'pending'
  },
  userId: { // Явное определение
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'users',
      key: 'id'
    }
  }
}, {
  tableName: 'histories',
  indexes: [
    {
      fields: ['userId'] // Корректное имя поля
    },
    {
      fields: ['createdAt']
    }
  ]
});

export default History;