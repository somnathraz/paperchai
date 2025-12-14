import nodemailer from 'nodemailer';

export type SendEmailOptions = {
    to: string;
    bcc?: string;
    subject: string;
    html: string;
    from?: string;
};

// Create reusable transporter (lazy initialization)
let transporter: nodemailer.Transporter | null = null;

function getTransporter(): nodemailer.Transporter | null {
    if (!process.env.SMTP_HOST) {
        return null;
    }

    if (!transporter) {
        transporter = nodemailer.createTransport({
            host: process.env.SMTP_HOST,
            port: parseInt(process.env.SMTP_PORT || '587'),
            secure: process.env.SMTP_SECURE === 'true',
            auth: {
                user: process.env.SMTP_USER,
                pass: process.env.SMTP_PASS,
            },
        });
    }

    return transporter;
}

export async function sendEmail({ to, bcc, subject, html, from }: SendEmailOptions): Promise<boolean> {
    const mailer = getTransporter();

    // Fallback to console logging if SMTP not configured
    if (!mailer) {
        console.warn("⚠️ SMTP not configured - logging email instead:");
        console.log("--- EMAIL (NOT SENT) ---");
        console.log("To:", to);
        console.log("Bcc:", bcc);
        console.log("From:", from || process.env.SMTP_FROM || "PaperChai System");
        console.log("Subject:", subject);
        console.log("Body Length:", html.length);
        console.log("------------------------");
        return true;
    }

    try {
        const result = await mailer.sendMail({
            from: from || process.env.SMTP_FROM || 'noreply@paperchai.com',
            to,
            bcc,
            subject,
            html,
        });

        console.log("✅ Email sent:", result.messageId);
        return true;
    } catch (error) {
        console.error("❌ Failed to send email:", error);
        throw error;
    }
}
