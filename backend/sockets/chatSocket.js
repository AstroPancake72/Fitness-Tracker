const { Server } = require("socket.io");
const { Profile, Message } = require("../models");

function setupChatSocket(server, sessionMiddleware) {
  const io = new Server(server, {
    cors: {
      origin: ["http://localhost:5173", "http://127.0.0.1:5173"],
      credentials: true,
    },
  });

  io.use((socket, next) => {
    sessionMiddleware(socket.request, socket.request.res || {}, next);
  });

  const onlineUsers = new Map();

  io.on("connection", (socket) => {
    const userId = socket.request.session?.userId?.toString();

    if (!userId) {
      socket.disconnect();
      return;
    }

    onlineUsers.set(userId, socket.id);
    console.log(`User connected: ${userId}`);

    socket.on("send_message", async ({ receiverId, content }) => {
      try {
        const senderProfile = await Profile.findOne({ userId });
        const receiverProfile = await Profile.findOne({ userId: receiverId });

        const isConnected = senderProfile?.connections.some(
          (c) => c.userId.toString() === receiverProfile?._id.toString() && c.status === "connected"
        );

        if (!isConnected) {
          socket.emit("message_error", { message: "You are not connected with this user." });
          return;
        }

        const msg = await Message.create({ senderId: userId, receiverId, type: "text", content });
        const receiverSocketId = onlineUsers.get(receiverId);

        if (receiverSocketId) io.to(receiverSocketId).emit("receive_message", msg);

        socket.emit("message_sent", msg);
      } catch (err) {
        console.error("send_message error:", err);
        socket.emit("message_error", { message: "Failed to send message" });
      }
    });

    socket.on("send_workout", async ({ receiverId, workout }) => {
      try {
        const senderProfile = await Profile.findOne({ userId });
        const receiverProfile = await Profile.findOne({ userId: receiverId });

        const isConnected = senderProfile?.connections.some(
          (c) => c.userId.toString() === receiverProfile?._id.toString() && c.status === "connected"
        );

        if (!isConnected) {
          socket.emit("message_error", { message: "You are not connected with this user." });
          return;
        }

        const msg = await Message.create({
          senderId: userId,
          receiverId,
          type: "workout",
          content: "",
          workout,
        });

        const receiverSocketId = onlineUsers.get(receiverId);

        if (receiverSocketId) io.to(receiverSocketId).emit("receive_message", msg);

        socket.emit("message_sent", msg);
      } catch (err) {
        console.error("send_workout error:", err);
        socket.emit("message_error", { message: "Failed to send workout" });
      }
    });

    socket.on("disconnect", () => {
      onlineUsers.delete(userId);
      console.log(`User disconnected: ${userId}`);
    });
  });
}

module.exports = setupChatSocket;