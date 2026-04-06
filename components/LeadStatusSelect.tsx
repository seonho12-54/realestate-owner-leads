"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { leadStatusOptions } from "@/lib/validation";

export function LeadStatusSelect({ leadId, currentStatus }: { leadId: number; currentStatus: string }) {
  const router = useRouter();
  const [status, setStatus] = useState(currentStatus);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleChange(nextStatus: string) {
    setStatus(nextStatus);
    setError(null);

    startTransition(async () => {
      try {
        const response = await fetch(`/api/admin/leads/${leadId}/status`, {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            status: nextStatus,
          }),
        });

        const result = await response.json();

        if (!response.ok) {
          throw new Error(result.error ?? "상태 변경에 실패했습니다.");
        }

        router.refresh();
      } catch (statusError) {
        setStatus(currentStatus);
        setError(statusError instanceof Error ? statusError.message : "상태 변경에 실패했습니다.");
      }
    });
  }

  return (
    <div className="field-group" style={{ minWidth: 180 }}>
      <label htmlFor={`lead-status-${leadId}`}>접수 상태</label>
      <select
        id={`lead-status-${leadId}`}
        className="select-input"
        value={status}
        onChange={(event) => handleChange(event.target.value)}
        disabled={isPending}
      >
        {leadStatusOptions.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      {error ? <span className="error-text">{error}</span> : null}
    </div>
  );
}

