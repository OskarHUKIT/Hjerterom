"use client";

import { cn } from "@/lib/utils";
import { Progress } from "@/components/ui/progress";

type Step = { id: 1 | 2 | 3; label: string };

export function BroadcastStepper({
  step,
  labels,
}: {
  step: 1 | 2 | 3;
  labels: [string, string, string];
}) {
  const steps: Step[] = [
    { id: 1, label: labels[0] },
    { id: 2, label: labels[1] },
    { id: 3, label: labels[2] },
  ];
  const progress = ((step - 1) / (steps.length - 1)) * 100;

  return (
    <div className="space-y-3">
      <Progress value={progress} className="h-1.5" />
      <div className="flex flex-wrap gap-2">
        {steps.map((s) => (
          <div
            key={s.id}
            className={cn(
              "flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-medium transition-colors",
              step === s.id
                ? "border-primary bg-primary/10 text-primary"
                : step > s.id
                  ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
                  : "border-border text-muted-foreground",
            )}
          >
            <span
              className={cn(
                "flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-bold",
                step === s.id
                  ? "bg-primary text-primary-foreground"
                  : step > s.id
                    ? "bg-emerald-500 text-white"
                    : "bg-muted text-muted-foreground",
              )}
            >
              {step > s.id ? "✓" : s.id}
            </span>
            {s.label}
          </div>
        ))}
      </div>
    </div>
  );
}
