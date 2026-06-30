import { useNavigate } from 'react-router-dom';
import { useAnalyticsSummary, useAnalyticsTrends } from '@/hooks/useAnalytics';
import { useUser } from '@/hooks/useTasks';
import { MockupLayout } from '@/components/MockupLayout';
import { format } from 'date-fns';
import { 
  TrendingUp, 
  CheckCircle, 
  AlertOctagon, 
  Lock, 
  ChevronLeft,
  Sparkles
} from 'lucide-react';

export const Analytics = () => {
  const navigate = useNavigate();
  const { data: user } = useUser();
  const { data: summaryData, isLoading: summaryLoading } = useAnalyticsSummary();
  const { data: trendsData, isLoading: trendsLoading } = useAnalyticsTrends();

  if (summaryLoading || trendsLoading) {
    return (
      <div className="min-h-screen bg-dot-grid flex items-center justify-center p-8 font-body">
        <div className="border-[3px] border-black p-12 text-center bg-[#FAF7F2] shadow-[4px_4px_0px_#000] rounded-[24px]">
          <div className="animate-spin w-8 h-8 border-4 border-[#4CD9E3] border-t-transparent inline-block mb-4 rounded-full" />
          <div className="font-display font-black text-sm tracking-widest uppercase">
            CALCULATING TELEMETRY NODES...
          </div>
        </div>
      </div>
    );
  }

  const isPremium = user?.plan === 'PRO';

  if (!isPremium) {
    return (
      <MockupLayout activeTab="home">
        <div className="flex flex-col gap-4 font-body">
          
          <button 
            onClick={() => navigate('/settings')}
            className="flex items-center gap-1.5 text-xs font-label font-black text-gray-500 hover:text-black cursor-pointer uppercase pb-1 select-none"
          >
            <ChevronLeft className="w-4 h-4" />
            <span>Back to settings</span>
          </button>

          <div className="border-[3px] border-black bg-[#FFEBEB] rounded-[24px] p-6 shadow-[4px_4px_0px_#000] relative text-center">
            <Lock className="w-12 h-12 mx-auto text-[#FF4B55] mb-4 mt-2 animate-pulse" />
            <h3 className="font-display font-black text-lg uppercase mb-2">RESTRICTED TELEMETRY</h3>
            <p className="text-gray-500 text-xs leading-relaxed mb-6 font-body">
              Detailed productivity tracking, hourly metrics, task velocity breakdowns, and historical trends are locked behind FocusForge PRO. Upgrade in Settings to unlock.
            </p>
            <button
              onClick={() => navigate('/settings')}
              className="w-full py-3.5 border-[3px] border-black bg-[#4CD9E3] text-black font-display font-black text-xs uppercase tracking-widest rounded-2xl shadow-[4px_4px_0px_#000] hover:bg-black hover:text-[#4CD9E3] active:translate-x-[2.5px] active:translate-y-[2.5px] active:shadow-none transition-colors"
            >
              UPGRADE ACCOUNT
            </button>
          </div>
        </div>
      </MockupLayout>
    );
  }

  const summary = summaryData;
  const trends = trendsData?.trends || [];
  const maxCompleted = Math.max(...trends.map(t => t.completed), 5);

  return (
    <MockupLayout activeTab="home">
      <div className="flex flex-col gap-4 font-body">
        
        {/* Back Link */}
        <button 
          onClick={() => navigate('/settings')}
          className="flex items-center gap-1.5 text-xs font-label font-black text-gray-500 hover:text-black cursor-pointer uppercase pb-1 select-none"
        >
          <ChevronLeft className="w-4 h-4" />
          <span>Back to settings</span>
        </button>

        {/* Telemetry KPIs */}
        <div className="grid grid-cols-1 gap-3">
          
          {/* Metric 1 */}
          <div className="border-[3px] border-black bg-[#47D185] text-black p-4 rounded-[20px] shadow-[3px_3px_0px_#000] relative overflow-hidden flex justify-between items-center select-none">
            <div className="z-10">
              <span className="font-label text-[8px] uppercase tracking-widest font-black opacity-80 block">PRODUCTIVITY SCORE</span>
              <span className="font-display font-black text-4xl tracking-tighter block mt-1">
                {summary?.productivityScore}
                <span className="text-sm font-body font-bold ml-1 font-mono">/100</span>
              </span>
            </div>
            <TrendingUp className="w-10 h-10 text-black/20 shrink-0" />
          </div>

          {/* Metric 2 */}
          <div className="border-[3px] border-black bg-[#FFD600] text-black p-4 rounded-[20px] shadow-[3px_3px_0px_#000] relative overflow-hidden flex justify-between items-center select-none">
            <div className="z-10">
              <span className="font-label text-[8px] uppercase tracking-widest font-black opacity-80 block">COMPLETED TODAY</span>
              <span className="font-display font-black text-4xl tracking-tighter block mt-1">
                {summary?.completedToday}
              </span>
            </div>
            <CheckCircle className="w-10 h-10 text-black/20 shrink-0" />
          </div>

          {/* Metric 3 */}
          <div className="border-[3px] border-black bg-[#FF4B55] text-white p-4 rounded-[20px] shadow-[3px_3px_0px_#000] relative overflow-hidden flex justify-between items-center select-none">
            <div className="z-10">
              <span className="font-label text-[8px] uppercase tracking-widest font-black opacity-80 block">CRITICAL REMAINING</span>
              <span className="font-display font-black text-4xl tracking-tighter block mt-1">
                {summary?.criticalRemaining}
              </span>
            </div>
            <AlertOctagon className="w-10 h-10 text-white/25 shrink-0" />
          </div>

        </div>

        {/* 7-Day Trend Chart Card */}
        <div className="border-[3px] border-black bg-white p-4 rounded-[24px] shadow-[4px_4px_0px_#000] relative">
          <span className="font-display font-black text-sm uppercase text-black block border-b border-gray-100 pb-2 mb-8">
            📈 7-DAY TASK VELOCITY
          </span>
          
          <div className="h-44 flex items-end gap-1.5 relative pt-8 border-b-[2px] border-black pb-1.5 px-1 select-none">
            {/* Gridlines */}
            <div className="absolute left-0 right-0 top-[25%] border-t border-dashed border-gray-200 pointer-events-none" />
            <div className="absolute left-0 right-0 top-[50%] border-t border-dashed border-gray-200 pointer-events-none" />
            <div className="absolute left-0 right-0 top-[75%] border-t border-dashed border-gray-200 pointer-events-none" />

            {trends.map((t) => {
              const heightPct = (t.completed / maxCompleted) * 100;
              return (
                <div key={t.date} className="flex-1 flex flex-col justify-end h-full relative group">
                  
                  {/* Tooltip on hover */}
                  <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 opacity-0 group-hover:opacity-100 transition-opacity bg-black text-white border-2 border-black font-label font-black text-[9px] px-1.5 py-0.5 pointer-events-none z-10 whitespace-nowrap shadow-[2px_2px_0px_#000] rounded">
                    {t.completed} Completed
                  </div>

                  {/* Value indicator */}
                  {t.completed > 0 && (
                    <div className="text-center font-mono text-[8px] font-black text-[#4CD9E3] mb-0.5">
                      {t.completed}
                    </div>
                  )}
                  
                  {/* Bar block */}
                  <div 
                    className="w-full border-2 border-black bg-[#4CD9E3] transition-all hover:bg-[#FFD600] rounded-t-md"
                    style={{ height: `${heightPct}%`, minHeight: t.completed > 0 ? '8px' : '0px' }}
                  />
                  
                  {/* X Axis Label */}
                  <div className="absolute top-[100%] mt-1.5 left-1/2 -translate-x-1/2 font-label font-black text-[9px] text-black">
                    {new Date(t.date).toLocaleDateString('en-US', { weekday: 'short' }).toUpperCase()}
                  </div>
                </div>
              );
            })}
          </div>
          
          {/* Legend dates */}
          <div className="mt-8 flex justify-between items-center text-[8px] font-mono font-black text-gray-400 uppercase select-none">
            <span>START: {trends[0]?.date ? format(new Date(trends[0].date), 'dd MMM').toUpperCase() : 'N/A'}</span>
            <span className="flex items-center gap-1 text-[#4CD9E3] animate-pulse">
              <Sparkles className="w-3 h-3" />
              FLOW STATUS NOMINAL
            </span>
            <span>END: {trends[trends.length-1]?.date ? format(new Date(trends[trends.length-1].date), 'dd MMM').toUpperCase() : 'N/A'}</span>
          </div>
        </div>

      </div>
    </MockupLayout>
  );
};
