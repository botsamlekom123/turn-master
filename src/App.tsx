import { useEffect, useState } from "react";
import { getOrCreateAnonymousUser, isSupabaseConfigured } from "./backend/supabase";
import RoomLobby from "./rooms/RoomLobby";
import RoomView from "./rooms/RoomView";

const ROOM_STORAGE_KEY = "turn-master-room-id";

function loadSavedRoom(): { id: string | null; error: string | null } {
  try {
    return { id: window.localStorage.getItem(ROOM_STORAGE_KEY), error: null };
  } catch (reason) {
    return {
      id: null,
      error: reason instanceof Error ? `Room tersimpan tidak dapat dibaca: ${reason.message}` : "Room tersimpan tidak dapat dibaca.",
    };
  }
}

function ConfigurationRequired() {
  return (
    <main className="app-shell centered-state">
      <header className="site-header">
        <a className="brand" href="#" aria-label="Turn Master beranda">
          <span className="brand-mark" aria-hidden="true">↻</span>
          <span>TURN<span className="brand-accent">MASTER</span></span>
        </a>
        <span className="header-tag">MULTIPLAYER PARTY GAME</span>
      </header>
      <section className="config-card">
        <span className="minigame-icon" aria-hidden="true">⚙</span>
        <p className="section-kicker">SETUP REQUIRED</p>
        <h1>Hubungkan Supabase.</h1>
        <p>
          Tambahkan URL project dan anon key Supabase di file <code>.env.local</code>. Kredensial server
          rahasia tidak boleh digunakan di browser.
        </p>
        <pre><code>VITE_SUPABASE_URL=https://your-project.supabase.co{"\n"}VITE_SUPABASE_ANON_KEY=your-anon-key</code></pre>
        <p className="helper-text">
          Terapkan migrasi <code>supabase/migrations/20261028000000_multiplayer_rooms.sql</code>,
          aktifkan Anonymous Sign-ins di Supabase Auth, lalu jalankan ulang dev server.
        </p>
      </section>
    </main>
  );
}

function App() {
  const [userId, setUserId] = useState<string | null>(null);
  const [savedRoom] = useState(loadSavedRoom);
  const [roomId, setRoomId] = useState<string | null>(savedRoom.id);
  const [storageError, setStorageError] = useState<string | null>(savedRoom.error);
  const [authError, setAuthError] = useState("");
  const [authAttempt, setAuthAttempt] = useState(0);

  useEffect(() => {
    if (!isSupabaseConfigured()) {
      return;
    }

    let active = true;
    setAuthError("");
    getOrCreateAnonymousUser()
      .then((id) => {
        if (active) {
          setUserId(id);
          setAuthError("");
        }
      })
      .catch((reason: unknown) => {
        if (active) {
          setAuthError(
            reason instanceof Error ? reason.message : "Identitas pemain anonim tidak dapat dibuat.",
          );
        }
      });

    return () => {
      active = false;
    };
  }, [authAttempt]);

  function enterRoom(id: string) {
    setRoomId(id);
    try {
      window.localStorage.setItem(ROOM_STORAGE_KEY, id);
      setStorageError(null);
      setAuthError("");
    } catch (reason) {
      setStorageError(
        reason instanceof Error
          ? `Room terbuka, tetapi tidak dapat dipulihkan setelah refresh: ${reason.message}`
          : "Room terbuka, tetapi tidak dapat dipulihkan setelah refresh.",
      );
    }
  }

  function returnToLobby() {
    setRoomId(null);
    try {
      window.localStorage.removeItem(ROOM_STORAGE_KEY);
      setStorageError(null);
    } catch {
      setStorageError("Room ditutup, tetapi browser tidak dapat menghapus data sesi lokal.");
    }
  }

  if (!isSupabaseConfigured()) {
    return <ConfigurationRequired />;
  }

  if (!userId) {
    return (
      <main className="app-shell centered-state">
        <div className="loading-mark" aria-hidden="true">↻</div>
        <p>{authError ? "Koneksi Supabase perlu diperiksa." : "Menyiapkan pemain…"}</p>
        {authError && <div className="notice" role="alert">{authError}</div>}
        {authError && (
          <button className="button button-secondary" type="button" onClick={() => setAuthAttempt((value) => value + 1)}>
            Coba lagi
          </button>
        )}
      </main>
    );
  }

  if (roomId) {
    return (
      <>
        {(storageError || authError) && (
          <div className="auth-notice" role="status">{authError || storageError}</div>
        )}
        <RoomView roomId={roomId} userId={userId} onLeave={returnToLobby} />
      </>
    );
  }

  return (
    <>
      {(authError || storageError) && (
        <div className="auth-notice" role="status">{authError || storageError}</div>
      )}
      <RoomLobby userId={userId} onJoined={enterRoom} />
    </>
  );
}

export default App;
