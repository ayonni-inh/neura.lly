import React, { useEffect, useState, useMemo } from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  LineChart, Line, PieChart, Pie, Cell, AreaChart, Area
} from 'recharts';
import { db } from '../services/db';
import { Activity, TrendingUp, Zap, Image as ImageIcon, Video, BarChart3, Calendar } from 'lucide-react';

interface UsageActivity {
  id: string;
  action: string;
  metadata: {
    type: 'prompt' | 'image' | 'video';
    plan: string;
  };
  timestamp: Date;
}

export const UsageDashboard: React.FC = () => {
  const [activities, setActivities] = useState<UsageActivity[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchActivities = async () => {
      try {
        const data = await db.getActivities();
        const usageActivities = data.filter(a => a.action === 'usage');
        setActivities(usageActivities);
      } catch (e) {
        console.error("Failed to fetch activities", e);
      } finally {
        setLoading(false);
      }
    };
    fetchActivities();
  }, []);

  const chartData = useMemo(() => {
    if (activities.length === 0) return [];

    // Group by day
    const grouped: Record<string, { date: string, prompts: number, images: number, videos: number }> = {};
    
    // Last 7 days
    const last7Days = Array.from({ length: 7 }, (_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - i);
      return d.toISOString().split('T')[0];
    }).reverse();

    last7Days.forEach(date => {
      grouped[date] = { date, prompts: 0, images: 0, videos: 0 };
    });

    activities.forEach(a => {
      const date = a.timestamp.toISOString().split('T')[0];
      if (grouped[date]) {
        if (a.metadata?.type === 'prompt') grouped[date].prompts++;
        if (a.metadata?.type === 'image') grouped[date].images++;
        if (a.metadata?.type === 'video') grouped[date].videos++;
      }
    });

    return Object.values(grouped);
  }, [activities]);

  const pieData = useMemo(() => {
    const counts = { prompts: 0, images: 0, videos: 0 };
    activities.forEach(a => {
      if (a.metadata?.type === 'prompt') counts.prompts++;
      if (a.metadata?.type === 'image') counts.images++;
      if (a.metadata?.type === 'video') counts.videos++;
    });

    return [
      { name: 'Prompts', value: counts.prompts, color: '#6366f1' },
      { name: 'Images', value: counts.images, color: '#ec4899' },
      { name: 'Videos', value: counts.videos, color: '#8b5cf6' }
    ].filter(d => d.value > 0);
  }, [activities]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-mirror-accent"></div>
      </div>
    );
  }

  if (activities.length === 0) {
    return (
      <div className="bg-white/5 border border-white/10 rounded-3xl p-10 text-center">
        <BarChart3 className="w-12 h-12 text-white/20 mx-auto mb-4" />
        <h3 className="text-xl font-bold mb-2">No Usage Data Yet</h3>
        <p className="text-mirror-subtext max-w-sm mx-auto">
          Start interacting with the system to see your usage analytics and trends.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 rounded-lg bg-indigo-500/20 text-indigo-400">
              <Zap className="w-5 h-5" />
            </div>
            <span className="text-sm font-medium text-mirror-subtext">Total Prompts</span>
          </div>
          <div className="text-3xl font-bold">{pieData.find(d => d.name === 'Prompts')?.value || 0}</div>
        </div>

        <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 rounded-lg bg-pink-500/20 text-pink-400">
              <ImageIcon className="w-5 h-5" />
            </div>
            <span className="text-sm font-medium text-mirror-subtext">Image Generations</span>
          </div>
          <div className="text-3xl font-bold">{pieData.find(d => d.name === 'Images')?.value || 0}</div>
        </div>

        <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 rounded-lg bg-purple-500/20 text-purple-400">
              <Video className="w-5 h-5" />
            </div>
            <span className="text-sm font-medium text-mirror-subtext">Video Generations</span>
          </div>
          <div className="text-3xl font-bold">{pieData.find(d => d.name === 'Videos')?.value || 0}</div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-white/5 border border-white/10 rounded-3xl p-8">
          <div className="flex items-center justify-between mb-8">
            <h3 className="text-lg font-bold flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-mirror-accent" />
              Usage Trends
            </h3>
            <div className="text-xs text-mirror-subtext flex items-center gap-1">
              <Calendar className="w-3 h-3" />
              Last 7 Days
            </div>
          </div>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="colorPrompts" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#ffffff05" vertical={false} />
                <XAxis 
                  dataKey="date" 
                  stroke="#ffffff40" 
                  fontSize={10} 
                  tickFormatter={(str) => {
                    try {
                      const d = new Date(str);
                      return d.toLocaleDateString(undefined, { weekday: 'short' });
                    } catch (e) {
                      return str;
                    }
                  }}
                />
                <YAxis stroke="#ffffff40" fontSize={10} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#1a1a1a', border: '1px solid #ffffff10', borderRadius: '12px' }}
                  itemStyle={{ fontSize: '12px' }}
                />
                <Area type="monotone" dataKey="prompts" stroke="#6366f1" fillOpacity={1} fill="url(#colorPrompts)" />
                <Area type="monotone" dataKey="images" stroke="#ec4899" fill="transparent" />
                <Area type="monotone" dataKey="videos" stroke="#8b5cf6" fill="transparent" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white/5 border border-white/10 rounded-3xl p-8">
          <h3 className="text-lg font-bold mb-8 flex items-center gap-2">
            <Activity className="w-5 h-5 text-mirror-accent" />
            Distribution
          </h3>
          <div className="h-[300px] w-full flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {pieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{ backgroundColor: '#1a1a1a', border: '1px solid #ffffff10', borderRadius: '12px' }}
                />
                <Legend verticalAlign="bottom" height={36}/>
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
};
