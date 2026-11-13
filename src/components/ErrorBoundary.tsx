import React from "react";
import { ArrowCounterClockwise, WarningCircle } from "@phosphor-icons/react";
import { Button } from "./Button";
import { PageLoadError } from "../utils/lazyPage";

type ErrorBoundaryProps = {
  /** Label shown in the fallback, e.g. "Discover". */
  name: string;
  children: React.ReactNode;
};

type ErrorBoundaryState = {
  error: Error | null;
};

/**
 * Catches render crashes inside one view so a single broken component can't
 * whitescreen the whole app. The rest of the navigation keeps working.
 */
export default class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { error: null };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo): void {
    // Visible in devtools and production log drains; never shown to users.
    console.error(`[ErrorBoundary:${this.props.name}]`, error, info.componentStack);
  }

  render(): React.ReactNode {
    if (this.state.error) {
      const pageLoadFailed = this.state.error instanceof PageLoadError;
      return (
        <div className="flex min-h-[calc(100dvh-12rem)] items-center justify-center p-4">
          <div
            role="alert"
            className="toon-card toon-paper w-full max-w-lg bg-panel p-6 text-center sm:p-10"
          >
            <WarningCircle size={36} weight="duotone" className="mx-auto text-danger" />
            <h3 className="mt-3 text-xl font-black">This {this.props.name} section crashed</h3>
            <p className="mt-1 font-bold text-muted">
              {pageLoadFailed
                ? "This page could not load. Refresh to try again."
                : "Refresh the page to continue. Unsaved changes may be lost."}
            </p>
            <div className="mt-5 flex flex-wrap justify-center gap-3">
              <Button variant="secondary" size="small" onClick={() => window.location.reload()}>
                <ArrowCounterClockwise size={18} weight="bold" />
                Refresh page
              </Button>
            </div>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
