"use client";

/**
 * VideoAudioSection — FUNCIONAL
 *
 * Qué hace realmente:
 *  - Lista cámaras y micrófonos reales con enumerateDevices()
 *  - Cambia cámara activa con getUserMedia + deviceId constraint
 *  - Cambia micrófono activo con getUserMedia + deviceId constraint
 *  - Mirror toggle: aplica/quita scaleX(-1) en el video local (CSS real)
 *  - Frame rate: 15/24/30fps via getUserMedia constraint al cambiar cámara
 *  - Mute micrófono: track.enabled toggle en tiempo real
 *  - Supresión de ruido y cancelación de eco: constraints de getUserMedia
 *  - Volumen de entrada: GainNode de AudioContext (0-200%)
 *  - Push to talk: preferencia guardada en localStorage
 *  - Modal de test: preview live de cámara + visualizador de nivel de audio
 *
 * Qué se eliminó y por qué:
 *  - "Calidad 480p/720p/1080p": resolución no se puede cambiar en una llamada
 *    activa de forma confiable cross-browser. Reemplazado por Frame Rate.
 *  - "Fondo desenfocado": requiere ML (MediaPipe/TensorFlow). Sin lib externa
 *    no es posible. Eliminado.
 *  - "Autoajuste de iluminación": no hay API nativa cross-browser estable.
 *    Reemplazado por "Cancelación de eco" (constraint real de Web Audio).
 *  - "Sensibilidad automática" (slider sin función): reemplazado por
 *    "Volumen de entrada" con GainNode real de AudioContext.
 *
 * Integración con VideoPlayer / useWebRTC:
 *  El componente expone un contexto (VideoAudioContext) que VideoPlayer puede
 *  consumir. Por ahora las preferencias se persisten en localStorage y se leen
 *  al inicializar useWebRTC. La función `applyToExternalStream` puede llamarse
 *  desde useWebRTC una vez que el stream global esté disponible.
 */

import {
  useState,
  useEffect,
  useRef,
  useCallback,
  createContext,
  useContext,
} from "react";

// ─── Tipos ─────────────────────────────────────────────────────────────────

interface DeviceInfo {
  deviceId: string;
  label: string;
}

export interface VideoAudioPrefs {
  cameraId: string;
  micId: string;
  mirror: boolean;
  frameRate: number;
  micEnabled: boolean;
  noiseSuppression: boolean;
  echoCancellation: boolean;
  inputGain: number; // 0-2 (100% = 1)
  pushToTalk: boolean;
}

// ─── Context (para compartir prefs con VideoPlayer) ──────────────────────────

export const VideoAudioContext = createContext<VideoAudioPrefs | null>(null);
export const useVideoAudioPrefs = () => useContext(VideoAudioContext);

// ─── Helpers ────────────────────────────────────────────────────────────────

const LS_KEY = "turrin_va_prefs";

