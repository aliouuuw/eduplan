'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Calendar, Clock, BookOpen } from 'lucide-react';

interface TimetableEntry {
  id: string;
  academicYear: string;
  status: string;
  className: string;
  classId: string;
  subjectName: string;
  subjectCode: string;
  subjectId: string;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  slotName: string | null;
  isBreak: boolean;
}

interface TimetableData {
  schedule: TimetableEntry[];
  scheduleByDay: Record<number, TimetableEntry[]>;
  totalPeriods: number;
}

const DAYS_OF_WEEK = [
  { value: 1, label: 'Monday' },
  { value: 2, label: 'Tuesday' },
  { value: 3, label: 'Wednesday' },
  { value: 4, label: 'Thursday' },
  { value: 5, label: 'Friday' },
  { value: 6, label: 'Saturday' },
  { value: 7, label: 'Sunday' },
];

export default function TeacherTimetable() {
  const { data: session } = useSession();
  const [timetableData, setTimetableData] = useState<TimetableData>({
    schedule: [],
    scheduleByDay: {},
    totalPeriods: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchTimetable = async () => {
      try {
        const response = await fetch('/api/dashboard/teacher/timetable');
        if (response.ok) {
          const data = await response.json();
          setTimetableData(data);
        }
      } catch (error) {
        console.error('Error fetching timetable:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchTimetable();
  }, []);

  const getColorForSubject = (subjectName: string) => {
    const colors = [
      'bg-blue-50 border-blue-200 text-blue-900',
      'bg-green-50 border-green-200 text-green-900',
      'bg-purple-50 border-purple-200 text-purple-900',
      'bg-orange-50 border-orange-200 text-orange-900',
      'bg-pink-50 border-pink-200 text-pink-900',
      'bg-indigo-50 border-indigo-200 text-indigo-900',
    ];
    const hash = subjectName.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    return colors[hash % colors.length];
  };

  return (
    <div className="space-y-8">
      <header className="space-y-2">
        <h1 className="text-3xl font-semibold text-black">My Timetable</h1>
        <p className="max-w-2xl text-sm text-gray-600">
          Your weekly teaching schedule with all classes and time slots.
        </p>
      </header>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Card className="rounded-2xl border border-gray-200 shadow-sm">
          <CardContent className="flex items-center justify-between p-6">
            <div>
              <p className="text-xs font-medium uppercase tracking-wider text-gray-500">Weekly Periods</p>
              <p className="mt-2 text-3xl font-semibold text-black">
                {loading ? (
                  <span className="inline-block h-8 w-12 animate-pulse rounded bg-gray-200" />
                ) : (
                  timetableData.totalPeriods
                )}
              </p>
            </div>
            <span className="flex h-12 w-12 items-center justify-center rounded-full border border-gray-200 bg-gray-50">
              <Clock className="h-6 w-6 text-gray-600" />
            </span>
          </CardContent>
        </Card>

        <Card className="rounded-2xl border border-gray-200 shadow-sm">
          <CardContent className="flex items-center justify-between p-6">
            <div>
              <p className="text-xs font-medium uppercase tracking-wider text-gray-500">Teaching Days</p>
              <p className="mt-2 text-3xl font-semibold text-black">
                {loading ? (
                  <span className="inline-block h-8 w-12 animate-pulse rounded bg-gray-200" />
                ) : (
                  Object.keys(timetableData.scheduleByDay).length
                )}
              </p>
            </div>
            <span className="flex h-12 w-12 items-center justify-center rounded-full border border-gray-200 bg-gray-50">
              <Calendar className="h-6 w-6 text-gray-600" />
            </span>
          </CardContent>
        </Card>

        <Card className="rounded-2xl border border-gray-200 shadow-sm">
          <CardContent className="flex items-center justify-between p-6">
            <div>
              <p className="text-xs font-medium uppercase tracking-wider text-gray-500">Unique Classes</p>
              <p className="mt-2 text-3xl font-semibold text-black">
                {loading ? (
                  <span className="inline-block h-8 w-12 animate-pulse rounded bg-gray-200" />
                ) : (
                  new Set(timetableData.schedule.map(s => s.classId)).size
                )}
              </p>
            </div>
            <span className="flex h-12 w-12 items-center justify-center rounded-full border border-gray-200 bg-gray-50">
              <BookOpen className="h-6 w-6 text-gray-600" />
            </span>
          </CardContent>
        </Card>
      </div>

      {/* Weekly Schedule */}
      {loading ? (
        <div className="space-y-6">
          {[...Array(5)].map((_, idx) => (
            <Card key={idx} className="rounded-2xl border border-gray-200 shadow-sm">
              <CardHeader>
                <div className="h-6 w-24 animate-pulse rounded bg-gray-200" />
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {[...Array(3)].map((_, i) => (
                    <div key={i} className="h-24 animate-pulse rounded-xl bg-gray-100" />
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : timetableData.totalPeriods === 0 ? (
        <Card className="rounded-2xl border border-gray-200 shadow-sm">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Calendar className="mb-4 h-12 w-12 text-gray-400" />
            <h3 className="mb-2 text-lg font-semibold text-black">No Schedule Available</h3>
            <p className="text-center text-sm text-gray-600">
              Your timetable hasn't been created yet. Contact your school administrator for more information.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {DAYS_OF_WEEK.map((day) => {
            const daySchedule = timetableData.scheduleByDay[day.value];
            if (!daySchedule || daySchedule.length === 0) return null;

            return (
              <Card key={day.value} className="rounded-2xl border border-gray-200 shadow-sm">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-lg font-semibold text-black">
                    <Calendar className="h-5 w-5 text-gray-600" />
                    {day.label}
                  </CardTitle>
                  <CardDescription className="text-sm text-gray-600">
                    {daySchedule.length} {daySchedule.length === 1 ? 'period' : 'periods'} scheduled
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {daySchedule.map((entry) => (
                      <div
                        key={entry.id}
                        className={`flex items-center gap-4 rounded-xl border p-4 transition hover:shadow-sm ${getColorForSubject(entry.subjectName)}`}
                      >
                        <div className="flex h-16 w-16 flex-shrink-0 flex-col items-center justify-center rounded-lg bg-white border border-gray-200">
                          <span className="text-xs font-medium text-gray-500">Start</span>
                          <span className="text-sm font-bold text-black">{entry.startTime}</span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="text-base font-semibold">
                            {entry.subjectName} {entry.subjectCode && `(${entry.subjectCode})`}
                          </h3>
                          <p className="mt-1 text-sm opacity-90">
                            {entry.className}
                          </p>
                          <div className="mt-2 flex items-center gap-3 text-xs opacity-75">
                            <span className="flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {entry.startTime} - {entry.endTime}
                            </span>
                            {entry.slotName && (
                              <>
                                <span>•</span>
                                <span>{entry.slotName}</span>
                              </>
                            )}
                          </div>
                        </div>
                        <div className="hidden sm:block">
                          <span className="rounded-full bg-white px-3 py-1 text-xs font-medium border border-gray-200">
                            {entry.academicYear}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

