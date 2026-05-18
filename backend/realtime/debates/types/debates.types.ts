// realtime/debates/types/debates.types.ts

export type DebateRole =
  | "host"
  | "cohost"
  | "speaker"
  | "viewer";

export interface DebateMember {
  userId:   string;
  socketId: string;
  name:     string;
  avatarUrl: string | null;

  role: DebateRole;

  micBlocked:   boolean;
  camBlocked:   boolean;

  banned:     boolean;
  handRaised: boolean;

  shadowMuted:    boolean;
  tempMutedUntil: number | null;
}

export type DebateVoteType = "yes_no" | "kick_vote" | "custom";

export interface DebateActiveVote {
  id:          string;
  type:        DebateVoteType;
  question:    string;
  options:     string[];
  votes:       Record<string, string>; // userId → opción elegida
  endsAt:      number;
  targetId?:   string;
  targetName?: string;
  createdBy?:  string;
}

export interface DebateRoomState {
  roomId: string;

  hostId:    string;
  maxPeople: number;

  members: Map<string, DebateMember>;
  cohosts: Set<string>;
  bans:    Set<string>;

  chatEnabled: boolean;

  strictMode: boolean;
  freeMode:   boolean;

  allMutedOnEntry: boolean;
  cameraAllowed:   boolean;
  speakTimeLimit:  number;

  speakQueue:     string[];
  currentSpeaker: string | null;
  speakEndsAt:    number | null;

  activeVote: DebateActiveVote | null;  // votación en curso

  createdAt: number;
}