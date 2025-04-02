
import React from 'react';
import { LucideIcon } from 'lucide-react';

interface ActivityItem {
  title: string;
  description: string;
  time: string;
  icon: LucideIcon;
  color: string;
}

interface ActivityProps {
  activities: ActivityItem[];
}

export const Activity: React.FC<ActivityProps> = ({ activities }) => {
  return (
    <div className="space-y-6">
      {activities.map((activity, index) => (
        <div key={index} className="flex">
          <div className="mr-4">
            <div className={`p-2 rounded-full ${activity.color}`}>
              <activity.icon className="h-5 w-5" />
            </div>
          </div>
          <div className="flex-1">
            <div className="flex items-center justify-between">
              <h4 className="font-medium text-sm">{activity.title}</h4>
              <span className="text-xs text-gray-500">{activity.time}</span>
            </div>
            <p className="text-sm text-gray-600 mt-1">{activity.description}</p>
          </div>
        </div>
      ))}
    </div>
  );
};
