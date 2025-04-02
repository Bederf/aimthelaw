import React from 'react';
import { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface PageSectionProps {
  children: React.ReactNode;
  title?: string;
  description?: string;
  icon?: LucideIcon;
  className?: string;
  variant?: 'default' | 'glass' | 'bordered';
  onDrop?: React.DragEventHandler<HTMLDivElement>;
  onDragOver?: React.DragEventHandler<HTMLDivElement>;
}

/**
 * PageSection component for consistent section styling
 * 
 * This component provides a standardized way to display content sections
 * with consistent styling across the application:
 * - Optional title and description
 * - Glass card styling by default
 * - Consistent padding and spacing
 */
export function PageSection({
  children,
  title,
  description,
  icon: Icon,
  className,
  variant = 'glass',
  onDrop,
  onDragOver
}: PageSectionProps) {
  const sectionClasses = cn(
    "rounded-lg p-6",
    {
      "glass-card hover-card": variant === 'glass',
      "bg-secondary/10 border border-border": variant === 'bordered',
      "bg-transparent": variant === 'default'
    },
    className
  );

  return (
    <div 
      className={sectionClasses}
      onDrop={onDrop}
      onDragOver={onDragOver}
    >
      {(title || description) && (
        <div className="mb-4">
          {title && (
            <div className="flex items-center gap-2 mb-1">
              {Icon && (
                <div className="rounded-full bg-primary/20 p-2">
                  <Icon className="h-5 w-5 text-primary" />
                </div>
              )}
              <h2 className="text-xl font-semibold">{title}</h2>
            </div>
          )}
          {description && (
            <p className="text-sm text-muted-foreground">{description}</p>
          )}
        </div>
      )}
      <div>{children}</div>
    </div>
  );
}

export default PageSection; 