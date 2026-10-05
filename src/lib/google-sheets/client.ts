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

      // 改行コードの統一
      privateKey = privateKey.replace(/\r\n/g, '\n').replace(/\\n/g, '\n');

      // ヘッダー・フッターが欠落している場合の自動補完
      if (!privateKey.includes('-----BEGIN') && privateKey.length > 50) {
        privateKey = `-----BEGIN PRIVATE KEY-----\n${privateKey}\n-----END PRIVATE KEY-----\n`;
      }

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

/**
 * Googleスプレッドシートへの接続診断を行う
 */
export async function testGoogleSheetsConnection(): Promise<{
  configured: boolean;
  spreadsheetId: string;
  hasEmail: boolean;
  hasPrivateKey: boolean;
  hasCredentialsJson: boolean;
  success: boolean;
  error?: string;
  sheetTitles?: string[];
}> {
  const spreadsheetId = getSpreadsheetId();
  const hasEmail = Boolean(process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL);
  const hasPrivateKey = Boolean(process.env.GOOGLE_PRIVATE_KEY);
  const hasCredentialsJson = Boolean(process.env.GOOGLE_CREDENTIALS);
  const configured = isGoogleConfigured();

  if (!configured) {
    return {
      configured: false,
      spreadsheetId,
      hasEmail,
      hasPrivateKey,
      hasCredentialsJson,
      success: false,
      error: 'Google APIの環境変数が設定されていません。（GOOGLE_SERVICE_ACCOUNT_EMAIL と GOOGLE_PRIVATE_KEY、または GOOGLE_CREDENTIALS）',
    };
  }

  try {
    const sheets = await getGoogleSheetsClient();
    if (!sheets) {
      return {
        configured: true,
        spreadsheetId,
        hasEmail,
        hasPrivateKey,
        hasCredentialsJson,
        success: false,
        error: 'GoogleSheetsクライアントの初期化に失敗しました。秘密鍵（GOOGLE_PRIVATE_KEY）の文字列形式を確認してください。',
      };
    }

    const meta = await sheets.spreadsheets.get({ spreadsheetId });
    const sheetTitles = meta.data.sheets?.map(s => s.properties?.title || '').filter(Boolean) || [];

    return {
      configured: true,
      spreadsheetId,
      hasEmail,
      hasPrivateKey,
      hasCredentialsJson,
      success: true,
      sheetTitles,
    };
  } catch (err: any) {
    return {
      configured: true,
      spreadsheetId,
      hasEmail,
      hasPrivateKey,
      hasCredentialsJson,
      success: false,
      error: err?.message || String(err),
    };
  }
}
