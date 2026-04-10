"use client";

import { ReactNode } from "react";

type SettingsLayoutProps = {
  // kept for backwards compat — sidebar active state is now in the main sidebar
  current: string;
  title: string;
  description: string;
  children: ReactNode;
};

export function SettingsLayout({ title, description, children }: SettingsLayoutProps) {
  return (
    <div className="mx-auto w-full max-w-3xl space-y-6 pb-16">
      <div className="border-b border-border/40 pb-4">
        <h1 className="text-xl font-bold text-foreground sm:text-2xl">{title}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{description}</p>
      </div>
      {children}
    </div>
  );
}
