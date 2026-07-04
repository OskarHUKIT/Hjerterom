"use client";

import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

type StatItem = { label: string; value: number | string };

export function BroadcastPreviewStats({ items }: { items: StatItem[] }) {
  return (
    <div className="grid gap-3 sm:grid-cols-3">
      {items.map((item) => (
        <Card key={item.label} size="sm">
          <CardHeader className="gap-1">
            <CardDescription>{item.label}</CardDescription>
            <CardTitle className="text-2xl tabular-nums">{item.value}</CardTitle>
          </CardHeader>
        </Card>
      ))}
    </div>
  );
}
