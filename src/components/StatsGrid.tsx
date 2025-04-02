import React from 'react';
import { LucideIcon } from "lucide-react";
import StatsCard from './StatsCard';

export interface StatItem {
  title: string;
  value: string | number;
  icon: LucideIcon;
  description?: string;
}

interface StatsGridProps {
  stats: StatItem[];
  columns?: 1 | 2 | 3 | 4;
  className?: string;
}

/**
 * StatsGrid component for displaying statistics in a consistent grid layout
 * 
 * This component takes an array of statistics and displays them in a grid
 * using the StatsCard component with consistent styling and spacing.
 */
export function StatsGrid({
  stats,
  columns = 3,
  className
}: StatsGridProps) {
  // Define grid column classes based on the columns prop
  const getGridClass = () => {
    switch(columns) {
      case 1: return 'grid-cols-1';
      case 2: return 'grid-cols-1 sm:grid-cols-2';
      case 3: return 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3';
      case 4: return 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4';
      default: return 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3';
    }
  };

  return (
    <div className={`grid ${getGridClass()} gap-4 mb-8 ${className || ''}`}>
      {stats.map((stat, index) => (
        <StatsCard
          key={`${stat.title}-${index}`}
          title={stat.title}
          value={stat.value}
          icon={stat.icon}
          description={stat.description}
        />
      ))}
    </div>
  );
}

export default StatsGrid; 