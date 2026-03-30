import { Metadata } from "next";

/**
 * Centralized SEO configuration for PaperChai
 * Invoice generator for freelancers and small companies
 */

export const siteConfig = {
  name: "PaperChai",
  tagline: "Invoice Generator for Freelancers & Small Companies",
  description:
    "Professional invoice generator for freelancers and small businesses. Create invoices, track payments, send automated WhatsApp & email reminders, and monitor client reliability scores. Free invoice management software.",
  url: process.env.NEXT_PUBLIC_APP_URL || "https://paperchai.com",
  ogImage: "/opengraph-image.png",
  twitterHandle: "@paperchai",
  keywords: [
    "invoice generator",
    "freelance invoice software",
    "invoice management",
    "payment reminders",
    "automated invoicing",
    "invoice generator for freelancers",
    "small business invoicing",
    "WhatsApp invoice reminders",
    "email invoice reminders",
    "client payment tracking",
    "invoice automation",
    "free invoice software",
    "online invoicing tool",
    "recurring invoices",
    "payment tracking software",
    "client reliability score",
  ],
};

/**
 * Generate metadata for a page
 */
export function generateMetadata({
  title,
  description,
  path = "",
  noIndex = false,
  ogImage,
}: {
  title: string;
  description?: string;
  path?: string;
  noIndex?: boolean;
  ogImage?: string;
}): Metadata {
  const pageTitle = title.includes("PaperChai") ? title : `${title} - PaperChai`;
  const pageDescription = description || siteConfig.description;
  const url = `${siteConfig.url}${path}`;
  const image = ogImage || siteConfig.ogImage;

  return {
    title: pageTitle,
    description: pageDescription,
    keywords: siteConfig.keywords,
    authors: [{ name: "PaperChai" }],
    creator: "PaperChai",
    publisher: "PaperChai",
    robots: noIndex
      ? {
          index: false,
          follow: false,
        }
      : {
          index: true,
          follow: true,
          googleBot: {
            index: true,
            follow: true,
            "max-video-preview": -1,
            "max-image-preview": "large",
            "max-snippet": -1,
          },
        },
    openGraph: {
      type: "website",
      locale: "en_US",
      url,
      title: pageTitle,
      description: pageDescription,
      siteName: siteConfig.name,
      images: [
        {
          url: image,
          width: 1200,
          height: 630,
          alt: `${siteConfig.name} - ${siteConfig.tagline}`,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: pageTitle,
      description: pageDescription,
      images: [image],
      creator: siteConfig.twitterHandle,
    },
    alternates: {
      canonical: url,
    },
  };
}

/**
 * Default metadata for the root layout
 */
export const defaultMetadata: Metadata = {
  metadataBase: new URL(siteConfig.url),
  title: {
    default: `${siteConfig.name} - ${siteConfig.tagline}`,
    template: `%s - ${siteConfig.name}`,
  },
  description: siteConfig.description,
  keywords: siteConfig.keywords,
  authors: [{ name: "PaperChai" }],
  creator: "PaperChai",
  publisher: "PaperChai",
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  openGraph: {
    type: "website",
    locale: "en_US",
    url: siteConfig.url,
    title: `${siteConfig.name} - ${siteConfig.tagline}`,
    description: siteConfig.description,
    siteName: siteConfig.name,
    images: [
      {
        url: siteConfig.ogImage,
        width: 1200,
        height: 630,
        alt: `${siteConfig.name} - ${siteConfig.tagline}`,
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: `${siteConfig.name} - ${siteConfig.tagline}`,
    description: siteConfig.description,
    images: [siteConfig.ogImage],
    creator: siteConfig.twitterHandle,
  },
  icons: {
    icon: "/favicon.png",
    shortcut: "/favicon.png",
    apple: "/favicon.png",
  },
  manifest: "/site.webmanifest",
};
