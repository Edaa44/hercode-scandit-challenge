import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { Recommendation } from "@/lib/types";

const STORAGE_KEY_V1 = "trailable.favorites.v1";
const STORAGE_KEY = "trailable.favorites.v2";
const DEFAULT_LIST_NAME = "My Favorites";

export function favoriteId(rec: Recommendation): string {
  return `${rec.group.product_id}::${rec.variant.product_code}`;
}

export type FavoriteList = {
  id: string;
  name: string;
  items: Recommendation[];
};

type FavoritesContextValue = {
  /** All saved lists, in display order. */
  lists: FavoriteList[];
  /** Flat, de-duplicated union of items across every list. */
  items: Recommendation[];
  /** Union of favorite ids across every list. */
  ids: Set<string>;
  /** True if the item is in at least one list. */
  isFavorite: (rec: Recommendation) => boolean;
  /** Returns the ids of lists that contain the item. */
  listsContaining: (rec: Recommendation) => string[];
  /** Toggle the item in the first list (creates default if none exists). */
  toggle: (rec: Recommendation) => void;
  /** Add an item to a specific list (no-op if already there). */
  addToList: (listId: string, rec: Recommendation) => void;
  /** Remove an item from a specific list. */
  removeFromList: (listId: string, id: string) => void;
  /** Remove an item from every list. */
  remove: (id: string) => void;
  /** Create a new list and return its id. */
  createList: (name: string) => string;
  renameList: (listId: string, name: string) => void;
  deleteList: (listId: string) => void;
  /** Clear every list (keeps the lists themselves, empties items). */
  clear: () => void;
};

const FavoritesContext = createContext<FavoritesContextValue | null>(null);

function newId(): string {
  return `lst_${Math.random().toString(36).slice(2, 9)}_${Date.now().toString(36)}`;
}

function makeDefaultList(items: Recommendation[] = []): FavoriteList {
  return { id: newId(), name: DEFAULT_LIST_NAME, items };
}

export function FavoritesProvider({ children }: { children: ReactNode }) {
  const [lists, setLists] = useState<FavoriteList[]>(() => [makeDefaultList()]);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setLists(parsed as FavoriteList[]);
        }
      } else {
        // Migrate v1 (flat array) → v2 (single default list).
        const legacy = window.localStorage.getItem(STORAGE_KEY_V1);
        if (legacy) {
          const parsed = JSON.parse(legacy);
          if (Array.isArray(parsed) && parsed.length > 0) {
            setLists([makeDefaultList(parsed as Recommendation[])]);
          }
        }
      }
    } catch (err) {
      console.warn("favorites: failed to load", err);
    }
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated || typeof window === "undefined") return;
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(lists));
    } catch (err) {
      console.warn("favorites: failed to save", err);
    }
  }, [lists, hydrated]);

  const items = useMemo(() => {
    const seen = new Set<string>();
    const out: Recommendation[] = [];
    for (const list of lists) {
      for (const rec of list.items) {
        const id = favoriteId(rec);
        if (!seen.has(id)) {
          seen.add(id);
          out.push(rec);
        }
      }
    }
    return out;
  }, [lists]);

  const ids = useMemo(() => new Set(items.map(favoriteId)), [items]);

  const isFavorite = useCallback(
    (rec: Recommendation) => ids.has(favoriteId(rec)),
    [ids],
  );

  const listsContaining = useCallback(
    (rec: Recommendation) => {
      const id = favoriteId(rec);
      return lists
        .filter((l) => l.items.some((r) => favoriteId(r) === id))
        .map((l) => l.id);
    },
    [lists],
  );

  const addToList = useCallback((listId: string, rec: Recommendation) => {
    const id = favoriteId(rec);
    setLists((prev) =>
      prev.map((l) =>
        l.id === listId && !l.items.some((r) => favoriteId(r) === id)
          ? { ...l, items: [...l.items, rec] }
          : l,
      ),
    );
  }, []);

  const removeFromList = useCallback((listId: string, id: string) => {
    setLists((prev) =>
      prev.map((l) =>
        l.id === listId
          ? { ...l, items: l.items.filter((r) => favoriteId(r) !== id) }
          : l,
      ),
    );
  }, []);

  const toggle = useCallback((rec: Recommendation) => {
    const id = favoriteId(rec);
    setLists((prev) => {
      const isSavedAnywhere = prev.some((l) =>
        l.items.some((r) => favoriteId(r) === id),
      );
      if (isSavedAnywhere) {
        return prev.map((l) => ({
          ...l,
          items: l.items.filter((r) => favoriteId(r) !== id),
        }));
      }
      const next = prev.length === 0 ? [makeDefaultList()] : [...prev];
      const first = next[0];
      next[0] = { ...first, items: [...first.items, rec] };
      return next;
    });
  }, []);

  const remove = useCallback((id: string) => {
    setLists((prev) =>
      prev.map((l) => ({
        ...l,
        items: l.items.filter((r) => favoriteId(r) !== id),
      })),
    );
  }, []);

  const createList = useCallback((name: string) => {
    const id = newId();
    setLists((prev) => [
      ...prev,
      { id, name: name.trim() || "Untitled list", items: [] },
    ]);
    return id;
  }, []);

  const renameList = useCallback((listId: string, name: string) => {
    setLists((prev) =>
      prev.map((l) =>
        l.id === listId ? { ...l, name: name.trim() || l.name } : l,
      ),
    );
  }, []);

  const deleteList = useCallback((listId: string) => {
    setLists((prev) => {
      const next = prev.filter((l) => l.id !== listId);
      return next.length === 0 ? [makeDefaultList()] : next;
    });
  }, []);

  const clear = useCallback(() => {
    setLists((prev) => prev.map((l) => ({ ...l, items: [] })));
  }, []);

  const value = useMemo(
    () => ({
      lists,
      items,
      ids,
      isFavorite,
      listsContaining,
      toggle,
      addToList,
      removeFromList,
      remove,
      createList,
      renameList,
      deleteList,
      clear,
    }),
    [
      lists,
      items,
      ids,
      isFavorite,
      listsContaining,
      toggle,
      addToList,
      removeFromList,
      remove,
      createList,
      renameList,
      deleteList,
      clear,
    ],
  );

  return (
    <FavoritesContext.Provider value={value}>
      {children}
    </FavoritesContext.Provider>
  );
}

export function useFavorites(): FavoritesContextValue {
  const ctx = useContext(FavoritesContext);
  if (!ctx) {
    throw new Error("useFavorites must be used inside <FavoritesProvider>");
  }
  return ctx;
}