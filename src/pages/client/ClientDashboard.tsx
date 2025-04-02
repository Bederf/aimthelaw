import { useAuth } from "@/contexts/AuthContext";
import { FileList } from "@/components/FileList";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

export function ClientDashboard() {
  const { user } = useAuth();
  const [files, setFiles] = useState([]);

  useEffect(() => {
    if (user) {
      loadFiles();
    }
  }, [user]);

  const loadFiles = async () => {
    try {
      const { data, error } = await supabase
        .from('client_files')
        .select('*')
        .eq('client_id', user?.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setFiles(data || []);
    } catch (error) {
      console.error('Error loading files:', error);
    }
  };

  return (
    <div className="container mx-auto p-6">
      <h1 className="text-2xl font-bold mb-6">Client Dashboard</h1>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold mb-4">Your Documents</h2>
            <FileList files={files} onFileDeleted={loadFiles} />
          </div>
        </div>
        <div className="space-y-6">
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold mb-4">Quick Actions</h2>
            <div className="space-y-2">
              <button className="w-full p-2 text-left hover:bg-gray-50 rounded">
                Upload New Document
              </button>
              <button className="w-full p-2 text-left hover:bg-gray-50 rounded">
                Ask Legal Question
              </button>
              <button className="w-full p-2 text-left hover:bg-gray-50 rounded">
                View Analytics
              </button>
            </div>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold mb-4">Recent Activity</h2>
            <p className="text-gray-600">No recent activity</p>
          </div>
        </div>
      </div>
    </div>
  );
} 