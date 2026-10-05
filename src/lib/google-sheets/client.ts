import { google } from 'googleapis';

const SPREADSHEET_ID = process.env.GOOGLE_SPREADSHEET_ID || '1J2R6ONPyoizosSviBW8QvqZaKyOB-BhHr2apA2eZK6Y';

export function getSpreadsheetId(): string {
  return process.env.GOOGLE_SPREADSHEET_ID || SPREADSHEET_ID;
}

export function isGoogleConfigured(): boolean {
  return Boolean(
    (process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL && process.env.GOOGLE_PRIVATE_KEY) ||
    process.env.GOOGLE_CREDENTIALS
  );
}

export async function getGoogleSheetsClient() {
  if (!isGoogleConfigured()) {
    return null;
  }

  try {
    let auth;
    if (process.env.GOOGLE_CREDENTIALS) {
      const credentials = JSON.parse(process.env.GOOGLE_CREDENTIALS);
      auth = new google.auth.GoogleAuth({
        credentials,
        scopes: ['https://www.googleapis.com/auth/spreadsheets'],
      });
    } else {
      const clientEmail = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
      let privateKey = process.env.GOOGLE_PRIVATE_KEY || '';
      // 改行コードのエスケープ解除
      privateKey = privateKey.replace(/\\n/g, '\n');

      auth = new google.auth.GoogleAuth({
        credentials: {
          client_email: clientEmail,
          private_key: privateKey,
        },
        scopes: ['https://www.googleapis.com/auth/spreadsheets'],
      });
    }

    const sheets = google.sheets({ version: 'v4', auth });
    return sheets;
  } catch (error) {
    console.error('Failed to initialize Google Sheets client:', error);
    return null;
  }
}
