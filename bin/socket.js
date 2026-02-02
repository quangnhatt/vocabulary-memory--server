import { Server } from "socket.io";
import { verifyAuthToken } from "../utils/jwt.js";
import BattleService from "../services/battle.service.js";
export function initSocket(server) {
  const io = new Server(server, {
    cors: {
      origin: "*",
      methods: ["GET", "POST"],
    },
  });


  // Auth middleware (JWT)
  io.use((socket, next) => {
    try {
      const token = socket.handshake.auth?.token;

      if (!token) {
        return next(new Error("UNAUTHORIZED"));
      }

      const {userId} = verifyAuthToken(token);
      socket.userId = userId;

      next();
    } catch (err) {
      next(new Error("UNAUTHORIZED"));
    }
  });


  // Connection handler
  io.on("connection", (socket) => {
    console.log("Socket connected:", socket.userId);
    BattleService.register(io, socket);
  });

  return io;
}
