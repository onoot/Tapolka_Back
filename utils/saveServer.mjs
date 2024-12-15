import Server from '../models/Server.mjs';

export async function saveServerAddress(port) {
  try {
    const serverAddress = `http://${process.env.SERVER_HOST || 'localhost'}:${port}`;
    
    // Проверяем, есть ли уже запись с этим адресом
    const existingServer = await Server.findOne({ where: { address: serverAddress } });
    
    if (!existingServer) {
      // Если нет, создаем новый сервер
      await Server.create({
        address: serverAddress,
        active: true, // Отметим сервер как активный
      });

      console.log(`Server address saved: ${serverAddress}`);
    } else {
      console.log(`Server address already exists: ${serverAddress}`);
    }
    return serverAddress
  } catch (error) {
    console.error('Error saving server address:', error);
    return error
  }
}
