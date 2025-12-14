export type EmailThemeData = {
  subject: string;
  body: string;
  logoUrl?: string;
  brandColor: string;
  accentColor?: string;
  clientName?: string;
  invoiceId?: string;
  amount?: string;
  dueDate?: string;
  paymentLink?: string;
};

// Helper to inject variables if they aren't already replaced (preview mode vs sending mode)
const processBody = (text: string) => {
  return text.replace(/\n/g, '<br/>');
};

const FOOTER_HTML = `
  <div style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #e5e7eb; text-align: center; font-size: 12px; color: #9ca3af;">
    <p>Sent via PaperChai</p>
    <p>© ${new Date().getFullYear()} Your Company Name. All rights reserved.</p>
  </div>
`;

export const getThemeHtml = (theme: 'minimal' | 'classic' | 'modern' | 'noir', data: EmailThemeData) => {
  const { body, brandColor, logoUrl, subject } = data;
  const processedBody = processBody(body);

  switch (theme) {
    case 'minimal':
      return `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; line-height: 1.6; color: #374151; margin: 0; padding: 20px; background-color: #f9fafb;">
          <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; padding: 40px; border-radius: 8px; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
            ${logoUrl ? `<img src="${logoUrl}" alt="Logo" style="height: 40px; margin-bottom: 30px; display: block;">` : ''}
            <h1 style="font-size: 20px; font-weight: 600; color: #111827; margin-bottom: 24px;">${subject}</h1>
            <div style="font-size: 16px; color: #4b5563;">
              ${processedBody}
            </div>
            <div style="margin-top: 32px;">
              <a href="{{paymentLink}}" style="display: inline-block; background-color: ${brandColor}; color: #ffffff; padding: 12px 24px; border-radius: 6px; text-decoration: none; font-weight: 500;">View Invoice</a>
            </div>
            ${FOOTER_HTML}
          </div>
        </body>
        </html>
      `;

    case 'modern':
      return `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="font-family: 'Inter', sans-serif; line-height: 1.6; color: #1e293b; margin: 0; padding: 0; background-color: #f1f5f9;">
          <div style="width: 100%; background-color: ${brandColor}; height: 8px;"></div>
          <div style="max-width: 600px; margin: 40px auto; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);">
            ${logoUrl ? `<div style="padding: 40px 40px 20px 40px; text-align: center;"><img src="${logoUrl}" alt="Logo" style="height: 48px; margin-bottom: 20px;"></div>` : ''}
            <div style="padding: 0 40px 40px 40px;">
              <h1 style="font-size: 24px; font-weight: 800; color: #0f172a; margin-bottom: 16px; text-align: center;">${subject}</h1>
              <div style="background-color: #f8fafc; border-radius: 12px; padding: 24px; font-size: 16px; color: #334155;">
                ${processedBody}
              </div>
               <div style="margin-top: 32px; text-align: center;">
                <a href="{{paymentLink}}" style="display: inline-block; background-color: ${brandColor}; color: #ffffff; padding: 14px 28px; border-radius: 50px; text-decoration: none; font-weight: 600; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);">Pay Invoice</a>
              </div>
            </div>
             ${FOOTER_HTML}
          </div>
        </body>
        </html>
      `;

    case 'classic':
      return `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="font-family: Georgia, serif; line-height: 1.6; color: #333333; margin: 0; padding: 20px; background-color: #ffffff;">
          <div style="max-width: 600px; margin: 0 auto; border: 1px solid #e0e0e0;">
            ${logoUrl ? `<div style="background-color: #f5f5f5; padding: 20px; border-bottom: 1px solid #e0e0e0; display: flex; align-items: center; justify-content: space-between;"><img src="${logoUrl}" alt="Logo" style="height: 32px;"></div>` : ''}
            <div style="padding: 40px;">
              <h2 style="font-family: Helvetica, Arial, sans-serif;font-size: 18px; margin-top: 0; color: ${brandColor};">${subject}</h2>
              <div style="font-size: 16px; margin-bottom: 30px;">
                 ${processedBody}
              </div>
              <p style="margin-bottom: 10px;">
                <a href="{{paymentLink}}" style="color: ${brandColor}; text-decoration: underline;">Click here to view invoice details</a>
              </p>
            </div>
            <div style="background-color: #fafafa; padding: 20px; border-top: 1px solid #e0e0e0; font-family: Helvetica, Arial, sans-serif; font-size: 11px; color: #888;">
              <p style="margin: 0;">This email was intended for the billing contact.</p>
            </div>
          </div>
        </body>
        </html>
      `;

    case 'noir':
      return `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="font-family: 'Inter', sans-serif; line-height: 1.6; color: #e2e8f0; margin: 0; padding: 0; background-color: #0f172a;">
          <div style="max-width: 600px; margin: 40px auto; background-color: #1e293b; border-radius: 20px; overflow: hidden; box-shadow: 0 4px 20px rgba(0, 0, 0, 0.4); border: 1px solid #334155;">
            ${logoUrl ? `<div style="background-color: #1e293b; padding: 40px 40px 20px 40px; text-align: center; border-bottom: 1px solid #334155;"><img src="${logoUrl}" alt="Logo" style="height: 48px; filter: brightness(0) invert(1);"></div>` : ''}
            <div style="padding: 40px;">
               <h1 style="font-size: 24px; font-weight: 700; color: #ffffff; margin-bottom: 24px; text-align: left;">${subject}</h1>
              <div style="font-size: 16px; color: #cbd5e1; font-weight: 400;">
                ${processedBody}
              </div>
               <div style="margin-top: 40px;">
                <a href="{{paymentLink}}" style="display: block; width: 100%; text-align: center; background-color: ${brandColor || '#ffffff'}; color: #000000; padding: 16px 24px; border-radius: 12px; text-decoration: none; font-weight: 700; font-size: 16px; transition: opacity 0.2s;">Pay Invoice</a>
              </div>
            </div>
            <div style="padding: 20px; text-align: center; font-size: 12px; color: #64748b; background-color: #0f172a;">
                 <p>© ${new Date().getFullYear()} PaperChai. Secure Payments.</p>
            </div>
          </div>
        </body>
        </html>
      `;
  }
};
