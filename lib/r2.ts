import { S3Client, PutObjectCommand, GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

const R2_ACCOUNT_ID = process.env.R2_ACCOUNT_ID;
const R2_ACCESS_KEY_ID = process.env.R2_ACCESS_KEY_ID;
const R2_SECRET_ACCESS_KEY = process.env.R2_SECRET_ACCESS_KEY;
const R2_BUCKET_NAME = process.env.R2_BUCKET_NAME;

const s3Client = new S3Client({
  region: "auto",
  endpoint: `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: R2_ACCESS_KEY_ID || "",
    secretAccessKey: R2_SECRET_ACCESS_KEY || "",
  },
});

/**
 * Upload an invoice PDF to Cloudflare R2
 * @param invoiceId The ID of the invoice
 * @param pdfBuffer The PDF content as a Buffer
 * @returns The key (path) of the stored object
 */
export async function uploadInvoicePdf(invoiceId: string, pdfBuffer: Buffer): Promise<string> {
  const key = `invoices/${invoiceId}.pdf`;

  const command = new PutObjectCommand({
    Bucket: R2_BUCKET_NAME,
    Key: key,
    Body: pdfBuffer,
    ContentType: "application/pdf",
  });

  await s3Client.send(command);
  return key;
}

/**
 * Upload a generic file to Cloudflare R2
 * @param key The destination key (path)
 * @param buffer The file content as a Buffer
 * @param contentType The MIME type of the file
 * @returns The key (path) of the stored object
 */
export async function uploadFile(
  key: string,
  buffer: Buffer,
  contentType: string
): Promise<string> {
  const command = new PutObjectCommand({
    Bucket: R2_BUCKET_NAME,
    Key: key,
    Body: buffer,
    ContentType: contentType,
  });

  await s3Client.send(command);
  return key;
}

/**
 * Get a presigned URL for an invoice PDF
 * @param key The R2 key of the PDF
 * @param expiresIn Time in seconds until the link expires (default 1 hour)
 */
export async function getInvoicePdfUrl(key: string, expiresIn: number = 3600): Promise<string> {
  const command = new GetObjectCommand({
    Bucket: R2_BUCKET_NAME,
    Key: key,
  });

  return await getSignedUrl(s3Client, command, { expiresIn });
}
