# PaperChai: The "Anti-Accounting" Invoice Tool for Freelancers

[🔴 Live Demo](https://paperchai.com) | [📄 View Portfolio](https://www.somanathkhadanga.com/)

![Project Demo Gif](./public/demo.gif)

## 🧐 The Problem

Existing freelance invoicing tools are bloated. They are built for accountants, requiring complex setups for inventory and taxes that freelance developers don't need. Sending a simple invoice took 15 clicks, and chasing payments was socially awkward.

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
