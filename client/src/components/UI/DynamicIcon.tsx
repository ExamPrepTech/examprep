import * as LucideIcons from 'lucide-react';

interface DynamicIconProps {
  name?: string;
  className?: string;
}

export const getDeterministicColor = (id: string) => {
  const colors = [
    'space-icon-blue',
    'space-icon-purple',
    'space-icon-emerald',
    'space-icon-orange',
    'space-icon-pink',
    'space-icon-teal',
    'space-icon-indigo',
    'space-icon-rose',
    'space-icon-cyan',
    'space-icon-amber',
  ];

  let hash = 0;
  for (let i = 0; i < id.length; i++) {
    hash = id.charCodeAt(i) + ((hash << 5) - hash);
  }

  return colors[Math.abs(hash) % colors.length];
};

export const DynamicIcon = ({ name, className }: DynamicIconProps) => {
  const Icon = (LucideIcons as any)[name || 'Book'] || LucideIcons.Book;
  return <Icon className={className} />;
};
