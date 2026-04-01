"use client";

import React from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";

type Props = { children: React.ReactNode; fallbackLabel?: string };
type State = { hasError: boolean };

export class DynamicErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error) {
    console.error("[DynamicErrorBoundary]", error);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-red-200 bg-red-50/60 p-6 text-center">
          <AlertTriangle className="h-6 w-6 text-red-500" />
          <p className="text-sm font-medium text-red-700">
            {this.props.fallbackLabel ?? "Failed to load component"}
          </p>
          <button
            onClick={() => this.setState({ hasError: false })}
            className="inline-flex items-center gap-1.5 rounded-full border border-red-300 px-3 py-1.5 text-xs font-semibold text-red-700 transition hover:bg-red-100"
          >
            <RefreshCw className="h-3 w-3" />
            Retry
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
