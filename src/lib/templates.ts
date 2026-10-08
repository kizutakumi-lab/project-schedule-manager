export interface ScheduleTemplate {
  id: string;
  name: string;
  description: string;
  parentType: 'category' | 'group';
  defaultCategoryName: string;
  content: string;
  isCustom?: boolean;
}

export const DEFAULT_TEMPLATES: ScheduleTemplate[] = [
  {
    id: 'tpl-anime',
    name: 'アニメーション制作（標準）',
    description: '企画・コンテ・作画・仕上げ・納品までの一連工程',
    parentType: 'category',
    defaultCategoryName: 'アニメーション制作',
    content: `シナリオ制作 / 10日 / DLE
確認（監修） / 3日 / クライアント
動画コンテ制作 / 8日 / DLE
確認（監修） / 3日 / クライアント
作画・アニメーション / 15日 / DLE
音響・BGM制作 / 8日 / DLE / 並行
編集・仕上げ / 5日 / DLE
初号プレビュー / 3日 / クライアント
納品データ作成 / 2日 / DLE`,
    isCustom: false,
  },
  {
    id: 'tpl-movie',
    name: '実写動画・プロモーションPV',
    description: '企画構成からロケ、撮影、編集、MA、納品まで',
    parentType: 'category',
    defaultCategoryName: 'PV・プロモーション動画',
    content: `企画構成・台本作成 / 7日 / DLE
企画・台本確認 / 3日 / クライアント
ロケハン・香盤表作成 / 4日 / DLE
撮影 / 2日 / DLE
仮編集（オフライン） / 6日 / DLE
仮編集確認 / 3日 / クライアント
本編集・MA・CG / 5日 / DLE
完成プレビュー / 2日 / クライアント
納品 / 1日 / DLE`,
    isCustom: false,
  },
  {
    id: 'tpl-web',
    name: 'WEBサイト・LP制作',
    description: '要件定義、デザイン、コーディング、検証、公開まで',
    parentType: 'category',
    defaultCategoryName: 'WEBサイト制作',
    content: `要件定義・構成案作成 / 5日 / DLE
構成案確認・素材提供 / 3日 / クライアント
ワイヤーフレーム作成 / 5日 / DLE
デザイン制作 / 8日 / DLE
デザイン確認 / 4日 / クライアント
コーディング・実装 / 10日 / DLE
テスト・検証 / 4日 / DLE
公開前最終確認 / 2日 / クライアント
本番公開・納品 / 1日 / DLE`,
    isCustom: false,
  },
  {
    id: 'tpl-character',
    name: 'キャラクターデザイン・イラスト',
    description: 'ラフ案から線画、着彩、納品まで',
    parentType: 'category',
    defaultCategoryName: 'キャラクターデザイン',
    content: `ラフ案・設定作成 / 6日 / DLE
ラフ確認・フィードバック / 3日 / クライアント
線画・カラー制作 / 6日 / DLE
線画確認 / 2日 / クライアント
着彩・仕上げ / 5日 / DLE
最終監修 / 2日 / クライアント
納品データ作成 / 1日 / DLE`,
    isCustom: false,
  },
  {
    id: 'tpl-event',
    name: 'イベント・キャンペーン企画',
    description: '企画立案、クリエイティブ準備、告知、当日運営まで',
    parentType: 'category',
    defaultCategoryName: 'イベント・キャンペーン',
    content: `企画書作成 / 6日 / DLE
企画確認・承認 / 3日 / クライアント
告知クリエイティブ制作 / 8日 / DLE
備品・会場手配 / 5日 / DLE / 並行
告知開始・集客運用 / 12日 / DLE
リハーサル・準備 / 1日 / DLE
本番当日運営 / 1日 / DLE
事後レポート作成 / 3日 / DLE`,
    isCustom: false,
  },
];

const STORAGE_KEY = 'project_schedule_templates_v1';

/**
 * テンプレート一覧を取得（デフォルト + localStorageのカスタムテンプレート）
 */
export function getSavedTemplates(): ScheduleTemplate[] {
  if (typeof window === 'undefined') return DEFAULT_TEMPLATES;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_TEMPLATES;
    const custom: ScheduleTemplate[] = JSON.parse(raw);
    return [...DEFAULT_TEMPLATES, ...custom];
  } catch (e) {
    console.error('Failed to parse templates from localStorage:', e);
    return DEFAULT_TEMPLATES;
  }
}

/**
 * 新しいカスタムテンプレートを保存
 */
export function saveCustomTemplate(template: Omit<ScheduleTemplate, 'id' | 'isCustom'>): ScheduleTemplate {
  const newTpl: ScheduleTemplate = {
    ...template,
    id: `custom-tpl-${Date.now()}`,
    isCustom: true,
  };

  try {
    const current = getCustomTemplates();
    current.push(newTpl);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(current));
  } catch (e) {
    console.error('Failed to save custom template:', e);
  }

  return newTpl;
}

/**
 * カスタムテンプレートのみを取得
 */
export function getCustomTemplates(): ScheduleTemplate[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

/**
 * カスタムテンプレートを削除
 */
export function deleteCustomTemplate(id: string): void {
  try {
    const current = getCustomTemplates().filter(t => t.id !== id);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(current));
  } catch (e) {
    console.error('Failed to delete custom template:', e);
  }
}
