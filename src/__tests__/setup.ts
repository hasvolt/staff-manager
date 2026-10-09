import 'fake-indexeddb/auto';
import indexedDB from 'fake-indexeddb';
// @ts-expect-error fake-indexeddb submodule export typing
import IDBKeyRange from 'fake-indexeddb/lib/FDBKeyRange';

if (!globalThis.indexedDB) {
  globalThis.indexedDB = indexedDB;
}
if (!globalThis.IDBKeyRange) {
  globalThis.IDBKeyRange = IDBKeyRange;
}

// Global DOM mocks for testing environment
if (typeof (globalThis as any).window === 'undefined') {
  (globalThis as any).window = globalThis;
}
if (typeof (globalThis as any).document === 'undefined') {
  (globalThis as any).document = {
    title: 'Staff Manager',
    fonts: { ready: Promise.resolve() },
    images: [],
    body: {
      appendChild: () => {},
      removeChild: () => {},
    },
    createElement: (tag: string) => {
      const attrs: Record<string, string> = {};
      return {
        tagName: tag.toUpperCase(),
        setAttribute: (k: string, v: string) => {
          attrs[k] = v;
        },
        getAttribute: (k: string) => attrs[k] || '',
        click: () => {},
      };
    },
  };
}
if (typeof (globalThis as any).requestAnimationFrame === 'undefined') {
  (globalThis as any).requestAnimationFrame = (cb: Function) => setTimeout(cb, 0);
}
if (typeof globalThis.URL.createObjectURL === 'undefined') {
  globalThis.URL.createObjectURL = () => 'blob:mock-url';
  globalThis.URL.revokeObjectURL = () => {};
}

