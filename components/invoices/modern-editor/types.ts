export type InvoiceSection = {
  id: string;
  title: string;
  visible: boolean;
  custom?: boolean;
  customType?: "text" | "keyValue" | "signature";
  content?: string;
  items?: { label: string; value: string }[];
};
