import { debateState } from "../state/debates.state";

export function isHost(roomId: string, userId: string) {
  const room = debateState.get(roomId);
  if (!room) return false;

  return room.hostId === userId;
}

export function isModerator(roomId: string, userId: string) {
  const room = debateState.get(roomId);
  if (!room) return false;

  return room.hostId === userId || room.cohosts.has(userId);
}