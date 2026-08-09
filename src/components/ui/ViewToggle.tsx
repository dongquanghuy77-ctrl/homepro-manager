'use client';

import { LayoutList, Trello, BarChart2 } from 'lucide-react';

export type ViewMode = 'list' | 'kanban' | 'gantt';

interface ViewToggleProps {
  view: ViewMode;
  onChange: (v: ViewMode) => void;
}

const VIEWS: { id: ViewMode; label: string; Icon: React.ElementType }[] = [
  { id: 'list', label: 'Danh sách', Icon: LayoutList },
  { id: 'kanban', label: 'Kanban', Icon: Trello },
  { id: 'gantt', label: 'Gantt', Icon: BarChart2 },
];

export default function ViewToggle({ view, onChange }: ViewToggleProps) {
  return (
    <div className="view-toggle">
      {VIEWS.map(({ id, label, Icon }) => (
        <button
          key={id}
          id={`view-toggle-${id}`}
          className={`view-toggle-btn${view === id ? ' active' : ''}`}
          onClick={() => onChange(id)}
          title={label}
        >
          <Icon size={15} />
          <span>{label}</span>
        </button>
      ))}
    </div>
  );
}
