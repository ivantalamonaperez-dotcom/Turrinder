"use client";

/**
 * DebateRoomsPage.tsx — v9
 *
 * FIXES vs v8 — Race conditions en señalización:
 *
 *  PROBLEMA RAÍZ:
 *    Supabase Broadcast no garantiza entrega si el receptor aún no terminó
 *    de suscribirse. Cuando B entra y manda "join", A responde con "offer"
 *    inmediatamente. Pero si B acaba de llamar .subscribe() y el canal no
 *    está 100% listo del lado de B, la offer llega y se pierde.
 *    Lo mismo pasa con ICE candidates que llegan antes de que exista la PC.
 *
 *  SOLUCIONES:
 *  1. COLA DE PENDIENTES — offers e ICE que llegan antes de que exista la PC
 *     se encolan en `pendingSignals`. Cuando createPC() crea la conexión,
 *     drena la cola automáticamente.
 *  2. RE-ANNOUNCE EN PRESENCE — cuando el presence "sync" detecta un miembro
 *     nuevo con el que NO tenemos PC activa, mandamos "join" de nuevo.
 *     Esto cubre el caso donde B se suscribió pero perdió la offer de A.
 *  3. RETRY INTELIGENTE — el retry periódico ahora detecta PCs "vacías"
 *     (sin remoteDescription) además de la ausencia total de PCs.
 *  4. DELAY POST-SUSCRIPCIÓN — esperamos 400ms después de SUBSCRIBED antes
 *     de mandar "join", dando tiempo a que los listeners queden activos.
 */

import { useEffect, useCallback, useState, useRef, useMemo } from "react";
import { supabase } from "@/services/supabase.client";
import { useRouter } from "next/navigation";
import { useProfile } from "@/hooks/useProfile";
import { useSocket } from "@/hooks/useSocket";
import logoImg from "../../../../Images/logo.png";
import debatesImg from "../../../../Images/debates.png";

type Tag =
  | "Política" | "Tecnología" | "Ciencia" | "Deportes" | "Cultura"
  | "Economía" | "Filosofía" | "Gaming" | "Arte" | "Actualidad";

const ALL_TAGS: Tag[] = [
  "Política","Tecnología","Ciencia","Deportes","Cultura",
  "Economía","Filosofía","Gaming","Arte","Actualidad",
];

const ICE_SERVERS = [
  { urls: "stun:stun.l.google.com:19302" },
  { urls: "stun:stun1.l.google.com:19302" },
  { urls: "stun:stun2.l.google.com:19302" },
];

const CAN_CREATE_ROLES = ["streamer", "vip"];
const MAX_ROOM_CAPACITY = 20;

// ─── Types ────────────────────────────────────────────────────────

interface Room {
  id: string; title: string; description: string; tags: Tag[];
  max_people: number; participant_count: number;
  host_id: string; host_name: string; host_role?: string;
  created_at: string; is_live: boolean;
}

interface Participant {
  id: string;
  name: string;
  avatarUrl: string | null;       // ← NUEVO: foto de perfil real
  role: "streamer" | "viewer";
  hasVideo: boolean;
  hasAudio: boolean;
  mutedByHost: boolean;
  camOffByHost: boolean;
  isHost: boolean;
  stream?: MediaStream;
}

interface ChatMessage {
  id: string; userId: string; userName: string; text: string; ts: number;
}

// ─── Helpers ──────────────────────────────────────────────────────

function gridLayout(n: number): { cols: number } {
  if (n <= 1) return { cols: 1 };
  if (n <= 2) return { cols: 2 };
  if (n <= 4) return { cols: 2 };
  if (n <= 6) return { cols: 3 };
  if (n <= 9) return { cols: 3 };
  if (n <= 12) return { cols: 4 };
  return { cols: 4 };
}

/** Busca name y avatar_url desde profiles para un userId dado */
async function fetchProfile(uid: string): Promise<{ name: string; avatarUrl: string | null }> {
  const { data } = await supabase
    .from("profiles")
    .select("name, avatar_url")
    .eq("id", uid)
    .single();
  return { name: data?.name || "Usuario", avatarUrl: data?.avatar_url || null };
}

// ─── useRooms ─────────────────────────────────────────────────────

function useRooms() {
  const [rooms, setRooms] = useState<Room[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.from("rooms").select("*").eq("is_live", true)
      .order("created_at", { ascending: false })
      .then(({ data }) => { if (data) setRooms(data as Room[]); setLoading(false); });

    const ch = supabase.channel("rooms-rt")
      .on("postgres_changes", { event: "*", schema: "public", table: "rooms" }, p => {
        if (p.eventType === "INSERT") setRooms(prev => [p.new as Room, ...prev]);
        else if (p.eventType === "UPDATE") setRooms(prev => prev.map(r => r.id === p.new.id ? p.new as Room : r));
        else if (p.eventType === "DELETE") setRooms(prev => prev.filter(r => r.id !== p.old.id));
      }).subscribe();
    return () => { supabase.removeChannel(ch); };
  }, []);

  const createRoom = useCallback(async (data: Omit<Room, "id"|"participant_count"|"created_at"|"is_live">) => {
    const { data: room, error } = await supabase.from("rooms")
      .insert({ ...data, participant_count: 1, is_live: true }).select().single();
    if (error) throw error;
    return room as Room;
  }, []);

  const closeRoom = useCallback(async (roomId: string) => {
    await supabase.from("rooms").update({ is_live: false }).eq("id", roomId);
  }, []);

  const setCount = useCallback(async (roomId: string, count: number) => {
    await supabase.from("rooms").update({ participant_count: count }).eq("id", roomId);
  }, []);

  return { rooms, loading, createRoom, closeRoom, setCount };
}

// ─── Ban helpers ──────────────────────────────────────────────────

async function checkBan(roomId: string, userId: string): Promise<boolean> {
  const { data } = await supabase
    .from("room_bans").select("id")
    .eq("room_id", roomId).eq("user_id", userId).maybeSingle();
  return !!data;
}

async function insertBan(roomId: string, userId: string): Promise<void> {
  await supabase.from("room_bans").upsert({ room_id: roomId, user_id: userId });
}

// ─── useDebateMedia ───────────────────────────────────────────────
//
// ARQUITECTURA MESH P2P:
//   Al entrar, el nuevo participante emite "join" con sus datos de perfil.
//   TODOS los que ya están (no solo el host) responden con una offer individual.
//   El nuevo responde con answer a cada offer.
//   Resultado: cada par tiene una RTCPeerConnection directa → todas las cámaras visibles.

