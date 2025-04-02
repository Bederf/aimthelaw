
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  FileText, Users, Calendar, Search, 
  BarChart2, ArrowUpRight, Clock, FileSearch,
  MessageSquare, FileInput, Plus, Briefcase 
} from 'lucide-react';
import { SidebarLayout } from '@/components/SidebarLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { StatCard } from '@/components/dashboard/StatCard';
import { Activity } from '@/components/dashboard/Activity';

const LawyerDashboardPage: React.FC = () => {
  const navigate = useNavigate();
  
  const statistics = [
    { 
      title: "Active Clients", 
      value: 24, 
      trend: "+3", 
      trendDirection: "up", 
      icon: Users,
      color: "blue" 
    },
    { 
      title: "Documents Analyzed", 
      value: 182, 
      trend: "+12", 
      trendDirection: "up", 
      icon: FileSearch,
      color: "green" 
    },
    { 
      title: "Active Cases", 
      value: 38, 
      trend: "+2", 
      trendDirection: "up", 
      icon: Briefcase,
      color: "orange" 
    },
    { 
      title: "AI Interactions", 
      value: 256, 
      trend: "+18", 
      trendDirection: "up", 
      icon: MessageSquare,
      color: "purple" 
    },
  ];

  const activities = [
    {
      title: "Document analysis completed",
      description: "AI completed analysis of 'Johnson v. Smith' contract",
      time: "10 minutes ago",
      icon: FileText,
      color: "bg-blue-100 text-blue-800"
    },
    {
      title: "Meeting reminder",
      description: "Client consultation with Sarah Parker at 2:00 PM",
      time: "25 minutes ago",
      icon: Calendar,
      color: "bg-amber-100 text-amber-800"
    },
    {
      title: "New document uploaded",
      description: "New case files for 'Thompson Estate Planning'",
      time: "1 hour ago",
      icon: FileInput,
      color: "bg-green-100 text-green-800"
    },
    {
      title: "Date extraction completed",
      description: "12 critical dates extracted from 'Baxter v. Yodel' case",
      time: "2 hours ago",
      icon: Calendar,
      color: "bg-purple-100 text-purple-800"
    },
    {
      title: "AI response generated",
      description: "Draft response to settlement offer created",
      time: "3 hours ago",
      icon: MessageSquare,
      color: "bg-indigo-100 text-indigo-800"
    }
  ];

  const quickActions = [
    {
      title: "Document Analysis",
      description: "Extract insights from legal documents",
      icon: FileSearch,
      onClick: () => navigate("/lawyer/document-analysis")
    },
    {
      title: "Legal Research",
      description: "Find precedents and legal information",
      icon: Search,
      onClick: () => navigate("/lawyer/legal-research")
    },
    {
      title: "Date Extraction",
      description: "Find and organize important dates",
      icon: Calendar,
      onClick: () => navigate("/lawyer/date-extraction")
    },
    {
      title: "Generate Response",
      description: "Draft legal responses with AI",
      icon: MessageSquare,
      onClick: () => navigate("/lawyer/generate-response")
    }
  ];

  const recentClients = [
    { name: "Johnson & Associates", case: "Contract Review", date: "Today" },
    { name: "Sarah Thompson", case: "Estate Planning", date: "Yesterday" },
    { name: "Baxter Corp.", case: "IP Litigation", date: "2 days ago" },
    { name: "Michael Wilson", case: "Employment Dispute", date: "3 days ago" },
    { name: "Tech Innovations LLC", case: "Patent Filing", date: "5 days ago" },
  ];

  return (
    <SidebarLayout>
      <div className="container mx-auto">
        <h1 className="text-3xl font-bold mb-2">Dashboard</h1>
        <p className="text-gray-500 mb-8">Welcome back to your legal workspace</p>

        {/* Search bar */}
        <div className="relative mb-8">
          <Search className="absolute top-3 left-3 h-5 w-5 text-gray-400" />
          <Input 
            className="pl-10 bg-white" 
            placeholder="Search for clients, cases, or documents..." 
          />
        </div>

        {/* Statistics Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {statistics.map((stat, index) => (
            <StatCard 
              key={index}
              title={stat.title}
              value={stat.value}
              trend={stat.trend}
              trendDirection={stat.trendDirection}
              icon={stat.icon}
              color={stat.color}
            />
          ))}
        </div>

        {/* Main Content Area */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column - Quick Actions */}
          <div className="lg:col-span-1">
            <Card className="mb-8">
              <CardHeader>
                <CardTitle className="text-lg font-medium">Quick Actions</CardTitle>
                <CardDescription>Access commonly used tools</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {quickActions.map((action, index) => (
                  <Button 
                    key={index}
                    variant="outline" 
                    className="w-full justify-start text-left h-auto p-3"
                    onClick={action.onClick}
                  >
                    <div className="flex items-start">
                      <div className="bg-blue-100 p-2 rounded-full mr-4">
                        <action.icon className="h-5 w-5 text-blue-600" />
                      </div>
                      <div>
                        <h3 className="font-medium">{action.title}</h3>
                        <p className="text-sm text-gray-500">{action.description}</p>
                      </div>
                    </div>
                  </Button>
                ))}
              </CardContent>
              <CardFooter>
                <Button className="w-full" size="sm" variant="ghost">
                  <Plus className="h-4 w-4 mr-2" /> Create Custom Action
                </Button>
              </CardFooter>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg font-medium">Recent Clients</CardTitle>
                <CardDescription>Your recently active clients</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {recentClients.map((client, index) => (
                    <div key={index} className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">{client.name}</p>
                        <p className="text-sm text-gray-500">{client.case}</p>
                      </div>
                      <div className="text-sm text-gray-500">{client.date}</div>
                    </div>
                  ))}
                </div>
              </CardContent>
              <CardFooter>
                <Button className="w-full" variant="outline" size="sm">
                  View All Clients
                </Button>
              </CardFooter>
            </Card>
          </div>

          {/* Right Column - Activity & Performance */}
          <div className="lg:col-span-2">
            <Card className="mb-8">
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="text-lg font-medium">Recent Activity</CardTitle>
                  <CardDescription>Updates from your cases and AI assistant</CardDescription>
                </div>
                <Button variant="ghost" size="sm" className="text-blue-600">
                  View All <ArrowUpRight className="h-4 w-4 ml-1" />
                </Button>
              </CardHeader>
              <CardContent>
                <Activity activities={activities} />
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle className="text-lg font-medium">Performance Metrics</CardTitle>
                <CardDescription>AI usage and efficiency analytics</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[300px] flex items-center justify-center bg-gray-50 rounded-md border border-dashed">
                  <div className="text-center">
                    <BarChart2 className="h-10 w-10 text-gray-400 mx-auto mb-2" />
                    <p className="text-gray-500">Performance charts will be displayed here</p>
                  </div>
                </div>
              </CardContent>
              <CardFooter className="flex justify-between">
                <Button variant="outline" size="sm">Weekly</Button>
                <Button variant="outline" size="sm">Monthly</Button>
                <Button variant="outline" size="sm">Quarterly</Button>
              </CardFooter>
            </Card>
          </div>
        </div>
      </div>
    </SidebarLayout>
  );
};

export default LawyerDashboardPage;
