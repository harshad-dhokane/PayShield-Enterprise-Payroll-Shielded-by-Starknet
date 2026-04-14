"use client";

import { useEffect } from "react";
import { Info, X } from "lucide-react";

export interface GuideDialogSection {
  title: string;
  items: string[];
  ordered?: boolean;
}

export interface GuideDialogContent {
  eyebrow?: string;
  title: string;
  summary: string;
  sections: GuideDialogSection[];
  footer?: string;
}

interface GuideDialogProps {
  content: GuideDialogContent | null;
  isOpen: boolean;
  onClose: () => void;
}

interface GuideButtonProps {
  label: string;
  onClick: () => void;
}

export function GuideButton({ label, onClick }: GuideButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-outline-variant/15 bg-surface-container-highest/40 text-on-surface-variant transition-colors hover:border-primary/40 hover:text-primary"
      aria-label={label}
      title={label}
    >
      <Info className="h-4 w-4" />
    </button>
  );
}

export default function GuideDialog({ content, isOpen, onClose }: GuideDialogProps) {
  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, [isOpen, onClose]);

  if (!isOpen || !content) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-[180] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-10 w-full max-w-2xl overflow-hidden rounded-3xl border border-outline-variant/10 bg-surface-container shadow-2xl">
        <div className="relative overflow-hidden border-b border-outline-variant/10 px-6 py-6 sm:px-8">
          <div className="absolute right-0 top-0 h-40 w-40 rounded-full bg-primary/10 blur-3xl" />
          <div className="relative flex items-start justify-between gap-4">
            <div className="space-y-2">
              {content.eyebrow && (
                <p className="text-[10px] font-bold uppercase tracking-[0.28em] text-primary">
                  {content.eyebrow}
                </p>
              )}
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-primary/20 bg-primary/10 text-primary">
                  <Info className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-2xl font-black tracking-tight text-on-surface">
                    {content.title}
                  </h3>
                  <p className="mt-1 max-w-xl text-sm leading-6 text-on-surface-variant">
                    {content.summary}
                  </p>
                </div>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="rounded-full border border-outline-variant/15 bg-surface-container-highest/40 p-2 text-on-surface-variant transition-colors hover:text-on-surface"
              aria-label="Close guide"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div className="max-h-[70vh] space-y-6 overflow-y-auto px-6 py-6 sm:px-8">
          {content.sections.map((section) => {
            const ListTag = section.ordered ? "ol" : "ul";

            return (
              <section
                key={section.title}
                className="rounded-2xl border border-outline-variant/10 bg-surface-container-low px-5 py-4"
              >
                <h4 className="text-sm font-bold uppercase tracking-[0.16em] text-on-surface">
                  {section.title}
                </h4>
                <ListTag
                  className={`mt-3 space-y-3 text-sm leading-6 text-on-surface-variant ${
                    section.ordered ? "list-decimal pl-5" : "list-disc pl-5"
                  }`}
                >
                  {section.items.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ListTag>
              </section>
            );
          })}

          {content.footer && (
            <div className="rounded-2xl border border-primary/20 bg-primary/10 px-5 py-4 text-sm leading-6 text-on-surface">
              {content.footer}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
