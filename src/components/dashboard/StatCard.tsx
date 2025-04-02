
import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { LucideIcon, TrendingUp, TrendingDown } from 'lucide-react';

interface StatCardProps {
  title: string;
  value: number | string;
  trend?: string;
  trendDirection?: 'up' | 'down' | 'flat';
  icon?: LucideIcon;
  color?: string;
}

export const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  trend,
  trendDirection = 'up',
  icon: Icon,
  color = 'blue',
}) => {
  const getColorClass = (color: string) => {
    const colors = {
      blue: 'text-blue-600 bg-blue-100',
      green: 'text-green-600 bg-green-100',
      amber: 'text-amber-600 bg-amber-100',
      red: 'text-red-600 bg-red-100',
      purple: 'text-purple-600 bg-purple-100',
      orange: 'text-orange-600 bg-orange-100',
      indigo: 'text-indigo-600 bg-indigo-100',
    };
    return colors[color as keyof typeof colors] || colors.blue;
  };

  const getTrendClasses = () => {
    if (trendDirection === 'up') {
      return 'text-green-600 bg-green-100';
    } 
    if (trendDirection === 'down') {
      return 'text-red-600 bg-red-100';
    }
    return 'text-gray-600 bg-gray-100';
  };

  const iconColorClass = getColorClass(color);
  const trendColorClass = getTrendClasses();

  return (
    <Card className="border-0 shadow-sm">
      <CardContent className="pt-6">
        <div className="flex justify-between items-start">
          <div>
            <p className="text-sm font-medium text-gray-500">{title}</p>
            <p className="text-2xl font-bold mt-1">{value}</p>
          </div>
          {Icon && (
            <div className={`p-2 rounded-full ${iconColorClass}`}>
              <Icon className="h-5 w-5" />
            </div>
          )}
        </div>
        
        {trend && (
          <div className="mt-4 flex items-center">
            <div className={`inline-flex items-center space-x-1 px-2 py-1 rounded-full ${trendColorClass}`}>
              {trendDirection === 'up' ? (
                <TrendingUp className="h-3 w-3" />
              ) : (
                <TrendingDown className="h-3 w-3" />
              )}
              <span className="text-xs font-medium">{trend}</span>
            </div>
            <span className="text-xs text-gray-500 ml-2">vs. last month</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
