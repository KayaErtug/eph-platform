import { Injectable } from '@nestjs/common';
import { AsyncLocalStorage } from 'node:async_hooks';
import { PrismaService } from '../prisma/prisma.service';

export const LINA_BUSY_MESSAGE = 'Lina şu an yoğun, lütfen tekrar deneyin.';
// Safety ceiling; the operational value is managed in SystemSetting.
const MAX_CHAT_TIMEOUT_MS = 22000;
const activeBudget = new AsyncLocalStorage<AbortSignal>();

export function assertLinaBudget() {
  activeBudget.getStore()?.throwIfAborted();
}

export function linaFetchSignal(local?: AbortSignal): AbortSignal {
  const request = activeBudget.getStore();
  return request && local ? AbortSignal.any([request, local])
    : request || local || AbortSignal.timeout(MAX_CHAT_TIMEOUT_MS);
}

@Injectable()
export class LinaChatBudgetService {
  constructor(private readonly prisma: PrismaService) {}

  async readTimeoutMs(): Promise<number> {
    const row = await this.prisma.systemSetting.findUnique({ where: { key: 'LINA_CHAT_TIMEOUT_MS' } });
    const json = row?.valueJson;
    const value = Number(json && typeof json === 'object' && !Array.isArray(json) ? json.value : json);
    return Number.isFinite(value) && value > 0 ? Math.min(Math.floor(value), MAX_CHAT_TIMEOUT_MS) : MAX_CHAT_TIMEOUT_MS;
  }

  async run<T>(work: () => Promise<T>) {
    const started = Date.now();
    const controller = new AbortController();
    let timer: ReturnType<typeof setTimeout>;
    const timeout = new Promise<never>((_, reject) => {
      const abort = () => {
        controller.abort(new Error('LINA_CHAT_TIMEOUT'));
        reject(controller.signal.reason);
      };
      timer = setTimeout(abort, MAX_CHAT_TIMEOUT_MS);
      controller.signal.addEventListener('abort', () => reject(controller.signal.reason), { once: true });
    });
    try {
      return await Promise.race([timeout, activeBudget.run(controller.signal, async () => {
        const configured = await this.readTimeoutMs();
        assertLinaBudget();
        clearTimeout(timer!);
        const remaining = configured - (Date.now() - started);
        timer = setTimeout(() => controller.abort(new Error('LINA_CHAT_TIMEOUT')), Math.max(0, remaining));
        if (remaining <= 0) controller.abort(new Error('LINA_CHAT_TIMEOUT'));
        assertLinaBudget();
        return work();
      })]);
    } catch (error) {
      if (!controller.signal.aborted) throw error;
      return { success: false, message: LINA_BUSY_MESSAGE, provider: 'local' as const, requiresConfirmation: false };
    } finally {
      clearTimeout(timer!);
    }
  }
}
