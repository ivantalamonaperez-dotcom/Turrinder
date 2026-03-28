type Session = {
  user1: string;
  user2: string;
};

const sessions: Session[] = [];

export const createSession = (user1: string, user2: string) => {
  sessions.push({ user1, user2 });
};

export const removeSession = (userId: string) => {
  const index = sessions.findIndex(
    (s) => s.user1 === userId || s.user2 === userId
  );

  if (index !== -1) {
    sessions.splice(index, 1);
  }
};

export const getPartner = (userId: string): string | null => {
  const session = sessions.find(
    (s) => s.user1 === userId || s.user2 === userId
  );

  if (!session) return null;

  return session.user1 === userId ? session.user2 : session.user1;
};