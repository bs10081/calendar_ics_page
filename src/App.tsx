import React, { useEffect, useState } from 'react';
import { Calendar, dateFnsLocalizer, Views, View } from 'react-big-calendar';
import { format, parse, startOfWeek, getDay } from 'date-fns';
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
  agenda: true,
  day: true,
  month: true,
  week: true,
  work_week: true,
};

const customMessages = {
  today: 'Today',
  previous: '上一個',
  next: '下一個',
  month: 'Month',
  week: 'Week',
  day: 'Day',
  work_week: '3 days',
  agenda: 'Agenda',
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
  const [showMenu, setShowMenu] = useState(false);
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [touchEnd, setTouchEnd] = useState<number | null>(null);
  const [date, setDate] = useState(new Date());

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
        setView(Views.WORK_WEEK);
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

  const isMobile = window.innerWidth < 768;

  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchStart(e.targetTouches[0].clientX);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    setTouchEnd(e.targetTouches[0].clientX);
  };

  const handleTouchEnd = () => {
    if (!touchStart || !touchEnd) return;
    const distance = touchStart - touchEnd;
    const isLeftSwipe = distance > 50;
    const isRightSwipe = distance < -50;

    if (isLeftSwipe) {
      handleNavigate('NEXT');
    }
    if (isRightSwipe) {
      handleNavigate('PREV');
    }

    setTouchStart(null);
    setTouchEnd(null);
  };

  const handleNavigate = (action: 'PREV' | 'NEXT' | 'TODAY') => {
    let newDate = new Date(date);
    
    switch (action) {
      case 'PREV':
        switch (view) {
          case Views.MONTH:
            newDate.setMonth(date.getMonth() - 1);
            break;
          case Views.WEEK:
            newDate.setDate(date.getDate() - 7);
            break;
          case Views.WORK_WEEK:
            newDate.setDate(date.getDate() - 3);
            break;
        }
        break;
      case 'NEXT':
        switch (view) {
          case Views.MONTH:
            newDate.setMonth(date.getMonth() + 1);
            break;
          case Views.WEEK:
            newDate.setDate(date.getDate() + 7);
            break;
          case Views.WORK_WEEK:
            newDate.setDate(date.getDate() + 3);
            break;
        }
        break;
      case 'TODAY':
        newDate = new Date();
        break;
    }
    
    setDate(newDate);
  };

  const getNavigationLabel = () => {
    switch (view) {
      case Views.MONTH:
        return { prev: '上個月', next: '下個月' };
      case Views.WEEK:
        return { prev: '上週', next: '下週' };
      case Views.WORK_WEEK:
        return { prev: '前三天', next: '後三天' };
      default:
        return { prev: '上一個', next: '下一個' };
    }
  };

  const formatDate = (date: Date) => {
    const month = format(date, 'M', { locale: zhTW });
    const year = format(date, 'yyyy', { locale: zhTW });
    return `${month}月 ${year}`;
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
          <div className="px-4 pt-4 pb-2">
            <div className="flex flex-col">
              <div className="mb-2">
                <p className="text-sm text-purple-600">i@regchien.info</p>
                <div className="text-2xl md:text-3xl mt-1">
                  <span className="font-bold">{format(date, 'MMMM')} </span>
                  <span>{format(date, 'yyyy')}</span>
                </div>
              </div>
            </div>
          </div>
          <div className="flex items-center justify-between px-6 py-3 border-b border-gray-200">
            <button
              className="md:hidden p-1.5 rounded-lg hover:bg-gray-100"
              onClick={() => setShowMenu(true)}
            >
              <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16m-7 6h7" />
              </svg>
            </button>
            <div className="flex items-center space-x-4">
              <div className="hidden md:flex items-center border rounded-lg overflow-hidden">
                <button
                  className={`px-4 py-1.5 text-sm font-medium ${
                    view === Views.WEEK ? 'bg-gray-100 text-gray-900' : 'text-gray-600 hover:bg-gray-50'
                  }`}
                  onClick={() => setView(Views.WEEK)}
                >
                  週
                </button>
                <button
                  className={`px-4 py-1.5 text-sm font-medium border-l ${
                    view === Views.MONTH ? 'bg-gray-100 text-gray-900' : 'text-gray-600 hover:bg-gray-50'
                  }`}
                  onClick={() => setView(Views.MONTH)}
                >
                  月
                </button>
              </div>
              <div className="flex items-center space-x-2">
                <button
                  className="p-1.5 rounded-lg hover:bg-gray-100"
                  onClick={() => handleNavigate('PREV')}
                >
                  <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                </button>
                <button
                  className="px-3 py-1.5 text-sm font-medium text-gray-600 hover:bg-gray-100 rounded-lg"
                  onClick={() => handleNavigate('TODAY')}
                >
                  Today
                </button>
                <button
                  className="p-1.5 rounded-lg hover:bg-gray-100"
                  onClick={() => handleNavigate('NEXT')}
                >
                  <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              </div>
            </div>
          </div>
          {showMenu && (
            <div className="fixed inset-0 bg-black bg-opacity-50 z-50" onClick={() => setShowMenu(false)}>
              <div className="absolute left-0 top-0 bottom-0 w-64 bg-white shadow-xl">
                <div className="p-4">
                  <h2 className="text-lg font-medium text-gray-900 mb-4">View</h2>
                  <div className="space-y-2">
                    <button
                      className={`w-full text-left px-4 py-2 text-base rounded-lg ${
                        view === Views.AGENDA ? 'bg-purple-50 text-purple-600' : 'text-gray-700 hover:bg-gray-50'
                      }`}
                      onClick={() => {
                        setView(Views.AGENDA);
                        setShowMenu(false);
                      }}
                    >
                      Agenda
                    </button>
                    <button
                      className={`w-full text-left px-4 py-2 text-base rounded-lg ${
                        view === Views.DAY ? 'bg-purple-50 text-purple-600' : 'text-gray-700 hover:bg-gray-50'
                      }`}
                      onClick={() => {
                        setView(Views.DAY);
                        setShowMenu(false);
                      }}
                    >
                      Day
                    </button>
                    <button
                      className={`w-full text-left px-4 py-2 text-base rounded-lg ${
                        view === Views.WORK_WEEK ? 'bg-purple-50 text-purple-600' : 'text-gray-700 hover:bg-gray-50'
                      }`}
                      onClick={() => {
                        setView(Views.WORK_WEEK);
                        setShowMenu(false);
                      }}
                    >
                      3 days
                    </button>
                    <button
                      className={`w-full text-left px-4 py-2 text-base rounded-lg ${
                        view === Views.WEEK ? 'bg-purple-50 text-purple-600' : 'text-gray-700 hover:bg-gray-50'
                      }`}
                      onClick={() => {
                        setView(Views.WEEK);
                        setShowMenu(false);
                      }}
                    >
                      Week
                    </button>
                    <button
                      className={`w-full text-left px-4 py-2 text-base rounded-lg ${
                        view === Views.MONTH ? 'bg-purple-50 text-purple-600' : 'text-gray-700 hover:bg-gray-50'
                      }`}
                      onClick={() => {
                        setView(Views.MONTH);
                        setShowMenu(false);
                      }}
                    >
                      Month
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
          <div 
            className="h-[calc(100vh-7rem)] md:h-[calc(100vh-8rem)]"
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
          >
            <Calendar
              localizer={localizer}
              events={events}
              startAccessor="start"
              endAccessor="end"
              views={customViews}
              defaultView={view}
              view={view}
              date={date}
              onView={(newView: View) => setView(newView)}
              onNavigate={(newDate: Date) => setDate(newDate)}
              culture="zh-TW"
              messages={customMessages}
              formats={{
                dayHeaderFormat: (date: Date) => format(date, 'M月 d日', { locale: zhTW }),
                dayRangeHeaderFormat: ({ start, end }: { start: Date; end: Date }) => {
                  if (view === Views.WORK_WEEK) {
                    return format(start, 'M月 d日', { locale: zhTW });
                  }
                  return `${format(start, 'M月 d日', { locale: zhTW })} - ${format(end, 'M月 d日', { locale: zhTW })}`;
                },
              }}
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
              min={new Date(2024, 1, 1, 5, 0)}
              max={new Date(2024, 1, 1, 20, 0)}
              length={3}
              components={{
                event: (props) => {
                  const { event } = props;
                  const calendar = calendars.find(cal => cal.id === event.calendarId);
                  if (!calendar?.showDetails) {
                    return <div className="whitespace-pre-wrap break-words">{event.title}</div>;
                  }
                  return (
                    <div className="overflow-hidden">
                      <div className="font-medium whitespace-pre-wrap break-words">{event.title}</div>
                      {event.location && (
                        <div className="text-xs opacity-75 whitespace-pre-wrap break-words">{event.location}</div>
                      )}
                      {event.description && (
                        <div className="text-xs opacity-75 whitespace-pre-wrap break-words">{event.description}</div>
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
