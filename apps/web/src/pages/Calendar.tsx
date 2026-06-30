import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useCalendarStatus, useConnectCalendar, useDisconnectCalendar, useSyncCalendar, useCalendarEvents } from '@/hooks/useCalendar';
import { MockupLayout } from '@/components/MockupLayout';
import toast from 'react-hot-toast';
import { 
  Calendar as CalendarIcon, 
  RefreshCw, 
  Trash2, 
  Info, 
  Terminal
} from 'lucide-react';

const MOCK_SYNC_STEPS = [
  'INITIALIZING: Google Calendar Linker...',
  'CONNECTING: Authenticating oAuth profile...',
  'FETCHING: Downloading events...',
  'RESOLVING: Mapping coordinate nodes...',
  'OPTIMIZING: Calculating Focus Blocks...',
  'SUCCESS: Synchronized & injected.',
  'DONE: Sync cycle verified. System nominal.',
];

export const Calendar = () => {
  const [searchParams] = useSearchParams();
  
  const { data: statusData, isLoading } = useCalendarStatus();
  const { data: events = [] } = useCalendarEvents();
  const connect = useConnectCalendar();
  const disconnect = useDisconnectCalendar();
  const sync = useSyncCalendar();

  const [syncLogs, setSyncLogs] = useState<string[]>([]);
  const [isManualSyncing, setIsManualSyncing] = useState(false);

  useEffect(() => {
    if (searchParams.get('success') === 'calendar_connected') {
      toast.success('GOOGLE CALENDAR CONNECTED');
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, [searchParams]);

  const triggerManualSync = async () => {
    setIsManualSyncing(true);
    setSyncLogs([]);
    
    let index = 0;
    const interval = setInterval(() => {
      if (index < MOCK_SYNC_STEPS.length) {
        setSyncLogs((prev) => [...prev, `[${new Date().toLocaleTimeString()}] ${MOCK_SYNC_STEPS[index]}`]);
        index++;
      } else {
        clearInterval(interval);
        sync.mutate(undefined, {
          onSuccess: () => {
            setIsManualSyncing(false);
            toast.success('SYNC COMPLETED');
          },
          onError: () => {
            setIsManualSyncing(false);
          }
        });
      }
    }, 250);
  };

  const isConnected = statusData?.connected;

  return (
    <MockupLayout activeTab="calendar">
      <div className="flex flex-col gap-4 font-body select-none">
        
        {isLoading ? (
          <div className="border-[3px] border-black rounded-[24px] p-12 text-center bg-[#FAF7F2] shadow-[4px_4px_0px_#000]">
            <div className="animate-spin w-8 h-8 border-4 border-[#4CD9E3] border-t-transparent inline-block mb-4 rounded-full" />
            <p className="font-label font-black text-sm uppercase tracking-widest">SCANNING DATA SYSTEMS...</p>
          </div>
        ) : !isConnected ? (
          <div className="border-[3px] border-black rounded-[24px] p-6 text-center bg-white shadow-[4px_4px_0px_#000] flex flex-col items-center">
            <CalendarIcon className="w-14 h-14 text-[#4CD9E3] mb-4 animate-bounce mt-4" />
            <h2 className="font-display font-black text-xl tracking-tight uppercase mb-2">CONNECT YOUR REALITY</h2>
            <p className="text-gray-500 text-xs leading-relaxed mb-6 max-w-sm">
              Sync with Google Calendar to overlay your tasks directly onto your free time. FocusForge AI automatically schedules focus slots to prevent conflicts and maximize throughput.
            </p>
            <button
              onClick={() => connect.mutate()}
              disabled={connect.isPending}
              className="w-full py-3.5 border-[3px] border-black bg-[#4CD9E3] text-black font-display font-black text-xs uppercase tracking-widest rounded-2xl shadow-[4px_4px_0px_#000] hover:bg-black hover:text-[#4CD9E3] transition-colors disabled:opacity-50 active:translate-x-[2.5px] active:translate-y-[2.5px] active:shadow-none"
            >
              {connect.isPending ? 'STAGING OAUTH...' : 'CONNECT GOOGLE CALENDAR'}
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            
            {/* Sync State Card */}
            <div className="border-[3px] border-black rounded-[24px] p-4 bg-white shadow-[4px_4px_0px_#000]">
              <div className="flex justify-between items-start flex-wrap gap-2 pb-2.5 border-b border-gray-100">
                <div>
                  <span className="bg-[#EAFBF2] text-[#1E3B06] border border-[#47D185] px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider select-none inline-block">
                    ● SYNC ACTIVE
                  </span>
                  <p className="text-[11px] font-bold text-gray-500 mt-2 truncate max-w-[240px]">
                    User: {statusData.email}
                  </p>
                </div>
                
                <div className="flex gap-2">
                  <button
                    onClick={triggerManualSync}
                    disabled={sync.isPending || isManualSyncing}
                    className="w-7 h-7 rounded-full border-[1.5px] border-black bg-[#4CD9E3] flex items-center justify-center shadow-[1.5px_1.5px_0px_#000] active:translate-x-[0.5px] active:translate-y-[0.5px] active:shadow-none cursor-pointer"
                    title="Manual Sync"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${isManualSyncing ? 'animate-spin' : ''}`} />
                  </button>
                  <button
                    onClick={() => disconnect.mutate()}
                    disabled={disconnect.isPending}
                    className="w-7 h-7 rounded-full border-[1.5px] border-black bg-[#FF4B55] flex items-center justify-center shadow-[1.5px_1.5px_0px_#000] text-white active:translate-x-[0.5px] active:translate-y-[0.5px] active:shadow-none cursor-pointer"
                    title="Disconnect"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
              
              <div className="flex items-center gap-1.5 mt-2.5 text-[9px] font-label font-bold text-gray-400 uppercase leading-none">
                <Info className="w-3.5 h-3.5" />
                <span>Last Sync: {statusData.lastSyncedAt ? new Date(statusData.lastSyncedAt).toLocaleTimeString() : 'NEVER'}</span>
              </div>
            </div>

            {/* Sync execution terminal overlay */}
            {(isManualSyncing || syncLogs.length > 0) && (
              <div className="border-[3px] border-black rounded-[20px] bg-black text-[#00FF66] p-4 font-mono text-[9px] leading-relaxed shadow-[3px_3px_0px_#000] relative">
                <div className="absolute top-2.5 right-3 uppercase font-bold text-[8px] text-[#00FF66] opacity-70 flex items-center gap-1">
                  <Terminal className="w-3 h-3" />
                  <span>Sync Console</span>
                </div>
                <div className="space-y-1 max-h-24 overflow-y-auto mt-2">
                  {syncLogs.map((log, idx) => (
                    <p key={idx}>{log}</p>
                  ))}
                  {isManualSyncing && (
                    <span className="animate-pulse bg-[#00FF66] w-1.5 h-3 inline-block align-middle ml-0.5">_</span>
                  )}
                </div>
              </div>
            )}

            {/* Timetable schedule grid overlay */}
            <div className="border-[3px] border-black rounded-[24px] p-4 bg-white shadow-[4px_4px_0px_#000]">
              <span className="font-display font-black text-sm uppercase text-black block mb-3 border-b border-gray-100 pb-2">
                📅 TODAY'S SCHEDULE OVERLAY
              </span>
              
              <div className="border-2 border-black rounded-xl bg-[#FAF7F2] relative overflow-hidden h-72 overflow-y-auto">
                {/* 9 AM to 5 PM list slots */}
                {[9, 10, 11, 12, 13, 14, 15, 16, 17].map((hour) => (
                  <div key={hour} className="flex border-b border-gray-200 h-12 relative">
                    <div className="w-12 border-r border-gray-200 flex items-start justify-center pt-1 font-mono text-[9px] text-gray-400 font-bold select-none bg-white">
                      {hour}:00
                    </div>
                    <div className="flex-1 bg-transparent"></div>
                  </div>
                ))}

                {/* Event overlay blocks */}
                {events.map((event: any) => {
                  const startTimeStr = event.start?.dateTime || event.start?.date;
                  const endTimeStr = event.end?.dateTime || event.end?.date;
                  if (!startTimeStr || !endTimeStr) return null;

                  const start = new Date(startTimeStr);
                  const end = new Date(endTimeStr);

                  // Validate if for today
                  const todayStr = new Date().toDateString();
                  if (start.toDateString() !== todayStr) return null;

                  const startHour = start.getHours() + start.getMinutes() / 60;
                  const endHour = end.getHours() + end.getMinutes() / 60;

                  const gridStart = 9;
                  const gridEnd = 18;

                  if (endHour <= gridStart || startHour >= gridEnd) return null;

                  const visibleStart = Math.max(startHour, gridStart);
                  const visibleEnd = Math.min(endHour, gridEnd);
                  const durationHrs = visibleEnd - visibleStart;

                  // 1 hour is 48px height
                  const topPx = (visibleStart - gridStart) * 48;
                  const heightPx = durationHrs * 48 - 1;

                  const isFocusBlock = event.summary?.toLowerCase().includes('focus');

                  return (
                    <div 
                      key={event.id}
                      className={`absolute left-[50px] right-2 border-[1.5px] border-black p-1.5 overflow-hidden rounded-lg shadow-[1.5px_1.5px_0px_#000] flex flex-col justify-between ${
                        isFocusBlock 
                          ? 'bg-[#D4F087] border-green-800 text-green-950' 
                          : 'bg-[#FFD600] border-black text-black'
                      }`}
                      style={{
                        top: `${topPx}px`,
                        height: `${heightPx}px`,
                      }}
                    >
                      <div className="min-w-0">
                        <span className="text-[7px] font-label font-black uppercase tracking-wider block bg-black text-white px-1 border border-white rounded w-fit scale-90 origin-left">
                          {isFocusBlock ? 'FOCUS' : 'MEETING'}
                        </span>
                        <h4 className="font-display font-black text-[9px] uppercase mt-0.5 truncate leading-none">
                          {event.summary}
                        </h4>
                      </div>
                    </div>
                  );
                })}

                {events.length === 0 && (
                  <div className="absolute inset-0 flex items-center justify-center p-8 bg-transparent pointer-events-none select-none">
                    <p className="font-body text-[10px] text-gray-400 font-bold uppercase tracking-wider text-center">
                      No synchronized events logged.
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Bottom info banner */}
            <div className="border-[3px] border-black rounded-[20px] bg-[#FFFDE6] p-3 shadow-[3px_3px_0px_#000] flex gap-2 items-start">
              <Info className="w-4 h-4 text-black shrink-0 mt-0.5" />
              <p className="text-[10px] font-body text-black leading-relaxed font-semibold">
                AI Schedule Injections occur automatically in open slots between synchronized calendar blocks. Adjust parameters in Settings.
              </p>
            </div>

          </div>
        )}

      </div>
    </MockupLayout>
  );
};
