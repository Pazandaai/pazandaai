import { Check, Plus, Trash2 } from "lucide-react";
import { useState } from "react";

import { useApp } from "../../context/AppContext";
import { hapticNotification } from "../../lib/telegram";
import { formatQuantity } from "../../lib/recipe-utils";
import ModalShell from "../ui/ModalShell";

export default function BozorlikModal() {
  const {
    activeModal,
    addToShoppingList,
    clearShoppingList,
    closeModal,
    format,
    removeShoppingItem,
    shoppingList,
    t,
    toggleShoppingItem,
  } = useApp();

  const [newItemName, setNewItemName] = useState("");

  const open = activeModal === "bozorlik";

  const addItem = () => {
    const name = newItemName.trim();

    if (!name) return;

    addToShoppingList([{ name }]);
    setNewItemName("");
    hapticNotification("success");
  };

  return (
    <ModalShell open={open} title={t("bozorlik")} onClose={closeModal}>
      <div className="space-y-4">
        <div className="flex gap-2">
          <input
            value={newItemName}
            onChange={(event) => setNewItemName(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") addItem();
            }}
            placeholder={t("bozorlikPlaceholder")}
            className="h-11 flex-1 rounded-2xl border border-slate-200 bg-white px-4 text-sm outline-none focus:border-[#DB2777]/40"
          />

          <button
            onClick={addItem}
            className="flex h-11 items-center gap-1 rounded-2xl bg-[#DB2777] px-4 text-sm font-bold text-white"
          >
            <Plus size={16} />
            {t("bozorlikAdd")}
          </button>
        </div>

        {shoppingList.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-slate-200 bg-slate-50 p-8 text-center text-sm text-slate-500">
            {t("bozorlikEmpty")}
          </div>
        ) : (
          <div className="space-y-2">
            {shoppingList.map((item) => (
              <div
                key={item.id}
                className="flex items-center justify-between gap-3 rounded-2xl border border-slate-100 bg-white p-3 shadow-sm"
              >
                <button
                  onClick={() => toggleShoppingItem(item.id)}
                  className="flex flex-1 items-center gap-3 text-left"
                >
                  <span
                    className={
                      item.checked
                        ? "flex h-6 w-6 items-center justify-center rounded-full bg-[#DB2777] text-white"
                        : "flex h-6 w-6 items-center justify-center rounded-full border border-slate-300 bg-white text-transparent"
                    }
                  >
                    <Check size={13} />
                  </span>

                  <span>
                    <span
                      className={
                        item.checked
                          ? "block text-sm font-semibold text-slate-400 line-through"
                          : "block text-sm font-semibold text-slate-900"
                      }
                    >
                      {format(item.name)}
                    </span>

                    {item.quantity ? (
                      <span className="text-xs text-slate-500">
                        {formatQuantity(item.quantity)} {item.unit ?? ""}
                      </span>
                    ) : null}
                  </span>
                </button>

                <button
                  onClick={() => removeShoppingItem(item.id)}
                  className="flex h-9 w-9 items-center justify-center rounded-2xl bg-red-50 text-red-500"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            ))}

            <button
              onClick={clearShoppingList}
              className="w-full rounded-2xl bg-slate-100 px-4 py-3 text-sm font-bold text-slate-600"
            >
              {t("bozorlikClear")}
            </button>
          </div>
        )}
      </div>
    </ModalShell>
  );
}
