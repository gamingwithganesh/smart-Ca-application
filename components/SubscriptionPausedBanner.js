'use client';

import React from 'react';

export default function SubscriptionPausedBanner({ reason, user, onOpenUpgrade }) {
  if (!user || (!user.isPaused && user.status === 'active' && !user.isParentPaused)) {
    return null;
  }

  const pauseMsg = reason || user.pauseReason || 'Subscription payment pending or account on hold';

  return (
    <div className="mb-6 p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-900 shadow-md backdrop-blur-md flex flex-col md:flex-row items-start md:items-center justify-between gap-4 animate-in fade-in slide-in-from-top-4 duration-300">
      <div className="flex items-start gap-3">
        <div className="w-9 h-9 rounded-xl bg-amber-500 text-white flex items-center justify-center font-bold text-lg shrink-0 shadow-sm">
          ⏸
        </div>
        <div>
          <h4 className="font-extrabold text-sm text-amber-950 flex items-center gap-2">
            <span>Account / Subscription Currently Paused</span>
            <span className="text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full bg-amber-200 text-amber-800 font-black">
              On Hold
            </span>
          </h4>
          <p className="text-xs text-amber-800/90 mt-0.5">
            <strong>Reason:</strong> {pauseMsg}. Read-only access is active. Document uploads and client additions are restricted until renewed.
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2 shrink-0">
        {onOpenUpgrade ? (
          <button
            onClick={onOpenUpgrade}
            className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition shadow-sm cursor-pointer flex items-center gap-1.5"
          >
            <span>⚡ Pay & Resume Subscription</span>
          </button>
        ) : null}
        <a
          href="mailto:support@smartca.com?subject=Resume%20Subscription%20Account"
          className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-900 text-white text-xs font-bold transition shadow-sm"
        >
          Contact Support
        </a>
      </div>
    </div>
  );
}
