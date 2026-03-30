export function getSiteLegalDetails() {
  return {
    companyName: process.env.NEXT_PUBLIC_COMPANY_NAME || "PaperChai",
    supportEmail: process.env.NEXT_PUBLIC_SUPPORT_EMAIL || "support@paperchai.com",
    businessEmail: process.env.NEXT_PUBLIC_BUSINESS_EMAIL || "hello@paperchai.com",
    contactPhone: process.env.NEXT_PUBLIC_CONTACT_PHONE || "",
    businessAddress:
      process.env.NEXT_PUBLIC_COMPANY_ADDRESS || "Business address available on request.",
  };
}