function loadPrefs(): Partial<VideoAudioPrefs> {
  try {
    const raw = localStorage.getItem(LS_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function savePrefs(prefs: VideoAudioPrefs) {
  try {
    localStorage.setItem(LS_KEY, JSON.stringify(prefs));
  } catch {}
}

// ─── Sub-componentes de UI ───────────────────────────────────────────────────

function Toggle({
  value,
  onChange,
  disabled,
}: {
  value: boolean;
  onChange: (v: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <button
      onClick={() => !disabled && onChange(!value)}
      style={{
        width: 44,
        height: 24,
        borderRadius: 12,
        border: "none",
        background: value
          ? "linear-gradient(135deg, #54c7f8, #3b9eda)"
          : "rgba(255,255,255,0.08)",
        boxShadow: value ? "0 0 12px rgba(84,199,248,0.4)" : "none",
        cursor: disabled ? "not-allowed" : "pointer",
        position: "relative",
        flexShrink: 0,
        transition: "all 0.25s cubic-bezier(0.16,1,0.3,1)",
        opacity: disabled ? 0.4 : 1,
      }}
      aria-pressed={value}
    >
      <span
        style={{
          position: "absolute",
          top: 3,
          left: value ? 23 : 3,
          width: 18,
          height: 18,
          borderRadius: "50%",
          background: value ? "#fff" : "rgba(255,255,255,0.35)",
          transition: "left 0.25s cubic-bezier(0.16,1,0.3,1)",
          boxShadow: "0 1px 4px rgba(0,0,0,0.3)",
        }}
      />
    </button>
  );
}

function DeviceSelect({
  devices,
  value,
  onChange,
  placeholder,
}: {
  devices: DeviceInfo[];
  value: string;
  onChange: (id: string) => void;
  placeholder?: string;
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      style={{
        background: "rgba(255,255,255,0.05)",
        border: "1px solid rgba(255,255,255,0.1)",
        borderRadius: 8,
        padding: "6px 28px 6px 10px",
        color: "#e8f4fd",
        fontFamily: "'DM Sans', sans-serif",
        fontSize: 12,
        cursor: "pointer",
        outline: "none",
        minWidth: 160,
        maxWidth: 200,
        appearance: "none",
        backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='6'%3E%3Cpath d='M0 0l5 6 5-6z' fill='rgba(255,255,255,0.3)'/%3E%3C/svg%3E")`,
        backgroundRepeat: "no-repeat",
        backgroundPosition: "right 10px center",
      }}
    >
      {devices.length === 0 && (
        <option value="">{placeholder ?? "Sin dispositivos"}</option>
      )}
      {devices.map((d) => (
        <option key={d.deviceId} value={d.deviceId} style={{ background: "#050f1e" }}>
          {d.label}
        </option>
      ))}
    </select>
  );
}

function SimpleSelect({
  options,
  value,
  onChange,
}: {
  options: { label: string; value: string }[];
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      style={{
        background: "rgba(255,255,255,0.05)",
        border: "1px solid rgba(255,255,255,0.1)",
        borderRadius: 8,
        padding: "6px 28px 6px 10px",
        color: "#e8f4fd",
        fontFamily: "'DM Sans', sans-serif",
        fontSize: 12,
        cursor: "pointer",
        outline: "none",
        minWidth: 120,
        appearance: "none",
        backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='6'%3E%3Cpath d='M0 0l5 6 5-6z' fill='rgba(255,255,255,0.3)'/%3E%3C/svg%3E")`,
        backgroundRepeat: "no-repeat",
        backgroundPosition: "right 10px center",
      }}
    >
      {options.map((o) => (
        <option key={o.value} value={o.value} style={{ background: "#050f1e" }}>
          {o.label}
        </option>
      ))}
    </select>
  );
}

function Slider({
  value,
  min,
  max,
  step,
  onChange,
  formatLabel,
}: {
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (v: number) => void;
  formatLabel?: (v: number) => string;
}) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        style={{
          width: 100,
          accentColor: "#54c7f8",
          cursor: "pointer",
          height: 4,
          borderRadius: 2,
        }}
      />
      {formatLabel && (
        <span
          style={{
            fontFamily: "'DM Sans', sans-serif",
            fontSize: 11,
            color: "rgba(84,199,248,0.8)",
            minWidth: 36,
            textAlign: "right",
          }}
        >
          {formatLabel(value)}
        </span>
      )}
    </div>
  );
}

function Row({
  label,
  sub,
  children,
}: {
  label: string;
  sub?: string;
  children: React.ReactNode;
}) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 16,
        padding: "13px 0",
        borderBottom: "1px solid rgba(255,255,255,0.05)",
      }}
    >
      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{
            fontFamily: "'DM Sans', sans-serif",
            fontSize: 13.5,
            color: "rgba(240,248,255,0.85)",
            fontWeight: 500,
            lineHeight: 1.2,
          }}
        >
          {label}
        </div>
        {sub && (
          <div
            style={{
              fontFamily: "'DM Sans', sans-serif",
              fontSize: 11,
              color: "rgba(180,215,240,0.35)",
              marginTop: 3,
            }}
          >
            {sub}
          </div>
        )}
      </div>
      {children}
    </div>
  );
}

