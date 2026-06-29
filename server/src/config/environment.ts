
import dotenv from 'dotenv';

// Ensure .env is loaded (try to load from root if not already loaded)
dotenv.config();

const SMTP_PORT = parseInt(process.env.SMTP_PORT || '587', 10);

export const ENV = {
  PORT: process.env.PORT || 5001,
  MONGODB_URI: process.env.MONGODB_URI || 'mongodb://localhost:27017/examprep',
  CLIENT_URL: process.env.CLIENT_URL || 'http://localhost:5173',
  NODE_ENV: process.env.NODE_ENV || 'development',
  JWT_SECRET: process.env.JWT_SECRET || 'dev-only-insecure-secret',
  GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID,
  GOOGLE_CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET,
  API_URL: process.env.API_URL || `http://localhost:${process.env.PORT}/api`,

  // SMTP / email
  SMTP_HOST: process.env.SMTP_HOST,
  SMTP_PORT,
  // Implicit TLS on 465, STARTTLS otherwise. Override with SMTP_SECURE=true/false.
  SMTP_SECURE: process.env.SMTP_SECURE ? process.env.SMTP_SECURE === 'true' : SMTP_PORT === 465,
  SMTP_USER: process.env.SMTP_USER,
  SMTP_PASS: process.env.SMTP_PASS,
  EMAIL_FROM: process.env.EMAIL_FROM || '"ExamPrep Support" <noreply@examprep.com>',
};

// Fail fast in production if a real JWT secret wasn't provided.
if (ENV.NODE_ENV === 'production' && !process.env.JWT_SECRET) {
  throw new Error('JWT_SECRET must be set in production');
}

/** True only when all SMTP credentials are present. */
export const isEmailConfigured = Boolean(ENV.SMTP_HOST && ENV.SMTP_USER && ENV.SMTP_PASS);
