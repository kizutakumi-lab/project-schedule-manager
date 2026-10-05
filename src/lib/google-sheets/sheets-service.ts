import { getGoogleSheetsClient, getSpreadsheetId } from './client';

export const SHEET_NAMES = {
  PROJECTS: 'Projects',
  SCHEDULE_ITEMS: 'ScheduleItems',
  TODOS: 'Todos',
  MEMBERS: 'Members',
} as const;

export const SHEET_HEADERS: Record<string, string[]> = {
  [SHEET_NAMES.PROJECTS]: [
    'project_id',
    'project_name',
    'client_name',
    'owner',
    'start_date',
    'end_date',
    'status',
    'memo',
    'created_at',
    'updated_at',
  ],
  [SHEET_NAMES.SCHEDULE_ITEMS]: [
    'schedule_id',
    'project_id',
    'parent_id',
    'item_type',
    'name',
    'duration_business_days',
    'start_date',
    'end_date',
    'assignee',
    'sort_order',
    'auto_schedule',
    'dependency_id',
    'buffer_days',
    'memo',
    'created_at',
    'updated_at',
  ],
  [SHEET_NAMES.TODOS]: [
    'todo_id',
    'project_id',
    'title',
    'assignee',
    'due_date',
    'status',
    'memo',
    'created_at',
    'updated_at',
  ],
  [SHEET_NAMES.MEMBERS]: [
    'member_id',
    'name',
    'email',
    'active',
  ],
};

let sheetsInitialized = false;

/**
 * 必要なシートが存在するか確認し、未存在シートのみ安全に作成・ヘッダー初期化を行う
 */
export async function ensureSheetsExist() {
  if (sheetsInitialized) return true;

  const sheets = await getGoogleSheetsClient();
  if (!sheets) return false;

  const spreadsheetId = getSpreadsheetId();

  try {
    const meta = await sheets.spreadsheets.get({ spreadsheetId });
    const existingTitles = new Set(meta.data.sheets?.map(s => s.properties?.title) || []);

    const sheetsToCreate: string[] = [];
    for (const name of Object.values(SHEET_NAMES)) {
      if (!existingTitles.has(name)) {
        sheetsToCreate.push(name);
      }
    }

    if (sheetsToCreate.length > 0) {
      await sheets.spreadsheets.batchUpdate({
        spreadsheetId,
        requestBody: {
          requests: sheetsToCreate.map(title => ({
            addSheet: {
              properties: { title },
            },
          })),
        },
      });

      // 新設シートにヘッダー行を挿入
      for (const title of sheetsToCreate) {
        const headers = SHEET_HEADERS[title];
        if (headers) {
          await sheets.spreadsheets.values.update({
            spreadsheetId,
            range: `${title}!A1`,
            valueInputOption: 'RAW',
            requestBody: {
              values: [headers],
            },
          });
        }
      }
    }

    sheetsInitialized = true;
    return true;
  } catch (error) {
    console.error('Error ensuring sheets exist:', error);
    return false;
  }
}

/**
 * 指定シートの全行を取得し、ヘッダー名を基準としたオブジェクト配列に変換して返す
 */
