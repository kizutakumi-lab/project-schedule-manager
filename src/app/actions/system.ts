'use server';

import { getCurrentStorageInfo, getMemberRepository } from '@/lib/repositories';
import { testGoogleSheetsConnection } from '@/lib/google-sheets/client';

export async function fetchSystemInfoAction(): Promise<{
  isGoogle: boolean;
  spreadsheetId: string;
  storageName: string;
  configured: boolean;
  sheetsStatus: 'connected' | 'mock' | 'error';
  errorMessage: string | null;
}> {
  const info = getCurrentStorageInfo();
  const diag = await testGoogleSheetsConnection();

  return {
    ...info,
    configured: diag.configured,
    sheetsStatus: diag.success ? 'connected' : (diag.configured ? 'error' : 'mock'),
    errorMessage: diag.error || null,
  };
}

export async function fetchMembersAction() {
  const repo = getMemberRepository();
  return await repo.getMembers();
}
