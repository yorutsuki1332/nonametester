import firebase from 'firebase/compat/app';

export function errorMessage(error: unknown): string {
  if (error instanceof Error && error.message) return error.message;
  return '未知錯誤';
}

export function errorCode(error: unknown): string | undefined {
  if (typeof error === 'object' && error !== null && 'code' in error && typeof error.code === 'string') {
    return error.code;
  }
  return undefined;
}

export function withoutDocumentId(data: firebase.firestore.DocumentData): Record<string, unknown> {
  const rest = { ...data };
  delete rest.id;
  return rest;
}

export interface OrderEmailItem {
  name: string;
  quantity: number;
  price: number;
}