function useDebateMedia(
  roomId: string | null,
  isHost: boolean,
  userId: string,
  userName: string,
  userAvatarUrl: string | null,
  userRole: "streamer" | "viewer",
  onToast: (msg: string, type?: "info"|"warn"|"error") => void,
) {
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [videoOn, setVideoOn] = useState(true);
  const [audioOn, setAudioOn] = useState(true);
  const [blockedByHost, setBlockedByHost] = useState({ mic: false, cam: false });
  const [presenceCount, setPresenceCount] = useState(1);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);

  const localRef       = useRef<MediaStream | null>(null);
  const peerConns      = useRef<Map<string, RTCPeerConnection>>(new Map());
  // Cache de perfiles ya fetcheados para no repetir queries
  const profileCache   = useRef<Map<string, { name: string; avatarUrl: string | null }>>(new Map());
  const sigCh          = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const retryTimer     = useRef<ReturnType<typeof setInterval> | null>(null);
  const heartbeat      = useRef<ReturnType<typeof setInterval> | null>(null);
  // FIX RACE CONDITION 1: cola de señales que llegan ANTES de que exista la PC
  const pendingSignals = useRef<Map<string, Array<{ type: "offer"|"ice"; payload: any }>>>(new Map());
  // FIX RACE CONDITION 2: set de peers ya conocidos vía presence (re-announce cuando hay nuevo)
  const knownPresence  = useRef<Set<string>>(new Set());

  // ── Obtener perfil con caché ──────────────────────────────────────
  const getProfile = useCallback(async (uid: string) => {
    if (profileCache.current.has(uid)) return profileCache.current.get(uid)!;
    const p = await fetchProfile(uid);
    profileCache.current.set(uid, p);
    return p;
  }, []);

  // ── Crear RTCPeerConnection con un peer ───────────────────────────
  // MESH: cualquier participante puede crear una PC con cualquier otro.
  const createPC = useCallback(async (peerId: string): Promise<RTCPeerConnection> => {
    // Cerrar PC previa si existía
    const old = peerConns.current.get(peerId);
    if (old) { old.close(); peerConns.current.delete(peerId); }

    const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS });

    // Añadir tracks locales
    localRef.current?.getTracks().forEach(t => pc.addTrack(t, localRef.current!));

    // ICE candidates → broadcast
    pc.onicecandidate = ({ candidate }) => {
      if (!candidate || !sigCh.current) return;
      sigCh.current.send({
        type: "broadcast", event: "ice",
        payload: { from: userId, to: peerId, candidate: candidate.toJSON() },
      });
    };

    // ✅ Fix ontrack: algunos browsers no incluyen e.streams[0]
    // Acumulamos los tracks en un MediaStream propio para garantizar que funcione
    const remoteStream = new MediaStream();
    pc.ontrack = async (e) => {
      // Agregar el track al stream acumulado
      remoteStream.addTrack(e.track);

      // También intentar usar e.streams[0] si existe (más completo)
      const stream = e.streams[0] ?? remoteStream;

      const prof = await getProfile(peerId);
      setParticipants(prev => {
        const ex = prev.find(p => p.id === peerId);
        if (ex) return prev.map(p => p.id === peerId ? { ...p, stream, hasVideo: true, hasAudio: true } : p);
        return [...prev, {
          id: peerId,
          name: prof.name,
          avatarUrl: prof.avatarUrl,
          role: "viewer",
          hasVideo: true, hasAudio: true,
          mutedByHost: false, camOffByHost: false,
          isHost: false, stream,
        }];
      });
    };

    pc.onconnectionstatechange = () => {
      const state = pc.connectionState;
      console.log(`[Debates] 🔌 PC con ${peerId.slice(0,8)}: ${state}`);
      if (state === "disconnected" || state === "failed" || state === "closed") {
        // Solo limpiar si presence ya lo confirmó también (evita falsos positivos de ICE restart)
        // La presencia es la fuente de verdad; esto es respaldo
        setTimeout(() => {
          if (!peerConns.current.has(peerId)) return; // ya fue limpiado por presence
          const currentState = peerConns.current.get(peerId)?.connectionState;
          if (currentState === "disconnected" || currentState === "failed" || currentState === "closed") {
            setParticipants(prev => prev.filter(p => p.id !== peerId));
            peerConns.current.delete(peerId);
            console.log(`[Debates] 🗑️ PC con ${peerId.slice(0,8)} eliminada (confirmado por WebRTC)`);
          }
        }, 3000); // esperar 3s para ver si presence lo detecta primero
      }
    };

    peerConns.current.set(peerId, pc);

    // FIX: drenar señales que llegaron antes de que existiera esta PC
    const pending = pendingSignals.current.get(peerId) ?? [];
    pendingSignals.current.delete(peerId);
    for (const sig of pending) {
      if (sig.type === "offer") {
        try {
          await pc.setRemoteDescription(new RTCSessionDescription(sig.payload.sdp));
          const answer = await pc.createAnswer();
          await pc.setLocalDescription(answer);
          sigCh.current?.send({
            type: "broadcast", event: "answer",
            payload: { from: userId, to: peerId, sdp: answer },
          });
          console.log(`[Debates] ✅ Offer drenada y answer enviada a ${peerId.slice(0,8)}`);
        } catch (e) { console.warn("[Debates] Error drenando offer pendiente de", peerId, e); }
      } else if (sig.type === "ice") {
        // ✅ Solo aplicar ICE candidates después de que remoteDescription esté seteado
        if (pc.remoteDescription) {
          try { await pc.addIceCandidate(new RTCIceCandidate(sig.payload.candidate)); } catch {}
        }
        // Si aún no hay remoteDescription, estos candidates se perderán
        // pero serán regenerados por ICE restart automático
      }
    }

    return pc;
  }, [userId, getProfile]);

  // ── Broadcast "join" con datos de perfil reales ───────────────────
  const sendJoin = useCallback((channel: ReturnType<typeof supabase.channel>) => {
    channel.send({
      type: "broadcast", event: "join",
      payload: { from: userId, name: userName, avatarUrl: userAvatarUrl, role: userRole },
    });
  }, [userId, userName, userAvatarUrl, userRole]);

  // ── setupSignaling — MESH P2P ─────────────────────────────────────
  const setupSignaling = useCallback(() => {
    if (!roomId) return;

    const channel = supabase.channel(`debate-${roomId}`, {
      config: { broadcast: { self: false }, presence: { key: userId } },
    });

    // Presencia: todos actualizan el conteo y limpian participantes que se fueron
    channel.on("presence", { event: "sync" }, () => {
      const state   = channel.presenceState();
      const current = new Set(Object.keys(state));
      setPresenceCount(current.size);

      // Limpiar participantes que ya no están en presencia (salida inmediata, sin esperar WebRTC)
      const gone = [...knownPresence.current].filter(uid => !current.has(uid));
      if (gone.length > 0) {
        gone.forEach(uid => {
          console.log(`[Debates] 👋 ${uid.slice(0,8)} salió (detectado vía presence)`);
          peerConns.current.get(uid)?.close();
          peerConns.current.delete(uid);
          pendingSignals.current.delete(uid);
        });
        setParticipants(prev => prev.filter(p => !gone.includes(p.id)));
      }

      // Detectar miembros nuevos con los que no tenemos PC → re-mandar join
      const newMembers = [...current].filter(
        uid => uid !== userId && !knownPresence.current.has(uid) && !peerConns.current.has(uid)
      );
      if (newMembers.length > 0) {
        console.log(`[Debates] 🔄 Nuevos en presence: ${newMembers.map(u => u.slice(0,8)).join(", ")}. Re-mandando join.`);
        // Pequeño delay para que el recién llegado tenga sus listeners activos
        setTimeout(() => sendJoin(channel), 300);
      }

      knownPresence.current = current;
    });

    // Presence leave: limpieza inmediata adicional (doble cobertura)
    channel.on("presence", { event: "leave" }, ({ leftPresences }) => {
      const leftIds = (leftPresences as any[]).map((p: any) => p.userId ?? p.key).filter(Boolean);
      if (leftIds.length === 0) return;
      leftIds.forEach((uid: string) => {
        console.log(`[Debates] 👋 ${uid.slice(0,8)} salió (evento leave)`);
        peerConns.current.get(uid)?.close();
        peerConns.current.delete(uid);
        pendingSignals.current.delete(uid);
      });
      setParticipants(prev => prev.filter(p => !leftIds.includes(p.id)));
    });

    channel
      // ── join: TODOS los presentes responden con offer al recién llegado ──
      .on("broadcast", { event: "join" }, async ({ payload }) => {
        if (payload.from === userId) return;   // ignorar el propio echo

        const isBanned = await checkBan(roomId, payload.from);
        if (isBanned) {
          channel.send({ type: "broadcast", event: "banned", payload: { to: payload.from } });
          return;
        }

        // Log de entrada en cliente
        console.log(`[Debates] 👤 ${payload.name} entró a la sala "${roomId}"`);

        // Registrar participante en el estado local
        const prof = { name: payload.name || "Usuario", avatarUrl: payload.avatarUrl || null };
        profileCache.current.set(payload.from, prof);

        setParticipants(prev => {
          const ex = prev.find(p => p.id === payload.from);
          if (ex) return prev.map(p => p.id === payload.from
            ? { ...p, name: prof.name, avatarUrl: prof.avatarUrl, role: payload.role ?? "viewer" } : p);
          return [...prev, {
            id: payload.from, name: prof.name, avatarUrl: prof.avatarUrl,
            role: payload.role ?? "viewer",
            hasVideo: false, hasAudio: false,
            mutedByHost: false, camOffByHost: false,
            isHost: payload.from === (/* will be set later */ userId) ? false : false,
          }];
        });

        // MESH: YO (cualquier participante ya presente) creo una PC y mando offer
        const pc = await createPC(payload.from);
        try {
          const offer = await pc.createOffer();
          await pc.setLocalDescription(offer);
          channel.send({
            type: "broadcast", event: "offer",
            payload: { from: userId, to: payload.from, sdp: offer, name: userName, avatarUrl: userAvatarUrl, role: userRole },
          });
        } catch (e) {
          console.error("[Debates] Error creando offer para", payload.from, e);
        }
      })

      // ── offer: el recién llegado recibe offers de TODOS los presentes ──
      .on("broadcast", { event: "offer" }, async ({ payload }) => {
        if (payload.to !== userId) return;

        if (retryTimer.current) { clearInterval(retryTimer.current); retryTimer.current = null; }

        // Guardar datos del remitente en caché
        const prof = { name: payload.name || "Usuario", avatarUrl: payload.avatarUrl || null };
        profileCache.current.set(payload.from, prof);

        setParticipants(prev => {
          if (prev.find(p => p.id === payload.from)) return prev;
          return [...prev, {
            id: payload.from, name: prof.name, avatarUrl: prof.avatarUrl,
            role: payload.role ?? "viewer",
            hasVideo: false, hasAudio: false,
            mutedByHost: false, camOffByHost: false,
            isHost: false,
          }];
        });

        // ✅ Fix: NO destruir la PC existente al recibir una offer.
        // Si ya existe PC, reutilizarla. Solo crear PC nueva si no existe.
        // Antes: siempre se llamaba createPC() que destruía la PC anterior,
        // perdiendo los tracks ya negociados y rompiendo la conexión.
        let pc = peerConns.current.get(payload.from);
        if (!pc) {
          pc = await createPC(payload.from);
        }
        try {
          // Solo procesar si no hay remoteDescription ya seteado
          // (evita error si llegó una offer duplicada)
          if (pc.signalingState === "stable" || pc.signalingState === "have-local-offer") {
            await pc.setRemoteDescription(new RTCSessionDescription(payload.sdp));
          } else if (pc.signalingState === "have-remote-offer") {
            // Ya tenemos remote description, solo crear answer
          } else {
            await pc.setRemoteDescription(new RTCSessionDescription(payload.sdp));
          }
          const answer = await pc.createAnswer();
          await pc.setLocalDescription(answer);
          channel.send({
            type: "broadcast", event: "answer",
            payload: { from: userId, to: payload.from, sdp: answer },
          });
        } catch (e) {
          console.error("[Debates] Error procesando offer de", payload.from, e);
        }
      })

      // ── answer: el que mandó la offer completa la negociación ──
      .on("broadcast", { event: "answer" }, async ({ payload }) => {
        if (payload.to !== userId) return;
        const pc = peerConns.current.get(payload.from);
        if (pc) {
          try { await pc.setRemoteDescription(new RTCSessionDescription(payload.sdp)); }
          catch (e) { console.warn("[Debates] Error procesando answer de", payload.from, e); }
        }
      })

      // ── ICE candidates ──
      .on("broadcast", { event: "ice" }, async ({ payload }) => {
        if (payload.to !== userId) return;
        const pc = peerConns.current.get(payload.from);
        if (pc && payload.candidate) {
          // ✅ Fix: solo aplicar ICE si hay remoteDescription seteado
          // Si no hay remoteDescription, encolar para aplicar después
          if (pc.remoteDescription) {
            try { await pc.addIceCandidate(new RTCIceCandidate(payload.candidate)); } catch {}
          } else {
            const queue = pendingSignals.current.get(payload.from) ?? [];
            queue.push({ type: "ice", payload });
            pendingSignals.current.set(payload.from, queue);
          }
        } else if (!pc && payload.candidate) {
          // PC no existe aún — encolar
          const queue = pendingSignals.current.get(payload.from) ?? [];
          queue.push({ type: "ice", payload });
          pendingSignals.current.set(payload.from, queue);
        }
      })

      // ── host-ready: los viewers aún sin PC mandan join ──
      .on("broadcast", { event: "host-ready" }, () => {
        if (!isHost && peerConns.current.size === 0) sendJoin(channel);
      })

      // ── Moderación ──
      .on("broadcast", { event: "banned" }, ({ payload }) => {
        if (payload.to !== userId) return;
        onToast("🚫 Estás baneado de esta sala", "error");
        setTimeout(() => window.location.reload(), 2200);
      })

      .on("broadcast", { event: "moderate" }, ({ payload }) => {
        if (payload.to !== userId) return;
        if (payload.action === "mute") {
          const t = localRef.current?.getAudioTracks()[0];
          if (t) { t.enabled = false; setAudioOn(false); }
          setBlockedByHost(b => ({ ...b, mic: true }));
          onToast("🔇 El host silenció tu micrófono", "warn");
        }
        if (payload.action === "unmute") {
          setBlockedByHost(b => ({ ...b, mic: false }));
          onToast("🎙️ El host reactivó tu micrófono", "info");
        }
        if (payload.action === "camoff") {
          const t = localRef.current?.getVideoTracks()[0];
          if (t) { t.enabled = false; setVideoOn(false); }
          setBlockedByHost(b => ({ ...b, cam: true }));
          onToast("📵 El host apagó tu cámara", "warn");
        }
        if (payload.action === "camon") {
          setBlockedByHost(b => ({ ...b, cam: false }));
          onToast("📹 El host reactivó tu cámara", "info");
        }
        if (payload.action === "kick") {
          onToast("🚪 Fuiste expulsado de la sala", "error");
          setTimeout(() => window.location.reload(), 2200);
        }
        if (payload.action === "ban") {
          onToast("🚫 Fuiste baneado de la sala", "error");
          setTimeout(() => window.location.reload(), 2200);
        }
      })

      .on("broadcast", { event: "mod-state" }, ({ payload }) => {
        setParticipants(prev => prev.map(p => p.id === payload.targetId
          ? {
              ...p,
              mutedByHost: payload.mutedByHost ?? p.mutedByHost,
              camOffByHost: payload.camOffByHost ?? p.camOffByHost,
              hasAudio: payload.mutedByHost ? false : p.hasAudio,
              hasVideo: payload.camOffByHost ? false : p.hasVideo,
            }
          : p));
      })

      .on("broadcast", { event: "room-closed" }, () => {
        if (!isHost) { onToast("🔴 El host cerró la sala", "error"); setTimeout(() => window.location.reload(), 2200); }
      })

      .on("broadcast", { event: "chat" }, ({ payload }) => {
        setChatMessages(prev => [...prev, payload as ChatMessage].slice(-200));
      })

      .subscribe(async (status) => {
        if (status !== "SUBSCRIBED") return;

        // Track presence con datos de perfil
        await channel.track({ userId, name: userName, avatarUrl: userAvatarUrl, role: userRole });

        if (isHost) {
          // Host anuncia que está listo → viewers que ya estaban mandan join
          channel.send({ type: "broadcast", event: "host-ready", payload: { hostId: userId } });
          // HOST también manda join: así los viewers que ya están crean PC con él inmediatamente
          await new Promise(r => setTimeout(r, 300));
          sendJoin(channel);
          // El host también tiene retry en caso de que haya viewers que no le respondieron
          retryTimer.current = setInterval(() => {
            const membersWithoutPC = [...knownPresence.current].filter(
              uid => uid !== userId && !peerConns.current.has(uid)
            );
            if (membersWithoutPC.length > 0) {
              console.log(`[Debates] 🔄 Host retry join (${membersWithoutPC.length} sin PC)`);
              sendJoin(channel);
            } else {
              if (retryTimer.current) { clearInterval(retryTimer.current); retryTimer.current = null; }
            }
          }, 3000);
          setTimeout(() => {
            if (retryTimer.current) { clearInterval(retryTimer.current); retryTimer.current = null; }
          }, 60000);
        } else {
          // Viewer: delay adaptativo — esperar hasta que el canal tenga presentes O máx 600ms
          let waited = 0;
          while (Object.keys(channel.presenceState()).length <= 1 && waited < 600) {
            await new Promise(r => setTimeout(r, 100));
            waited += 100;
          }
          sendJoin(channel);

          // Retry inteligente: detecta PCs sin remoteDescription o PCs rotas
          retryTimer.current = setInterval(() => {
            const hasBrokenPC = [...peerConns.current.values()].some(
              pc => !pc.remoteDescription || pc.connectionState === "failed"
            );
            const membersWithoutPC = [...knownPresence.current].filter(
              uid => uid !== userId && !peerConns.current.has(uid)
            );
            if (peerConns.current.size === 0 || hasBrokenPC || membersWithoutPC.length > 0) {
              console.log("[Debates] 🔄 Viewer retry join");
              sendJoin(channel);
            } else {
              if (retryTimer.current) { clearInterval(retryTimer.current); retryTimer.current = null; }
            }
          }, 3000);
          setTimeout(() => {
            if (retryTimer.current) { clearInterval(retryTimer.current); retryTimer.current = null; }
          }, 60000);
        }
      });

    sigCh.current = channel;

    // Watchdog para viewers: detectar si la sala se cerró
    if (!isHost && roomId) {
      let alreadyLeft = false;

      const watchdogCh = supabase
        .channel(`room-watchdog-${roomId}`)
        .on("postgres_changes", { event: "UPDATE", schema: "public", table: "rooms", filter: `id=eq.${roomId}` },
          (p) => {
            if (p.new && (p.new as any).is_live === false && !alreadyLeft) {
              alreadyLeft = true;
              onToast("🔴 El host cerró la sala", "error");
              setTimeout(() => window.location.reload(), 2200);
            }
          }
        ).subscribe();

      const pollingInterval = setInterval(async () => {
        const { data } = await supabase.from("rooms").select("is_live").eq("id", roomId).single();
        if (data && !data.is_live && !alreadyLeft) {
          alreadyLeft = true;
          clearInterval(pollingInterval);
          onToast("🔴 El host cerró la sala", "error");
          setTimeout(() => window.location.reload(), 2200);
        }
      }, 5000);

      (sigCh.current as any)._watchdog = watchdogCh;
      (sigCh.current as any)._polling  = pollingInterval;
    }
  }, [roomId, isHost, userId, userName, userAvatarUrl, userRole, createPC, sendJoin, onToast]);

  // ── Media ─────────────────────────────────────────────────────────

  const startMedia = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      localRef.current = stream;
      setLocalStream(stream); setVideoOn(true); setAudioOn(true);
    } catch (e) { console.error("Media error:", e); }
  }, []);

  const stopMedia = useCallback(() => {
    localRef.current?.getTracks().forEach(t => t.stop());
    setLocalStream(null); setVideoOn(false); setAudioOn(false);
  }, []);

  const toggleVideo = useCallback(() => {
    if (blockedByHost.cam) { onToast("📵 Tu cámara fue bloqueada por el host", "warn"); return; }
    const t = localRef.current?.getVideoTracks()[0];
    if (t) { t.enabled = !t.enabled; setVideoOn(t.enabled); }
  }, [blockedByHost.cam, onToast]);

  const toggleAudio = useCallback(() => {
    if (blockedByHost.mic) { onToast("🔇 Tu micrófono fue bloqueado por el host", "warn"); return; }
    const t = localRef.current?.getAudioTracks()[0];
    if (t) { t.enabled = !t.enabled; setAudioOn(t.enabled); }
  }, [blockedByHost.mic, onToast]);

  // ── Moderación ────────────────────────────────────────────────────

  const moderate = useCallback((id: string, action: string) => {
    sigCh.current?.send({ type: "broadcast", event: "moderate", payload: { to: id, action } });
  }, []);

  const muteParticipant = useCallback((id: string) => {
    setParticipants(prev => prev.map(p => p.id === id ? { ...p, mutedByHost: true, hasAudio: false } : p));
    moderate(id, "mute");
    sigCh.current?.send({ type: "broadcast", event: "mod-state", payload: { targetId: id, mutedByHost: true } });
  }, [moderate]);

  const unmuteParticipant = useCallback((id: string) => {
    setParticipants(prev => prev.map(p => p.id === id ? { ...p, mutedByHost: false, hasAudio: true } : p));
    moderate(id, "unmute");
    sigCh.current?.send({ type: "broadcast", event: "mod-state", payload: { targetId: id, mutedByHost: false } });
  }, [moderate]);

  const camOffParticipant = useCallback((id: string) => {
    setParticipants(prev => prev.map(p => p.id === id ? { ...p, camOffByHost: true, hasVideo: false } : p));
    moderate(id, "camoff");
    sigCh.current?.send({ type: "broadcast", event: "mod-state", payload: { targetId: id, camOffByHost: true } });
  }, [moderate]);

  const camOnParticipant = useCallback((id: string) => {
    setParticipants(prev => prev.map(p => p.id === id ? { ...p, camOffByHost: false, hasVideo: true } : p));
    moderate(id, "camon");
    sigCh.current?.send({ type: "broadcast", event: "mod-state", payload: { targetId: id, camOffByHost: false } });
  }, [moderate]);

  const kickParticipant = useCallback((id: string) => {
    setParticipants(prev => prev.filter(p => p.id !== id));
    moderate(id, "kick");
    peerConns.current.get(id)?.close(); peerConns.current.delete(id);
  }, [moderate]);

  const banParticipant = useCallback(async (id: string) => {
    if (roomId) await insertBan(roomId, id);
    setParticipants(prev => prev.filter(p => p.id !== id));
    moderate(id, "ban");
    peerConns.current.get(id)?.close(); peerConns.current.delete(id);
  }, [moderate, roomId]);

  const notifyRoomClosed = useCallback(() => {
    sigCh.current?.send({ type: "broadcast", event: "room-closed", payload: {} });
  }, []);

  const sendChat = useCallback((text: string) => {
    const msg: ChatMessage = { id: Date.now().toString(), userId, userName, text, ts: Date.now() };
    setChatMessages(prev => [...prev, msg].slice(-200));
    sigCh.current?.send({ type: "broadcast", event: "chat", payload: msg });
  }, [userId, userName]);

  // ── Effect principal ──────────────────────────────────────────────

  useEffect(() => {
    if (!roomId) return;

    // Log de entrada (cliente)
    console.log(`[Debates] 🏠 Entrando a sala "${roomId}" como ${isHost ? "HOST" : "viewer"}`);

    startMedia().then(() => setupSignaling());

    if (isHost) {
      heartbeat.current = setInterval(async () => {
        await supabase.from("rooms")
          .update({ updated_at: new Date().toISOString() })
          .eq("id", roomId).eq("is_live", true);
      }, 8000);
    }

    return () => {
      if (retryTimer.current) clearInterval(retryTimer.current);
      if (heartbeat.current) clearInterval(heartbeat.current);
      stopMedia();
      peerConns.current.forEach(pc => pc.close()); peerConns.current.clear();
      pendingSignals.current.clear();
      knownPresence.current.clear();
      if ((sigCh.current as any)?._polling) clearInterval((sigCh.current as any)._polling);
      if ((sigCh.current as any)?._watchdog) supabase.removeChannel((sigCh.current as any)._watchdog);
      if (sigCh.current) supabase.removeChannel(sigCh.current);
    };
  }, [roomId, isHost]);

  return {
    participants, localStream, videoOn, audioOn, blockedByHost, presenceCount,
    chatMessages, stopMedia, toggleVideo, toggleAudio,
    muteParticipant, unmuteParticipant,
    camOffParticipant, camOnParticipant,
    kickParticipant, banParticipant,
    notifyRoomClosed, sendChat,
  };
}