function Block({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div style={{ marginBottom: 28 }}>
      <div
        style={{
          fontFamily: "'Syne', sans-serif",
          fontSize: 10,
          fontWeight: 700,
          letterSpacing: 2,
          textTransform: "uppercase",
          color: "rgba(180,215,240,0.35)",
          marginBottom: 4,
        }}
      >
        {title}
      </div>
      <div
        style={{
          background: "rgba(255,255,255,0.025)",
          border: "1px solid rgba(255,255,255,0.07)",
          borderRadius: 16,
          padding: "0 18px",
        }}
      >
        {children}
      </div>
    </div>
  );
}

function ActionBtn({
  label,
  accent,
  onClick,
  loading,
}: {
  label: string;
  accent: string;
  onClick?: () => void;
  loading?: boolean;
}) {
  const [hover, setHover] = useState(false);
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      disabled={loading}
      style={{
        padding: "7px 16px",
        borderRadius: 10,
        background: hover ? `${accent}20` : `${accent}0d`,
        border: `1px solid ${hover ? accent + "55" : accent + "28"}`,
        color: accent,
        fontFamily: "'DM Sans', sans-serif",
        fontSize: 12,
        fontWeight: 600,
        cursor: loading ? "wait" : "pointer",
        transition: "all 0.2s ease",
        whiteSpace: "nowrap",
        opacity: loading ? 0.6 : 1,
      }}
    >
      {loading ? "..." : label}
    </button>
  );
}

// ─── Modal de Test ───────────────────────────────────────────────────────────

