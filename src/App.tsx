import React, { useEffect, useState } from "react";
import { AuthProvider } from "./auth/AuthProvider";
import ErrorBoundary from "./components/ErrorBoundary";
import Main from "./pages/Main";

export default function App({ fontReadiness }: { fontReadiness?: Promise<unknown> }) {
  const [fontsReady, setFontsReady] = useState(!fontReadiness);
  useEffect(() => {
    let active = true;
    const reveal = () => {
      if (active) setFontsReady(true);
    };
    void fontReadiness?.then(reveal, reveal);
    return () => {
      active = false;
    };
  }, [fontReadiness]);
  return (
    <AuthProvider>
      <ErrorBoundary name="app">
        <Main fontsReady={fontsReady} />
      </ErrorBoundary>
    </AuthProvider>
  );
}
