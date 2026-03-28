import { Server } from "socket.io";

export const sendTo = (
  io: Server,
  to: string,
  event: string,
  data: any
) => {
  io.to(to).emit(event, data);
};