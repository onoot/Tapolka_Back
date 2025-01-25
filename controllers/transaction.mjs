import TonWeb from 'tonweb';
import { v4 as uuidv4 } from "uuid";
import { VerifJWT } from "./userController.mjs";
import Payment from "../models/Payment.mjs";
import User from "../models/User.mjs";
 
const tonweb = new TonWeb(new TonWeb.HttpProvider('https://toncenter.com/api/v2/jsonRPC', {
    apiKey: process.env.TONCENTER_API_KEY 
}));

export const prepareTransaction = async (req, res) => {
    try {
        const token = req.headers.authorization?.split(" ")[1];

    if (!token || !VerifJWT(token)) {
        return res.status(401).json({ message: "Unauthorized" });
    }

    const { senderAddress, recipientAddress, amount, userId } = req.body;
    console.log(req.body)
    if (!senderAddress || !recipientAddress || !amount || !userId) {
      return res.status(400).json({ error: "Invalid input" });
    }
  
    // Генерация уникального nonce для защиты от повторных транзакций
    const transactionId = uuidv4();
  
    // Сохранение платежа в базе данных как "ожидающий"
    await Payment.create({
      transactionId,
      senderAddress,
      recipientAddress,
      amount,
      status: "pending",
      userId,
    });
  
    res.json({
      transactionId,
      senderAddress,
      recipientAddress,
      amount,
    })
    } catch (error) {
        console.error("Ошибка при подготовке транзакции:", error);
        return res.status(500).json({ error: "Ошибка при подготовке транзакции" });
    }
}

export const sendTransaction = async (req, res) => {
    const { transactionId, signedTransaction } = req.body;

    if (!transactionId || !signedTransaction) {
        return res.status(400).json({ error: "Invalid input" });
    }

    // Проверяем, существует ли транзакция в базе данных
    const payment = await Payment.findOne({ 
        where: { transactionId },
        include: [{ model: User }]
    });

    if (!payment) {
        return res.status(404).json({ error: "Transaction not found" });
    }

    try {
        // Отправка транзакции в сеть TON
        const result = await tonweb.sendRawTransaction(signedTransaction);

        // Обновляем информацию о транзакции
        payment.txHash = result;
        payment.status = "completed";
        await payment.save();

        // Обновляем статистику транзакций пользователя
        const user = payment.User;
        const transactions = user.transactions || {
            daily: { count: 0, lastDate: new Date().toISOString() },
            tasks: { count: 0, lastDate: new Date().toISOString() },
            totalTokens: 0
        };

        // Определяем тип транзакции и обновляем соответствующий счетчик
        const transactionType = payment.type || 'tasks';
        transactions[transactionType] = {
            count: (transactions[transactionType]?.count || 0) + 1,
            lastDate: new Date().toISOString()
        };
        transactions.totalTokens += Number(payment.amount);

        // Сохраняем обновленную статистику
        user.transactions = transactions;
        await user.save();

        res.json({ success: true, txHash: result });
    } catch (error) {
        console.error("Error submitting transaction:", error);
        return res.status(500).json({ error: "Transaction failed" });
    }
}

export const checkTransaction = async (req, res) => {
    try {
        const { txHash } = req.body;
        const txInfo = await tonweb.provider.getTransaction(txHash);
    
        if (txInfo && txInfo.status === "confirmed") {
          // Обновление статуса платежа в базе данных
          const payment = await Payment.findOne({ where: { txHash } });
          payment.status = "confirmed";
    
          // Начисление бонусов
          await BonusService.addBonus(payment.userId, payment.amount);
    
          await payment.save();
          console.log("Transaction confirmed and bonus added.");
        }
      } catch (error) {
        console.error("Error checking transaction status:", error);
      }
}