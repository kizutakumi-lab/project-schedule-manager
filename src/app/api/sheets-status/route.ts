import { NextResponse } from 'next/server';
import { testGoogleSheetsConnection, getSpreadsheetId } from '@/lib/google-sheets/client';

export const dynamic = 'force-dynamic';

export async function GET() {
  const result = await testGoogleSheetsConnection();

  return NextResponse.json({
    status: result.success ? 'ok' : 'error',
    diagnosis: result,
    help: result.success
      ? 'Googleスプレッドシートへの接続・読み書き権限が正常に確認できました！'
      : {
          suggestion: '以下のチェック項目を確認してください：',
          checks: [
            '1. Googleスプレッドシートの「共有」にサービスアカウントのメールアドレス（GOOGLE_SERVICE_ACCOUNT_EMAIL）を「編集者」として追加しましたか？',
            '2. Google Cloud Consoleで「Google Sheets API」を有効化（Enable）しましたか？',
            '3. Vercelの環境変数で Production / Preview の両方にチェックを入れて保存しましたか？',
            '4. もしくは GOOGLE_CREDENTIALS にサービスアカウントJSONの全文をそのまま貼り付けると確実です。',
          ],
        },
  });
}
