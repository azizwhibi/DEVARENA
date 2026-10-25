'use client';

import {
  createContext,
  useContext,
  useEffect,
  useId,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { Download, X } from 'lucide-react';
import styles from './Install.module.css';

type InstallEvent = Event & {
  prompt(): Promise<unknown>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
};
type Platform = 'ios' | 'mac-safari' | 'browser';
type Environment = {
  installed: boolean;
  available: boolean;
  bannerDismissed: boolean;
  secure: boolean;
  platform: Platform;
};
type InstallContextValue = Environment & {
  busy: boolean;
  error: string;
  message: string;
  requestInstall(trigger: HTMLElement): Promise<void>;
  dismissBanner(): void;
};

const DISMISSED_KEY = 'devarena-install-dismissed-session';
const InstallContext = createContext<InstallContextValue | null>(null);

function detectPlatform(): Platform {
  const ua = navigator.userAgent;
  const ios = /iPad|iPhone|iPod/.test(ua)
    || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  if (ios) return 'ios';
  const safari = /Safari/.test(ua)
    && !/Chrome|Chromium|CriOS|Edg|FxiOS|OPR|Android/.test(ua);
  return safari && /Macintosh|Mac OS X/.test(ua) ? 'mac-safari' : 'browser';
}

function bannerWasDismissed() {
  try {
    return sessionStorage.getItem(DISMISSED_KEY) === '1';
  } catch {
    return false;
  }
}

export function useInstall() {
  const value = useContext(InstallContext);
  if (!value) throw new Error('Install controls require InstallProvider');
  return value;
}

export function InstallProvider({ children }: { children: ReactNode }) {
  // Browser-derived state is populated after hydration so the initial HTML stays stable.
  const [environment, setEnvironment] = useState<Environment>({
    installed: false,
    available: false,
    bannerDismissed: false,
    secure: true,
    platform: 'browser',
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [instructionsOpen, setInstructionsOpen] = useState(false);
  const nativeEvent = useRef<InstallEvent | null>(null);
  const busyRef = useRef(false);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const returnFocus = useRef<HTMLElement | null>(null);
  const titleId = useId();
  const descriptionId = useId();

  useEffect(() => {
    const standalone = window.matchMedia('(display-mode: standalone)');
    const isInstalled = () => standalone.matches
      || (navigator as Navigator & { standalone?: boolean }).standalone === true;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- Read browser install state after hydration.
    setEnvironment({
      installed: isInstalled(),
      available: false,
      bannerDismissed: bannerWasDismissed(),
      secure: window.isSecureContext,
      platform: detectPlatform(),
    });
    const onPrompt = (event: Event) => {
      event.preventDefault();
      if (isInstalled()) return;
      nativeEvent.current = event as InstallEvent;
      setEnvironment((current) => ({ ...current, available: true }));
    };
    const onInstalled = () => {
      nativeEvent.current = null;
      setEnvironment((current) => ({ ...current, installed: true, available: false }));
      setError('');
      setMessage('DevArena is installed.');
      setInstructionsOpen(false);
    };
    const onDisplayChange = () => {
      if (isInstalled()) onInstalled();
    };
    // Dismissing the banner never stops capture: the landing CTA stays usable.
    window.addEventListener('beforeinstallprompt', onPrompt);
    window.addEventListener('appinstalled', onInstalled);
    standalone.addEventListener('change', onDisplayChange);
    return () => {
      window.removeEventListener('beforeinstallprompt', onPrompt);
      window.removeEventListener('appinstalled', onInstalled);
      standalone.removeEventListener('change', onDisplayChange);
    };
  }, []);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!instructionsOpen || !dialog) return;
    dialog.showModal();
    return () => {
      if (dialog.open) dialog.close();
      if (returnFocus.current?.isConnected) returnFocus.current.focus();
    };
  }, [instructionsOpen]);

  function dismissBanner() {
    try {
      sessionStorage.setItem(DISMISSED_KEY, '1');
    } catch {
      // In-memory dismissal still works when browser storage is unavailable.
    }
    setEnvironment((current) => ({ ...current, bannerDismissed: true }));
  }

  async function requestInstall(trigger: HTMLElement) {
    if (busyRef.current || environment.installed) return;
    setError('');
    setMessage('');
    const event = environment.secure ? nativeEvent.current : null;
    if (!event) {
      returnFocus.current = trigger;
      setInstructionsOpen(true);
      return;
    }
    // Each deferred browser event can only be used once, including failed attempts.
    nativeEvent.current = null;
    setEnvironment((current) => ({ ...current, available: false }));
    busyRef.current = true;
    setBusy(true);
    try {
      await event.prompt();
      const choice = await event.userChoice;
      setMessage(choice.outcome === 'accepted'
        ? 'Complete installation in your browser.'
        : 'Installation dismissed. You can still install from your browser menu.');
    } catch {
      setError('Installation did not finish. Select Install DevArena again for browser instructions.');
    } finally {
      busyRef.current = false;
      setBusy(false);
    }
  }

  const platform = environment.platform;
  return (
    <InstallContext.Provider value={{ ...environment, busy, error, message, requestInstall, dismissBanner }}>
      {children}
      <dialog
        ref={dialogRef}
        className={styles.dialog}
        aria-labelledby={titleId}
        aria-describedby={descriptionId}
        onCancel={(event) => {
          event.preventDefault();
          setInstructionsOpen(false);
        }}
        onClose={() => setInstructionsOpen(false)}
      >
        <div className={styles.dialogHeader}>
          <span className={styles.dialogIcon} aria-hidden="true">
            <Download size={20} strokeWidth={1.5} />
          </span>
          <button
            type="button"
            className={styles.closeButton}
            aria-label="Close installation instructions"
            onClick={() => setInstructionsOpen(false)}
          >
            <X size={20} strokeWidth={1.5} aria-hidden="true" />
          </button>
        </div>
        <h2 id={titleId} className={styles.dialogTitle}>Install DevArena</h2>
        <p id={descriptionId} className={styles.dialogDescription}>
          {!environment.secure
            ? 'Installation requires a secure connection. Open the HTTPS DevArena site on your device.'
            : platform === 'ios'
              ? 'Add DevArena to your Home Screen from Safari.'
              : platform === 'mac-safari'
                ? 'Add DevArena to your Mac Dock from Safari.'
                : 'Use your browser’s install option to keep DevArena close.'}
        </p>
        <ol className={styles.steps}>
          {!environment.secure ? (
            <>
              <li>Open the deployed <strong>HTTPS DevArena address</strong> in your browser.</li>
              <li>Select <strong>Install DevArena</strong> again.</li>
              <li>Follow the installation steps for your browser.</li>
            </>
          ) : platform === 'ios' ? (
            <>
              <li>Open this page in <strong>Safari</strong>.</li>
              <li>Tap <strong>Share</strong> in the browser toolbar.</li>
              <li>Choose <strong>Add to Home Screen</strong>, then tap <strong>Add</strong>.</li>
            </>
          ) : platform === 'mac-safari' ? (
            <>
              <li>Open Safari’s <strong>File</strong> menu.</li>
              <li>Choose <strong>Add to Dock</strong>.</li>
              <li>Confirm the app name, then select <strong>Add</strong>.</li>
            </>
          ) : (
            <>
              <li>Open your browser’s menu or the install icon in its address bar.</li>
              <li>Choose <strong>Install DevArena</strong>, <strong>Install app</strong>, or <strong>Add to Home screen</strong>.</li>
              <li>Follow the browser’s confirmation steps.</li>
            </>
          )}
        </ol>
        <p className={styles.dialogNote}>
          Installation options depend on your browser and device. If the option is unavailable, keep using DevArena in your browser.
        </p>
        <button type="button" className={styles.button} onClick={() => setInstructionsOpen(false)}>
          Got it
        </button>
      </dialog>
    </InstallContext.Provider>
  );
}
