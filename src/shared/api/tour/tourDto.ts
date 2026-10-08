import { errorForCode, TourError } from './tourError.ts';
export type TourRecord = Record<string, unknown>;
export interface TourPage { items: TourRecord[]; totalCount: number; page: number; pageSize: number; resultCode: string; status: number }
export function record(value: unknown): TourRecord {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new TourError('format');
  return Object.fromEntries(Object.entries(value));
}
export function textField(item: TourRecord, field: string): string | undefined {
  const value = item[field];
  return typeof value === 'string' && value.trim() ? value.trim() : undefined;
}
export function requiredText(item: TourRecord, field: string): string {
  const value = textField(item, field);
  if (!value) throw new TourError('format');
  return value;
}
function integer(value: unknown): number {
  if (typeof value !== 'number' && (typeof value !== 'string' || !/^\d+$/.test(value))) throw new TourError('format');
  const result = Number(value);
  if (!Number.isSafeInteger(result) || result < 0) throw new TourError('format');
  return result;
}
function httpError(status: number) {
  return new TourError(status === 429 ? 'quota' : status === 401 || status === 403 ? 'authentication' : 'http', undefined, status);
}
export function parseTourResponse(body: string, status: number): TourPage {
  let value: unknown;
  try { value = JSON.parse(body); }
  catch {
    const match = body.match(/<(?:returnReasonCode|resultCode)>\s*(\d{1,3})\s*<\//);
    if (match) throw errorForCode(match[1], status);
    if (status < 200 || status >= 300) throw httpError(status);
    throw new TourError('format', undefined, status);
  }
  let root: TourRecord;
  try { root = record(value); } catch { throw status < 200 || status >= 300 ? httpError(status) : new TourError('format', undefined, status); }
  if (root.OpenAPI_ServiceResponse) {
    const gateway = record(record(root.OpenAPI_ServiceResponse).cmmMsgHeader);
    const code = requiredText(gateway, 'returnReasonCode');
    if (!/^\d{1,4}$/.test(code)) throw new TourError('format', undefined, status);
    throw errorForCode(code, status);
  }
  if (status < 200 || status >= 300) {
    let code: string | undefined;
    try { code = textField(record(record(root.response).header), 'resultCode'); } catch { /* HTTP 오류에는 본문 형식이 보장되지 않는다. */ }
    if (code && /^\d{1,4}$/.test(code) && code !== '0000' && code !== '00') throw errorForCode(code, status);
    throw httpError(status);
  }
  const response = record(root.response);
  const header = record(response.header);
  const code = requiredText(header, 'resultCode');
  if (!/^\d{1,4}$/.test(code)) throw new TourError('format', undefined, status);
  if (code !== '0000' && code !== '00') throw errorForCode(code, status);
  const content = record(response.body);
  const totalCount = integer(content.totalCount);
  const page = integer(content.pageNo);
  const pageSize = integer(content.numOfRows);
  const rawItems = content.items;
  let items: TourRecord[] = [];
  if (rawItems !== '' && rawItems !== undefined && rawItems !== null) {
    const raw = record(rawItems).item;
    if (raw !== undefined && raw !== '' && raw !== null) items = (Array.isArray(raw) ? raw : [raw]).map(record);
  }
  if (totalCount > 0 && !items.length && page * pageSize <= totalCount) throw new TourError('format');
  return { items, totalCount, page, pageSize, resultCode: code, status };
}
