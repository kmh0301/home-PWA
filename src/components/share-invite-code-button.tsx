"use client";

import { useState } from "react";

type ShareInviteCodeButtonProps = {
  code: string;
  householdName: string;
};

export function ShareInviteCodeButton({
  code,
  householdName,
}: ShareInviteCodeButtonProps) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    await navigator.clipboard.writeText(code);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1500);
  }

  async function handleShare() {
    if (navigator.share) {
      await navigator.share({
        title: `Join ${householdName}`,
        text: `Use invite code ${code} to join ${householdName}.`,
      });
      return;
    }

    await handleCopy();
  }

  return (
    <div className="mt-4 flex gap-3">
      <button
        type="button"
        onClick={handleCopy}
        className="flex h-11 flex-1 items-center justify-center rounded-full border border-[var(--color-border)] px-4 text-sm font-semibold text-[var(--color-foreground)]"
      >
        {copied ? "Copied" : "Copy code"}
      </button>
      <button
        type="button"
        onClick={handleShare}
        className="flex h-11 flex-1 items-center justify-center rounded-full bg-[var(--color-accent)] px-4 text-sm font-semibold text-white"
      >
        Share
      </button>
    </div>
  );
}
