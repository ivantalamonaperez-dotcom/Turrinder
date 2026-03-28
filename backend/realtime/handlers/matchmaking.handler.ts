import { Socket } from "socket.io";

let queue: Socket[] = [];

export const addToQueue = (socket: Socket) => {
  queue.push(socket);
};

export const removeFromQueue = (socket: Socket) => {
  queue = queue.filter((s) => s.id !== socket.id);
};

export const findMatch = (): [Socket, Socket] | null => {
  if (queue.length >= 2) {
    const user1 = queue.shift()!;
    const user2 = queue.shift()!;

    return [user1, user2];
  }

  return null;
};