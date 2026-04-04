import { generateMetadata } from "@/lib/seo-config";

export const metadata = generateMetadata({
  title: "Client Management",
  description:
    "Track your freelance clients, view payment reliability scores, and manage contact information.",
  path: "/clients",
  noIndex: true,
});
