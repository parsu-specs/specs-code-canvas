import { useCallback, useEffect, useState } from "react";
import { viewerSettingKey } from "./viewerCache";

type ViewLayout = "grid" | "list";

function readLayout(key: string): ViewLayout {
  try {
    return localStorage.getItem(key) === "list" ? "list" : "grid";
  } catch {
    return "grid";
  }
}

/** Device-only preferences, kept separate for each page and viewer. */
export function useViewLayout(page: "discover" | "developers") {
  const key = viewerSettingKey(`cc.view-layout.v1:${page}`);
  const [layout, setLayout] = useState<ViewLayout>(() => readLayout(key));
  useEffect(() => {
    setLayout(readLayout(key));
    const onStorage = (event: StorageEvent) => {
      if (event.key === key || event.key === null) setLayout(readLayout(key));
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, [key]);
  const updateLayout = useCallback(
    (next: ViewLayout) => {
      setLayout(next);
      try {
        localStorage.setItem(key, next);
      } catch {
        // The current page still keeps the selection when storage is unavailable.
      }
    },
    [key],
  );
  return [layout, updateLayout] as const;
}