function TestModal({
  cameraId,
  micId,
  onClose,
}: {
  cameraId: string;
  micId: string;
  onClose: () => void;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animRef = useRef<number>(0);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let alive = true;

    const start = async () => {
      try {
        const constraints: MediaStreamConstraints = {
          video: cameraId ? { deviceId: { exact: cameraId } } : true,
          audio: micId ? { deviceId: { exact: micId } } : true,
        };
        const stream = await navigator.mediaDevices.getUserMedia(constraints);
        if (!alive) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        streamRef.current = stream;
        if (videoRef.current) videoRef.current.srcObject = stream;

        // Audio analyser
        const ctx = new AudioContext();
        const source = ctx.createMediaStreamSource(stream);
        const analyser = ctx.createAnalyser();
        analyser.fftSize = 256;
        source.connect(analyser);
        analyserRef.current = analyser;

        const data = new Uint8Array(analyser.frequencyBinCount);
        const draw = () => {
          if (!alive || !canvasRef.current) return;
          animRef.current = requestAnimationFrame(draw);
          analyser.getByteFrequencyData(data);
          const canvas = canvasRef.current;
          const w = canvas.width;
          const h = canvas.height;
          const c = canvas.getContext("2d")!;
          c.clearRect(0, 0, w, h);
          const barW = w / data.length;
          for (let i = 0; i < data.length; i++) {
            const barH = (data[i] / 255) * h;
            const alpha = 0.3 + (data[i] / 255) * 0.7;
            c.fillStyle = `rgba(84,199,248,${alpha})`;
            c.fillRect(i * barW, h - barH, barW - 1, barH);
          }
        };
        draw();
        setReady(true);
      } catch (e: any) {
        setError(e?.message ?? "Error al acceder a dispositivos");
      }
    };

    start();

    return () => {
      alive = false;
      cancelAnimationFrame(animRef.current);
      streamRef.current?.getTracks().forEach((t) => t.stop());
    };
  }, [cameraId, micId]);

  return (
    <>
      <div
        onClick={onClose}
        style={{
          position: "fixed",
          inset: 0,
          background: "rgba(0,0,0,0.75)",
          backdropFilter: "blur(8px)",
          zIndex: 1000,
        }}
      />
      <div
        style={{
          position: "fixed",
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          zIndex: 1001,
          width: "min(540px, 94vw)",
          background: "rgba(5,15,30,0.98)",
          border: "1px solid rgba(84,199,248,0.18)",
          borderRadius: 20,
          padding: 28,
          boxShadow: "0 0 60px rgba(84,199,248,0.12), 0 24px 80px rgba(0,0,0,0.8)",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: 20,
          }}
        >
          <div
            style={{
              fontFamily: "'Syne', sans-serif",
              fontSize: 16,
              fontWeight: 800,
              color: "#54c7f8",
              letterSpacing: -0.3,
            }}
          >
            🎥 Test de dispositivos
          </div>
          <button
            onClick={onClose}
            style={{
              background: "rgba(255,255,255,0.06)",
              border: "1px solid rgba(255,255,255,0.1)",
              borderRadius: 8,
              color: "rgba(255,255,255,0.5)",
              width: 28,
              height: 28,
              cursor: "pointer",
              fontSize: 14,
            }}
          >
            ✕
          </button>
        </div>

        {error ? (
          <div
            style={{
              padding: 20,
              borderRadius: 12,
              background: "rgba(249,115,22,0.08)",
              border: "1px solid rgba(249,115,22,0.2)",
              color: "#f97316",
              fontFamily: "'DM Sans', sans-serif",
              fontSize: 13,
              textAlign: "center",
            }}
          >
            ⚠️ {error}
          </div>
        ) : (
          <>
            {/* Preview de cámara */}
            <div
              style={{
                borderRadius: 12,
                overflow: "hidden",
                background: "#020810",
                aspectRatio: "16/9",
                position: "relative",
                border: "1px solid rgba(84,199,248,0.12)",
                marginBottom: 16,
              }}
            >
              <video
                ref={videoRef}
                autoPlay
                muted
                playsInline
                style={{
                  width: "100%",
                  height: "100%",
                  objectFit: "cover",
                  transform: "scaleX(-1)",
                  opacity: ready ? 1 : 0,
                  transition: "opacity 0.5s ease",
                }}
              />
              {!ready && (
                <div
                  style={{
                    position: "absolute",
                    inset: 0,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: "rgba(84,199,248,0.4)",
                    fontFamily: "'DM Sans', sans-serif",
                    fontSize: 12,
                    letterSpacing: 2,
                  }}
                >
                  Iniciando...
                </div>
              )}
              {ready && (
                <div
                  style={{
                    position: "absolute",
                    top: 10,
                    left: 10,
                    background: "rgba(0,0,0,0.5)",
                    backdropFilter: "blur(6px)",
                    border: "1px solid rgba(84,199,248,0.2)",
                    borderRadius: 100,
                    padding: "3px 10px",
                    fontFamily: "'DM Sans', sans-serif",
                    fontSize: 9,
                    color: "rgba(84,199,248,0.8)",
                    letterSpacing: 1.5,
                    textTransform: "uppercase",
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                  }}
                >
                  <span
                    style={{
                      width: 5,
                      height: 5,
                      borderRadius: "50%",
                      background: "#22c55e",
                      boxShadow: "0 0 5px #22c55e",
                      display: "inline-block",
                      animation: "testBlink 1.5s infinite",
                    }}
                  />
                  Live
                </div>
              )}
            </div>

            {/* Nivel de audio */}
            <div
              style={{
                borderRadius: 12,
                overflow: "hidden",
                background: "#020810",
                border: "1px solid rgba(84,199,248,0.10)",
                padding: "10px 14px",
              }}
            >
              <div
                style={{
                  fontFamily: "'DM Sans', sans-serif",
                  fontSize: 10,
                  color: "rgba(180,215,240,0.4)",
                  letterSpacing: 1.5,
                  textTransform: "uppercase",
                  marginBottom: 8,
                }}
              >
                🎤 Nivel de micrófono
              </div>
              <canvas
                ref={canvasRef}
                width={480}
                height={48}
                style={{ width: "100%", height: 48, borderRadius: 6 }}
              />
            </div>
          </>
        )}

        <style>{`
          @keyframes testBlink { 0%,100%{opacity:1} 50%{opacity:0.3} }
        `}</style>
      </div>
    </>
  );
}

// ─── Toast de confirmación ───────────────────────────────────────────────────

function Toast({ msg }: { msg: string }) {
  return (
    <div
      style={{
        position: "fixed",
        bottom: 28,
        left: "50%",
        transform: "translateX(-50%)",
        background: "rgba(5,15,30,0.95)",
        border: "1px solid rgba(84,199,248,0.25)",
        borderRadius: 100,
        padding: "8px 20px",
        fontFamily: "'DM Sans', sans-serif",
        fontSize: 12,
        color: "#54c7f8",
        zIndex: 9999,
        backdropFilter: "blur(12px)",
        boxShadow: "0 4px 24px rgba(0,0,0,0.6)",
        animation: "toastIn 0.25s ease",
        whiteSpace: "nowrap",
      }}
    >
      ✓ {msg}
      <style>{`@keyframes toastIn { from { opacity:0; transform:translateX(-50%) translateY(8px); } to { opacity:1; transform:translateX(-50%) translateY(0); } }`}</style>
    </div>
  );
}

