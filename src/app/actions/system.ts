'use server';

import { getCurrentStorageInfo, getMemberRepository } from '@/lib/repositories';
import { ensureSheetsExist } from '@/lib/google-sheets/sheets-service';

export async function fetchSystemInfoAction() {
  const info = getCurrentStorageInfo();
  let sheetsStatus: 'connected' | 'mock' | 'error' = 'mock';

  if (info.isGoogle) {
    try {
      const ok = await ensureSheetsExist();
      sheetsStatus = ok ? 'connected' : 'error';
    } catch {
      sheetsStatus = 'error';
    }
  }

  return {
    ...info,
    sheetsStatus,
  };
}

export async function fetchMembersAction() {
  const repo = getMemberRepository();
  return await repo.getMembers();
}
