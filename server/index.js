const express = require("express");
const bodyParser = require("body-parser");
const { Server } = require("socket.io");

const app = express();
app.use(bodyParser.json());

const io = new Server({
  cors: {
    origin: "*", // Replace '*' with your frontend domain in production
    methods: ["GET", "POST"],
  },
});

const emailToSocketMapping = new Map();
const socketToEmailMapping = new Map();

io.on("connection", (socket) => {
  console.log("New Connection", socket.id);

  socket.on("join-room", (data) => {
    const { roomId, email } = data;
    console.log("User", email, "Joined Room", roomId);
    emailToSocketMapping.set(email, socket.id);
    socketToEmailMapping.set(socket.id, email);

    socket.join(roomId);
    socket.emit("joined-room", roomId);
    socket.broadcast.to(roomId).emit("user-joined", { email });
  });

  socket.on("call-user", (data) => {
    console.log("Inside call user");
    const { email, offer } = data;
    const fromEmail = socketToEmailMapping.get(socket.id);
    console.log("Call initiated by", fromEmail);
    console.log("He wants to connect to ", email);

    const socketId = emailToSocketMapping.get(email);
    if (!socketId) {
      console.error(`Socket ID not found for email: ${email}`);
      socket.emit("call-error", { message: "User not found" });
      return;
    }

    console.log(`Sending offer to ${email} at socket ID: ${socketId}`);
    socket.to(socketId).emit("incoming-call", { from: fromEmail, offer });
  });

  socket.on("call-accepted", (data) => {
    const { email, answer } = data;
    const socketId = emailToSocketMapping.get(email);
    if (!socketId) {
      console.error(`Socket ID not found for email: ${email}`);
      socket.emit("call-error", { message: "User not found" });
      return;
    }

    console.log(`Sending answer back to ${email} at socket ID: ${socketId}`);
    io.to(socketId).emit("call-accepted", { answer });
  });

  socket.on("disconnect", () => {
    const email = socketToEmailMapping.get(socket.id);
    if (email) {
      console.log(`User ${email} disconnected`);
      emailToSocketMapping.delete(email);
      socketToEmailMapping.delete(socket.id);
    }
  });
});

app.listen(8000, () => console.log("HTTP server running at PORT 8000"));
io.listen(8001, () => console.log("Socket.IO server running at PORT 8001"));
