import { google } from 'googleapis';

const SPREADSHEET_ID = '1J2R6ONPyoizosSviBW8QvqZaKyOB-BhHr2apA2eZK6Y';

export function getSpreadsheetId(): string {
  const raw = (process.env.GOOGLE_SPREADSHEET_ID || SPREADSHEET_ID).trim();
  // URLがそのまま貼り付けられていた場合、ID部分のみ抽出 (例: /spreadsheets/d/XXXX/edit)
  const match = raw.match(/\/d\/([a-zA-Z0-9-_]+)/);
  if (match) {
    return match[1];
  }
  return raw;
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
      let credsStr = process.env.GOOGLE_CREDENTIALS.trim();
      if ((credsStr.startsWith('"') && credsStr.endsWith('"')) ||
          (credsStr.startsWith("'") && credsStr.endsWith("'"))) {
        credsStr = credsStr.slice(1, -1).trim();
      }
      const credentials = JSON.parse(credsStr);
      auth = new google.auth.GoogleAuth({
        credentials,
        scopes: ['https://www.googleapis.com/auth/spreadsheets'],
      });
    } else {
      const clientEmail = (process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL || '').trim();
      let privateKey = (process.env.GOOGLE_PRIVATE_KEY || '').trim();

      // 先頭・末尾のクォート (" や ') を除去
      if ((privateKey.startsWith('"') && privateKey.endsWith('"')) ||
          (privateKey.startsWith("'") && privateKey.endsWith("'"))) {
        privateKey = privateKey.slice(1, -1).trim();
      }

      // エスケープされた \n を実際の改行コードに置換
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
