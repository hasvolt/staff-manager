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
