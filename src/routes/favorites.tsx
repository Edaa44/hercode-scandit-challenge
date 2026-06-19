import { createFileRoute, Link } from "@tanstack/react-router";
import { Heart, Trash2, Pencil, Plus, FolderPlus, Check, X } from "lucide-react";
import { useState } from "react";
import { AppShell } from "@/components/AppShell";
import { ProductCard } from "@/components/ProductCard";
import { useFavorites, favoriteId } from "@/lib/favorites";

export const Route = createFileRoute("/favorites")({
  head: () => ({
    meta: [
      { title: "Favorites — TrailAble" },
      {
        name: "description",
        content: "Items you've saved from your concierge searches.",
      },
    ],
  }),
  component: FavoritesPage,
});

function FavoritesPage() {
  const {
    lists,
    items,
    createList,
    renameList,
    deleteList,
    removeFromList,
  } = useFavorites();

  const [activeId, setActiveId] = useState<string | null>(null);
  const [newName, setNewName] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");

  const currentId = activeId ?? lists[0]?.id ?? null;
  const current = lists.find((l) => l.id === currentId) ?? lists[0] ?? null;

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    const name = newName.trim();
    if (!name) return;
    const id = createList(name);
    setActiveId(id);
    setNewName("");
  };

  return (
    <AppShell title="Favorites" subtitle="Organise saved items into lists">
      {/* Create new list */}
      <form
        onSubmit={handleCreate}
        className="mb-4 flex items-center gap-2 rounded-2xl border-2 border-dashed border-border bg-card p-3"
      >
        <FolderPlus className="size-4 text-primary" aria-hidden="true" />
        <input
          type="text"
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          placeholder="New list (e.g. Andes trip, Winter gear)"
          className="min-w-0 flex-1 rounded-md border border-border bg-background px-3 py-2 text-sm"
          aria-label="New list name"
        />
        <button
          type="submit"
          className="inline-flex items-center gap-1 rounded-md bg-primary px-3 py-2 text-sm font-bold text-primary-foreground"
        >
          <Plus className="size-3.5" aria-hidden="true" />
          Create
        </button>
      </form>

      {/* List tabs */}
      {lists.length > 0 && (
        <div className="mb-4 flex flex-wrap gap-2" role="tablist" aria-label="Favorite lists">
          {lists.map((l) => {
            const active = l.id === currentId;
            return (
              <button
                key={l.id}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => setActiveId(l.id)}
                className={`inline-flex items-center gap-1.5 rounded-full border-2 px-3 py-1.5 text-xs font-bold transition-colors ${
                  active
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border bg-card text-foreground hover:bg-muted"
                }`}
              >
                <span>{l.name}</span>
                <span
                  className={`rounded-full px-1.5 text-[10px] ${
                    active ? "bg-primary-foreground/20" : "bg-muted"
                  }`}
                >
                  {l.items.length}
                </span>
              </button>
            );
          })}
        </div>
      )}

      {!current || items.length === 0 && current.items.length === 0 ? (
        <div className="rounded-2xl border-2 border-dashed border-border bg-card p-6 text-center">
          <Heart className="mx-auto size-8 text-muted-foreground" aria-hidden="true" />
          <h2 className="mt-3 text-base font-bold">No favorites yet</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Tap the heart on any recommendation to save it into one of your lists.
          </p>
          <Link
            to="/"
            className="mt-4 inline-flex items-center justify-center rounded-full bg-primary px-4 py-2 text-sm font-bold text-primary-foreground"
          >
            Back to Concierge
          </Link>
        </div>
      ) : (
        <section aria-label={`Items in ${current.name}`} className="space-y-4">
          {/* List header */}
          <div className="flex items-center justify-between gap-2 rounded-xl bg-muted/50 p-3">
            {editingId === current.id ? (
              <form
                className="flex flex-1 items-center gap-1.5"
                onSubmit={(e) => {
                  e.preventDefault();
                  renameList(current.id, editValue);
                  setEditingId(null);
                }}
              >
                <input
                  type="text"
                  value={editValue}
                  autoFocus
                  onChange={(e) => setEditValue(e.target.value)}
                  className="min-w-0 flex-1 rounded-md border border-border bg-background px-2 py-1 text-sm font-bold"
                />
                <button
                  type="submit"
                  aria-label="Save name"
                  className="rounded-md bg-primary p-1.5 text-primary-foreground"
                >
                  <Check className="size-4" aria-hidden="true" />
                </button>
                <button
                  type="button"
                  aria-label="Cancel rename"
                  onClick={() => setEditingId(null)}
                  className="rounded-md border border-border p-1.5"
                >
                  <X className="size-4" aria-hidden="true" />
                </button>
              </form>
            ) : (
              <>
                <div className="min-w-0">
                  <h2 className="truncate text-base font-bold">{current.name}</h2>
                  <p className="text-xs text-muted-foreground">
                    {current.items.length} item{current.items.length === 1 ? "" : "s"}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-1">
                  <button
                    type="button"
                    onClick={() => {
                      setEditingId(current.id);
                      setEditValue(current.name);
                    }}
                    className="inline-flex items-center gap-1 rounded-md border border-border bg-card px-2 py-1.5 text-xs font-bold hover:bg-muted"
                    aria-label="Rename list"
                  >
                    <Pencil className="size-3.5" aria-hidden="true" />
                    Rename
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      if (
                        typeof window !== "undefined" &&
                        window.confirm(`Delete list "${current.name}"?`)
                      ) {
                        deleteList(current.id);
                        setActiveId(null);
                      }
                    }}
                    className="inline-flex items-center gap-1 rounded-md border border-border bg-card px-2 py-1.5 text-xs font-bold text-destructive hover:bg-destructive/10"
                    aria-label="Delete list"
                  >
                    <Trash2 className="size-3.5" aria-hidden="true" />
                    Delete
                  </button>
                </div>
              </>
            )}
          </div>

          {current.items.length === 0 ? (
            <div className="rounded-2xl border-2 border-dashed border-border bg-card p-6 text-center">
              <p className="text-sm text-muted-foreground">
                This list is empty. Tap the heart on any search result to add items here.
              </p>
              <Link
                to="/"
                className="mt-3 inline-flex items-center justify-center rounded-full bg-primary px-4 py-2 text-sm font-bold text-primary-foreground"
              >
                Find items
              </Link>
            </div>
          ) : (
            <div className="space-y-4">
              {current.items.map((rec) => (
                <div key={favoriteId(rec)} className="relative">
                  <ProductCard rec={rec} />
                  <button
                    type="button"
                    onClick={() => removeFromList(current.id, favoriteId(rec))}
                    aria-label={`Remove ${rec.group.name} from ${current.name}`}
                    className="absolute right-3 top-3 inline-flex items-center gap-1 rounded-full border border-border bg-card/95 px-2 py-1 text-[10px] font-bold text-muted-foreground shadow-sm hover:bg-destructive hover:text-destructive-foreground"
                  >
                    <X className="size-3" aria-hidden="true" />
                    From list
                  </button>
                </div>
              ))}
            </div>
          )}
        </section>
      )}
    </AppShell>
  );
}