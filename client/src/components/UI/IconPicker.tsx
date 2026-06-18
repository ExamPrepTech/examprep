import { useState, useMemo } from 'react';
import * as LucideIcons from 'lucide-react';
import { DynamicIcon } from '@/components/UI/DynamicIcon';
import { Search } from 'lucide-react';

const ALL_ICON_NAMES = Object.keys(LucideIcons).filter(
  (key) => key !== 'default' && key !== 'createLucideIcon' && key !== 'Icon' && /^[A-Z]/.test(key)
);

interface IconPickerProps {
  selected: string;
  onSelect: (icon: string) => void;
}

export const IconPicker = ({ selected, onSelect }: IconPickerProps) => {
  const [search, setSearch] = useState('');

  const filteredIcons = useMemo(() => {
    if (!search.trim()) return ALL_ICON_NAMES;
    const q = search.toLowerCase();
    return ALL_ICON_NAMES.filter((name) => name.toLowerCase().includes(q));
  }, [search]);

  return (
    <div>
      <label className="text-sm font-medium mb-2 block">Icon</label>
      <div className="relative mb-2">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
        <input
          className="flex h-9 w-full rounded-md border border-input bg-background pl-8 pr-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          placeholder="Search icons..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>
      <div className="grid grid-cols-8 gap-1.5 max-h-[200px] overflow-y-auto p-2 rounded-lg border border-input bg-background">
        {filteredIcons.length === 0 ? (
          <p className="col-span-8 text-center text-sm text-muted-foreground py-4">
            No icons found
          </p>
        ) : (
          filteredIcons.map((iconName) => (
            <button
              key={iconName}
              type="button"
              onClick={() => onSelect(iconName)}
              className={`flex items-center justify-center h-9 w-9 rounded-md transition-colors ${
                selected === iconName
                  ? 'bg-primary/10 text-primary ring-2 ring-primary/30'
                  : 'text-muted-foreground hover:bg-accent hover:text-foreground'
              }`}
              title={iconName}
            >
              <DynamicIcon name={iconName} className="h-4 w-4" />
            </button>
          ))
        )}
      </div>
    </div>
  );
};
