/**
 * Base types for invoice template system
 */

export type TemplateSlug =
  | "classic-gray"
  | "minimal-light"
  | "duo-card"
  | "invoice-compact"
  | "soft-pastel"
  | "neat-receipt"
  | "studio-bold"
  | "edge-minimal-pro"
  | "essential-pro"
  | "folio-modern"
  | "gradient-aura"
  | "luxe-gold"
  | "multi-brand-dynamic"
  | "neo-dark"
  | "split-hero";

export type TemplateSection = {
  id: string;
  title: string;
  visible: boolean;
  custom?: boolean;
  customType?: "text" | "keyValue" | "signature";
  content?: string;
  items?: { label: string; value: string }[];
};

export interface TemplateProps {
  /** Preview mode - shows simplified version for gallery/preview */
  preview?: boolean;
  /** Modal preview mode - shows more detailed preview with 4-5 sections */
  modalPreview?: boolean;
  /** Section visibility/order coming from the editor */
  sections?: TemplateSection[];
  /** Simplified map for quick checks */
  sectionVisibility?: Record<string, boolean>;
  /** Mock data for preview */
  mockData?: {
    businessName?: string;
    documentTitle?: string;
    invoiceNumber?: string;
    logoUrl?: string;
    logoSettings?: { width?: number; height?: number; style?: "rounded" | "square" | "circle" };
    signatureSettings?: { width?: number; height?: number; style?: "rounded" | "square" | "circle" };
    clientName?: string;
    clientEmail?: string;
    clientPhone?: string;
    clientCompany?: string;
    clientAddress?: string;
    projectName?: string;
    total?: string;
    subtotal?: string;
    tax?: string;
    discount?: string;
    fee?: string;
    subtotalLabel?: string;
    taxLabel?: string;
    totalLabel?: string;
    extraSummaryLabel?: string;
    extraSummaryValue?: string;
    signatureUrl?: string;
    typography?: Record<string, { size?: string; weight?: string }>;
    fontFamily?: string;
    primaryColor?: string;
    accentColor?: string;
    backgroundColor?: string;
    gradientFrom?: string;
    gradientTo?: string;
    items?: Array<{ name: string; amount: string }>;
    notes?: string;
    paymentTerms?: string;
    reminderCadence?: {
      softDays?: number;
      mediumDays?: number;
      firmDays?: number;
    };
  };
  /** Dark mode toggle for preview */
  previewDark?: boolean;
}

export interface TemplateMetadata {
  slug: TemplateSlug;
  name: string;
  description: string;
  isPro: boolean;
  category: string;
  tags: string[];
  colorPalette: {
    primary: string;
    secondary: string;
    background: string;
    text: string;
  };
  layout: {
    sections: string[];
    orientation: "portrait" | "landscape";
    style: string;
  };
  uniqueFields: string[];
  bestFor: string;
}
