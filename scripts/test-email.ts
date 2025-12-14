/**
 * AWS SES Email Test Script
 * 
 * Usage: npx ts-node scripts/test-email.ts
 * 
 * Required ENV vars:
 * - SMTP_HOST (e.g., email-smtp.ap-south-1.amazonaws.com)
 * - SMTP_PORT (e.g., 587)
 * - SMTP_USER (AWS SES SMTP username)
 * - SMTP_PASS (AWS SES SMTP password)
 * - SMTP_FROM (verified sender email)
 * - TEST_EMAIL_TO (recipient email for testing)
 */

import nodemailer from 'nodemailer';

// ========== LOGGING HELPERS ==========
const log = {
    info: (msg: string, data?: any) => {
        console.log(`[${new Date().toISOString()}] ℹ️  INFO: ${msg}`);
        if (data) console.log(JSON.stringify(data, null, 2));
    },
    success: (msg: string, data?: any) => {
        console.log(`[${new Date().toISOString()}] ✅ SUCCESS: ${msg}`);
        if (data) console.log(JSON.stringify(data, null, 2));
    },
    error: (msg: string, error?: any) => {
        console.error(`[${new Date().toISOString()}] ❌ ERROR: ${msg}`);
        if (error) {
            console.error('Error Details:', error.message || error);
            if (error.stack) console.error('Stack:', error.stack);
        }
    },
    warn: (msg: string) => {
        console.warn(`[${new Date().toISOString()}] ⚠️  WARN: ${msg}`);
    },
    divider: () => {
        console.log('\n' + '='.repeat(60) + '\n');
    }
};

// ========== CONFIGURATION ==========
function getConfig() {
    const config = {
        host: process.env.SMTP_HOST || '',
        port: parseInt(process.env.SMTP_PORT || '587'),
        secure: process.env.SMTP_SECURE === 'true',
        user: process.env.SMTP_USER || '',
        pass: process.env.SMTP_PASS || '',
        from: process.env.SMTP_FROM || 'noreply@paperchai.com',
        testTo: process.env.TEST_EMAIL_TO || '',
    };

    return config;
}

function validateConfig(config: ReturnType<typeof getConfig>) {
    const missing: string[] = [];

    if (!config.host) missing.push('SMTP_HOST');
    if (!config.user) missing.push('SMTP_USER');
    if (!config.pass) missing.push('SMTP_PASS');
    if (!config.testTo) missing.push('TEST_EMAIL_TO');

    if (missing.length > 0) {
        log.error(`Missing required environment variables: ${missing.join(', ')}`);
        log.info('Please set these in your .env file or environment');
        return false;
    }

    return true;
}

// ========== EMAIL TEST ==========
async function testSMTPConnection(config: ReturnType<typeof getConfig>) {
    log.info('Testing SMTP connection...');
    log.info('Configuration:', {
        host: config.host,
        port: config.port,
        secure: config.secure,
        user: config.user.substring(0, 8) + '...',
        from: config.from,
    });

    const transporter = nodemailer.createTransport({
        host: config.host,
        port: config.port,
        secure: config.secure,
        auth: {
            user: config.user,
            pass: config.pass,
        },
        logger: true, // Enable nodemailer logging
        debug: true,  // Enable debug output
    });

    try {
        await transporter.verify();
        log.success('SMTP connection verified successfully!');
        return transporter;
    } catch (error) {
        log.error('SMTP connection failed', error);
        return null;
    }
}

async function sendTestEmail(transporter: nodemailer.Transporter, config: ReturnType<typeof getConfig>) {
    log.divider();
    log.info('Sending test email...');
    log.info('Email details:', {
        from: config.from,
        to: config.testTo,
        subject: 'PaperChai - AWS SES Test Email',
    });

    const testHtml = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Test Email</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
    <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; border-radius: 12px 12px 0 0; text-align: center;">
        <h1 style="color: white; margin: 0; font-size: 24px;">🎉 PaperChai Email Test</h1>
    </div>
    <div style="background: #f8fafc; padding: 30px; border: 1px solid #e2e8f0; border-top: none; border-radius: 0 0 12px 12px;">
        <h2 style="color: #1e293b; margin-top: 0;">AWS SES Connection Successful!</h2>
        <p style="color: #64748b;">This is a test email sent from PaperChai to verify your AWS SES configuration.</p>
        
        <div style="background: white; border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px; margin: 20px 0;">
            <h3 style="margin: 0 0 12px 0; color: #334155; font-size: 14px; text-transform: uppercase;">Test Details</h3>
            <table style="width: 100%; font-size: 14px;">
                <tr>
                    <td style="padding: 4px 0; color: #64748b;">Timestamp:</td>
                    <td style="padding: 4px 0; color: #1e293b; font-weight: 500;">${new Date().toISOString()}</td>
                </tr>
                <tr>
                    <td style="padding: 4px 0; color: #64748b;">From:</td>
                    <td style="padding: 4px 0; color: #1e293b; font-weight: 500;">${config.from}</td>
                </tr>
                <tr>
                    <td style="padding: 4px 0; color: #64748b;">SMTP Host:</td>
                    <td style="padding: 4px 0; color: #1e293b; font-weight: 500;">${config.host}</td>
                </tr>
            </table>
        </div>
        
        <p style="color: #64748b; font-size: 14px;">If you received this email, your AWS SES setup is working correctly! ✅</p>
        
        <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e2e8f0; text-align: center;">
            <p style="color: #94a3b8; font-size: 12px; margin: 0;">
                PaperChai Invoice Management System
            </p>
        </div>
    </div>
</body>
</html>
    `;

    const startTime = Date.now();

    try {
        const result = await transporter.sendMail({
            from: config.from,
            to: config.testTo,
            subject: `[TEST] PaperChai AWS SES Test - ${new Date().toLocaleString()}`,
            html: testHtml,
        });

        const duration = Date.now() - startTime;

        log.success('Email sent successfully!', {
            messageId: result.messageId,
            response: result.response,
            accepted: result.accepted,
            rejected: result.rejected,
            duration: `${duration}ms`,
        });

        return true;
    } catch (error) {
        log.error('Failed to send email', error);
        return false;
    }
}

// ========== MAIN ==========
async function main() {
    console.log('\n');
    log.info('========================================');
    log.info('PaperChai AWS SES Email Test Script');
    log.info('========================================');
    log.divider();

    // Load .env if available
    try {
        const dotenv = require('dotenv');
        const path = require('path');
        const fs = require('fs');

        const envPath = path.resolve(process.cwd(), '.env');
        if (fs.existsSync(envPath)) {
            dotenv.config({ path: envPath });
            log.info('Loaded .env file from: ' + envPath);
        } else {
            log.warn('.env file not found at: ' + envPath);
        }
    } catch (error) {
        log.warn('Could not load dotenv module. Using existing environment variables.');
    }

    const config = getConfig();

    if (!validateConfig(config)) {
        process.exit(1);
    }

    const transporter = await testSMTPConnection(config);
    if (!transporter) {
        process.exit(1);
    }

    const success = await sendTestEmail(transporter, config);

    log.divider();
    if (success) {
        log.success('All tests passed! Your AWS SES configuration is working.');
        log.info(`Check your inbox at: ${config.testTo}`);
    } else {
        log.error('Email test failed. Please check the logs above.');
        process.exit(1);
    }

    // Close the transporter
    transporter.close();
}

main().catch((error) => {
    log.error('Unexpected error', error);
    process.exit(1);
});
