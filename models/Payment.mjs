import { DataTypes } from 'sequelize';
import sequelize from '../config/database.mjs';
import User from './User.mjs';

const Payment = sequelize.define('Payment', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  transactionId: {
    type: DataTypes.UUID,
    allowNull: false,
    unique: true,
  },
  senderAddress: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  recipientAddress: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  amount: {
    type: DataTypes.DECIMAL(20, 9),
    allowNull: false,
  },
  status: {
    type: DataTypes.ENUM('pending', 'completed', 'failed'),
    defaultValue: 'pending',
    allowNull: false,
  },
  txHash: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  userId: {
    type: DataTypes.INTEGER,
    references: {
      model: User,
      key: 'id',
    },
    allowNull: false,
  },
  type: {
    type: DataTypes.ENUM('daily', 'tasks'),
    allowNull: false,
    defaultValue: 'tasks'
  }
}, {
  tableName: 'payments',
  timestamps: true,
});

// Устанавливаем связь с моделью User
Payment.belongsTo(User, { foreignKey: 'userId' });

export default Payment; 