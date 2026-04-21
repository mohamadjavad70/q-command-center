// src/autonomous/SelfLearningBrain.ts
// Q-Network Phase 3 — Self-Learning Autonomous Brain
// Council of Light approved — سام آرمان

export interface UserHabit {
  id: string;
  action: string;
  timeOfDay: number;    // 0-23
  dayOfWeek: number[];  // 0=Sun, 6=Sat
  frequency: number;    // times per week
  duration: number;     // minutes
  automated: boolean;
  lastExecuted: number; // timestamp
}

export interface OptimizationSuggestion {
  habitId: string;
  originalAction: string;
  timeSaved: number;    // minutes per week
  confidence: number;   // 0-1
}

export class SelfLearningBrain {
  private habits: UserHabit[] = [];
  private suggestions: OptimizationSuggestion[] = [];
  private learningMode: boolean = true;

  constructor() {
    this.loadHabits();
  }

  /** Record a user activity — called after every action */
  recordActivity(action: string, duration: number, timestamp: number): void {
    const hour = new Date(timestamp).getHours();
    const day  = new Date(timestamp).getDay();

    // Find existing similar habit (same action ± 1 hour, same day)
    const habit = this.habits.find(h =>
      h.action === action &&
      Math.abs(h.timeOfDay - hour) <= 1 &&
      h.dayOfWeek.includes(day)
    );

    if (habit) {
      habit.frequency++;
      habit.duration    = Math.round((habit.duration + duration) / 2);
      habit.lastExecuted = timestamp;
      if (!habit.dayOfWeek.includes(day)) {
        habit.dayOfWeek.push(day);
      }
    } else if (this.learningMode) {
      this.habits.push({
        id:           `habit_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        action,
        timeOfDay:     hour,
        dayOfWeek:     [day],
        frequency:     1,
        duration,
        automated:     false,
        lastExecuted:  timestamp,
      });
    }

    this.saveHabits();
    this.analyzeOptimizations();
  }

  /** Identify habits eligible for automation */
  analyzeOptimizations(): void {
    this.suggestions = [];

    for (const habit of this.habits) {
      if (habit.frequency >= 5 && !habit.automated) {
        const timeSaved = habit.duration * habit.frequency; // minutes/week

        if (timeSaved >= 10) {
          this.suggestions.push({
            habitId:        habit.id,
            originalAction: habit.action,
            timeSaved,
            confidence:     Math.min(0.95, 0.5 + habit.frequency / 100),
          });
        }
      }
    }
  }

  /** Get sorted suggestions (highest time saved first) */
  getSuggestions(): OptimizationSuggestion[] {
    return [...this.suggestions].sort((a, b) => b.timeSaved - a.timeSaved);
  }

  /** User approves automation for a habit */
  async approveSuggestion(habitId: string): Promise<boolean> {
    const habit = this.habits.find(h => h.id === habitId);
    if (!habit) return false;

    habit.automated = true;
    this.saveHabits();
    this.suggestions = this.suggestions.filter(s => s.habitId !== habitId);
    return true;
  }

  /** Auto-execute due automated habits (call every hour from scheduler) */
  async autoExecute(): Promise<{ executed: string[]; timeSaved: number }> {
    const now  = new Date();
    const hour = now.getHours();
    const day  = now.getDay();
    const executed: string[] = [];
    let timeSaved = 0;

    const due = this.habits.filter(h =>
      h.automated &&
      Math.abs(h.timeOfDay - hour) <= 1 &&
      h.dayOfWeek.includes(day)
    );

    for (const habit of due) {
      await this._executeAction(habit.action);
      habit.lastExecuted = Date.now();
      habit.frequency++;
      executed.push(habit.action);
      timeSaved += habit.duration;
    }

    if (executed.length > 0) this.saveHabits();
    return { executed, timeSaved };
  }

  private async _executeAction(action: string): Promise<void> {
    // Hook for real integration — email / calendar / messaging agents
    console.log(`[Q-Brain] Auto-executing: ${action}`);
    return new Promise(resolve => setTimeout(resolve, 100));
  }

  /** Stats snapshot */
  getStats(): {
    totalHabits: number;
    automatedHabits: number;
    totalTimeSavedPerWeek: number;
    learningProgress: number;
  } {
    const automated  = this.habits.filter(h => h.automated).length;
    const timeSaved  = this.habits
      .filter(h => h.automated)
      .reduce((sum, h) => sum + h.duration * h.frequency, 0);

    return {
      totalHabits:           this.habits.length,
      automatedHabits:       automated,
      totalTimeSavedPerWeek: timeSaved,
      learningProgress:      this.habits.length > 0 ? automated / this.habits.length : 0,
    };
  }

  getHabits(): UserHabit[] {
    return [...this.habits];
  }

  /** Reset — for testing */
  reset(): void {
    this.habits      = [];
    this.suggestions = [];
    this.saveHabits();
  }

  private loadHabits(): void {
    try {
      const stored = (typeof localStorage !== 'undefined')
        ? localStorage.getItem('q_brain_habits')
        : null;
      if (stored) this.habits = JSON.parse(stored);
    } catch {
      this.habits = [];
    }
  }

  private saveHabits(): void {
    try {
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem('q_brain_habits', JSON.stringify(this.habits));
      }
    } catch {
      // silently ignore in SSR / test environments
    }
  }
}

export const globalBrain = new SelfLearningBrain();