// ─── Toast ────────────────────────────────────────────────────────

function Toast({ message, type = "info", onDone }: {
  message: string; type?: "info"|"warn"|"error"; onDone: () => void;
}) {
  useEffect(() => { const t = setTimeout(onDone, 3500); return () => clearTimeout(t); }, [onDone]);
  return <div className={`dr-toast dr-toast-${type}`}>{message}</div>;
}

function TagBadge({ tag, selected, onClick }: { tag: Tag; selected?: boolean; onClick?: () => void }) {
  return (
    <button type="button" onClick={onClick}
      className={`dr-tag ${selected ? "selected" : ""}`}
      style={{ cursor: onClick ? "pointer" : "default" }}>{tag}</button>
  );
}

// ─── RoomCard ─────────────────────────────────────────────────────

function RoomCard({ room, userId, onJoin }: { room: Room; userId: string; onJoin: (r: Room) => void }) {
  const pct  = Math.round((room.participant_count / room.max_people) * 100);
  const full = room.participant_count >= room.max_people;
  const [banned, setBanned]         = useState(false);
  const [checkingBan, setChecking]  = useState(false);

  const handleJoin = useCallback(async () => {
    if (full || checkingBan) return;
    setChecking(true);
    const isBanned = await checkBan(room.id, userId);
    setChecking(false);
    if (isBanned) { setBanned(true); return; }
    onJoin(room);
  }, [full, checkingBan, room, userId, onJoin]);

  return (
    <div className="dr-card" onClick={handleJoin}>
      <div className="dr-card-orb" /><div className="dr-card-shimmer" />
      <div className="dr-card-body">
        <div className="dr-card-top">
          <div className="dr-live-pill"><span className="dr-live-dot" /><span className="dr-live-label">EN VIVO</span></div>
          <div className="dr-card-host-info">
            <span className="dr-card-role-badge">
              <span className="dr-role-crown">{room.host_role === "vip" ? "💎" : "👑"}</span>
              {room.host_role === "vip" ? "VIP" : "STREAMER"}
            </span>
            <span className="dr-card-host-name">{room.host_name}</span>
          </div>
        </div>
        <h3 className="dr-card-title">{room.title}</h3>
        {room.description && <p className="dr-card-desc">{room.description}</p>}
        <div className="dr-card-tags">{room.tags.map(t => <TagBadge key={t} tag={t} />)}</div>
      </div>
      <div className="dr-card-footer">
        <div className="dr-capacity">
          <div className="dr-capacity-header">
            <span className="dr-capacity-icon">👥</span>
            <span className="dr-capacity-label">{room.participant_count} / {room.max_people}{full ? " · LLENA" : ""}</span>
          </div>
          <div className="dr-capacity-bar">
            <div className="dr-capacity-fill" style={{ width:`${pct}%`, background: full ? "linear-gradient(90deg,#f87171,#fb923c)" : "linear-gradient(90deg,#54c7f8,#3b9eda)" }} />
            <div className="dr-capacity-glow" style={{ width:`${pct}%`, opacity: full ? 0 : 1 }} />
          </div>
        </div>
        {banned ? (
          <div className="dr-banned-msg">🚫 Estás baneado de esta sala</div>
        ) : !full ? (
          <button className="dr-join-btn" disabled={checkingBan}>
            <span>{checkingBan ? "Verificando..." : "Unirse"}</span>
            {!checkingBan && <span className="dr-join-arrow">→</span>}
          </button>
        ) : null}
      </div>
    </div>
  );
}

// ─── VideoTile ────────────────────────────────────────────────────
// Ahora muestra foto de perfil real cuando no hay video activo.

