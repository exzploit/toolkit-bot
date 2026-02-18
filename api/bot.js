module.exports = async (req, res) => {
  // Now we pull the token from the server's secret environment variables
  const token = process.env.BOT_TOKEN; 
  const body = req.body;

  if (body && body.message) {
    const chatId = body.message.chat.id;
    const text = "Welcome to the Toolkit! Your key is now hidden and secure. 🛡️";

    await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        text: text,
      }),
    });
  }

  res.status(200).send("OK");
};