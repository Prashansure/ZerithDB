import { readable, writable, derived } from "svelte/store";
import { createApp } from "zerithdb-sdk";
import type { ZerithDBConfig, Document } from "zerithdb-sdk";
import type { Readable, Writable } from "svelte/store";

// ── App instance ──────────────────────────────────────────────────────────────

let _app: ReturnType<typeof createApp> | null = null;

/**
 * Initialize the ZerithDB app instance.
 * Call this once at the top of your Svelte app (e.g. in `+layout.svelte`).
 *
 * @example
 * ```svelte
 * <script>
 *   import { initZerith } from "zerithdb-svelte";
 *   initZerith({ appId: "my-app" });
 * </script>
 * ```
 */
export function initZerith(config: ZerithDBConfig): ReturnType<typeof createApp> {
  _app = createApp(config);
  return _app;
}

/**
 * Get the current ZerithDB app instance.
 * Throws if `initZerith` has not been called.
 */
export function getZerith(): ReturnType<typeof createApp> {
  if (!_app) {
    throw new Error("ZerithDB not initialized. Call initZerith(config) first.");
  }
  return _app;
}

// ── Collection store ──────────────────────────────────────────────────────────

export interface CollectionStore<T extends Record<string, any>> {
  /** Svelte readable store — subscribe to live document updates */
  subscribe: Readable<Document<T>[]>["subscribe"];
  /** Insert a new document */
  insert(doc: T): Promise<{ id: string }>;
  /** Update documents matching a filter */
  update(filter: Partial<T>, spec: { $set: Partial<T> }): Promise<number>;
  /** Delete documents matching a filter */
  delete(filter: Partial<T>): Promise<number>;
  /** Refetch documents from IndexedDB */
  refresh(): Promise<void>;
}

/**
 * Create a reactive Svelte store for a ZerithDB collection.
 * The store automatically updates when documents change.
 *
 * @example
 * ```svelte
 * <script>
 *   import { collectionStore } from "zerithdb-svelte";
 *   const todos = collectionStore("todos");
 * </script>
 *
 * {#each $todos as todo}
 *   <p>{todo.text}</p>
 * {/each}
 *
 * <button on:click={() => todos.insert({ text: "New task", done: false })}>
 *   Add
 * </button>
 * ```
 */
export function collectionStore<T extends Record<string, any>>(
  collectionName: string,
  filter: Partial<T> = {}
): CollectionStore<T> {
  const app = getZerith();
  const collection = app.db<T>(collectionName);

  const store = writable<Document<T>[]>([]);

  // Initial load
  collection.find(filter).then((docs) => store.set(docs));

  // Subscribe to real-time CRDT updates if supported
  if (typeof (collection as any).subscribe === "function") {
    (collection as any).subscribe((docs: Document<T>[]) => {
      store.set(docs);
    });
  }

  return {
    subscribe: store.subscribe,

    async insert(doc: T) {
      const result = await collection.insert(doc);
      const updated = await collection.find(filter);
      store.set(updated);
      return result;
    },

    async update(f: Partial<T>, spec: { $set: Partial<T> }) {
      const count = await collection.update(f, spec);
      const updated = await collection.find(filter);
      store.set(updated);
      return count;
    },

    async delete(f: Partial<T>) {
      const count = await collection.delete(f);
      const updated = await collection.find(filter);
      store.set(updated);
      return count;
    },

    async refresh() {
      const updated = await collection.find(filter);
      store.set(updated);
    },
  };
}

// ── Derived helpers ───────────────────────────────────────────────────────────

/**
 * Create a derived store that filters documents client-side.
 *
 * @example
 * ```svelte
 * <script>
 *   import { collectionStore, filteredStore } from "zerithdb-svelte";
 *   const todos = collectionStore("todos");
 *   const pending = filteredStore(todos, (t) => !t.done);
 * </script>
 * ```
 */
export function filteredStore<T extends Record<string, any>>(
  store: CollectionStore<T>,
  predicate: (doc: Document<T>) => boolean
): Readable<Document<T>[]> {
  return derived({ subscribe: store.subscribe }, ($docs) => $docs.filter(predicate));
}

/**
 * Create a derived store that sorts documents client-side.
 *
 * @example
 * ```svelte
 * <script>
 *   const sorted = sortedStore(todos, (a, b) => a._createdAt - b._createdAt);
 * </script>
 * ```
 */
export function sortedStore<T extends Record<string, any>>(
  store: CollectionStore<T>,
  compareFn: (a: Document<T>, b: Document<T>) => number
): Readable<Document<T>[]> {
  return derived({ subscribe: store.subscribe }, ($docs) => [...$docs].sort(compareFn));
}
