# 案件進行管理くん (Project Progress Manager)

中長期案件のスケジュール・各工程・TODOを一元管理できる社内向けWebアプリケーションです。  
Excelで行われていた進行管理をWeb化し、案件ごとの自由な階層作成、日本の祝日を考慮した営業日ベースの自動計算、工程日数変更に伴う後続工程の自動連動、担当者別TODOカレンダー表示、A4横向きクライアント提出用PDF出力を備えています。

---

## 🌟 主な機能・特徴

1. **Excelライクな洗練されたUI**
   - 大項目・中項目・工程の自由な多階層ツリー構造
   - 添付Excelのデザインを忠実に再現（制作タスク、監修確認、コンテ、仕上げ、イベント等の自動色分け）
   - 月・日・曜日の見やすいカレンダーヘッダー
   - 土日祝日の非稼働日グレー背景、今日の縦ライン表示
   - 長期案件に対応する横スクロールと「今日へジャンプ」機能
   - 階層の展開・折りたたみ対応

2. **営業日ベースの自動計算 & 後続工程自動再計算（最重要仕様）**
   - `@holiday-jp/holiday_jp` による日本の祝日・振替休日・国民の休日を完全考慮
   - 工程の日数（営業日数）を変更すると、直ちに後続工程の開始日・終了日を自動再計算してタイムラインへ反映
   - 「自動スケジュール（前工程に連続）」と「手動開始日」を工程単位で選択可能
   - 「シナリオ制作 / 10日」「監修 / 3日」などのテキストから一括して連続スケジュールを自動生成する機能

3. **TODO管理 & ガントチャート担当者別表示**
   - 案件ごとのTODOの登録・編集・ステータス管理
   - ガントチャート下部に担当者ごとの行（「TODO: 山田」「TODO: 佐藤」等）を自動生成
   - 期限日に該当するカレンダーセルにバッジを表示（期限超過・当日期限・接近・完了の色分け）
   - セルをクリックして即座に内容確認・編集が可能

4. **クライアント提出用 PDF / 印刷出力**
   - A4横向きの提出用フォーマット
   - 案件名、クライアント名、発行日、期間、工程一覧、備考を美しく出力
   - 社内情報を隠すため「担当者名の表示/非表示」「TODOセクションの表示/非表示」を選択可能

5. **Googleスプレッドシート連携 & 負荷対策**
   - 指定スプレッドシート（ID: `1J2R6ONPyoizosSviBW8QvqZaKyOB-BhHr2apA2eZK6Y`）をデータストアとして利用
   - 必要なシート（`Projects`, `ScheduleItems`, `Todos`, `Members`）が存在しない場合のみ安全に作成
   - ヘッダー名基準のマッピング、行単位の部分更新によるAPI負荷軽減
   - `updated_at` による楽観的ロック（同時編集競合検知）
   - Google API秘密鍵はサーバーサイドのみで管理（フロントへの露出ゼロ）
   - Repository層が完全に分離されており、将来のSupabase / PostgreSQLへの移行が容易

---

## 🛠 システム構成

- **フロントエンド / バックエンド**: Next.js 16 (App Router), TypeScript, React 19
- **スタイリング**: Tailwind CSS v4, Lucide Icons
- **日付・祝日計算**: `date-fns`, `@holiday-jp/holiday_jp`
- **データストア**: Google Sheets API (v4) / Google Cloud サービスアカウント
- **ホスティング**: Vercel

---

## 🚀 セットアップ・起動手順

### 1. 依存パッケージのインストール
```bash
npm install
```

### 2. 環境変数の設定
`.env.example` をコピーして `.env.local` を作成します。
```bash
cp .env.example .env.local
```

`.env.local` の設定項目:
```env
GOOGLE_SPREADSHEET_ID="1J2R6ONPyoizosSviBW8QvqZaKyOB-BhHr2apA2eZK6Y"

# Google Cloud サービスアカウント情報
GOOGLE_SERVICE_ACCOUNT_EMAIL="your-service-account@your-project.iam.gserviceaccount.com"
GOOGLE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
```

> **Google API未設定時の自動フォールバック:**  
> Google APIの認証情報が設定されていない場合でも、本アプリは自動的にローカルインメモリのモックリポジトリ（Excelサンプルデータ入り）で動作するため、ローカル環境ですぐに全機能を試すことができます。

### 3. Googleスプレッドシートへの権限付与
1. Google Cloud Console でサービスアカウントを作成し、秘密鍵を発行します。
2. 対象のGoogleスプレッドシート（`https://docs.google.com/spreadsheets/d/1J2R6ONPyoizosSviBW8QvqZaKyOB-BhHr2apA2eZK6Y/edit`）の共有設定を開きます。
3. サービスアカウントのメールアドレス（`GOOGLE_SERVICE_ACCOUNT_EMAIL`）に「**編集者**」権限を付与します。

### 4. 開発サーバーの起動
```bash
npm run dev
```
ブラウザで [http://localhost:3000](http://localhost:3000) を開きます。

---

## 🚢 Vercel へのデプロイ

1. 本リポジトリを GitHub へプッシュします。
2. Vercel のダッシュボードから該当リポジトリをインポートします。
3. **Environment Variables** に以下を設定します。
   - `GOOGLE_SPREADSHEET_ID` : `1J2R6ONPyoizosSviBW8QvqZaKyOB-BhHr2apA2eZK6Y`
   - `GOOGLE_SERVICE_ACCOUNT_EMAIL` : サービスアカウントのメールアドレス
   - `GOOGLE_PRIVATE_KEY` : サービスアカウントの秘密鍵
4. 「Deploy」をクリックすると自動的にビルド・デプロイが完了します。
