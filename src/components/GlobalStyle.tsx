import React from 'react';

/**
 * Global Style Guidelines for AI Law Platform
 * 
 * This component doesn't render anything, it serves as documentation
 * for the standardized styling approach used throughout the application.
 */
export const GlobalStyle = () => {
  return null;
};

/**
 * Color Palette
 * 
 * Base colors defined in index.css:
 * - Background: hsl(228 20% 13%) - Dark navy/black
 * - Foreground: hsl(210 40% 98%) - Near white
 * - Primary: hsl(252 89% 74%) - Purple
 * - Secondary: hsl(228 20% 23%) - Slightly lighter navy
 * - Muted: hsl(228 20% 23%) - Slightly lighter navy
 * - Border: hsl(228 20% 23%) - Slightly lighter navy
 * 
 * Usage:
 * - Background color: bg-background
 * - Text color: text-foreground
 * - Primary color: text-primary, bg-primary
 * - Primary with opacity: bg-primary/20 (20% opacity)
 * - Muted text: text-muted-foreground
 */

/**
 * Component Styling
 * 
 * Card Styling:
 * - Use .glass-card for card background with transparency
 * - Use .hover-card for hover effects
 * - Example: <div className="glass-card hover-card rounded-lg p-6">
 * 
 * Layout Structure:
 * - Use PageLayout for consistent page structure
 * - Use PageSection for content sections
 * - Use StatsGrid for stat cards
 * - Use FeatureGrid for feature cards
 * 
 * Typography:
 * - Page title: text-4xl font-bold
 * - Section headings: text-xl font-semibold
 * - Regular text: text-foreground
 * - Muted text: text-muted-foreground
 * 
 * Icons:
 * - Standard size: h-5 w-5
 * - Small size: h-4 w-4
 * - Icon containers: rounded-full bg-primary/20 p-2
 */

/**
 * Standard Components
 * 
 * - PageLayout: Overall page wrapper with consistent header and content area
 * - PageSection: Content section with consistent styling
 * - StatsGrid: Grid of statistics cards
 * - FeatureGrid: Grid of feature cards
 * - StatsCard: Individual stat card with icon
 * - FeatureCard: Individual feature card with icon
 */

export default GlobalStyle; 