function VideoTile({
  participant, isLocalSelf, isPinned, canModerate, onPin,
  onMute, onUnmute, onCamOff, onCamOn, onKick, onBan,
}: {
  participant: Participant; isLocalSelf?: boolean; isPinned?: boolean;
  canModerate?: boolean; onPin?: () => void;
  onMute?: () => void; onUnmute?: () => void;
  onCamOff?: () => void; onCamOn?: () => void;
  onKick?: () => void; onBan?: () => void;
}) {
  const videoRef  = useRef<HTMLVideoElement>(null);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    if (videoRef.current && participant.stream) {
      if (videoRef.current.srcObject !== participant.stream) {
        videoRef.current.srcObject = participant.stream;
        // ✅ Forzar play después de asignar el stream
        // El browser puede bloquear autoplay — intentamos con muted primero
        videoRef.current.muted = true;
        videoRef.current.play().catch(() => {});
      }
    }
  }, [participant.stream]);

  // ✅ Fix: también asignar cuando el ref monta (cubre el caso donde
  // el stream ya existe cuando el componente se monta por primera vez)
  const setVideoRef = useCallback((el: HTMLVideoElement | null) => {
    (videoRef as any).current = el;
    if (el && participant.stream) {
      el.srcObject = participant.stream;
      el.muted = true;
      el.play().catch(() => {});
    }
  }, [participant.stream]);

  const initials = participant.name.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase();
  const micOff   = participant.mutedByHost || !participant.hasAudio;
  const camOff   = participant.camOffByHost || !participant.hasVideo;

  return (
    <div className={`dr-tile ${isPinned ? "dr-tile-pinned" : ""} ${isLocalSelf ? "dr-tile-self" : ""}`}>
      {/* ✅ Fix: usar ref callback para asignar stream al montar */}
      <video ref={setVideoRef} autoPlay playsInline muted
        className="dr-tile-video"
        data-self={isLocalSelf ? "true" : undefined}
        style={{ display: camOff ? "none" : "block" }} />

      {camOff && (
        <div className="dr-tile-avatar">
          {participant.avatarUrl ? (
            /* Foto de perfil real */
            <img
              src={participant.avatarUrl}
              alt={participant.name}
              className="dr-tile-avatar-img"
            />
          ) : (
            /* Fallback: iniciales */
            <>
              <div className="dr-tile-avatar-ring" />
              <span className="dr-tile-initials">{initials}</span>
            </>
          )}
          {participant.mutedByHost && <span className="dr-tile-blocked-badge">🔇</span>}
          {participant.camOffByHost && <span className="dr-tile-blocked-badge" style={{ right: 22 }}>📵</span>}
        </div>
      )}

      <div className="dr-tile-info">
        <div className="dr-tile-info-left">
          {participant.isHost && <span className="dr-host-badge">HOST</span>}
          {participant.role === "streamer" && !participant.isHost && <span className="dr-streamer-badge">STR</span>}
          {isLocalSelf && <span className="dr-you-badge">TÚ</span>}
          {/* Miniatura de avatar junto al nombre */}
          {participant.avatarUrl && (
            <img src={participant.avatarUrl} alt="" className="dr-tile-name-avatar" />
          )}
          <span className="dr-tile-name">{participant.name}</span>
        </div>
        <div className="dr-tile-icons">
          <span className={micOff ? "dr-icon-off" : "dr-icon-on"}>🎙️</span>
          <span className={camOff ? "dr-icon-off" : "dr-icon-on"}>📹</span>
        </div>
      </div>

      <button className={`dr-pin-btn ${isPinned ? "active" : ""}`} onClick={onPin}
        title={isPinned ? "Desfijar" : "Fijar"}>{isPinned ? "📌" : "📍"}</button>

      {canModerate && !participant.isHost && !isLocalSelf && (
        <div className="dr-menu-wrap">
          <button className="dr-menu-btn" onClick={() => setMenuOpen(o => !o)}>⋯</button>
          {menuOpen && (
            <div className="dr-menu-dropdown" onMouseLeave={() => setMenuOpen(false)}>
              {participant.mutedByHost
                ? <button onClick={() => { onUnmute?.(); setMenuOpen(false); }}>🎙️ Reactivar mic</button>
                : <button onClick={() => { onMute?.(); setMenuOpen(false); }}>🔇 Silenciar</button>}
              {participant.camOffByHost
                ? <button onClick={() => { onCamOn?.(); setMenuOpen(false); }}>📹 Reactivar cámara</button>
                : <button onClick={() => { onCamOff?.(); setMenuOpen(false); }}>📵 Apagar cámara</button>}
              <div className="dr-menu-divider" />
              <button onClick={() => { onKick?.(); setMenuOpen(false); }}>🚪 Expulsar</button>
              <button className="dr-menu-ban" onClick={() => { onBan?.(); setMenuOpen(false); }}>🚫 Banear permanente</button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── ChatPanel ────────────────────────────────────────────────────

function ChatPanel({ messages, onSend, onClose, userId }: {
  messages: ChatMessage[]; onSend: (t: string) => void; onClose: () => void; userId: string;
}) {
  const [input, setInput] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);
  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);
  const handleSend = () => { const t = input.trim(); if (!t) return; onSend(t); setInput(""); };

  return (
    <div className="dr-chat">
      <div className="dr-chat-header">
        <div className="dr-chat-header-left"><div className="dr-chat-dot" /><span>Chat en vivo</span></div>
        <button onClick={onClose} className="dr-chat-close">✕</button>
      </div>
      <div className="dr-chat-messages">
        {messages.length === 0 && <div className="dr-chat-empty">Todavía no hay mensajes</div>}
        {messages.map(m => (
          <div key={m.id} className={`dr-chat-msg ${m.userId === userId ? "own" : ""}`}>
            <span className="dr-chat-author">{m.userId === userId ? "Tú" : m.userName}</span>
            <span className="dr-chat-text">{m.text}</span>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>
      <div className="dr-chat-input-row">
        <input className="dr-chat-input" placeholder="Escribir..." value={input}
          onChange={e => setInput(e.target.value)} onKeyDown={e => e.key === "Enter" && handleSend()} maxLength={300} />
        <button className="dr-chat-send" onClick={handleSend}>→</button>
      </div>
    </div>
  );
}

// ─── CreateRoomModal ──────────────────────────────────────────────

function CreateRoomModal({ hostId, hostName, hostRole, onClose, onCreated }: {
  hostId: string; hostName: string; hostRole: string;
  onClose: () => void; onCreated: (r: Room) => void;
}) {
  const { createRoom } = useRooms();
  const [title, setTitle]       = useState("");
  const [description, setDesc]  = useState("");
  const [tags, setTags]         = useState<Tag[]>([]);
  const [maxPeople, setMax]     = useState<number | "">(10);
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState("");

  const toggleTag = (tag: Tag) =>
    setTags(prev => prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag].slice(0, 4));

  const handleCreate = async () => {
    if (!title.trim()) { setError("El título es obligatorio"); return; }
    if (tags.length === 0) { setError("Elegí al menos un tema"); return; }
    const cap = (maxPeople as number) || 2;
    if (cap < 2) { setError("La capacidad mínima es 2"); return; }
    setError(""); setLoading(true);
    try {
      const room = await createRoom({
        title: title.trim(), description: description.trim(), tags,
        max_people: Math.min(cap, MAX_ROOM_CAPACITY),
        host_id: hostId, host_name: hostName, host_role: hostRole,
      });
      onCreated(room);
    } catch (e: any) { setError(e.message ?? "Error al crear la sala"); }
    finally { setLoading(false); }
  };

  return (
    <div className="crm-overlay" onClick={onClose}>
      <div className="crm-sheet" onClick={e => e.stopPropagation()}>
        <div className="crm-beam" /><div className="crm-beam-glow" />
        <div className="crm-header">
          <div className="crm-header-left">
            <div className="crm-crown-wrap">
              <div className="crm-crown-ring" />
              <span className="crm-crown-icon">{hostRole === "vip" ? "💎" : "👑"}</span>
            </div>
            <div>
              <p className="crm-eyebrow">{hostRole === "vip" ? "Exclusivo para VIP" : "Exclusivo para Streamer"}</p>
              <h2 className="crm-title">Crear debate</h2>
            </div>
          </div>
          <button className="crm-close" onClick={onClose}>
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path d="M1 1l12 12M13 1L1 13" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/>
            </svg>
          </button>
        </div>
        <div className="crm-body">
          <div className="crm-field">
            <label className="crm-label">Título <span className="crm-required">*</span></label>
            <div className="crm-input-wrap">
              <input className="crm-input" placeholder="¿De qué van a debatir?" value={title}
                onChange={e => setTitle(e.target.value)} maxLength={80} autoFocus />
              <span className="crm-char-count">{title.length}/80</span>
            </div>
          </div>
          <div className="crm-field">
            <label className="crm-label">Descripción <span className="crm-hint">opcional</span></label>
            <div className="crm-input-wrap">
              <textarea className="crm-input crm-textarea" placeholder="Contexto, reglas del debate..."
                value={description} onChange={e => setDesc(e.target.value)} maxLength={280} rows={3} />
              <span className="crm-char-count crm-char-count-ta">{description.length}/280</span>
            </div>
          </div>
          <div className="crm-field">
            <label className="crm-label">Tema <span className="crm-required">*</span><span className="crm-hint">hasta 4</span></label>
            <div className="crm-tags-grid">
              {ALL_TAGS.map(tag => (
                <button key={tag} type="button" className={`crm-tag ${tags.includes(tag) ? "crm-tag-on" : ""}`}
                  onClick={() => toggleTag(tag)}>
                  {tags.includes(tag) && <span className="crm-tag-check">✓</span>}{tag}
                </button>
              ))}
            </div>
          </div>
          <div className="crm-field">
            <label className="crm-label">Capacidad <span className="crm-hint">2–{MAX_ROOM_CAPACITY} personas</span></label>
            <div className="crm-capacity-row">
              <div className="crm-number-wrap">
                <button className="crm-num-btn" type="button" onClick={() => setMax(p => Math.max(2, (p || 2) - 1))}>−</button>
                <input className="crm-number-input" type="number" min={2} max={MAX_ROOM_CAPACITY} value={maxPeople}
                  onChange={e => { const n = parseInt(e.target.value, 10); if (!isNaN(n)) setMax(Math.min(MAX_ROOM_CAPACITY, Math.max(2, n))); }} />
                <button className="crm-num-btn" type="button" onClick={() => setMax(p => Math.min(MAX_ROOM_CAPACITY, (p || 2) + 1))}>+</button>
              </div>
              <div className="crm-capacity-presets">
                {[2, 5, 10, 20].map(n => (
                  <button key={n} type="button" className={`crm-preset ${maxPeople === n ? "crm-preset-on" : ""}`}
                    onClick={() => setMax(n)}>{n}</button>
                ))}
              </div>
            </div>
            <p className="crm-capacity-note">Máximo {MAX_ROOM_CAPACITY} participantes con video.</p>
          </div>
          {error && (
            <div className="crm-error">
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                <circle cx="7" cy="7" r="6" stroke="#f87171" strokeWidth="1.4"/>
                <path d="M7 4v3.5M7 9.5v.5" stroke="#f87171" strokeWidth="1.4" strokeLinecap="round"/>
              </svg>
              {error}
            </div>
          )}
        </div>
        <div className="crm-footer">
          <button className="crm-btn-cancel" onClick={onClose}>Cancelar</button>
          <button className="crm-btn-create" onClick={handleCreate} disabled={loading}>
            {loading
              ? <span className="crm-loading-dots"><span /><span /><span /></span>
              : <><span>Iniciar sala</span><span className="crm-arrow">→</span></>}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── LockedModal ──────────────────────────────────────────────────

function LockedModal({ onClose }: { onClose: () => void }) {
  return (
    <div className="crm-overlay" onClick={onClose}>
      <div className="crm-sheet" onClick={e => e.stopPropagation()} style={{ maxWidth: 400 }}>
        <div className="crm-beam" style={{ background: "linear-gradient(90deg,rgba(251,191,36,0.6),transparent)" }} />
        <div className="crm-header">
          <div className="crm-header-left">
            <div className="crm-crown-wrap" style={{ background: "rgba(251,191,36,0.08)" }}>
              <div className="crm-crown-ring" />
              <span className="crm-crown-icon">🔒</span>
            </div>
            <div>
              <p className="crm-eyebrow">Función premium</p>
              <h2 className="crm-title">Solo VIP / Streamer</h2>
            </div>
          </div>
          <button className="crm-close" onClick={onClose}>
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path d="M1 1l12 12M13 1L1 13" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/>
            </svg>
          </button>
        </div>
        <div className="crm-body" style={{ gap: 14 }}>
          <p style={{ color: "rgba(180,215,240,0.65)", fontSize: 14, lineHeight: 1.6 }}>
            Crear salas de debate es exclusivo para usuarios con rango <strong style={{ color: "#fbbf24" }}>VIP</strong> o <strong style={{ color: "#54c7f8" }}>Streamer</strong>.
          </p>
          <p style={{ color: "rgba(180,215,240,0.4)", fontSize: 13 }}>Los viewers pueden unirse a cualquier sala activa de forma gratuita.</p>
          <div className="crm-locked-badges">
            <div className="crm-locked-badge crm-locked-vip">💎 VIP</div>
            <div className="crm-locked-badge crm-locked-streamer">👑 Streamer</div>
          </div>
        </div>
        <div className="crm-footer" style={{ justifyContent: "center" }}>
          <button className="crm-btn-cancel" style={{ minWidth: 120 }} onClick={onClose}>Entendido</button>
        </div>
      </div>
    </div>
  );
}

// ─── RoomView ─────────────────────────────────────────────────────

function RoomView({ room, currentUserId, currentUserName, currentUserAvatarUrl, currentUserRole, onLeave, closeRoom, setCount, socket }: {
  room: Room;
  currentUserId: string;
  currentUserName: string;
  currentUserAvatarUrl: string | null;
  currentUserRole: "streamer" | "viewer";
  onLeave: () => void;
  closeRoom: (id: string) => Promise<void>;
  setCount: (id: string, n: number) => Promise<void>;
  socket: any;
}) {
  const isHost = room.host_id === currentUserId;
  const [toasts, setToasts]   = useState<{ id: string; msg: string; type: "info"|"warn"|"error" }[]>([]);
  const [pinnedId, setPinned] = useState<string | null>(null);
  const [chatOpen, setChat]   = useState(false);

  const onToast = useCallback((msg: string, type: "info"|"warn"|"error" = "info") => {
    const id = Date.now().toString();
    setToasts(prev => [...prev, { id, msg, type }]);
  }, []);

  const {
    participants, localStream, videoOn, audioOn, blockedByHost, presenceCount,
    chatMessages, stopMedia, toggleVideo, toggleAudio,
    muteParticipant, unmuteParticipant,
    camOffParticipant, camOnParticipant,
    kickParticipant, banParticipant,
    notifyRoomClosed, sendChat,
  } = useDebateMedia(
    room.id, isHost,
    currentUserId, currentUserName, currentUserAvatarUrl, currentUserRole,
    onToast,
  );

  const selfViewRef = useRef<HTMLVideoElement>(null);

  // Sincronizar conteo con Supabase
  useEffect(() => { setCount(room.id, presenceCount); }, [presenceCount]);

  // Registrar sala en servidor socket
  useEffect(() => {
    if (!isHost || !socket?.connected) return;
    socket.emit("create-debate-room", { roomId: room.id, maxPeople: room.max_people, hostId: currentUserId });
  }, [isHost, room.id, room.max_people, currentUserId, socket]);

  // Beforeunload del host
  useEffect(() => {
    if (!isHost) return;
    const handleUnload = () => {
      fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/rooms?id=eq.${room.id}`, {
        method: "PATCH", keepalive: true,
        headers: {
          "Content-Type": "application/json",
          "apikey": process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
          "Authorization": `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!}`,
          "Prefer": "return=minimal",
        },
        body: JSON.stringify({ is_live: false }),
      });
      socket?.emit("close-debate-room", { roomId: room.id });
    };
    window.addEventListener("beforeunload", handleUnload);
    return () => {
      window.removeEventListener("beforeunload", handleUnload);
      notifyRoomClosed();
      closeRoom(room.id);
      socket?.emit("close-debate-room", { roomId: room.id });
    };
  }, [isHost, room.id, closeRoom, notifyRoomClosed, socket]);

  useEffect(() => {
    if (selfViewRef.current && localStream) selfViewRef.current.srcObject = localStream;
  }, [localStream]);

  const handleLeaveOrClose = useCallback(async () => {
    if (isHost) {
      notifyRoomClosed();
      await closeRoom(room.id);
      socket?.emit("close-debate-room", { roomId: room.id });
    }
    stopMedia(); onLeave();
  }, [isHost, room.id, closeRoom, stopMedia, onLeave, notifyRoomClosed, socket]);

  const togglePin = useCallback((id: string) => setPinned(prev => prev === id ? null : id), []);

  // Participante propio (self)
  const selfParticipant: Participant = useMemo(() => ({
    id: currentUserId, name: currentUserName, avatarUrl: currentUserAvatarUrl,
    role: currentUserRole,
    hasVideo: videoOn, hasAudio: audioOn,
    mutedByHost: blockedByHost.mic, camOffByHost: blockedByHost.cam,
    isHost, stream: localStream ?? undefined,
  }), [currentUserId, currentUserName, currentUserAvatarUrl, currentUserRole, videoOn, audioOn, blockedByHost, isHost, localStream]);

  const allParticipants  = useMemo(() => [selfParticipant, ...participants], [selfParticipant, participants]);
  const pinnedParticipant = pinnedId ? allParticipants.find(p => p.id === pinnedId) : null;
  const gridParticipants  = pinnedId ? allParticipants.filter(p => p.id !== pinnedId) : allParticipants;
  const { cols } = useMemo(() => gridLayout(gridParticipants.length), [gridParticipants.length]);
  const needsScroll = gridParticipants.length > 16;

  return (
    <div className="dr-room-view">
      <div className="dr-toasts-stack">
        {toasts.map(t => (
          <Toast key={t.id} message={t.msg} type={t.type}
            onDone={() => setToasts(prev => prev.filter(x => x.id !== t.id))} />
        ))}
      </div>

      <div className="dr-room-header">
        <div className="dr-room-meta">
          <div className="dr-room-logo-mini"><span className="dr-room-logo-t">T</span></div>
          <span className="dr-live-dot" />
          <span className="dr-room-title-text">{room.title}</span>
          <div className="dr-room-tags">{room.tags.map(t => <TagBadge key={t} tag={t} />)}</div>
        </div>
        <div className="dr-room-header-right">
          <div className="dr-room-count-pill">
            <span className="dr-room-count-dot" />
            <span>{presenceCount}/{room.max_people}</span>
          </div>
          <button className="dr-chat-toggle-btn" onClick={() => setChat(o => !o)}>
            💬
            {chatMessages.length > 0 && <span className="dr-chat-badge">{chatMessages.length}</span>}
          </button>
          <button className="dr-leave-btn" onClick={handleLeaveOrClose}>
            {isHost ? "🚪 Cerrar sala" : "← Salir"}
          </button>
        </div>
      </div>

      {/* ✅ Fix audio: click en cualquier parte desbloquea audio de videos remotos (excluye el propio) */}
      <div className="dr-room-body" onClick={() => {
        document.querySelectorAll<HTMLVideoElement>('.dr-tile-video:not([data-self])').forEach(v => {
          if (v.muted) { v.muted = false; v.play().catch(() => {}); }
        });
      }}>
        {pinnedParticipant ? (
          <div className="dr-pinned-layout">
            <div className="dr-pinned-stage">
              <VideoTile participant={pinnedParticipant} isLocalSelf={pinnedParticipant.id === currentUserId}
                isPinned canModerate={isHost} onPin={() => togglePin(pinnedParticipant.id)}
                onMute={() => muteParticipant(pinnedParticipant.id)} onUnmute={() => unmuteParticipant(pinnedParticipant.id)}
                onCamOff={() => camOffParticipant(pinnedParticipant.id)} onCamOn={() => camOnParticipant(pinnedParticipant.id)}
                onKick={() => kickParticipant(pinnedParticipant.id)} onBan={() => banParticipant(pinnedParticipant.id)} />
            </div>
            <div className="dr-pinned-rail">
              {gridParticipants.map(p => (
                <VideoTile key={p.id} participant={p} isLocalSelf={p.id === currentUserId}
                  canModerate={isHost} onPin={() => togglePin(p.id)}
                  onMute={() => muteParticipant(p.id)} onUnmute={() => unmuteParticipant(p.id)}
                  onCamOff={() => camOffParticipant(p.id)} onCamOn={() => camOnParticipant(p.id)}
                  onKick={() => kickParticipant(p.id)} onBan={() => banParticipant(p.id)} />
              ))}
            </div>
          </div>
        ) : (
          <div className={`dr-meet-grid ${needsScroll ? "scrollable" : ""}`}
            style={{ "--grid-cols": cols } as React.CSSProperties}>
            {gridParticipants.map(p => (
              <VideoTile key={p.id} participant={p} isLocalSelf={p.id === currentUserId}
                canModerate={isHost} onPin={() => togglePin(p.id)}
                onMute={() => muteParticipant(p.id)} onUnmute={() => unmuteParticipant(p.id)}
                onCamOff={() => camOffParticipant(p.id)} onCamOn={() => camOnParticipant(p.id)}
                onKick={() => kickParticipant(p.id)} onBan={() => banParticipant(p.id)} />
            ))}
          </div>
        )}
        {chatOpen && (
          <ChatPanel messages={chatMessages} onSend={sendChat} onClose={() => setChat(false)} userId={currentUserId} />
        )}
      </div>

      {/* Self PIP */}
      <div className="dr-self-pip">
        <video ref={selfViewRef} autoPlay playsInline muted className="dr-self-pip-video" />
        {(!videoOn || blockedByHost.cam) && (
          <div className="dr-self-pip-avatar">
            {currentUserAvatarUrl
              ? <img src={currentUserAvatarUrl} alt={currentUserName} className="dr-self-pip-avatar-img" />
              : <span className="dr-self-pip-initials">{currentUserName.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase()}</span>
            }
          </div>
        )}
        <div className="dr-self-pip-info">
          <span className="dr-self-pip-name">{currentUserName}</span>
          <div className="dr-self-pip-icons">
            <span className={audioOn && !blockedByHost.mic ? "dr-icon-on" : "dr-icon-off"}>🎙️</span>
            <span className={videoOn && !blockedByHost.cam ? "dr-icon-on" : "dr-icon-off"}>📹</span>
          </div>
        </div>
      </div>

      {/* Controls */}
      <div className="dr-controls">
        <button className={`dr-ctrl-btn ${audioOn && !blockedByHost.mic ? "active" : "off"}`} onClick={toggleAudio}
          title={blockedByHost.mic ? "Bloqueado por host" : (audioOn ? "Silenciar" : "Activar mic")}>
          {audioOn && !blockedByHost.mic ? "🎙️" : "🔇"}
        </button>
        <button className={`dr-ctrl-btn ${videoOn && !blockedByHost.cam ? "active" : "off"}`} onClick={toggleVideo}
          title={blockedByHost.cam ? "Bloqueado por host" : (videoOn ? "Apagar cam" : "Encender cam")}>
          {videoOn && !blockedByHost.cam ? "📹" : "📵"}
        </button>
        <button className="dr-ctrl-btn neutral" onClick={() => setChat(o => !o)} title="Chat">💬</button>
        {isHost && <div className="dr-ctrl-host-badge" title="Modo host">👑</div>}
        {(blockedByHost.mic || blockedByHost.cam) && (
          <div className="dr-ctrl-blocked-warn">🔒</div>
        )}
      </div>

      {room.description && (
        <div className="dr-room-desc-bar"><span>💬</span><span>{room.description}</span></div>
      )}
    </div>
  );
}

// ─── Página principal ─────────────────────────────────────────────

export default function DebateRoomsPage() {
  const router  = useRouter();
  // ✅ Fix: destructurar correctamente — antes (profile as any) leía el objeto
  // completo { profile, profileReady } en vez del profile real
  const { profile, profileReady } = useProfile();
  const { socket } = useSocket();

  const userId:   string = profile?.id   ?? "";
  const userRole: string = profile?.role ?? "viewer";
  const canCreate = CAN_CREATE_ROLES.includes(userRole);
  const mediaRole: "streamer"|"viewer" = userRole === "streamer" ? "streamer" : "viewer";

  // Datos de perfil reales (nombre + avatar)
  const [profileData, setProfileData] = useState<{ name: string; avatarUrl: string | null }>({ name: "Usuario", avatarUrl: null });

  useEffect(() => {
    if (!userId) return;
    fetchProfile(userId).then(setProfileData);
  }, [userId]);

  const userName      = profileData.name;
  const userAvatarUrl = profileData.avatarUrl;

  const { rooms, loading, closeRoom, setCount } = useRooms();
  const [activeRoom, setActiveRoom] = useState<Room | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [showLocked, setShowLocked] = useState(false);
  const [filterTag, setFilterTag]   = useState<Tag | null>(null);
  const [search, setSearch]         = useState("");

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => { if (!data.user) router.push("/"); });
  }, [router]);

  const filteredRooms = useMemo(() => rooms.filter(r => {
    const matchTag    = !filterTag || r.tags.includes(filterTag);
    const matchSearch = !search || r.title.toLowerCase().includes(search.toLowerCase());
    return matchTag && matchSearch;
  }), [rooms, filterTag, search]);

  const handleCreateClick = useCallback(() => {
    if (canCreate) setShowCreate(true);
    else setShowLocked(true);
  }, [canCreate]);

  if (activeRoom) {
    return (
      <><GlobalStyles />
        <div className="dr-root">
          <div className="dr-aurora" /><div className="dr-flag" />
          <RoomView
            room={activeRoom}
            currentUserId={userId}
            currentUserName={userName}
            currentUserAvatarUrl={userAvatarUrl}
            currentUserRole={mediaRole}
            onLeave={() => setActiveRoom(null)}
            closeRoom={closeRoom}
            setCount={setCount}
            socket={socket}
          />
        </div>
      </>
    );
  }

  return (
    <><GlobalStyles />
      {showCreate && canCreate && (
        <CreateRoomModal hostId={userId} hostName={userName} hostRole={userRole}
          onClose={() => setShowCreate(false)}
          onCreated={room => { setShowCreate(false); setActiveRoom(room); }} />
      )}
      {showLocked && <LockedModal onClose={() => setShowLocked(false)} />}

      <div className="dr-root">
        <div className="dr-aurora" /><div className="dr-flag" />

        <header className="dr-header">
          <div className="dr-logo-full">
            <div className="dr-logo-icon-wrap">
              <div className="dr-logo-icon-halo" />
              <img src={logoImg.src} alt="Turrinder logo" className="dr-logo-img-clean" />
            </div>
            <div className="dr-logo-text-group">
              <div className="dr-logo-wordmark">Turr<em>inder</em></div>
              <div className="dr-logo-section-tag"><span className="dr-section-dot" />Debates</div>
            </div>
          </div>

          <div className="dr-header-right">
            {/* Avatar del usuario logueado */}
            {userAvatarUrl && (
              <img src={userAvatarUrl} alt={userName} className="dr-header-avatar" />
            )}
            <div className="dr-role-badge" data-role={userRole}>
              {userRole === "streamer" ? "👑 Streamer" : userRole === "vip" ? "💎 VIP" : "👁 Viewer"}
            </div>
            <button
              className={`dr-create-btn ${!canCreate ? "dr-create-btn-locked" : ""}`}
              onClick={handleCreateClick}
              title={canCreate ? "Crear una sala de debate" : "Función exclusiva para VIP y Streamer"}
            >
              <span className="dr-create-btn-plus">{canCreate ? "+" : "🔒"}</span>
              <span>Crear sala</span>
            </button>
          </div>
        </header>

        <div className="dr-filters">
          <div className="dr-search-wrap">
            <svg className="dr-search-icon" width="14" height="14" viewBox="0 0 14 14" fill="none">
              <circle cx="6" cy="6" r="4.5" stroke="currentColor" strokeWidth="1.4"/>
              <path d="M10 10l2.5 2.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
            </svg>
            <input className="dr-search" placeholder="Buscar debate..." value={search}
              onChange={e => setSearch(e.target.value)} />
          </div>
          <div className="dr-filter-tags">
            <button className={`dr-filter-tag ${!filterTag ? "active" : ""}`} onClick={() => setFilterTag(null)}>Todos</button>
            {ALL_TAGS.map(tag => (
              <button key={tag} className={`dr-filter-tag ${filterTag === tag ? "active" : ""}`}
                onClick={() => setFilterTag(prev => prev === tag ? null : tag)}>{tag}</button>
            ))}
          </div>
        </div>

        <main className="dr-main">
          {loading ? (
            <div className="dr-loading">
              <div className="dr-spinner-wrap"><div className="dr-spinner" /><div className="dr-spinner-inner" /></div>
              <span>Cargando salas...</span>
            </div>
          ) : filteredRooms.length === 0 ? (
            <div className="dr-empty">
              <div className="dr-empty-orb" />
              <div className="dr-empty-icon"><img src={debatesImg.src} alt="Sin debates" className="dr-empty-debates-img" /></div>
              <h3>No hay debates activos</h3>
              <p>{canCreate ? "¡Creá la primera sala y empezá el debate!" : "Esperá a que un VIP o Streamer cree una sala."}</p>
              {canCreate && <button className="dr-empty-create-btn" onClick={handleCreateClick}>+ Crear primera sala</button>}
            </div>
          ) : (
            <div className="dr-rooms-grid">
              {filteredRooms.map(room => (
                <RoomCard key={room.id} room={room} userId={userId} onJoin={setActiveRoom} />
              ))}
            </div>
          )}
        </main>
      </div>
    </>
  );
}

// ─── GlobalStyles ─────────────────────────────────────────────────

function GlobalStyles() {
  return (
    <style>{`
      @import url('https://fonts.googleapis.com/css2?family=Syne:wght@600;700;800&family=DM+Sans:wght@300;400;500;600&display=swap');
      *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

      .dr-root {
        --sky: #54c7f8; --sky2: #3b9eda; --sky3: #1a6fa8;
        --sky-glow: rgba(84,199,248,0.38); --white: #f5f8ff;
        --bg: #030a14; --bg2: #050f1e;
        --glass: rgba(84,199,248,0.04); --glass-b: rgba(84,199,248,0.11);
        --muted: rgba(180,215,240,0.45); --danger: #f87171;
        --warn: #fbbf24; --violet: #a78bfa; --green: #4ade80;
        min-height: 100dvh; height: 100dvh; max-height: 100dvh; display: flex; flex-direction: column; overflow: hidden;
        background: var(--bg); font-family: 'DM Sans', sans-serif;
        -webkit-font-smoothing: antialiased; color: var(--white); position: relative;
      }
      .dr-root::before {
        content: ''; position: fixed; inset: 0; pointer-events: none; z-index: 0;
        background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.04'/%3E%3C/svg%3E");
        opacity: 0.25;
      }
      .dr-aurora {
        position: fixed; inset: 0; pointer-events: none; z-index: 0;
        background:
          radial-gradient(ellipse 80% 50% at 5% 10%, rgba(84,199,248,0.18) 0%, transparent 60%),
          radial-gradient(ellipse 60% 45% at 95% 85%, rgba(59,158,218,0.13) 0%, transparent 58%),
          radial-gradient(ellipse 45% 40% at 70% 5%, rgba(26,111,168,0.10) 0%, transparent 55%);
        animation: dr-aurora 22s ease-in-out infinite alternate;
      }
      @keyframes dr-aurora {
        0%   { opacity:0.7; transform:scale(1); }
        50%  { opacity:1;   transform:scale(1.06); }
        100% { opacity:0.85; transform:scale(1.09); }
      }
      .dr-flag { position:fixed; inset:0; pointer-events:none; z-index:0;
        background:linear-gradient(180deg,rgba(3,10,20,0) 60%,rgba(3,10,20,0.85) 100%); }

      /* ── HEADER ── */
      .dr-header {
        position:relative; z-index:10; display:flex; align-items:center; justify-content:space-between;
        padding:16px 28px; border-bottom:1px solid rgba(84,199,248,0.07);
        background:rgba(3,10,20,0.72); backdrop-filter:blur(20px);
      }
      .dr-logo-full { display:flex; align-items:center; gap:12px; }
      .dr-logo-icon-wrap { position:relative; width:36px; height:36px; }
      .dr-logo-icon-halo {
        position:absolute; inset:-4px; border-radius:14px;
        background:radial-gradient(circle,rgba(84,199,248,0.18) 0%,transparent 70%);
        animation:dr-halo 3s ease-in-out infinite;
      }
      @keyframes dr-halo { 0%,100%{opacity:0.6;} 50%{opacity:1;} }
      .dr-logo-img-placeholder {
        width:36px; height:36px; border-radius:10px;
        background:linear-gradient(135deg,rgba(84,199,248,0.22),rgba(59,158,218,0.1));
        border:1px solid rgba(84,199,248,0.22);
        display:flex; align-items:center; justify-content:center;
        font-family:'Syne',sans-serif; font-size:17px; font-weight:800; color:var(--sky);
      }
      .dr-logo-img-clean {
        width:36px; height:36px; object-fit:contain;
        display:block; position:relative; z-index:1;
      }
      .dr-logo-text-group { display:flex; flex-direction:column; gap:2px; }
      .dr-logo-wordmark { font-family:'Syne',sans-serif; font-size:18px; font-weight:800; color:#f0f6ff; letter-spacing:-0.5px; }
      .dr-logo-wordmark em { font-style:normal; color:var(--sky); }
      .dr-logo-section-tag {
        display:flex; align-items:center; gap:5px;
        font-size:10px; font-weight:600; letter-spacing:1.8px; text-transform:uppercase;
        color:rgba(180,215,240,0.4);
      }
      .dr-section-dot { width:4px; height:4px; border-radius:50%; background:var(--sky); opacity:0.6; animation:dr-pulse 2s ease-in-out infinite; }
      @keyframes dr-pulse { 0%,100%{opacity:0.4;} 50%{opacity:1;} }

      .dr-header-right { display:flex; align-items:center; gap:12px; }

      /* Avatar del header */
      .dr-header-avatar {
        width:34px; height:34px; border-radius:50%; object-fit:cover;
        border:2px solid rgba(84,199,248,0.3);
        box-shadow:0 0 10px rgba(84,199,248,0.15);
      }

      .dr-role-badge {
        font-size:11px; font-weight:600; padding:5px 12px; border-radius:100px;
        border:1px solid rgba(84,199,248,0.2); color:rgba(180,215,240,0.6); background:rgba(84,199,248,0.05);
      }
      .dr-role-badge[data-role="streamer"] { border-color:rgba(251,191,36,0.35); color:#fbbf24; background:rgba(251,191,36,0.07); }
      .dr-role-badge[data-role="vip"]      { border-color:rgba(251,191,36,0.35); color:#fbbf24; background:rgba(251,191,36,0.07); }

      .dr-create-btn {
        display:flex; align-items:center; gap:7px; padding:9px 18px; border-radius:12px;
        border:1px solid rgba(84,199,248,0.35);
        background:linear-gradient(135deg,rgba(84,199,248,0.14),rgba(59,158,218,0.07));
        color:var(--sky); font-family:'Syne',sans-serif; font-size:13px; font-weight:700;
        cursor:pointer; transition:all 0.22s cubic-bezier(0.16,1,0.3,1); position:relative; overflow:hidden;
      }
      .dr-create-btn:hover {
        border-color:rgba(84,199,248,0.6);
        background:linear-gradient(135deg,rgba(84,199,248,0.22),rgba(59,158,218,0.12));
        box-shadow:0 0 24px rgba(84,199,248,0.2),0 4px 14px rgba(84,199,248,0.1); transform:translateY(-1px);
      }
      .dr-create-btn-locked { border-color:rgba(180,215,240,0.12)!important; background:rgba(180,215,240,0.03)!important; color:rgba(180,215,240,0.4)!important; }
      .dr-create-btn-locked:hover { border-color:rgba(251,191,36,0.3)!important; background:rgba(251,191,36,0.05)!important; color:rgba(251,191,36,0.7)!important; }
      .dr-create-btn-plus { font-size:16px; font-weight:400; }

      /* ── FILTROS ── */
      .dr-filters { position:relative; z-index:5; padding:14px 28px 8px; display:flex; flex-direction:column; gap:12px; border-bottom:1px solid rgba(84,199,248,0.05); }
      .dr-search-wrap { display:flex; align-items:center; gap:10px; background:rgba(84,199,248,0.03); border:1px solid rgba(84,199,248,0.09); border-radius:12px; padding:9px 14px; max-width:320px; }
      .dr-search-icon { color:rgba(180,215,240,0.3); flex-shrink:0; }
      .dr-search { background:transparent; border:none; outline:none; color:#e8f2ff; font-size:13px; font-family:'DM Sans',sans-serif; width:100%; }
      .dr-search::placeholder { color:rgba(180,215,240,0.22); }
      .dr-filter-tags { display:flex; flex-wrap:wrap; gap:7px; }
      .dr-filter-tag { font-size:12px; font-weight:500; padding:6px 14px; border-radius:100px; border:1px solid rgba(84,199,248,0.09); background:transparent; color:rgba(180,215,240,0.4); cursor:pointer; transition:all 0.16s; }
      .dr-filter-tag:hover { border-color:rgba(84,199,248,0.22); color:rgba(180,215,240,0.75); }
      .dr-filter-tag.active { border-color:rgba(84,199,248,0.5); background:rgba(84,199,248,0.09); color:var(--sky); }

      /* ── MAIN ── */
      .dr-main { flex:1; position:relative; z-index:2; padding:24px 28px 40px; }
      .dr-rooms-grid { display:grid; grid-template-columns:repeat(auto-fill,minmax(300px,1fr)); gap:18px; }

      /* ── ESTADOS ── */
      .dr-loading { display:flex; flex-direction:column; align-items:center; gap:16px; padding:80px 0; }
      .dr-spinner-wrap { position:relative; width:44px; height:44px; }
      .dr-spinner { width:44px; height:44px; border-radius:50%; border:2px solid rgba(84,199,248,0.12); border-top-color:var(--sky); animation:dr-spin 1s linear infinite; }
      .dr-spinner-inner { position:absolute; inset:6px; border-radius:50%; border:1.5px solid rgba(84,199,248,0.08); border-bottom-color:rgba(84,199,248,0.5); animation:dr-spin 1.5s linear infinite reverse; }
      @keyframes dr-spin { to{transform:rotate(360deg);} }
      .dr-empty { display:flex; flex-direction:column; align-items:center; gap:14px; padding:80px 0; text-align:center; position:relative; }
      .dr-empty-orb { position:absolute; width:300px; height:300px; border-radius:50%; background:radial-gradient(circle,rgba(84,199,248,0.06) 0%,transparent 70%); top:50%; left:50%; transform:translate(-50%,-50%); pointer-events:none; }
      .dr-empty-icon { font-size:48px; filter:grayscale(0.4); margin-bottom:6px; }
      .dr-empty-debates-img { width:96px; height:96px; object-fit:contain; filter:drop-shadow(0 0 18px rgba(84,199,248,0.35)); animation:dr-levitate 3.2s ease-in-out infinite; }
      @keyframes dr-levitate { 0%,100%{transform:translateY(0px);} 50%{transform:translateY(-10px);} }
      .dr-empty h3 { font-family:'Syne',sans-serif; font-size:20px; font-weight:700; color:#f0f6ff; }
      .dr-empty p { font-size:14px; color:rgba(180,215,240,0.45); max-width:280px; }
      .dr-empty-create-btn { margin-top:6px; padding:11px 24px; border-radius:13px; border:1px solid rgba(84,199,248,0.35); background:linear-gradient(135deg,rgba(84,199,248,0.14),rgba(59,158,218,0.07)); color:var(--sky); font-family:'Syne',sans-serif; font-size:13px; font-weight:700; cursor:pointer; transition:all 0.2s; }
      .dr-empty-create-btn:hover { border-color:rgba(84,199,248,0.6); transform:translateY(-1px); }

      /* ── CARDS ── */
      .dr-card { background:rgba(5,15,30,0.7); border:1px solid rgba(84,199,248,0.09); border-radius:18px; cursor:pointer; position:relative; overflow:hidden; transition:all 0.28s cubic-bezier(0.16,1,0.3,1); display:flex; flex-direction:column; animation:dr-fadein 0.4s ease both; }
      .dr-card:hover { border-color:rgba(84,199,248,0.26); transform:translateY(-3px); box-shadow:0 12px 40px rgba(84,199,248,0.1),0 4px 16px rgba(0,0,0,0.4); }
      .dr-card-orb { position:absolute; width:180px; height:180px; border-radius:50%; background:radial-gradient(circle,rgba(84,199,248,0.08) 0%,transparent 70%); top:-40px; right:-40px; pointer-events:none; }
      .dr-card-shimmer { position:absolute; inset:0; border-radius:18px; pointer-events:none; background:linear-gradient(135deg,rgba(255,255,255,0.03) 0%,transparent 50%); }
      .dr-card-body { padding:20px 20px 14px; flex:1; display:flex; flex-direction:column; gap:10px; }
      .dr-card-top { display:flex; align-items:center; justify-content:space-between; }
      .dr-live-pill { display:flex; align-items:center; gap:6px; background:rgba(248,113,113,0.12); border:1px solid rgba(248,113,113,0.22); border-radius:100px; padding:4px 10px; }
      .dr-live-dot { width:6px; height:6px; border-radius:50%; background:#f87171; animation:dr-pulse 1.5s ease-in-out infinite; }
      .dr-live-label { font-size:10px; font-weight:700; letter-spacing:1.2px; color:#fca5a5; }
      .dr-card-host-info { display:flex; flex-direction:column; align-items:flex-end; gap:3px; }
      .dr-card-role-badge { display:flex; align-items:center; gap:4px; font-size:9px; font-weight:700; letter-spacing:1.2px; color:rgba(251,191,36,0.75); }
      .dr-role-crown { font-size:11px; }
      .dr-card-host-name { font-size:11px; color:rgba(180,215,240,0.5); }
      .dr-card-title { font-family:'Syne',sans-serif; font-size:16px; font-weight:700; color:#f0f6ff; line-height:1.35; letter-spacing:-0.3px; }
      .dr-card-desc { font-size:12px; color:rgba(180,215,240,0.45); line-height:1.5; }
      .dr-card-tags { display:flex; flex-wrap:wrap; gap:5px; }
      .dr-tag { font-size:11px; font-weight:500; padding:4px 10px; border-radius:100px; border:1px solid rgba(84,199,248,0.12); background:rgba(84,199,248,0.04); color:rgba(180,215,240,0.5); transition:all 0.15s; }
      .dr-tag.selected { border-color:rgba(84,199,248,0.45); background:rgba(84,199,248,0.1); color:var(--sky); }
      .dr-card-footer { padding:14px 20px 18px; border-top:1px solid rgba(84,199,248,0.06); }
      .dr-capacity { display:flex; flex-direction:column; gap:7px; margin-bottom:14px; }
      .dr-capacity-header { display:flex; align-items:center; gap:6px; }
      .dr-capacity-icon { font-size:13px; }
      .dr-capacity-label { font-size:12px; color:rgba(180,215,240,0.5); }
      .dr-capacity-bar { height:4px; background:rgba(84,199,248,0.08); border-radius:2px; position:relative; overflow:hidden; }
      .dr-capacity-fill { height:100%; border-radius:2px; transition:width 0.5s; }
      .dr-capacity-glow { position:absolute; top:0; left:0; height:100%; border-radius:2px; background:linear-gradient(90deg,transparent,rgba(84,199,248,0.6),transparent); animation:dr-shimmer 2s linear infinite; }
      @keyframes dr-shimmer { 0%{transform:translateX(-100%);} 100%{transform:translateX(500%);} }
      .dr-join-btn { width:100%; display:flex; align-items:center; justify-content:center; gap:8px; padding:11px; border-radius:12px; border:1px solid rgba(84,199,248,0.28); background:linear-gradient(135deg,rgba(84,199,248,0.12),rgba(59,158,218,0.06)); color:var(--sky); font-family:'Syne',sans-serif; font-size:13px; font-weight:600; cursor:pointer; transition:all 0.2s; }
      .dr-join-btn:hover { border-color:rgba(84,199,248,0.55); background:rgba(84,199,248,0.18); }
      .dr-join-arrow { font-size:16px; transition:transform 0.2s; }
      .dr-join-btn:hover .dr-join-arrow { transform:translateX(4px); }
      .dr-banned-msg { font-size:12px; color:var(--danger); text-align:center; padding:8px 0; }

      /* ── ROOM VIEW ── */
      .dr-room-view { flex:1; display:flex; flex-direction:column; position:relative; z-index:2; overflow:hidden; min-height:0; max-height:100vh; }
      .dr-toasts-stack { position:fixed; top:20px; right:20px; z-index:9999; display:flex; flex-direction:column; gap:8px; }
      .dr-toast { padding:12px 18px; border-radius:12px; font-size:13px; backdrop-filter:blur(20px); animation:dr-fadein 0.3s ease; border:1px solid rgba(84,199,248,0.15); background:rgba(3,10,20,0.9); color:#e8f2ff; }
      .dr-toast-warn { border-color:rgba(251,191,36,0.35); color:#fde68a; }
      .dr-toast-error { border-color:rgba(248,113,113,0.35); color:#fca5a5; }

      .dr-room-header { display:flex; align-items:center; justify-content:space-between; padding:12px 20px; border-bottom:1px solid rgba(84,199,248,0.08); background:rgba(3,10,20,0.8); backdrop-filter:blur(20px); z-index:5; }
      .dr-room-meta { display:flex; align-items:center; gap:10px; flex:1; min-width:0; }
      .dr-room-logo-mini { width:28px; height:28px; border-radius:8px; flex-shrink:0; background:rgba(84,199,248,0.1); border:1px solid rgba(84,199,248,0.2); display:flex; align-items:center; justify-content:center; font-family:'Syne',sans-serif; font-size:13px; font-weight:800; color:var(--sky); }
      .dr-room-title-text { font-family:'Syne',sans-serif; font-size:14px; font-weight:700; color:#f0f6ff; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; max-width:260px; }
      .dr-room-tags { display:flex; gap:5px; flex-shrink:0; }
      .dr-room-header-right { display:flex; align-items:center; gap:10px; }
      .dr-room-count-pill { display:flex; align-items:center; gap:6px; padding:5px 12px; border-radius:100px; background:rgba(84,199,248,0.06); border:1px solid rgba(84,199,248,0.14); font-size:12px; color:rgba(180,215,240,0.6); }
      .dr-room-count-dot { width:6px; height:6px; border-radius:50%; background:#4ade80; animation:dr-pulse 1.5s infinite; }
      .dr-chat-toggle-btn { position:relative; background:rgba(84,199,248,0.06); border:1px solid rgba(84,199,248,0.12); border-radius:10px; width:36px; height:36px; cursor:pointer; display:flex; align-items:center; justify-content:center; font-size:16px; transition:all 0.18s; }
      .dr-chat-toggle-btn:hover { background:rgba(84,199,248,0.12); border-color:rgba(84,199,248,0.28); }
      .dr-chat-badge { position:absolute; top:-4px; right:-4px; background:#f87171; color:white; font-size:9px; font-weight:700; padding:1px 5px; border-radius:100px; }
      .dr-leave-btn { padding:8px 16px; border-radius:10px; cursor:pointer; border:1px solid rgba(248,113,113,0.25); background:rgba(248,113,113,0.07); color:#fca5a5; font-size:13px; font-weight:500; transition:all 0.18s; }
      .dr-leave-btn:hover { border-color:rgba(248,113,113,0.5); background:rgba(248,113,113,0.14); }

      .dr-room-body { flex:1; display:flex; overflow:hidden; position:relative; min-height:0; max-height:100%; }
      .dr-meet-grid { flex:1; display:grid; grid-template-columns:repeat(var(--grid-cols,2),1fr); gap:8px; padding:12px; overflow-y:auto; align-content:center; max-height:100%; }
      .dr-meet-grid.scrollable { overflow-y:auto; align-content:start; }
      .dr-pinned-layout { display:flex; flex:1; gap:8px; padding:12px; overflow:hidden; min-height:0; max-height:100%; }
      .dr-pinned-stage { flex:1; min-width:0; min-height:0; display:flex; align-items:center; justify-content:center; overflow:hidden; }
      .dr-pinned-stage .dr-tile { width:100%; max-width:100%; max-height:100%; aspect-ratio:16/9; }
      .dr-pinned-rail { width:180px; flex-shrink:0; display:flex; flex-direction:column; gap:8px; overflow-y:auto; }

      /* ── TILES ── */
      .dr-tile { position:relative; border-radius:14px; overflow:hidden; background:rgba(5,15,30,0.8); border:1px solid rgba(84,199,248,0.08); aspect-ratio:16/9; max-height:calc(100vh - 120px); }
      .dr-tile-pinned { border-color:rgba(84,199,248,0.3); box-shadow:0 0 20px rgba(84,199,248,0.12); }
      .dr-tile-self { border-color:rgba(74,222,128,0.25); }
      .dr-tile-video { width:100%; height:100%; object-fit:cover; }

      .dr-tile-avatar { position:absolute; inset:0; display:flex; align-items:center; justify-content:center; background:rgba(5,15,30,0.9); overflow:hidden; }
      /* Foto de perfil real en el tile */
      .dr-tile-avatar-img { width:80px; height:80px; border-radius:50%; object-fit:cover; border:2px solid rgba(84,199,248,0.3); box-shadow:0 0 20px rgba(84,199,248,0.15); }
      .dr-tile-avatar-ring { position:absolute; width:70px; height:70px; border-radius:50%; border:2px solid rgba(84,199,248,0.18); animation:dr-pulse 3s infinite; }
      .dr-tile-initials { font-family:'Syne',sans-serif; font-size:22px; font-weight:700; color:rgba(180,215,240,0.6); position:relative; z-index:1; }
      .dr-tile-blocked-badge { position:absolute; bottom:8px; right:8px; font-size:14px; background:rgba(248,113,113,0.2); border-radius:6px; padding:2px 4px; }

      .dr-tile-info { position:absolute; bottom:0; left:0; right:0; padding:8px 10px; background:linear-gradient(0deg,rgba(0,0,0,0.75) 0%,transparent 100%); display:flex; align-items:center; justify-content:space-between; }
      .dr-tile-info-left { display:flex; align-items:center; gap:5px; }
      /* Miniatura de avatar junto al nombre en la barra inferior */
      .dr-tile-name-avatar { width:18px; height:18px; border-radius:50%; object-fit:cover; border:1px solid rgba(84,199,248,0.3); flex-shrink:0; }
      .dr-host-badge { font-size:9px; font-weight:700; padding:2px 6px; border-radius:4px; background:rgba(251,191,36,0.2); color:#fbbf24; }
      .dr-streamer-badge { font-size:9px; font-weight:700; padding:2px 6px; border-radius:4px; background:rgba(84,199,248,0.2); color:var(--sky); }
      .dr-you-badge { font-size:9px; font-weight:700; padding:2px 6px; border-radius:4px; background:rgba(74,222,128,0.18); color:#4ade80; }
      .dr-tile-name { font-size:12px; font-weight:500; color:rgba(255,255,255,0.85); }
      .dr-tile-icons { display:flex; gap:5px; }
      .dr-icon-on { font-size:13px; opacity:0.9; }
      .dr-icon-off { font-size:13px; opacity:0.35; filter:grayscale(1); }

      .dr-pin-btn { position:absolute; top:8px; right:8px; background:rgba(0,0,0,0.5); border:none; border-radius:8px; padding:4px 6px; cursor:pointer; font-size:14px; opacity:0; transition:opacity 0.2s; }
      .dr-tile:hover .dr-pin-btn { opacity:1; }
      .dr-pin-btn.active { opacity:1; }

      .dr-menu-wrap { position:absolute; top:8px; left:8px; }
      .dr-menu-btn { background:rgba(0,0,0,0.5); border:none; border-radius:8px; padding:4px 8px; cursor:pointer; font-size:18px; color:rgba(255,255,255,0.7); opacity:0; transition:opacity 0.2s; }
      .dr-tile:hover .dr-menu-btn { opacity:1; }
      .dr-menu-dropdown { position:absolute; top:32px; left:0; z-index:100; background:rgba(5,12,26,0.97); border:1px solid rgba(84,199,248,0.15); border-radius:12px; padding:6px; min-width:180px; box-shadow:0 8px 32px rgba(0,0,0,0.5); backdrop-filter:blur(20px); }
      .dr-menu-dropdown button { display:flex; width:100%; align-items:center; gap:8px; padding:9px 12px; border-radius:8px; border:none; background:transparent; color:rgba(180,215,240,0.75); font-size:13px; cursor:pointer; transition:background 0.15s; }
      .dr-menu-dropdown button:hover { background:rgba(84,199,248,0.08); color:#e8f2ff; }
      .dr-menu-divider { height:1px; background:rgba(84,199,248,0.08); margin:4px 0; }
      .dr-menu-ban { color:#fca5a5!important; }
      .dr-menu-ban:hover { background:rgba(248,113,113,0.1)!important; }

      /* ── SELF PIP ── */
      .dr-self-pip { position:fixed; bottom:80px; right:16px; z-index:50; width:120px; background:rgba(5,15,30,0.9); border:1px solid rgba(84,199,248,0.2); border-radius:12px; overflow:hidden; box-shadow:0 4px 20px rgba(0,0,0,0.4); }
      .dr-self-pip-video { width:100%; aspect-ratio:4/3; object-fit:cover; display:block; }
      .dr-self-pip-avatar { width:100%; aspect-ratio:4/3; display:flex; align-items:center; justify-content:center; background:rgba(5,15,30,0.95); overflow:hidden; }
      .dr-self-pip-avatar-img { width:100%; height:100%; object-fit:cover; }
      .dr-self-pip-initials { font-family:'Syne',sans-serif; font-size:20px; font-weight:700; color:rgba(180,215,240,0.5); }
      .dr-self-pip-info { padding:5px 8px; display:flex; align-items:center; justify-content:space-between; }
      .dr-self-pip-name { font-size:10px; color:rgba(180,215,240,0.55); white-space:nowrap; overflow:hidden; text-overflow:ellipsis; max-width:70px; }
      .dr-self-pip-icons { display:flex; gap:3px; font-size:11px; }

      /* ── CONTROLS ── */
      .dr-controls { position:fixed; bottom:20px; left:50%; transform:translateX(-50%); z-index:50; display:flex; align-items:center; gap:10px; background:rgba(3,10,20,0.88); backdrop-filter:blur(24px); border:1px solid rgba(84,199,248,0.1); border-radius:18px; padding:10px 16px; box-shadow:0 8px 32px rgba(0,0,0,0.4); }
      .dr-ctrl-btn { width:44px; height:44px; border-radius:12px; border:1px solid rgba(84,199,248,0.15); background:rgba(84,199,248,0.06); font-size:20px; cursor:pointer; display:flex; align-items:center; justify-content:center; transition:all 0.18s; }
      .dr-ctrl-btn.active { border-color:rgba(74,222,128,0.35); background:rgba(74,222,128,0.08); }
      .dr-ctrl-btn.off { border-color:rgba(248,113,113,0.3); background:rgba(248,113,113,0.07); }
      .dr-ctrl-btn.neutral { border-color:rgba(84,199,248,0.15); }
      .dr-ctrl-btn:hover { transform:translateY(-2px); box-shadow:0 4px 12px rgba(0,0,0,0.3); }
      .dr-ctrl-host-badge { font-size:18px; padding:4px 8px; border-radius:10px; background:rgba(251,191,36,0.1); border:1px solid rgba(251,191,36,0.2); }
      .dr-ctrl-blocked-warn { font-size:16px; padding:4px 8px; border-radius:10px; background:rgba(248,113,113,0.1); border:1px solid rgba(248,113,113,0.2); animation:dr-pulse 2s infinite; }

      /* ── CHAT ── */
      .dr-chat { width:300px; flex-shrink:0; display:flex; flex-direction:column; border-left:1px solid rgba(84,199,248,0.08); background:rgba(3,10,20,0.85); backdrop-filter:blur(20px); }
      .dr-chat-header { display:flex; align-items:center; justify-content:space-between; padding:12px 16px; border-bottom:1px solid rgba(84,199,248,0.07); font-size:13px; font-weight:600; color:rgba(180,215,240,0.7); }
      .dr-chat-header-left { display:flex; align-items:center; gap:7px; }
      .dr-chat-dot { width:7px; height:7px; border-radius:50%; background:#4ade80; animation:dr-pulse 2s infinite; }
      .dr-chat-close { background:none; border:none; cursor:pointer; color:rgba(180,215,240,0.35); font-size:14px; padding:2px 6px; border-radius:6px; transition:all 0.15s; }
      .dr-chat-close:hover { color:rgba(180,215,240,0.8); background:rgba(84,199,248,0.08); }
      .dr-chat-messages { flex:1; overflow-y:auto; padding:12px; display:flex; flex-direction:column; gap:10px; }
      .dr-chat-empty { font-size:12px; color:rgba(180,215,240,0.25); text-align:center; padding:20px 0; }
      .dr-chat-msg { display:flex; flex-direction:column; gap:3px; }
      .dr-chat-msg.own { align-items:flex-end; }
      .dr-chat-author { font-size:10px; font-weight:600; color:rgba(180,215,240,0.4); }
      .dr-chat-text { font-size:13px; color:rgba(240,246,255,0.85); background:rgba(84,199,248,0.06); border:1px solid rgba(84,199,248,0.1); padding:7px 11px; border-radius:10px; max-width:220px; word-break:break-word; line-height:1.45; }
      .dr-chat-msg.own .dr-chat-text { background:rgba(84,199,248,0.1); border-color:rgba(84,199,248,0.2); }
      .dr-chat-input-row { display:flex; gap:8px; padding:10px 12px; border-top:1px solid rgba(84,199,248,0.07); }
      .dr-chat-input { flex:1; background:rgba(84,199,248,0.04); border:1px solid rgba(84,199,248,0.1); border-radius:10px; padding:8px 12px; color:#e8f2ff; font-size:13px; font-family:'DM Sans',sans-serif; outline:none; }
      .dr-chat-input:focus { border-color:rgba(84,199,248,0.3); }
      .dr-chat-send { width:34px; height:34px; border-radius:10px; border:1px solid rgba(84,199,248,0.25); background:rgba(84,199,248,0.1); color:var(--sky); cursor:pointer; font-size:16px; transition:all 0.15s; display:flex; align-items:center; justify-content:center; }
      .dr-chat-send:hover { background:rgba(84,199,248,0.2); border-color:rgba(84,199,248,0.45); }

      /* ── DESC BAR ── */
      .dr-room-desc-bar { display:flex; align-items:center; gap:8px; padding:8px 20px; border-top:1px solid rgba(84,199,248,0.06); font-size:12px; color:rgba(180,215,240,0.4); background:rgba(3,10,20,0.6); }

      /* ── CREATE ROOM MODAL ── */
      .crm-overlay { position:fixed; inset:0; z-index:200; background:rgba(0,0,0,0.65); backdrop-filter:blur(8px); display:flex; align-items:center; justify-content:center; padding:16px; animation:dr-fadein 0.2s ease; }
      .crm-sheet { width:100%; max-width:520px; border-radius:24px; background:rgba(4,12,24,0.98); border:1px solid rgba(84,199,248,0.12); box-shadow:0 24px 80px rgba(0,0,0,0.6); overflow:hidden; position:relative; animation:crm-up 0.3s cubic-bezier(0.16,1,0.3,1) both; }
      @keyframes crm-up { from{opacity:0;transform:translateY(20px) scale(0.97);} to{opacity:1;transform:none;} }
      .crm-beam { height:2px; background:linear-gradient(90deg,rgba(84,199,248,0.7),rgba(59,158,218,0.3),transparent); }
      .crm-beam-glow { height:1px; background:linear-gradient(90deg,rgba(84,199,248,0.15),transparent); }
      .crm-header { display:flex; align-items:center; justify-content:space-between; padding:20px 26px 18px; border-bottom:1px solid rgba(84,199,248,0.07); }
      .crm-header-left { display:flex; align-items:center; gap:14px; }
      .crm-crown-wrap { width:46px; height:46px; border-radius:13px; background:rgba(251,191,36,0.08); display:flex; align-items:center; justify-content:center; position:relative; }
      .crm-crown-ring { position:absolute; inset:0; border-radius:13px; background:linear-gradient(135deg,rgba(251,191,36,0.14),rgba(251,191,36,0.04)); border:1px solid rgba(251,191,36,0.28); box-shadow:0 0 16px rgba(251,191,36,0.12); }
      .crm-crown-icon { font-size:22px; position:relative; z-index:1; }
      .crm-eyebrow { font-size:10px; font-weight:600; letter-spacing:1.8px; text-transform:uppercase; color:rgba(251,191,36,0.65); margin-bottom:4px; }
      .crm-title { font-family:'Syne',sans-serif; font-size:22px; font-weight:800; letter-spacing:-0.5px; color:#f0f6ff; }
      .crm-close { width:34px; height:34px; border-radius:10px; border:1px solid rgba(84,199,248,0.1); background:rgba(84,199,248,0.04); color:rgba(180,215,240,0.35); display:flex; align-items:center; justify-content:center; cursor:pointer; transition:all 0.18s; }
      .crm-close:hover { border-color:rgba(84,199,248,0.25); color:rgba(180,215,240,0.9); }
      .crm-body { padding:22px 26px; display:flex; flex-direction:column; gap:20px; }
      .crm-field { display:flex; flex-direction:column; gap:8px; }
      .crm-label { font-size:10px; font-weight:700; letter-spacing:1.4px; text-transform:uppercase; color:rgba(180,215,240,0.45); display:flex; align-items:center; gap:6px; }
      .crm-required { color:rgba(84,199,248,0.7); font-size:13px; }
      .crm-hint { font-weight:400; letter-spacing:0; text-transform:none; font-size:11px; color:rgba(180,215,240,0.25); }
      .crm-input-wrap { position:relative; }
      .crm-input { width:100%; background:rgba(3,10,22,0.8); border:1px solid rgba(84,199,248,0.1); border-radius:13px; padding:12px 16px; color:#e8f2ff; font-size:14px; font-family:'DM Sans',sans-serif; outline:none; transition:border-color 0.2s; resize:none; }
      .crm-input::placeholder { color:rgba(180,215,240,0.18); }
      .crm-input:focus { border-color:rgba(84,199,248,0.38); box-shadow:0 0 0 3px rgba(84,199,248,0.07); }
      .crm-textarea { min-height:80px; }
      .crm-char-count { position:absolute; bottom:10px; right:13px; font-size:10px; color:rgba(180,215,240,0.18); pointer-events:none; }
      .crm-char-count-ta { bottom:10px; }
      .crm-tags-grid { display:flex; flex-wrap:wrap; gap:7px; }
      .crm-tag { display:flex; align-items:center; gap:5px; font-size:12px; font-weight:500; padding:7px 14px; border-radius:100px; border:1px solid rgba(84,199,248,0.09); background:rgba(84,199,248,0.03); color:rgba(180,215,240,0.45); cursor:pointer; transition:all 0.18s; white-space:nowrap; }
      .crm-tag:hover { border-color:rgba(84,199,248,0.22); color:rgba(180,215,240,0.82); }
      .crm-tag-on { border-color:rgba(84,199,248,0.5)!important; background:rgba(84,199,248,0.11)!important; color:#54c7f8!important; }
      .crm-tag-check { font-size:10px; font-weight:800; color:var(--sky); }
      .crm-capacity-row { display:flex; align-items:center; gap:14px; flex-wrap:wrap; }
      .crm-number-wrap { display:flex; align-items:center; background:rgba(3,10,22,0.8); border:1px solid rgba(84,199,248,0.1); border-radius:13px; overflow:hidden; }
      .crm-num-btn { width:42px; height:46px; background:rgba(84,199,248,0.04); border:none; color:rgba(180,215,240,0.45); font-size:18px; cursor:pointer; display:flex; align-items:center; justify-content:center; transition:all 0.15s; }
      .crm-num-btn:hover { background:rgba(84,199,248,0.1); color:var(--sky); }
      .crm-number-input { width:74px; height:46px; background:transparent; border:none; border-left:1px solid rgba(84,199,248,0.08); border-right:1px solid rgba(84,199,248,0.08); color:#e8f2ff; font-family:'Syne',sans-serif; font-size:17px; font-weight:700; text-align:center; outline:none; -moz-appearance:textfield; }
      .crm-number-input::-webkit-outer-spin-button,.crm-number-input::-webkit-inner-spin-button { -webkit-appearance:none; }
      .crm-capacity-presets { display:flex; gap:6px; flex-wrap:wrap; }
      .crm-preset { font-size:12px; font-weight:500; padding:6px 14px; border-radius:100px; border:1px solid rgba(84,199,248,0.09); background:rgba(84,199,248,0.02); color:rgba(180,215,240,0.4); cursor:pointer; transition:all 0.15s; }
      .crm-preset:hover { border-color:rgba(84,199,248,0.2); color:rgba(180,215,240,0.75); }
      .crm-preset-on { border-color:rgba(84,199,248,0.5)!important; background:rgba(84,199,248,0.1)!important; color:var(--sky)!important; }
      .crm-capacity-note { font-size:11px; color:rgba(180,215,240,0.28); margin-top:4px; }
      .crm-error { display:flex; align-items:center; gap:9px; font-size:12px; color:var(--danger); background:rgba(248,113,113,0.05); border:1px solid rgba(248,113,113,0.18); border-radius:12px; padding:11px 15px; }
      .crm-footer { display:flex; justify-content:flex-end; gap:10px; padding:14px 26px 24px; border-top:1px solid rgba(84,199,248,0.07); }
      .crm-btn-cancel { padding:12px 24px; border-radius:13px; border:1px solid rgba(84,199,248,0.1); background:transparent; color:rgba(180,215,240,0.38); font-size:13px; cursor:pointer; transition:all 0.18s; font-family:'DM Sans',sans-serif; }
      .crm-btn-cancel:hover { border-color:rgba(84,199,248,0.22); color:rgba(180,215,240,0.75); }
      .crm-btn-create { display:flex; align-items:center; gap:8px; padding:12px 26px; border-radius:13px; border:1px solid rgba(84,199,248,0.38); background:linear-gradient(135deg,rgba(84,199,248,0.16),rgba(59,158,218,0.08)); color:var(--sky); font-family:'Syne',sans-serif; font-size:13px; font-weight:700; cursor:pointer; transition:all 0.22s; position:relative; overflow:hidden; }
      .crm-btn-create:hover:not(:disabled) { border-color:rgba(84,199,248,0.65); box-shadow:0 0 28px rgba(84,199,248,0.22); transform:translateY(-1px); }
      .crm-btn-create:disabled { opacity:0.42; cursor:not-allowed; }
      .crm-arrow { font-size:16px; transition:transform 0.22s; }
      .crm-btn-create:hover .crm-arrow { transform:translateX(4px); }
      .crm-loading-dots { display:flex; gap:4px; align-items:center; }
      .crm-loading-dots span { width:5px; height:5px; border-radius:50%; background:var(--sky); animation:crm-dot 1.2s ease-in-out infinite; }
      .crm-loading-dots span:nth-child(2){animation-delay:0.2s;}
      .crm-loading-dots span:nth-child(3){animation-delay:0.4s;}
      @keyframes crm-dot { 0%,80%,100%{opacity:0.25;transform:scale(0.8);} 40%{opacity:1;transform:scale(1);} }

      /* ── LOCKED MODAL ── */
      .crm-locked-badges { display:flex; gap:10px; margin-top:4px; }
      .crm-locked-badge { padding:7px 18px; border-radius:100px; font-size:13px; font-weight:600; }
      .crm-locked-vip { background:rgba(251,191,36,0.1); border:1px solid rgba(251,191,36,0.3); color:#fbbf24; }
      .crm-locked-streamer { background:rgba(84,199,248,0.08); border:1px solid rgba(84,199,248,0.25); color:var(--sky); }

      /* ── Scrollbars ── */
      ::-webkit-scrollbar { width:3px; height:3px; }
      ::-webkit-scrollbar-track { background:transparent; }
      ::-webkit-scrollbar-thumb { background:rgba(84,199,248,0.18); border-radius:2px; }

      @keyframes dr-fadein { from{opacity:0;} to{opacity:1;} }

      @media (max-width:900px) { .dr-header{padding:12px 18px;} .dr-filters{padding:12px 18px 6px;} .dr-main{padding:12px 18px 30px;} }
      @media (max-width:560px) { .dr-logo-wordmark{font-size:16px;} .dr-logo-section-tag{display:none;} .dr-create-btn{padding:8px 14px;font-size:12px;} .crm-sheet{border-radius:20px;} .crm-header{padding:14px 20px 16px;} .crm-body{padding:18px 20px;} .crm-footer{padding:12px 20px 20px;} }
    `}</style>
  );
}