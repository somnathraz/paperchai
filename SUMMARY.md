# PaperChai – Product Summary

## What We Are

**PaperChai** is an invoice and cash-flow product for **freelancers and small companies**. It is built as an “anti-accounting” tool: minimal setup, no inventory or complex tax flows—just create invoices, send them, and get paid. The product focuses on **speed** (e.g. invoice from a Notion doc or Slack in seconds) and **automation** (reminders, recurring billing, approval flows).

- **Product name:** PaperChai
- **Tagline:** Invoice Generator for Freelancers & Small Companies
- **Live:** [paperchai.com](https://paperchai.com)

---

## Core Product

| Area           | What we do                                                                                                                          |
| -------------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| **Invoices**   | Create, edit, send, and track invoices. Multiple templates, PDF generation, email send. Status flow: draft → sent/scheduled → paid. |
| **Clients**    | Client profiles (name, email, billing). Clients can have multiple projects and invoices.                                            |
| **Projects**   | Project-based work with optional milestones, billable items, and links to invoices.                                                 |
| **Workspaces** | Multi-tenant: users belong to workspaces; workspace members have roles (Owner, Admin, Member, Viewer).                              |
| **Approvals**  | Optional approval before sending (e.g. Slack-requested sends). Approvers get a queue; approve/reject then send or keep as draft.    |

---

## Features (High Level)

### Invoicing

- Create invoice from scratch or from **existing invoice** (clone / “copy from invoice”).
- **Recurring invoice plans:** fixed template, milestones, or “copy from invoice”; interval (days/weeks/months); auto-run; optional auto-send and approval. Plans can be paused or **deleted** (archived).
- **Scheduled send:** set a future send time; cron runs scheduled sends.
- **Draft reminders:** nudge to send or update draft invoices.
- **Payment reminders:** post-send reminders (email, and optionally WhatsApp).

### Integrations

- **Slack:** OAuth connect workspace; **slash command** `/invoice` with subcommands: `create`, `send`, `status`, `help`. All sends go through approval (no direct send from Slack). Signature verification and idempotency.
- **Notion:** OAuth; import clients/projects/notes/agreements; AI-assisted extraction from Notion docs for invoice data.

### Automation

- **Automation rules:** trigger-based workflows (e.g. on invoice sent, on milestone).
- **Recurring runner:** cron runs recurring plans and creates drafts (or sends if auto-send and approval allow).
- **Internal crons:** reminders run, scheduled invoices run, approval escalation, recurring run—all via internal API routes used by cron.

### AI

- **AI extraction:** from Notion docs, Slack context, or free text for invoice/client/project data (Google Gemini / OpenAI).
- **AI review:** suggestions and validation on invoice content.
- **AI project wizard:** guided project/client setup with AI-assisted extraction.

### Security & Auth

- **Auth:** NextAuth.js (credentials, email verification, password reset). Optional platform roles (User, Support, Platform Admin, etc.).
- **Workspace-scoped data:** all main resources (invoices, clients, projects) are scoped by workspace. Approvers = workspace owners/admins for approval flows.
- **Slack:** request signing verified; optional rate limits and audit logging where applicable.

---

## Tech Stack (Summary)

| Layer       | Tech                                             |
| ----------- | ------------------------------------------------ |
| **App**     | Next.js (App Router), React, TypeScript          |
| **UI**      | Tailwind CSS, shadcn/ui, Framer Motion           |
| **State**   | Redux Toolkit (e.g. auth, workspace)             |
| **API**     | Next.js API Routes (REST)                        |
| **DB**      | PostgreSQL via Prisma ORM                        |
| **Auth**    | NextAuth.js                                      |
| **AI**      | Google Gemini, OpenAI API                        |
| **Email**   | Send grid / configured provider                  |
| **Storage** | Optional S3-compatible (e.g. R2) for assets/PDFs |

---

## Key Scripts & Tests

| Command                       | Purpose                                                                                                                                                        |
| ----------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `npm run dev`                 | Local dev server                                                                                                                                               |
| `npm run build` / `npm start` | Production build and start                                                                                                                                     |
| `npm run prisma:seed`         | Seed DB (e.g. test Slack team/user)                                                                                                                            |
| `npm run test:slack`          | Slack unit tests + live smoke (parser, validation, signature, commands)                                                                                        |
| `npm run test:slack-commands` | Live smoke test for `/invoice` commands (needs dev server + `SLACK_SIGNING_SECRET`)                                                                            |
| `npm run db:list-users`       | List users and access (platform role + workspace memberships)                                                                                                  |
| **Cron-style**                | `test:draft-reminders`, `test:scheduled-invoices`, `cron:automation`, `cron:reminders`, `cron:recurring`, `cron:approval-escalation` (POST to internal routes) |

---

## Docs & Repo

- **README.md** – Problem/solution, architecture, tech stack, author.
- **SUMMARY.md** (this file) – What we are, product summary, features, tech, scripts.
- **docs/NGROK-SLACK.md** – Expose local dev with ngrok for Slack OAuth redirect URL.
- **docs/SLACK-INTEGRATION-VERIFICATION.md** – Slack OAuth, commands, disconnect, env and app config checklist.
- **Admin docs** – Optional internal docs under `app/admin/docs/` (frontend, backend, database, system logs).

---

_PaperChai – Invoice generator for freelancers & small companies. Built by Somnath Khadanga._
