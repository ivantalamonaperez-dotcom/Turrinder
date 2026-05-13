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
  avatarUrl: string | null;   // ← NUEVO: necesario para mostrar avatar en tiles

  role: DebateRole;

  micBlocked:   boolean;
  camBlocked:   boolean;

  banned:     boolean;
  handRaised: boolean;

  shadowMuted:    boolean;        // ← NUEVO: shadow mute silencioso
  tempMutedUntil: number | null;  // ← NUEVO: timestamp de expiración del temp mute
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

  // Configuración de sala
  allMutedOnEntry: boolean;   // ← NUEVO: mutear al entrar
  cameraAllowed:   boolean;   // ← NUEVO: permitir cámara
  speakTimeLimit:  number;    // ← NUEVO: ms por turno (0 = sin límite)

  speakQueue:     string[];        // userIds en orden de solicitud
  currentSpeaker: string | null;
  speakEndsAt:    number | null;   // ← NUEVO: timestamp de fin de turno

  createdAt: number;
}