"use client";

import { useRef, useState } from "react";
import { Download, Upload, RotateCcw } from "lucide-react";
import { BottomSheet } from "./BottomSheet";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { useAppData } from "@/store/useAppData";
import { buildExport, parseImport } from "@/lib/importExport";

interface Props {
  open: boolean;
  onClose: () => void;
}

export function SettingsSheet({ open, onClose }: Props) {
  const { data, importData, reset } = useAppData();
  const fileRef = useRef<HTMLInputElement>(null);
  const [confirmReset, setConfirmReset] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  function handleExport() {
    const doc = buildExport(data);
    const blob = new Blob([JSON.stringify(doc, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "remoney-export.json";
    a.click();
    URL.revokeObjectURL(url);
  }

  async function handleImportFile(file: File) {
    const text = await file.text();
    const doc = parseImport(text);
    if (!doc) {
      setMessage("Import failed: the file is not a valid Remoney export.");
      return;
    }
    importData(doc);
    setMessage("Import complete. New entries merged; existing ones kept.");
  }

  return (
    <>
      <BottomSheet open={open} onClose={onClose} title="Settings">
        <div className="flex flex-col gap-3">
          <SettingsRow
            icon={<Download size={20} />}
            label="Export"
            hint="Download all data as a JSON file."
            onClick={handleExport}
          />
          <SettingsRow
            icon={<Upload size={20} />}
            label="Import"
            hint="Merge data from another device (additive)."
            onClick={() => fileRef.current?.click()}
          />
          <SettingsRow
            icon={<RotateCcw size={20} />}
            label="Reset"
            hint="Erase all local data. This cannot be undone."
            destructive
            onClick={() => setConfirmReset(true)}
          />

          {message && <p className="mt-2 text-sm font-medium text-zinc-600">{message}</p>}

          <input
            ref={fileRef}
            type="file"
            accept="application/json,.json"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) void handleImportFile(file);
              e.target.value = "";
            }}
          />
        </div>
      </BottomSheet>

      <ConfirmDialog
        open={confirmReset}
        title="Reset all data?"
        message="This permanently erases every shop and transaction on this device. This cannot be undone."
        confirmLabel="Reset"
        onConfirm={() => {
          reset();
          setConfirmReset(false);
          setMessage("All data has been reset.");
        }}
        onCancel={() => setConfirmReset(false)}
      />
    </>
  );
}

function SettingsRow({
  icon,
  label,
  hint,
  onClick,
  destructive,
}: {
  icon: React.ReactNode;
  label: string;
  hint: string;
  onClick: () => void;
  destructive?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      className="flex w-full items-center gap-4 rounded-2xl border border-zinc-100 bg-white p-4 text-left transition-colors hover:bg-zinc-50"
    >
      <span
        className={`flex h-10 w-10 items-center justify-center rounded-full ${
          destructive ? "bg-red-50 text-red-600" : "bg-zinc-100 text-zinc-700"
        }`}
      >
        {icon}
      </span>
      <span className="flex flex-col">
        <span className={`font-semibold ${destructive ? "text-red-600" : "text-zinc-900"}`}>
          {label}
        </span>
        <span className="text-sm text-zinc-500">{hint}</span>
      </span>
    </button>
  );
}
