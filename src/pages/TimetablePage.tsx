import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Loader2 } from 'lucide-react';
import { getTimetable, getPeriodConfigs } from '@/lib/services';
import { TimetableEntry, PeriodConfig } from '@/lib/types';
import { useTerm } from '@/lib/termContext';

// Days of week
const DAYS = [
  { value: 1, label: 'จันทร์', color: 'bg-yellow-100 border-yellow-200 text-yellow-800' },
  { value: 2, label: 'อังคาร', color: 'bg-pink-100 border-pink-200 text-pink-800' },
  { value: 3, label: 'พุธ', color: 'bg-green-100 border-green-200 text-green-800' },
  { value: 4, label: 'พฤหัสบดี', color: 'bg-orange-100 border-orange-200 text-orange-800' },
  { value: 5, label: 'ศุกร์', color: 'bg-blue-100 border-blue-200 text-blue-800' },
];

// Generate hours from 07:00 to 17:00 (or later)
const START_HOUR = 7;
const END_HOUR = 17;
const HOURS = Array.from({ length: END_HOUR - START_HOUR + 1 }, (_, i) => START_HOUR + i);

export default function TimetablePage() {
  const { activeTerm } = useTerm();
  const [timetable, setTimetable] = useState<TimetableEntry[]>([]);
  const [periodConfigs, setPeriodConfigs] = useState<PeriodConfig[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      if (!activeTerm) {
        setLoading(false);
        return;
      }

      setLoading(true);
      try {
        const [ttData, periodsData] = await Promise.all([
          getTimetable(activeTerm.id),
          getPeriodConfigs()
        ]);
        setTimetable(ttData);
        setPeriodConfigs(periodsData);
      } catch (e) {
        console.error("Failed to load timetable", e);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [activeTerm]);

  // Helper to convert time string "HH:MM" to minutes from midnight
  const timeToMinutes = (time: string) => {
    const [h, m] = time.split(':').map(Number);
    return h * 60 + m;
  };

  // Helper to calculate position and width
  const getStyle = (entry: TimetableEntry) => {
    if (!entry.startTime || !entry.endTime) return {};

    const start = timeToMinutes(entry.startTime);
    const end = timeToMinutes(entry.endTime);
    const dayStart = START_HOUR * 60; // 07:00 in minutes

    // Calculate left offset percentage relative to full day width
    const totalMinutes = (END_HOUR - START_HOUR + 1) * 60;
    const left = ((start - dayStart) / totalMinutes) * 100;
    const width = ((end - start) / totalMinutes) * 100;

    return {
      left: `${left}%`,
      width: `${width}%`
    };
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold">ตารางสอน</h1>
        <p className="text-sm text-muted-foreground">ภาคเรียนปัจจุบัน</p>
      </div>

      <Card className="border-0 shadow-sm overflow-hidden">
        <CardContent className="p-0 overflow-x-auto">
          {loading ? (
            <div className="flex justify-center p-8 text-muted-foreground">
              <Loader2 className="mr-2 h-6 w-6 animate-spin" /> Loading...
            </div>
          ) : (
            <div className="min-w-[1000px] p-4">
              {/* Header (Times) */}
              <div className="flex border-b border-border/50 mb-2">
                <div className="w-24 shrink-0"></div> {/* Day Column Placeholder */}
                <div className="flex-1 flex relative h-8">
                  {HOURS.map((hour) => (
                    <div key={hour} className="flex-1 text-xs text-muted-foreground font-medium border-l border-border/30 pl-1">
                      {hour.toString().padStart(2, '0')}:00
                    </div>
                  ))}
                  {/* Last border */}
                  <div className="absolute right-0 top-0 bottom-0 w-px bg-border/30"></div>
                </div>
              </div>

              {/* Rows (Days) */}
              <div className="space-y-2">
                {DAYS.map((day) => {
                  // Get entries for this day
                  const dayEntries = timetable.filter(t => t.dayOfWeek === day.value);

                  return (
                    <div key={day.value} className="flex h-20 group hover:bg-secondary/5 rounded-lg transition-colors">
                      {/* Day Label */}
                      <div className="w-24 shrink-0 flex items-center justify-center p-2">
                        <div className={`w-full h-full flex items-center justify-center rounded-md text-sm font-bold ${day.color}`}>
                          {day.label}
                        </div>
                      </div>

                      {/* Timeline Area */}
                      <div className="flex-1 relative border-l border-border/30 bg-secondary/5 rounded-r-lg">
                        {/* Grid Lines */}
                        <div className="absolute inset-0 flex pointer-events-none">
                          {HOURS.map((h) => (
                            <div key={h} className="flex-1 border-r border-border/10 last:border-0"></div>
                          ))}
                        </div>

                        {/* Entries */}
                        {dayEntries.map(entry => {
                          const style = getStyle(entry);
                          return (
                            <div
                              key={entry.id}
                              className="absolute top-2 bottom-2 rounded bg-white border shadow-sm p-1.5 overflow-hidden hover:shadow-md hover:z-10 transition-all cursor-pointer group/item"
                              style={style}
                              title={`${entry.subjectName} (${entry.startTime} - ${entry.endTime})`}
                            >
                              <div className={`h-full w-1 absolute left-0 top-0 bottom-0 ${day.color.replace('bg-', 'bg-opacity-50 ')}`}></div>
                              <div className="pl-2 h-full flex flex-col justify-center">
                                <p className="text-xs font-bold truncate leading-tight">{entry.subjectName}</p>
                                <p className="text-[10px] text-muted-foreground truncate">{entry.classroomName}</p>
                                <p className="text-[9px] text-muted-foreground/70 hidden group-hover/item:block">
                                  {entry.startTime} - {entry.endTime}
                                </p>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="text-xs text-muted-foreground text-center">
        * ตารางแสดงช่วงเวลา 07:00 - 18:00 น.
      </div>
    </div>
  );
}
