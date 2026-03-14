"use client";

import { useState } from "react";

type ShareInviteCodeButtonProps = {
  code: string;
  householdName: string;
  expiresAtLabel?: string | null;
  isExpired?: boolean;
};

export function ShareInviteCodeButton({
  code,
  householdName,
  expiresAtLabel,
  isExpired = false,
}: ShareInviteCodeButtonProps) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    await navigator.clipboard.writeText(code);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1500);
  }

  async function handleShare() {
    const shareText = isExpired
      ? `「${householdName}」上一個邀請碼 ${code} 已經過期，請等我重新產生新碼再傳給你。`
      : `加入「${householdName}」時，請輸入邀請碼 ${code}${expiresAtLabel ? `，有效至 ${expiresAtLabel}` : ""}。`;

    if (navigator.share) {
      await navigator.share({
        title: `加入 ${householdName}`,
        text: shareText,
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
        {copied ? "已複製邀請碼" : "複製邀請碼"}
      </button>
      <button
        type="button"
        onClick={handleShare}
        className="flex h-11 flex-1 items-center justify-center rounded-full bg-[var(--color-accent)] px-4 text-sm font-semibold text-white"
      >
        {isExpired ? "提醒對方等新邀請碼" : "直接分享出去"}
      </button>
    </div>
  );
}
