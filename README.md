# PaperChai: The "Anti-Accounting" Invoice Tool for Freelancers

**Invoice automation for freelancers and agencies — send smarter, get paid faster.**

paperchai handles the boring parts of invoicing: auto-reminders, AI-generated invoices, Slack/Notion sync, and a dashboard that tells you exactly who owes what and how reliable each client is.

---

## Features

- **AI invoice generation** — describe a project and get a ready-to-send invoice in seconds (powered by Google Gemini)
- **Smart reminders** — automated follow-ups that escalate based on how overdue an invoice is, with customizable templates
- **15 invoice templates** — 7 free + 8 premium, from minimal to bold; PDF export via Puppeteer
- **Reliability radar** — scores each client's payment behavior so you know who to chase and who to trust
- **Cashflow forecasting** — visualize upcoming and overdue revenue at a glance
- **Automation engine** — schedule invoices, set milestones, trigger actions on payment events
- **Slack integration** — create and send invoices directly from Slack commands
- **Notion integration** — import clients, projects, and agreements from your Notion databases
- **Multi-workspace** — invite team members, manage roles, switch workspaces
- **Email templates** — fully customizable transactional and reminder emails
- **WhatsApp templates** — send invoice reminders via WhatsApp
- **AI autopilot** — let the app draft and send follow-ups without you lifting a finger

---

## Tech Stack

| Layer        | Choice                                  |
| ------------ | --------------------------------------- |
| Framework    | Next.js 14 (App Router)                 |
| Database ORM | Prisma                                  |
| Auth         | NextAuth.js                             |
| AI           | Google Gemini (`@google/generative-ai`) |
| UI           | shadcn/ui + Radix UI + Tailwind CSS     |
| PDF          | Puppeteer                               |
| Animations   | Framer Motion                           |
| Email        | Nodemailer                              |
| Validation   | Zod                                     |

---

[🔴 Live Demo](https://paperchai.com) | [📄 View Portfolio](https://www.somanathkhadanga.com/)

![Project Demo Gif](./public/demo.gif)

### 1. Install dependencies

## 🧐 The Problem

Existing freelance invoicing tools are bloated. They are built for accountants, requiring complex setups for inventory and taxes that freelance developers don't need. Sending a simple invoice took 15 clicks, and chasing payments was socially awkward.

### 2. Configure environment

Copy the example env files and fill in your values:

```bash
cp .env.integrations.example .env.local
```

Required variables:

```env
# Database
DATABASE_URL=

# Auth
NEXTAUTH_SECRET=
NEXTAUTH_URL=http://localhost:3000

# Google Gemini (AI features)
GOOGLE_AI_API_KEY=

# Email (Nodemailer)
EMAIL_HOST=
EMAIL_PORT=
EMAIL_USER=
EMAIL_PASS=

# Slack Integration (optional)
SLACK_CLIENT_ID=
SLACK_CLIENT_SECRET=
SLACK_SIGNING_SECRET=

# Notion Integration (optional)
NOTION_CLIENT_ID=
NOTION_CLIENT_SECRET=
NOTION_API_VERSION=2022-06-28

# Encryption key for OAuth tokens (32 bytes as 64 hex chars)
ENCRYPTION_KEY=

NEXT_PUBLIC_APP_URL=http://localhost:3000
```

Generate an encryption key:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### 3. Set up the database

```bash
npx prisma migrate dev
npm run prisma:seed
```

### 4. Run the dev server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

---

## Cron Jobs

paperchai uses two internal cron endpoints. Point your cron scheduler (cron-job.org, Vercel cron, etc.) at:

| Job                | Endpoint                                    | Suggested interval |
| ------------------ | ------------------------------------------- | ------------------ |
| Payment reminders  | `POST /api/internal/reminders/run`          | Every hour         |
| Scheduled invoices | `POST /api/internal/scheduled-invoices/run` | Every hour         |

Test locally:

```bash
npm run cron:reminders
npm run cron:scheduled
```

---

## Project Structure

```
app/
  api/          # All API routes (invoices, clients, projects, integrations, auth…)
  dashboard/    # Main dashboard with tabs: overview, cashflow, reminders, automation
  invoices/     # Invoice list + new invoice builder + PDF view
  clients/      # Client management
  projects/     # Project + milestone tracking
  settings/     # Profile, workspace, integrations, email templates, AI autopilot…
  automation/   # Automation rules UI
components/     # Shared React components (dashboard widgets, invoice builder, UI)
lib/            # Auth config, utilities, hooks, Prisma client
prisma/         # Schema + seed script
```

---

## Invoice Templates

15 templates across two tiers:

**Free (7):** Classic Gray, Minimal Light, Bold Dark, Retro Stamp, Pastel Soft, Modern Split, Studio Clean

**Premium (8):** Agency Pro, Luxury Black, Neon Cyber, Architect Blueprint, Handcrafted, Executive Suite, Creative Studio, and more

---

## Contributing

Pull requests are welcome. For major changes, open an issue first.

---

## License

MIT

## 💡 The Solution

PaperChai is an "Anti-Accounting" tool designed for speed. It focuses purely on cash flow: generating an invoice from a Notion doc in seconds and using AI to handle payment follow-ups without the awkwardness.

### 🏗️ Architecture / System Design

- **Frontend:** Next.js (App Router) with Tailwind CSS & shadcn/ui for a snappy, accessible client-side experience.
- **Backend:** Next.js API Routes handling business logic and secure database interactions.
- **Database:** PostgreSQL (via Prisma ORM) for flexible relationship management (client profiles, invoice history).
- **AI Integration:** Google Gemini & OpenAI for intelligence layers, such as drafting email follow-ups and parsing unstructured invoice data.
- **Automation:** structured automation workflows for recurring tasks.

## 🛠️ Tech Stack

| Component            | Technology                             |
| :------------------- | :------------------------------------- |
| **Core**             | Next.js 14, React, Node.js, Prisma     |
| **State Management** | Redux Toolkit                          |
| **Styling**          | Tailwind CSS, shadcn/ui, Framer Motion |
| **Auth**             | NextAuth.js                            |
| **AI/ML**            | Google Gemini, OpenAI API              |
| **Testing/Tools**    | Puppeteer, Jest                        |

## 🧠 Challenges & Learnings

**Challenge 1: Ensuring Reliable AI Data Extraction**

> _The Problem:_ LLMs can occasionally "hallucinate" or format data inconsistently when extracting invoice details from free-text Notion documents.
> _How I Solved It:_ I implemented a strict Zod schema validation layer that acts as a gateway for the AI output. This ensures that any data entering the system adheres to the expected format, with a fallback retry mechanism for malformed responses.

**Trade-off Decision:**

> "I chose **NextAuth.js** for authentication over building a custom JWT system. While a custom solution enables fine-grained control, NextAuth.js provided battle-tested security and built-in OAuth providers immediately. This trade-off saved approximately 20 hours of development time, allowing me to focus on the core 'Anti-Accounting' features."

---

### 📬 Author

Built by **Somnath Khadanga**.

I specialize in building full-stack applications and integrating AI into business workflows.

[👉 Visit my Full Portfolio](https://www.somanathkhadanga.com/) | [Connect on LinkedIn](https://www.linkedin.com/in/somnath-khadanga/)
