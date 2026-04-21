// src/components/LearningDashboard.tsx
// Q-Network Phase 3 — Learning Dashboard
// Council of Light approved — سام آرمان
import React, { useState, useEffect, useCallback } from 'react';
import { Brain, TrendingUp, Clock, Zap, CheckCircle, Play } from 'lucide-react';
import { globalBrain, type OptimizationSuggestion } from '../autonomous/SelfLearningBrain';

const LearningDashboard: React.FC = () => {
  const [stats, setStats]             = useState(globalBrain.getStats());
  const [suggestions, setSuggestions] = useState<OptimizationSuggestion[]>(globalBrain.getSuggestions());
  const [approving, setApproving]     = useState<string | null>(null);

  const refresh = useCallback(() => {
    setStats(globalBrain.getStats());
    setSuggestions(globalBrain.getSuggestions());
  }, []);

  useEffect(() => {
    const id = setInterval(refresh, 5000);
    return () => clearInterval(id);
  }, [refresh]);

  const handleApprove = async (habitId: string) => {
    setApproving(habitId);
    await globalBrain.approveSuggestion(habitId);
    refresh();
    setApproving(null);
  };

  const progressPct = Math.round(stats.learningProgress * 100);

  return (
    <div className="min-h-screen bg-gray-950 text-white p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3 border-b border-gray-800 pb-4">
        <Brain size={30} className="text-purple-400" />
        <div>
          <h1 className="text-2xl font-bold">Self-Learning Brain</h1>
          <p className="text-xs text-gray-400">Q-Network Phase 3 — Autonomous Habit Engine</p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard
          value={stats.totalHabits}
          label="Erkannte Gewohnheiten"
          icon={<Brain size={18} className="text-purple-400" />}
          color="purple"
        />
        <StatCard
          value={stats.automatedHabits}
          label="Automatisiert"
          icon={<CheckCircle size={18} className="text-green-400" />}
          color="green"
        />
        <StatCard
          value={`${stats.totalTimeSavedPerWeek} min`}
          label="Gespart / Woche"
          icon={<Clock size={18} className="text-yellow-400" />}
          color="yellow"
        />
        <StatCard
          value={`${progressPct}%`}
          label="Lernfortschritt"
          icon={<TrendingUp size={18} className="text-blue-400" />}
          color="blue"
        />
      </div>

      {/* Learning Progress Bar */}
      <div className="bg-gray-800 rounded-xl p-4">
        <div className="flex justify-between items-center mb-2">
          <h3 className="text-sm font-medium text-gray-300">🧠 Lernstatus</h3>
          <span className="text-xs text-gray-500">{progressPct}%</span>
        </div>
        <div className="w-full bg-gray-700 rounded-full h-2.5">
          <div
            className="bg-gradient-to-r from-purple-600 to-blue-500 h-2.5 rounded-full transition-all duration-700"
            style={{ width: `${progressPct}%` }}
          />
        </div>
        <p className="text-xs text-gray-500 mt-2">
          {progressPct < 30
            ? '📖 System lernt deine Gewohnheiten...'
            : progressPct < 70
            ? '🧠 Ich kenne dich schon gut...'
            : '🎯 Vollständig kalibriert. Bereit zur Optimierung.'}
        </p>
      </div>

      {/* Suggestions */}
      {suggestions.length > 0 ? (
        <div className="bg-gradient-to-br from-purple-900/20 to-blue-900/20 border border-purple-800/40 rounded-xl p-5">
          <h3 className="text-white font-semibold mb-4 flex items-center gap-2">
            <Zap size={16} className="text-yellow-400" />
            Optimierungsvorschläge ({suggestions.length})
          </h3>
          <div className="space-y-3">
            {suggestions.map(s => (
              <div
                key={s.habitId}
                className="flex justify-between items-center p-3 bg-gray-800/60 rounded-lg border border-gray-700/50"
              >
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-white font-medium truncate">{s.originalAction}</p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {s.timeSaved} min/Woche sparen · Konfidenz {Math.round(s.confidence * 100)}%
                  </p>
                </div>
                <button
                  onClick={() => handleApprove(s.habitId)}
                  disabled={approving === s.habitId}
                  className="ml-3 flex items-center gap-1.5 px-3 py-1.5 bg-green-600 hover:bg-green-700 disabled:bg-gray-600 rounded-lg text-white text-xs font-medium transition-colors shrink-0"
                >
                  {approving === s.habitId
                    ? <span className="animate-spin">⏳</span>
                    : <Play size={12} />}
                  Automatisieren
                </button>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="bg-gray-800/50 border border-gray-700/40 rounded-xl p-5 text-center">
          <p className="text-gray-400 text-sm">
            {stats.totalHabits === 0
              ? '📖 Noch keine Gewohnheiten erkannt. Nutze Q täglich, damit ich deine Muster lerne.'
              : '✅ Alle Gewohnheiten sind bereits optimiert.'}
          </p>
        </div>
      )}

      {/* Demo Seeder */}
      <div className="bg-gray-800/30 border border-gray-700/30 rounded-xl p-4">
        <h3 className="text-xs text-gray-500 uppercase tracking-wider mb-3">Demo — Gewohnheiten simulieren</h3>
        <div className="flex flex-wrap gap-2">
          {DEMO_HABITS.map(h => (
            <button
              key={h.action}
              onClick={() => {
                globalBrain.recordActivity(h.action, h.duration, Date.now());
                refresh();
              }}
              className="px-3 py-1.5 bg-gray-700 hover:bg-gray-600 rounded-lg text-xs text-gray-300 transition-colors"
            >
              +{h.action}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

/* ----- Sub-components ----- */

interface StatCardProps {
  value: string | number;
  label: string;
  icon: React.ReactNode;
  color: 'purple' | 'green' | 'yellow' | 'blue';
}

const colorMap = {
  purple: 'text-purple-400',
  green:  'text-green-400',
  yellow: 'text-yellow-400',
  blue:   'text-blue-400',
};

const StatCard: React.FC<StatCardProps> = ({ value, label, icon, color }) => (
  <div className="bg-gray-800 rounded-xl p-4 flex flex-col gap-1">
    <div className="flex items-center gap-2">{icon}</div>
    <div className={`text-2xl font-bold ${colorMap[color]}`}>{value}</div>
    <div className="text-xs text-gray-400 leading-tight">{label}</div>
  </div>
);

const DEMO_HABITS = [
  { action: 'E-Mails lesen',       duration: 15 },
  { action: 'Kalender überprüfen', duration: 5  },
  { action: 'Slack Nachrichten',   duration: 10 },
  { action: 'Berichte erstellen',  duration: 30 },
];

export default LearningDashboard;
