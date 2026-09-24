import React, { useEffect, useRef, useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { api } from '../../services/api';

let gisPromise = null;

function loadGoogleIdentityServices() {
  if (window.google?.accounts?.id) return Promise.resolve();
  if (gisPromise) return gisPromise;
  gisPromise = new Promise((resolve, reject) => {
    const existing = document.querySelector('script[src="https://accounts.google.com/gsi/client"]');
    if (existing) {
      existing.addEventListener('load', () => resolve());
      existing.addEventListener('error', () => reject(new Error('Gagal memuat layanan Google.')));
      return;
    }
    const script = document.createElement('script');
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.defer = true;
    script.onload = () => resolve();
    script.onerror = () => {
      gisPromise = null;
      reject(new Error('Gagal memuat layanan Google.'));
    };
    document.head.appendChild(script);
  });
  return gisPromise;
}

export default function GoogleLoginButton({ mode = 'login', onError, onSuccess, disabled }) {
  const auth = useAuth();
  const buttonRef = useRef(null);
  const authRef = useRef(null);
  const uiRef = useRef({ onError, onSuccess, mode, disabled });
  const cancelledRef = useRef(false);
  const busyRef = useRef(false);
  const [ready, setReady] = useState(false);
  const [unavailable, setUnavailable] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    authRef.current = auth;
  }, [auth]);

  useEffect(() => {
    uiRef.current = { onError, onSuccess, mode, disabled };
  }, [onError, onSuccess, mode, disabled]);

  useEffect(() => {
    cancelledRef.current = false;
    let refreshing = false;

    const handleCredential = async (response) => {
      const { mode: currentMode, disabled: currentDisabled, onError: handleError, onSuccess: handleSuccess } = uiRef.current;
      if (currentDisabled || busyRef.current) return;
      busyRef.current = true;
      setBusy(true);
      setError('');
      try {
        const auth = authRef.current;
        if (currentMode === 'link') {
          const data = await auth.linkGoogle(response.credential);
          handleSuccess?.(data);
        } else {
          const user = await auth.loginWithGoogle(response.credential);
          handleSuccess?.(user);
        }
      } catch (err) {
        const message = err?.message || 'Login Google belum berhasil. Silakan coba lagi.';
        setError(message);
        handleError?.(err);
        if (!cancelledRef.current && !refreshing) {
          refreshing = true;
          try {
            await setup();
          } catch {
            /* biarkan pesan error utama yang tampil */
          } finally {
            refreshing = false;
          }
        }
      } finally {
        busyRef.current = false;
        if (!cancelledRef.current) setBusy(false);
      }
    };

    const setup = async () => {
      if (cancelledRef.current) return;
      try {
        const config = await api.getGoogleConfig();
        if (cancelledRef.current) return;
        if (!config.enabled) {
          setUnavailable(true);
          setReady(false);
          return;
        }
        await loadGoogleIdentityServices();
        if (cancelledRef.current || !buttonRef.current) return;
        buttonRef.current.innerHTML = '';
        window.google.accounts.id.initialize({
          client_id: config.clientId,
          nonce: config.nonce,
          callback: handleCredential
        });
        window.google.accounts.id.renderButton(buttonRef.current, {
          theme: 'outline',
          size: 'large',
          text: 'continue_with',
          width: Math.max(240, buttonRef.current.clientWidth || 320),
          locale: 'id'
        });
        setReady(true);
        setUnavailable(false);
      } catch (err) {
        if (!cancelledRef.current) {
          setUnavailable(true);
          setReady(false);
          setError(err?.message || 'Login Google tidak tersedia.');
        }
      }
    };

    setup();

    const onConfigChanged = () => {
      if (!cancelledRef.current) setup();
    };
    window.addEventListener('freshmarket:google-config-changed', onConfigChanged);

    return () => {
      cancelledRef.current = true;
      window.removeEventListener('freshmarket:google-config-changed', onConfigChanged);
    };
  }, []);

  if (unavailable && !ready) {
    if (error && !busy) {
      return <p className="text-[11px] text-rose-600 text-center">{error}</p>;
    }
    return null;
  }

  return (
    <div className="space-y-2">
      <div
        ref={buttonRef}
        className={`flex justify-center min-h-[44px] ${disabled || busy ? 'pointer-events-none opacity-60' : ''}`}
        aria-busy={busy || undefined}
      />
      {busy && (
        <p className="text-[11px] text-slate-500 text-center animate-pulse">Memproses login Google...</p>
      )}
      {error && !busy && (
        <p className="text-[11px] text-rose-600 text-center">{error}</p>
      )}
    </div>
  );
}
