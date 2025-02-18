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
  description?: string;
  location?: string;
  start: Date;
  end: Date;
  allDay?: boolean;
  calendarId: string;
}

interface CalendarConfig {
  id: string;
  url: string;
  color: string;
  title: string;
  enabled: boolean;
  showDetails: boolean;
}

const getCalendarConfigs = (): CalendarConfig[] => {
  const configs: CalendarConfig[] = [];
  const envVars = process.env;

  // 尋找所有行事曆配置
  Object.keys(envVars).forEach(key => {
    if (key.startsWith('REACT_APP_CALENDAR_') && key.endsWith('_URL')) {
      const baseKey = key.replace('REACT_APP_CALENDAR_', '').replace('_URL', '');
      const id = baseKey.toLowerCase();
      
      configs.push({
        id,
        url: envVars[key] || '',
        color: envVars[`REACT_APP_CALENDAR_${baseKey}_COLOR`] || '#4F46E5',
        title: envVars[`REACT_APP_CALENDAR_${baseKey}_TITLE`] || baseKey,
        enabled: true,
        showDetails: envVars[`REACT_APP_CALENDAR_${baseKey}_SHOW_DETAILS`] === 'true',
      });
    }
  });

  return configs;
};

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
  const [calendars, setCalendars] = useState<CalendarConfig[]>(getCalendarConfigs());

  const fetchCalendarEvents = async (calendar: CalendarConfig) => {
    try {
      const response = await fetch(calendar.url);
      const icsData = await response.text();
      
      const jcalData = ICAL.parse(icsData);
      const comp = new ICAL.Component(jcalData);
      const vevents = comp.getAllSubcomponents('vevent');
      
      return vevents.map(vevent => {
        const event = new ICAL.Event(vevent);
        const eventData: CalendarEvent = {
          title: calendar.showDetails ? event.summary : calendar.title,
          start: event.startDate.toJSDate(),
          end: event.endDate.toJSDate(),
          allDay: event.startDate.isDate,
          calendarId: calendar.id,
        };

        if (calendar.showDetails) {
          if (event.description) eventData.description = event.description;
          if (event.location) eventData.location = event.location;
        }

        return eventData;
      });
    } catch (error) {
      console.error(`Error fetching calendar ${calendar.id}:`, error);
      return [];
    }
  };

  useEffect(() => {
    const fetchAllCalendars = async () => {
      try {
        const enabledCalendars = calendars.filter(cal => cal.enabled);
        const allEvents = await Promise.all(
          enabledCalendars.map(calendar => fetchCalendarEvents(calendar))
        );
        
        setEvents(allEvents.flat());
      } catch (error) {
        console.error('Error fetching calendars:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchAllCalendars();
  }, [calendars]);

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

  const toggleCalendar = (calendarId: string) => {
    setCalendars(prevCalendars =>
      prevCalendars.map(cal =>
        cal.id === calendarId ? { ...cal, enabled: !cal.enabled } : cal
      )
    );
  };

  const toggleDetails = (calendarId: string) => {
    setCalendars(prevCalendars =>
      prevCalendars.map(cal =>
        cal.id === calendarId ? { ...cal, showDetails: !cal.showDetails } : cal
      )
    );
  };

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
                <p className="text-base text-purple-600">i@regchien.info</p>
              </div>
              <div className="flex items-center space-x-4">
                <div className="flex gap-2">
                  {calendars.map(calendar => (
                    <div key={calendar.id} className="flex items-center gap-1">
                      <button
                        className={`px-3 py-1 rounded-full text-sm font-medium transition-colors duration-200 ${
                          calendar.enabled
                            ? `bg-opacity-100 text-white`
                            : `bg-opacity-20 text-gray-600`
                        }`}
                        style={{
                          backgroundColor: calendar.enabled
                            ? calendar.color
                            : `${calendar.color}33`,
                        }}
                        onClick={() => toggleCalendar(calendar.id)}
                      >
                        {calendar.title}
                      </button>
                      <button
                        className={`p-1 rounded-full transition-colors duration-200 ${
                          calendar.enabled
                            ? calendar.showDetails
                              ? 'text-gray-900'
                              : 'text-gray-400'
                            : 'text-gray-300'
                        }`}
                        onClick={() => toggleDetails(calendar.id)}
                        disabled={!calendar.enabled}
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                          <path d="M10 12a2 2 0 100-4 2 2 0 000 4z" />
                          <path fillRule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clipRule="evenodd" />
                        </svg>
                      </button>
                    </div>
                  ))}
                </div>
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
              eventPropGetter={(event) => {
                const calendar = calendars.find(cal => cal.id === event.calendarId);
                return {
                  className: 'calendar-event',
                  style: {
                    backgroundColor: calendar?.color,
                    borderColor: calendar?.color,
                  },
                };
              }}
              dayPropGetter={(date) => ({
                className: 'calendar-day'
              })}
              min={new Date(2024, 1, 1, 5, 0)} // 從早上 5 點開始
              max={new Date(2024, 1, 1, 20, 0)} // 到晚上 8 點結束
              length={3} // 設定工作週視圖的長度為 3 天
              components={{
                event: (props) => {
                  const { event } = props;
                  const calendar = calendars.find(cal => cal.id === event.calendarId);
                  if (!calendar?.showDetails) {
                    return <div>{event.title}</div>;
                  }
                  return (
                    <div>
                      <div className="font-medium">{event.title}</div>
                      {event.location && (
                        <div className="text-xs opacity-75">{event.location}</div>
                      )}
                      {event.description && (
                        <div className="text-xs opacity-75">{event.description}</div>
                      )}
                    </div>
                  );
                },
              }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;
