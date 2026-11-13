import { useEffect, useRef } from "react";

const SCRIPT_SRC = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";

type TurnstileApi = {
  render: (container: HTMLElement, options: Record<string, unknown>) => string;
  remove: (widgetId: string) => void;
};

type TurnstileWindow = Window & { turnstile?: TurnstileApi };

// One api.js copy per page, ever. Turnstile's script warns
// "[Cloudflare Turnstile] Turnstile already has been loaded. Was Turnstile
// imported multiple times?" whenever a second copy executes. That happened
// because the load effect below ran again while the first script was still
// downloading (window.turnstile not set yet): React StrictMode double-mounts
// effects in development, and the login form remounts this component via
// `key` after every submit. The first caller appends the script; every other
// mount — concurrent or later — awaits the same in-flight promise.
let scriptLoading: Promise<void> | null = null;

function loadTurnstile(): Promise<void> {
  const win = window as TurnstileWindow;
  if (win.turnstile) return Promise.resolve();
  if (!scriptLoading) {
    scriptLoading = new Promise<void>((resolve, reject) => {
      const script = document.createElement("script");
      script.src = SCRIPT_SRC;
      script.async = true;
      script.defer = true;
      script.onload = () => resolve();
      script.onerror = () => {
        // Drop the dead tag and clear the flight so a later mount can retry.
        script.remove();
        scriptLoading = null;
        reject(new Error("Turnstile script failed to load"));
      };
      document.head.appendChild(script);
    });
  }
  return scriptLoading;
}

/**
 * Cloudflare Turnstile widget (explicit render). Parent remounts via `key`
 * after every submit because tokens are single-use. Callbacks ride a ref so
 * parent re-renders (every keystroke) never thrash the widget. Renders
 * nothing but the box — the parent owns all messaging.
 */
export default function Turnstile({
  siteKey,
  onToken,
  onUnavailable,
}: {
  siteKey: string;
  onToken: (token: string | null) => void;
  onUnavailable: (message: string) => void;
}) {
  const boxRef = useRef<HTMLDivElement>(null);
  const handlers = useRef({ onToken, onUnavailable });
  handlers.current = { onToken, onUnavailable };

  useEffect(() => {
    let cancelled = false;
    let widgetId: string | null = null;
    const win = window as TurnstileWindow;
    const fail = () => {
      if (!cancelled) {
        handlers.current.onUnavailable(
          "Human check failed to load. Check your connection and reload the page.",
        );
      }
    };
    const renderWidget = () => {
      if (cancelled || !boxRef.current || !win.turnstile) return;
      try {
        widgetId = win.turnstile.render(boxRef.current, {
          sitekey: siteKey,
          callback: (token: string) => handlers.current.onToken(token),
          "expired-callback": () => handlers.current.onToken(null),
          "error-callback": () => handlers.current.onToken(null),
        });
      } catch {
        fail();
      }
    };
    if (win.turnstile) {
      renderWidget();
    } else {
      loadTurnstile().then(renderWidget, fail);
    }
    return () => {
      cancelled = true;
      if (widgetId && (window as TurnstileWindow).turnstile) {
        try {
          (window as TurnstileWindow).turnstile?.remove(widgetId);
        } catch {
          // Already gone.
        }
      }
    };
  }, [siteKey]);

  return (
    <div className="min-w-0 flex justify-center max-w-full">
      <div ref={boxRef} />
    </div>
  );
}
