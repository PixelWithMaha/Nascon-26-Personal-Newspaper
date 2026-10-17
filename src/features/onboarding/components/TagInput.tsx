"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type TagInputProps = {
  id: string;
  label: string;
  hint?: string;
  placeholder?: string;
  value: string[];
  onChange: (next: string[]) => void;
  max?: number;
};

export function TagInput({ id, label, hint, placeholder, value, onChange, max = 20 }: TagInputProps) {
  const [draft, setDraft] = useState("");

  function add() {
    const tag = draft.trim().replace(/,$/, "");
    setDraft("");
    if (!tag || value.length >= max) return;
    if (value.some((v) => v.toLowerCase() === tag.toLowerCase())) return;
    onChange([...value, tag]);
  }

  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      {hint && <p className="text-sm text-muted-foreground">{hint}</p>}
      <Input
        id={id}
        value={draft}
        placeholder={placeholder}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === ",") {
            e.preventDefault();
            add();
          }
        }}
        onBlur={add}
      />
      {value.length > 0 && (
        <ul className="flex flex-wrap gap-2">
          {value.map((tag) => (
            <li key={tag}>
              <button
                type="button"
                onClick={() => onChange(value.filter((v) => v !== tag))}
                className="rounded-full border px-3 py-1 text-sm hover:bg-muted"
                aria-label={`Remove ${tag}`}
              >
                {tag} <span aria-hidden>×</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}