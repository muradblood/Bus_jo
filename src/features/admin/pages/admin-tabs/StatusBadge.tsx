import React from 'react';

export default function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; className: string }> = {
    confirmed: { label: 'مؤكد', className: 'bg-green-100 text-green-700 border border-green-200' },
    pending: { label: 'معلق', className: 'bg-yellow-100 text-yellow-700 border border-yellow-200' },
    new: { label: 'جديد', className: 'bg-blue-100 text-blue-700 border border-blue-200' },
    cancelled: { label: 'ملغي', className: 'bg-red-100 text-red-700 border border-red-200' },
  };
  const s = map[status] || map.new;
  return <span className={`text-xs px-2.5 py-1 rounded-full font-bold ${s.className}`}>{s.label}</span>;
}
