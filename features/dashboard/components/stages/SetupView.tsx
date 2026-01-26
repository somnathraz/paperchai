"use client";

import { ArrowRight, CheckCircle2, FileText, Palette, Rocket } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

export function SetupView() {
  return (
    <div className="flex flex-col items-center justify-center space-y-8 py-12 text-center">
      <div className="space-y-4 max-w-2xl">
        <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
          Welcome to your financial autopilot.
        </h2>
        <p className="text-lg text-muted-foreground">
          PaperChai helps you get paid faster without the awkward conversations. Let&apos;s get you
          set up to send your first invoice.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 max-w-4xl w-full">
        <Card className="p-6 flex flex-col items-start space-y-4 hover:shadow-lg transition-shadow border-primary/20 bg-primary/5">
          <div className="p-3 rounded-full bg-primary/10 text-primary">
            <Rocket className="h-6 w-6" />
          </div>
          <div className="space-y-2 text-left">
            <h3 className="font-semibold text-xl">Create your first invoice</h3>
            <p className="text-sm text-muted-foreground">
              Send a professional invoice in seconds. We&apos;ll track it and follow up
              automatically.
            </p>
          </div>
          <Button asChild className="w-full mt-auto">
            <Link href="/invoices/new">
              Create Invoice
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
        </Card>

        <Card className="p-6 flex flex-col items-start space-y-4 hover:shadow-lg transition-shadow">
          <div className="p-3 rounded-full bg-secondary/50 text-secondary-foreground">
            <Palette className="h-6 w-6" />
          </div>
          <div className="space-y-2 text-left">
            <h3 className="font-semibold text-xl">Customize your brand</h3>
            <p className="text-sm text-muted-foreground">
              Add your logo and colors. Look professional and build trust with your clients.
            </p>
          </div>
          <Button asChild variant="outline" className="w-full mt-auto">
            <Link href="/settings">Customize Settings</Link>
          </Button>
        </Card>
      </div>

      <div className="max-w-2xl w-full pt-8">
        <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-4">
          What happens next?
        </h3>
        <div className="grid gap-4 text-left">
          <div className="flex gap-3 items-start">
            <div className="mt-1 bg-primary/10 p-1 rounded-full">
              <FileText className="h-3 w-3 text-primary" />
            </div>
            <div>
              <p className="font-medium">1. You send an invoice</p>
              <p className="text-sm text-muted-foreground">
                The dashboard will update to track its status.
              </p>
            </div>
          </div>
          <div className="flex gap-3 items-start">
            <div className="mt-1 bg-primary/10 p-1 rounded-full">
              <CheckCircle2 className="h-3 w-3 text-primary" />
            </div>
            <div>
              <p className="font-medium">2. We follow up</p>
              <p className="text-sm text-muted-foreground">
                If it goes overdue, we sends gentle reminders automatically.
              </p>
            </div>
          </div>
          <div className="flex gap-3 items-start">
            <div className="mt-1 bg-primary/10 p-1 rounded-full">
              <ArrowRight className="h-3 w-3 text-primary" />
            </div>
            <div>
              <p className="font-medium">3. You get paid</p>
              <p className="text-sm text-muted-foreground">
                Money hits your account, and we update your cashflow insights.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