export async function fetchSheetRows<T extends Record<string, any>>(sheetName: string): Promise<{ data: T[]; headerRow: string[]; rowIndexMap: Map<string, number> }> {
  const sheets = await getGoogleSheetsClient();
  if (!sheets) {
    return { data: [], headerRow: [], rowIndexMap: new Map() };
  }

  const spreadsheetId = getSpreadsheetId();
  await ensureSheetsExist();

  const response = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: `${sheetName}!A:Z`,
  });

  const values = response.data.values || [];
  if (values.length === 0) {
    return { data: [], headerRow: [], rowIndexMap: new Map() };
  }

  const headerRow: string[] = values[0].map(h => String(h).trim());
  const data: T[] = [];
  const rowIndexMap = new Map<string, number>(); // ID -> 1-indexed row number in spreadsheet

  const idColIndex = 0; // すべてのシートで1列目が固有ID（project_id, schedule_id, todo_id, member_id）

  for (let i = 1; i < values.length; i++) {
    const row = values[i];
    if (!row || row.length === 0) continue;

    const rowObj: any = {};
    for (let c = 0; c < headerRow.length; c++) {
      const key = headerRow[c];
      const val = row[c] !== undefined ? row[c] : '';
      rowObj[key] = val;
    }

    // 型の変換（boolean, number）
    if ('duration_business_days' in rowObj) {
      rowObj.duration_business_days = Number(rowObj.duration_business_days) || 0;
    }
    if ('sort_order' in rowObj) {
      rowObj.sort_order = Number(rowObj.sort_order) || 0;
    }
    if ('buffer_days' in rowObj && rowObj.buffer_days !== '') {
      rowObj.buffer_days = Number(rowObj.buffer_days) || 0;
    }
    if ('auto_schedule' in rowObj) {
      rowObj.auto_schedule = String(rowObj.auto_schedule).toLowerCase() === 'true' || rowObj.auto_schedule === true || rowObj.auto_schedule === '1';
    }
    if ('active' in rowObj) {
      rowObj.active = String(rowObj.active).toLowerCase() === 'true' || rowObj.active === true || rowObj.active === '1';
    }

    const id = row[idColIndex];
    if (id) {
      rowIndexMap.set(String(id), i + 1); // 1-indexed (A1 is row 1, first data row is 2)
      data.push(rowObj as T);
    }
  }

  return { data, headerRow, rowIndexMap };
}

/**
 * 1行をシートの末尾に追加する
 */
export async function appendSheetRow(sheetName: string, item: Record<string, any>): Promise<boolean> {
  const sheets = await getGoogleSheetsClient();
  if (!sheets) return false;

  const spreadsheetId = getSpreadsheetId();
  await ensureSheetsExist();

  const headers = SHEET_HEADERS[sheetName];
  const rowValues = headers.map(h => {
    const val = item[h];
    return val !== undefined && val !== null ? String(val) : '';
  });

  await sheets.spreadsheets.values.append({
    spreadsheetId,
    range: `${sheetName}!A1`,
    valueInputOption: 'USER_ENTERED',
    requestBody: {
      values: [rowValues],
    },
  });

  return true;
}

/**
 * 該当IDの行を部分更新する
 */
export async function updateSheetRow(
  sheetName: string,
  id: string,
  updates: Record<string, any>
): Promise<boolean> {
  const sheets = await getGoogleSheetsClient();
  if (!sheets) return false;

  const spreadsheetId = getSpreadsheetId();
  const { data, headerRow, rowIndexMap } = await fetchSheetRows(sheetName);

  const rowIndex = rowIndexMap.get(id);
  if (!rowIndex) {
    console.error(`Row with id ${id} not found in sheet ${sheetName}`);
    return false;
  }

  const existing = data.find((d: any) => Object.values(d)[0] === id) || {};
  const merged = { ...existing, ...updates };

  const rowValues = headerRow.map(h => {
    const val = merged[h];
    return val !== undefined && val !== null ? String(val) : '';
  });

  const lastColLetter = String.fromCharCode(64 + Math.min(26, headerRow.length));
  await sheets.spreadsheets.values.update({
    spreadsheetId,
    range: `${sheetName}!A${rowIndex}:${lastColLetter}${rowIndex}`,
    valueInputOption: 'USER_ENTERED',
    requestBody: {
      values: [rowValues],
    },
  });

  return true;
}

/**
 * 該当IDの行を削除（空白化または削除リクエスト）
 */
export async function deleteSheetRow(sheetName: string, id: string): Promise<boolean> {
  const sheets = await getGoogleSheetsClient();
  if (!sheets) return false;

  const spreadsheetId = getSpreadsheetId();
  const { rowIndexMap } = await fetchSheetRows(sheetName);

  const rowIndex = rowIndexMap.get(id);
  if (!rowIndex) return false;

  // シートIDを取得して行削除
  const meta = await sheets.spreadsheets.get({ spreadsheetId });
  const sheetObj = meta.data.sheets?.find(s => s.properties?.title === sheetName);
  const sheetNumericId = sheetObj?.properties?.sheetId;

  if (sheetNumericId === undefined) return false;

  await sheets.spreadsheets.batchUpdate({
    spreadsheetId,
    requestBody: {
      requests: [
        {
          deleteDimension: {
            range: {
              sheetId: sheetNumericId,
              dimension: 'ROWS',
              startIndex: rowIndex - 1,
              endIndex: rowIndex,
            },
          },
        },
      ],
    },
  });

  return true;
}
