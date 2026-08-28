'use client';

import { useState, useMemo } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface WorkoutCalendarProps {
  sessions: any[];
  onDayClick: (dateStr: string, daySessions: any[]) => void;
}

export default function WorkoutCalendar({
  sessions,
  onDayClick,
}: WorkoutCalendarProps) {
  const [currentDate, setCurrentDate] = useState(new Date());

  // Group completed workouts by YYYY-MM-DD
  const workoutsByDate = useMemo(() => {
    const map: Record<string, any[]> = {};
    sessions
      .filter((s) => s.status === 'completed')
      .forEach((session) => {
        const dateStr = new Date(session.start_time)
          .toISOString()
          .split('T')[0];
        if (!map[dateStr]) map[dateStr] = [];
        map[dateStr].push(session);
      });
    return map;
  }, [sessions]);

  // Calendar Math
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const firstDay = new Date(year, month, 1).getDay();
  const startingEmptyCells = firstDay === 0 ? 6 : firstDay - 1;

  const daysArray = Array.from({ length: daysInMonth }, (_, i) => i + 1);
  const monthName = currentDate.toLocaleString('default', { month: 'long' });

  const nextMonth = () => setCurrentDate(new Date(year, month + 1, 1));
  const prevMonth = () => setCurrentDate(new Date(year, month - 1, 1));

  return (
    <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-4 sm:p-5 shadow-sm">
      {/* Month Navigation */}
      <div className="flex justify-between items-center mb-6">
        <h3 className="font-bold text-white text-lg tracking-tight">
          {monthName} {year}
        </h3>
        <div className="flex gap-2">
          <button
            onClick={prevMonth}
            className="p-1.5 text-neutral-400 hover:text-white hover:bg-neutral-800 rounded-md transition"
          >
            <ChevronLeft size={20} />
          </button>
          <button
            onClick={nextMonth}
            className="p-1.5 text-neutral-400 hover:text-white hover:bg-neutral-800 rounded-md transition"
          >
            <ChevronRight size={20} />
          </button>
        </div>
      </div>

      {/* Days of week */}
      <div className="grid grid-cols-7 mb-3 text-center">
        {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day) => (
          <div
            key={day}
            className="text-[10px] font-mono text-neutral-500 uppercase tracking-wider"
          >
            {day}
          </div>
        ))}
      </div>

      {/* Calendar Grid */}
      <div className="grid grid-cols-7 gap-y-4 gap-x-1 text-center">
        {Array.from({ length: startingEmptyCells }).map((_, i) => (
          <div key={`empty-${i}`} />
        ))}

        {daysArray.map((day) => {
          const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
          const dayWorkouts = workoutsByDate[dateStr] || [];
          const hasWorkout = dayWorkouts.length > 0;

          return (
            <div
              key={day}
              onClick={() => hasWorkout && onDayClick(dateStr, dayWorkouts)}
              className={`flex flex-col items-center ${hasWorkout ? 'cursor-pointer group' : ''}`}
            >
              <div
                className={`w-8 h-8 sm:w-9 sm:h-9 flex items-center justify-center rounded-full text-xs sm:text-sm font-medium transition-colors ${
                  hasWorkout
                    ? 'bg-indigo-600 text-white group-hover:bg-indigo-500 shadow-lg shadow-indigo-900/20'
                    : 'text-neutral-400 bg-transparent'
                }`}
              >
                {day}
              </div>
              <div className="h-4 mt-1 flex flex-col items-center">
                {hasWorkout && (
                  <span className="text-[8px] sm:text-[9px] font-mono text-neutral-500 leading-tight truncate w-10 sm:w-12 px-1">
                    {dayWorkouts[0].name}
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
