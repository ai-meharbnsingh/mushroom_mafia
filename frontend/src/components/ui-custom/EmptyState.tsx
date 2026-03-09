import React from 'react';
import type { LucideIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon: Icon,
  title,
  description,
  actionLabel,
  onAction,
}) => {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
      <div className="w-16 h-16 rounded-2xl bg-iot-tertiary flex items-center justify-center mb-4">
        <Icon className="w-8 h-8 text-iot-muted" />
      </div>
      <h3 className="text-lg font-semibold text-iot-primary mb-2">{title}</h3>
      {description && (
        <p className="text-sm text-iot-secondary max-w-md mb-6">{description}</p>
      )}
      {actionLabel && onAction && (
        <Button
          onClick={onAction}
          className="gradient-primary text-iot-bg-primary hover:opacity-90"
        >
          {actionLabel}
        </Button>
      )}
    </div>
  );
};

export default EmptyState;
