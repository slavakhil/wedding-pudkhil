import { StrictMode, useEffect, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter, Navigate, Outlet, Route, Routes } from "react-router-dom";
import { AdminPage } from "./pages/AdminPage/AdminPage";
import { LandingPage } from "./pages/LandingPage/LandingPage";
import "./styles.css";

function NotFoundPage() {
  return (
    <main className="center-screen not-found-page">
      <section>
        <h1>Страница не существует</h1>
        <p>Проверьте ссылку на приглашение или перейдите в админ-панель.</p>
      </section>
    </main>
  );
}

function BackgroundAudio() {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const mutedRef = useRef(false);
  const primedRef = useRef(false);
  const [muted, setMuted] = useState(false);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const audio = new Audio("/assets/audio-background.mp3");
    audio.loop = true;
    audio.volume = 0.42;
    audioRef.current = audio;

    const primeAudio = () => {
      if (primedRef.current) return;
      primedRef.current = true;
      audio.muted = true;
      void audio
        .play()
        .then(() => {
          audio.pause();
          audio.currentTime = 0;
          audio.muted = mutedRef.current;
        })
        .catch(() => {
          audio.muted = mutedRef.current;
        });
    };

    const playAudio = () => {
      setVisible(true);
      if (mutedRef.current) return;
      audio.muted = false;
      void audio.play().catch(() => undefined);
    };

    window.addEventListener("wedding:prime-audio", primeAudio);
    window.addEventListener("wedding:play-audio", playAudio);

    return () => {
      window.removeEventListener("wedding:prime-audio", primeAudio);
      window.removeEventListener("wedding:play-audio", playAudio);
      audio.pause();
      audioRef.current = null;
    };
  }, []);

  function toggleAudio() {
    const audio = audioRef.current;
    if (!audio) return;

    const nextMuted = !muted;
    mutedRef.current = nextMuted;
    setMuted(nextMuted);
    audio.muted = nextMuted;

    if (nextMuted) {
      audio.pause();
      return;
    }

    void audio.play().catch(() => undefined);
  }

  if (!visible) {
    return null;
  }

  return (
    <button
      aria-label={muted ? "Включить звук" : "Отключить звук"}
      aria-pressed={!muted}
      className={`audio-toggle ${muted ? "audio-toggle-muted" : ""}`}
      onClick={toggleAudio}
      type="button"
    >
      <span aria-hidden="true">{muted ? "♪" : "♫"}</span>
    </button>
  );
}

function InviteLayout() {
  return (
    <>
      <BackgroundAudio />
      <Outlet />
    </>
  );
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <BrowserRouter>
      <Routes>
        <Route element={<InviteLayout />}>
          <Route path="/invite/:slug" element={<LandingPage />} />
        </Route>
        <Route path="/admin" element={<AdminPage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </BrowserRouter>
  </StrictMode>
);
