import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Activity, Flame, Clock, History } from 'lucide-react';
import { supabase } from '../lib/supabase';
import './Dashboard.css';

interface Session {
  id: string;
  duration_seconds: number;
  created_at: string;
}

const Dashboard: React.FC = () => {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchSessions = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const { data, error } = await supabase
          .from('user_sessions')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false });

        if (error) throw error;
        setSessions(data || []);
      } catch (err) {
        console.error("Error fetching sessions:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchSessions();
  }, []);

  // Calculate aggregates
  const totalSeconds = sessions.reduce((acc, curr) => acc + curr.duration_seconds, 0);
  const totalMinutes = Math.floor(totalSeconds / 60);
  const totalHours = Math.floor(totalMinutes / 60);
  const remainingMinutes = totalMinutes % 60;

  // Simple streak logic (consecutive days with at least 1 session)
  let currentStreak = 0;
  if (sessions.length > 0) {
      const dates = sessions.map(s => new Date(s.created_at).toDateString());
      const uniqueDates = Array.from(new Set(dates));
      
      let checkDate = new Date();
      if (!uniqueDates.includes(checkDate.toDateString())) {
          // If no session today, maybe the streak is from yesterday
          checkDate.setDate(checkDate.getDate() - 1);
      }
      
      for (let i = 0; i < uniqueDates.length; i++) {
          if (uniqueDates.includes(checkDate.toDateString())) {
              currentStreak++;
              checkDate.setDate(checkDate.getDate() - 1);
          } else {
              break;
          }
      }
  }

  const formatDuration = (seconds: number) => {
    if (seconds < 60) return `${seconds}s`;
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}m ${s}s`;
  };

  return (
    <div className="dashboard-container">
      <div className="dashboard-header">
        <motion.h2 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="dashboard-title"
        >
          Bio-<span className="text-gradient">Dashboard</span>
        </motion.h2>
        <p className="dashboard-subtitle">Track your somatic mastery and flow state.</p>
      </div>

      <motion.div 
        className="stats-grid"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        <div className="stat-card">
          <div className="stat-icon-wrap cyan">
            <Clock size={28} />
          </div>
          <div className="stat-content">
            <span className="stat-label">Total Flow State</span>
            <span className="stat-value">
              {totalHours > 0 ? `${totalHours}h ` : ''}{remainingMinutes}m
            </span>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon-wrap orange">
            <Flame size={28} />
          </div>
          <div className="stat-content">
            <span className="stat-label">Current Streak</span>
            <span className="stat-value">{currentStreak} Day{currentStreak !== 1 ? 's' : ''}</span>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon-wrap purple">
            <Activity size={28} />
          </div>
          <div className="stat-content">
            <span className="stat-label">Total Sessions</span>
            <span className="stat-value">{sessions.length}</span>
          </div>
        </div>
      </motion.div>

      <motion.div 
        className="history-section"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        <div className="history-header">
          <History size={20} className="panel-icon purple-icon" />
          <h3>Recent Sessions</h3>
        </div>
        
        {loading ? (
          <div className="empty-state">Loading data...</div>
        ) : sessions.length === 0 ? (
          <div className="empty-state">No sessions recorded yet. Start a wash!</div>
        ) : (
          <div className="history-list">
            {sessions.slice(0, 10).map((session) => (
              <div key={session.id} className="history-item">
                <span className="history-item-date">
                  {new Date(session.created_at).toLocaleDateString()} at {new Date(session.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                </span>
                <span className="history-item-duration">
                  {formatDuration(session.duration_seconds)}
                </span>
              </div>
            ))}
          </div>
        )}
      </motion.div>
    </div>
  );
};

export default Dashboard;
