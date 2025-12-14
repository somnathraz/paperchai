import { siteConfig } from "./seo-config";

/**
 * Schema.org JSON-LD generators for structured data
 * Improves SEO and enables rich snippets in search results
 */

export interface SchemaOrganization {
  "@context": "https://schema.org";
  "@type": "Organization";
  name: string;
  description: string;
  url: string;
  logo?: string;
  sameAs?: string[];
  contactPoint?: {
    "@type": "ContactPoint";
    contactType: string;
    email?: string;
  };
}

export interface SchemaSoftwareApplication {
  "@context": "https://schema.org";
  "@type": "SoftwareApplication";
  name: string;
  applicationCategory: string;
  operatingSystem: string;
  description: string;
  url: string;
  offers?: {
    "@type": "Offer";
    price: string;
    priceCurrency: string;
    availability?: string;
  };
  featureList?: string[];
  screenshot?: string[];
  aggregateRating?: {
    "@type": "AggregateRating";
    ratingValue: string;
    ratingCount: string;
  };
}

export interface SchemaWebSite {
  "@context": "https://schema.org";
  "@type": "WebSite";
  name: string;
  url: string;
  potentialAction?: {
    "@type": "SearchAction";
    target: string;
    "query-input": string;
  };
}

export interface SchemaBreadcrumb {
  "@context": "https://schema.org";
  "@type": "BreadcrumbList";
  itemListElement: Array<{
    "@type": "ListItem";
    position: number;
    name: string;
    item?: string;
  }>;
}

export interface SchemaFAQ {
  "@context": "https://schema.org";
  "@type": "FAQPage";
  mainEntity: Array<{
    "@type": "Question";
    name: string;
    acceptedAnswer: {
      "@type": "Answer";
      text: string;
    };
  }>;
}

/**
 * Generate Organization schema for company information
 */
export function generateOrganizationSchema(
  options?: Partial<SchemaOrganization>
): SchemaOrganization {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: siteConfig.name,
    description: siteConfig.description,
    url: siteConfig.url,
    logo: `${siteConfig.url}/logo.png`,
    sameAs: [
      // Add social media profiles here when available
      // "https://twitter.com/paperchai",
      // "https://linkedin.com/company/paperchai",
    ],
    contactPoint: {
      "@type": "ContactPoint",
      contactType: "Customer Support",
      email: "support@paperchai.com",
    },
    ...options,
  };
}

/**
 * Generate SoftwareApplication schema for the product
 */
export function generateSoftwareApplicationSchema(
  options?: Partial<SchemaSoftwareApplication>
): SchemaSoftwareApplication {
  return {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: siteConfig.name,
    applicationCategory: "FinanceApplication",
    operatingSystem: "Web",
    description: siteConfig.description,
    url: siteConfig.url,
    offers: {
      "@type": "Offer",
      price: "0",
      priceCurrency: "USD",
      availability: "https://schema.org/InStock",
    },
    featureList: [
      "Automated invoice generation for freelancers",
      "Payment reminder automation via WhatsApp and Email",
      "Client reliability score tracking",
      "Recurring invoice management",
      "Professional invoice templates",
      "Payment status tracking",
      "Client and project management",
      "Invoice PDF export",
      "Email template customization",
      "WhatsApp integration for reminders",
      "Multi-currency support",
      "Tax calculation",
    ],
    screenshot: [
      `${siteConfig.url}/screenshots/dashboard.png`,
      `${siteConfig.url}/screenshots/invoice-editor.png`,
    ],
    ...options,
  };
}

/**
 * Generate WebSite schema with search action
 */
export function generateWebSiteSchema(options?: Partial<SchemaWebSite>): SchemaWebSite {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: siteConfig.name,
    url: siteConfig.url,
    potentialAction: {
      "@type": "SearchAction",
      target: `${siteConfig.url}/search?q={search_term_string}`,
      "query-input": "required name=search_term_string",
    },
    ...options,
  };
}

/**
 * Generate BreadcrumbList schema for navigation
 */
export function generateBreadcrumbSchema(
  breadcrumbs: Array<{ name: string; path?: string }>
): SchemaBreadcrumb {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: breadcrumbs.map((crumb, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: crumb.name,
      ...(crumb.path && { item: `${siteConfig.url}${crumb.path}` }),
    })),
  };
}

/**
 * Generate FAQPage schema
 */
export function generateFAQSchema(faqs: Array<{ question: string; answer: string }>): SchemaFAQ {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.map((faq) => ({
      "@type": "Question",
      name: faq.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: faq.answer,
      },
    })),
  };
}
