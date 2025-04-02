import React from 'react';
import { LucideIcon } from "lucide-react";
import FeatureCard from './FeatureCard';

export interface FeatureItem {
  title: string;
  description: string;
  icon: LucideIcon;
  link: string;
  disabled?: boolean;
  isNew?: boolean;
  onFeatureClick?: () => void;
}

interface FeatureGridProps {
  features: FeatureItem[];
  columns?: 1 | 2 | 3;
  className?: string;
}

/**
 * FeatureGrid component for displaying feature cards in a consistent grid layout
 * 
 * This component takes an array of features and displays them in a grid
 * using the FeatureCard component with consistent styling and spacing.
 */
export function FeatureGrid({
  features,
  columns = 3,
  className
}: FeatureGridProps) {
  // Define grid column classes based on the columns prop
  const getGridClass = () => {
    switch(columns) {
      case 1: return 'grid-cols-1';
      case 2: return 'grid-cols-1 sm:grid-cols-2';
      case 3: return 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3';
      default: return 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3';
    }
  };

  return (
    <div className={`grid ${getGridClass()} gap-6 ${className || ''}`}>
      {features.map((feature, index) => (
        <FeatureCard
          key={`${feature.title}-${index}`}
          title={feature.title}
          description={feature.description}
          icon={feature.icon}
          link={feature.link}
          disabled={feature.disabled}
          isNew={feature.isNew}
          onFeatureClick={feature.onFeatureClick}
        />
      ))}
    </div>
  );
}

export default FeatureGrid; 