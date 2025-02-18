import React, { useEffect, useState } from 'react';
import { Calendar, dateFnsLocalizer, Views, View } from 'react-big-calendar';
import { format } from 'date-fns';
import { parse } from 'date-fns';
import { startOfWeek } from 'date-fns';
import { getDay } from 'date-fns';
import zhTW from 'date-fns/locale/zh-TW';
import ICAL from 'ical.js';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import './calendar.css';

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

const customViews = {
  month: true,
  week: true,
  day: true,
  work_week: true,
};

const customMessages = {
  today: '今天',
  previous: '上一個',
  next: '下一個',
  month: '月',
  week: '週',
  day: '日',
  work_week: '三日',
  date: '日期',
  time: '時間',
  event: '事件',
  noEventsInRange: '此時段沒有預約',
};

function App() {
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [view, setView] = useState<View>(Views.WEEK);

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

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 768) {
        setView(Views.DAY);
      } else {
        setView(Views.WEEK);
      }
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-white">
        <div className="text-lg font-semibold text-gray-600">載入中...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-7xl mx-auto">
        <div className="bg-white">
          <div className="px-4 pt-6 pb-4">
            <div className="flex justify-between items-center">
              <div>
                <h1 className="text-4xl font-bold text-black mb-1">RegChien's Calendar</h1>
                <p className="text-base text-purple-600">查看可預約時段</p>
              </div>
              <div className="flex items-center space-x-4">
                <button className="text-purple-600 text-lg">Today</button>
                <button className="text-purple-600 text-2xl">⋯</button>
              </div>
            </div>
          </div>
          <div className="h-[calc(100vh-8rem)]">
            <Calendar
              localizer={localizer}
              events={events}
              startAccessor="start"
              endAccessor="end"
              views={customViews}
              defaultView={view}
              view={view}
              onView={(newView: View) => setView(newView)}
              culture="zh-TW"
              messages={customMessages}
              eventPropGetter={() => ({
                className: 'calendar-event'
              })}
              dayPropGetter={(date) => ({
                className: 'calendar-day'
              })}
              min={new Date(2024, 1, 1, 5, 0)} // 從早上 5 點開始
              max={new Date(2024, 1, 1, 20, 0)} // 到晚上 8 點結束
              length={3} // 設定工作週視圖的長度為 3 天
            />
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;