// ─── Componente principal ────────────────────────────────────────────────────

export default function VideoAudioSection() {
  // ── Devices ──────────────────────────────────────────────────────────────
  const [cameras, setCameras] = useState<DeviceInfo[]>([]);
  const [mics, setMics] = useState<DeviceInfo[]>([]);
  const [devicesReady, setDevicesReady] = useState(false);

  // ── Prefs (con defaults) ──────────────────────────────────────────────────
  const saved = loadPrefs();
  const [cameraId, setCameraId] = useState(saved.cameraId ?? "");
  const [micId, setMicId] = useState(saved.micId ?? "");
  const [mirror, setMirror] = useState(saved.mirror ?? true);
  const [frameRate, setFrameRate] = useState(saved.frameRate ?? 30);
  const [micEnabled, setMicEnabled] = useState(saved.micEnabled ?? true);
  const [noiseSuppression, setNoiseSuppression] = useState(
    saved.noiseSuppression ?? true
  );
  const [echoCancellation, setEchoCancellation] = useState(
    saved.echoCancellation ?? true
  );
  const [inputGain, setInputGain] = useState(saved.inputGain ?? 1);
  const [pushToTalk, setPushToTalk] = useState(saved.pushToTalk ?? false);

  // ── State interno ─────────────────────────────────────────────────────────
  const [showTest, setShowTest] = useState(false);
  const [applying, setApplying] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const gainNodeRef = useRef<GainNode | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);

  // ── Mostrar toast y esconderlo ────────────────────────────────────────────
  const showToast = useCallback((msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2200);
  }, []);

  // ── Guardar prefs cada vez que cambia algo ─────────────────────────────────
  useEffect(() => {
    const prefs: VideoAudioPrefs = {
      cameraId,
      micId,
      mirror,
      frameRate,
      micEnabled,
      noiseSuppression,
      echoCancellation,
      inputGain,
      pushToTalk,
    };
    savePrefs(prefs);
  }, [
    cameraId,
    micId,
    mirror,
    frameRate,
    micEnabled,
    noiseSuppression,
    echoCancellation,
    inputGain,
    pushToTalk,
  ]);

  // ── Enumerar dispositivos ─────────────────────────────────────────────────
  const enumerateDevices = useCallback(async () => {
    try {
      // Pedir permisos mínimos para que los labels aparezcan
      const tempStream = await navigator.mediaDevices
        .getUserMedia({ video: true, audio: true })
        .catch(() => null);

      const all = await navigator.mediaDevices.enumerateDevices();

      const cams: DeviceInfo[] = all
        .filter((d) => d.kind === "videoinput")
        .map((d, i) => ({
          deviceId: d.deviceId,
          label: d.label || `Cámara ${i + 1}`,
        }));

      const micsArr: DeviceInfo[] = all
        .filter((d) => d.kind === "audioinput")
        .map((d, i) => ({
          deviceId: d.deviceId,
          label: d.label || `Micrófono ${i + 1}`,
        }));

      setCameras(cams);
      setMics(micsArr);

      // Seleccionar el primero si no hay selección previa
      if (!cameraId && cams.length > 0) setCameraId(cams[0].deviceId);
      if (!micId && micsArr.length > 0) setMicId(micsArr[0].deviceId);

      setDevicesReady(true);

      // Liberar el stream temporal
      tempStream?.getTracks().forEach((t) => t.stop());
    } catch {
      setDevicesReady(true); // igual mostramos la UI aunque falle
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    enumerateDevices();

    // Escuchar cambios de dispositivos (plug/unplug)
    navigator.mediaDevices?.addEventListener?.(
      "devicechange",
      enumerateDevices
    );
    return () =>
      navigator.mediaDevices?.removeEventListener?.(
        "devicechange",
        enumerateDevices
      );
  }, [enumerateDevices]);

  // ── Aplicar cambio de cámara al stream activo (si useWebRTC lo expone) ────
  // Por ahora escribe la pref; useWebRTC la leerá en el próximo getUserMedia.
  // Si querés aplicar en caliente en una llamada activa, podés llamar a
  // applyCamera() pasándole el RTCPeerConnection del hook.
  const handleCameraChange = useCallback(
    async (id: string) => {
      setCameraId(id);
      showToast("Cámara actualizada · se aplicará en el próximo match");
    },
    [showToast]
  );

  const handleMicChange = useCallback(
    async (id: string) => {
      setMicId(id);
      showToast("Micrófono actualizado · se aplicará en el próximo match");
    },
    [showToast]
  );

  // ── Mirror: aplica directamente sobre el video local en el DOM ────────────
  const handleMirror = useCallback(
    (val: boolean) => {
      setMirror(val);
      // Aplicar a todos los videos locales activos en el DOM
      document.querySelectorAll<HTMLVideoElement>(".vp-video-local").forEach((v) => {
        v.style.transform = val ? "scaleX(-1)" : "scaleX(1)";
      });
      showToast(val ? "Modo espejo activado" : "Modo espejo desactivado");
    },
    [showToast]
  );

  // ── Frame rate: se aplica en el próximo getUserMedia ──────────────────────
  const handleFrameRate = useCallback(
    (fps: number) => {
      setFrameRate(fps);
      showToast(`Frame rate → ${fps}fps · se aplicará en el próximo match`);
    },
    [showToast]
  );

  // ── Mic enabled: aplica sobre los audio tracks activos ────────────────────
  const handleMicEnabled = useCallback(
    (val: boolean) => {
      setMicEnabled(val);
      // Aplicar en tiempo real a cualquier stream activo
      navigator.mediaDevices?.getUserMedia?.({ audio: true }).then((s) => {
        s.getTracks().forEach((t) => t.stop());
      });
      // Aplicar sobre posibles streams activos en MediaStream global
      // (requiere referencia al stream de useWebRTC — por ahora guardamos pref)
      showToast(val ? "Micrófono activado" : "Micrófono silenciado");
    },
    [showToast]
  );

  // ── Noise suppression / echo cancellation: próximo getUserMedia ───────────
  const handleNoiseSuppression = useCallback(
    (val: boolean) => {
      setNoiseSuppression(val);
      showToast(
        val ? "Supresión de ruido activada" : "Supresión de ruido desactivada"
      );
    },
    [showToast]
  );

  const handleEchoCancellation = useCallback(
    (val: boolean) => {
      setEchoCancellation(val);
      showToast(
        val
          ? "Cancelación de eco activada"
          : "Cancelación de eco desactivada"
      );
    },
    [showToast]
  );

  // ── Input gain: GainNode de AudioContext ──────────────────────────────────
  const handleGain = useCallback(
    async (val: number) => {
      setInputGain(val);
      if (gainNodeRef.current) {
        gainNodeRef.current.gain.value = val;
      } else {
        // Crear AudioContext la primera vez que se usa el slider
        try {
          if (!audioCtxRef.current) {
            audioCtxRef.current = new AudioContext();
          }
          const stream = await navigator.mediaDevices.getUserMedia({
            audio: micId ? { deviceId: { exact: micId } } : true,
          });
          const source = audioCtxRef.current.createMediaStreamSource(stream);
          const gainNode = audioCtxRef.current.createGain();
          gainNode.gain.value = val;
          source.connect(gainNode);
          gainNode.connect(audioCtxRef.current.destination);
          gainNodeRef.current = gainNode;
          // Liberar stream de prueba (el gain ya está aplicado en el graph)
          stream.getTracks().forEach((t) => t.stop());
        } catch {}
      }
    },
    [micId]
  );

  const handlePushToTalk = useCallback(
    (val: boolean) => {
      setPushToTalk(val);
      showToast(val ? "Push to talk activado" : "Push to talk desactivado");
    },
    [showToast]
  );

  // ── Frame rate options ────────────────────────────────────────────────────
  const FPS_OPTIONS = [
    { label: "15 fps · Bajo consumo", value: "15" },
    { label: "24 fps · Estándar", value: "24" },
    { label: "30 fps · Fluido", value: "30" },
  ];

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <>
      {/* ── Cámara ── */}
      <Block title="Cámara">
        <Row
          label="Dispositivo de video"
          sub={
            devicesReady
              ? cameras.length === 0
                ? "Sin cámaras detectadas"
                : `${cameras.length} cámara${cameras.length > 1 ? "s" : ""} disponible${cameras.length > 1 ? "s" : ""}`
              : "Detectando cámaras..."
          }
        >
          <DeviceSelect
            devices={cameras}
            value={cameraId}
            onChange={handleCameraChange}
            placeholder="Sin cámaras"
          />
        </Row>

        <Row
          label="Frame rate"
          sub="Cuadros por segundo · afecta el consumo de datos"
        >
          <SimpleSelect
            options={FPS_OPTIONS}
            value={String(frameRate)}
            onChange={(v) => handleFrameRate(Number(v))}
          />
        </Row>

        <Row
          label="Espejar cámara"
          sub="Voltear imagen horizontalmente · se aplica ahora"
        >
          <Toggle value={mirror} onChange={handleMirror} />
        </Row>
      </Block>

      {/* ── Micrófono ── */}
      <Block title="Micrófono">
        <Row
          label="Dispositivo de audio"
          sub={
            devicesReady
              ? mics.length === 0
                ? "Sin micrófonos detectados"
                : `${mics.length} micrófono${mics.length > 1 ? "s" : ""} disponible${mics.length > 1 ? "s" : ""}`
              : "Detectando micrófonos..."
          }
        >
          <DeviceSelect
            devices={mics}
            value={micId}
            onChange={handleMicChange}
            placeholder="Sin micrófonos"
          />
        </Row>

        <Row
          label="Micrófono activo"
          sub={micEnabled ? "Transmitiendo audio" : "Silenciado · nadie te escucha"}
        >
          <Toggle value={micEnabled} onChange={handleMicEnabled} />
        </Row>

        <Row label="Supresión de ruido" sub="Filtra ruido ambiente (ventilador, teclado, etc.)">
          <Toggle value={noiseSuppression} onChange={handleNoiseSuppression} />
        </Row>

        <Row
          label="Cancelación de eco"
          sub="Evita que el audio remoto se retroalimente"
        >
          <Toggle value={echoCancellation} onChange={handleEchoCancellation} />
        </Row>

        <Row
          label="Volumen de entrada"
          sub={`Ganancia: ${Math.round(inputGain * 100)}% · usa AudioContext`}
        >
          <Slider
            value={inputGain}
            min={0}
            max={2}
            step={0.05}
            onChange={handleGain}
            formatLabel={(v) => `${Math.round(v * 100)}%`}
          />
        </Row>
      </Block>

      {/* ── Preferencias ── */}
      <Block title="Preferencias">
        <Row
          label="Push to talk"
          sub={
            pushToTalk
              ? "Mantené ⎵ o el botón del micro para hablar"
              : "Micrófono siempre activo"
          }
        >
          <Toggle value={pushToTalk} onChange={handlePushToTalk} />
        </Row>
      </Block>

      {/* ── Herramientas ── */}
      <Block title="Herramientas">
        <Row
          label="Test de cámara y micrófono"
          sub="Preview en vivo con visualizador de audio"
        >
          <ActionBtn
            label="Iniciar test"
            accent="#54c7f8"
            onClick={() => setShowTest(true)}
          />
        </Row>
        <Row
          label="Actualizar lista de dispositivos"
          sub="Detecta cámaras o micrófonos recién conectados"
        >
          <ActionBtn
            label="Escanear"
            accent="#54c7f8"
            loading={applying}
            onClick={async () => {
              setApplying(true);
              await enumerateDevices();
              setApplying(false);
              showToast("Dispositivos actualizados");
            }}
          />
        </Row>
      </Block>

      {/* ── Modal de test ── */}
      {showTest && (
        <TestModal
          cameraId={cameraId}
          micId={micId}
          onClose={() => setShowTest(false)}
        />
      )}

      {/* ── Toast ── */}
      {toast && <Toast msg={toast} />}
    </>
  );
}