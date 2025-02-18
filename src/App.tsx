import React, { useEffect, useState } from 'react';
import { Calendar, dateFnsLocalizer, Views } from 'react-big-calendar';
import { format } from 'date-fns';
import { parse } from 'date-fns';
import { startOfWeek } from 'date-fns';
import { getDay } from 'date-fns';
import zhTW from 'date-fns/locale/zh-TW';
import ICAL from 'ical.js';
import 'react-big-calendar/lib/css/react-big-calendar.css';

const locales = {
  'zh-TW': zhTW,
};

const localizer = dateFnsLocalizer({
  format,
  parse,
  startOfWeek,
  getDay,
  locales,
});

interface CalendarEvent {
  title: string;
  start: Date;
  end: Date;
  allDay?: boolean;
}

function App() {
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchCalendar = async () => {
      try {
        const icsUrl = process.env.REACT_APP_ICS_URL;
        if (!icsUrl) {
          throw new Error('ICS URL not found in environment variables');
        }

        const response = await fetch(icsUrl);
        const icsData = await response.text();
        
        const jcalData = ICAL.parse(icsData);
        const comp = new ICAL.Component(jcalData);
        const vevents = comp.getAllSubcomponents('vevent');
        
        const calendarEvents = vevents.map(vevent => {
          const event = new ICAL.Event(vevent);
          return {
            title: '已預約',
            start: event.startDate.toJSDate(),
            end: event.endDate.toJSDate(),
            allDay: event.startDate.isDate
          };
        });

        setEvents(calendarEvents);
      } catch (error) {
        console.error('Error fetching calendar:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchCalendar();
  }, []);

  if (isLoading) {
    return <div className="flex items-center justify-center min-h-screen">載入中...</div>;
  }

  return (
    <div className="min-h-screen p-4 bg-white">
      <h1 className="text-2xl font-bold mb-4 text-gray-900">行事曆</h1>
      <div className="h-[600px]">
        <Calendar
          localizer={localizer}
          events={events}
          startAccessor="start"
          endAccessor="end"
          views={[Views.MONTH, Views.WEEK, Views.DAY]}
          defaultView={Views.MONTH}
          culture="zh-TW"
          messages={{
            today: '今天',
            previous: '上一個',
            next: '下一個',
            month: '月',
            week: '週',
            day: '日',
            agenda: '議程',
          }}
        />
      </div>
    </div>
  );
}

export default App;
