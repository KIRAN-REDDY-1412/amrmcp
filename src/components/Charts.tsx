import React from 'react';

interface ChartData {
  label: string;
  value: number;
  color?: string;
}

interface ChartProps {
  title: string;
  data: ChartData[];
  emptyMessage?: string;
}

// 1. Donut Chart Component
export const DonutChart: React.FC<ChartProps> = ({ title, data, emptyMessage = 'No data available' }) => {
  const filteredData = data.filter((item) => item.value > 0);
  const total = filteredData.reduce((sum, item) => sum + item.value, 0);

  return (
    <div className="glass p-6 rounded-2xl shadow-sm border border-navy-100 dark:border-navy-800 flex flex-col h-full">
      <h3 className="text-navy-900 dark:text-white font-semibold text-lg mb-4">{title}</h3>
      
      {total === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center min-h-[200px] text-center p-4">
          <div className="w-16 h-16 rounded-full bg-navy-100 dark:bg-navy-800 flex items-center justify-center text-navy-400 dark:text-navy-600 mb-3">
            <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M11 3.055A9.001 9.001 0 1020.945 13H11V3.055z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M20.488 9H15V3.512A9.025 9.025 0 0120.488 9z" />
            </svg>
          </div>
          <p className="text-navy-400 dark:text-navy-500 text-sm">{emptyMessage}</p>
        </div>
      ) : (
        <div className="flex-1 flex flex-col sm:flex-row items-center justify-around gap-6">
          {/* SVG Pie Representation */}
          <div className="relative w-40 h-40">
            <svg viewBox="0 0 42 42" className="w-full h-full transform -rotate-90">
              <circle
                cx="21"
                cy="21"
                r="15.915"
                fill="transparent"
                stroke="rgba(226, 232, 240, 0.2)"
                strokeWidth="4.2"
              />
              {(() => {
                let accumulatedPercent = 0;
                return filteredData.map((item, index) => {
                  const percent = (item.value / total) * 100;
                  const dashArray = `${percent} ${100 - percent}`;
                  const dashOffset = 100 - accumulatedPercent;
                  accumulatedPercent += percent;

                  return (
                    <circle
                      key={index}
                      cx="21"
                      cy="21"
                      r="15.915"
                      fill="transparent"
                      stroke={item.color || '#3b82f6'}
                      strokeWidth="4.2"
                      strokeDasharray={dashArray}
                      strokeDashoffset={dashOffset}
                      className="transition-all duration-1000"
                    />
                  );
                });
              })()}
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-2xl font-bold text-navy-950 dark:text-white">{total}</span>
              <span className="text-[10px] text-navy-400 dark:text-navy-500 uppercase tracking-wider font-semibold">Total</span>
            </div>
          </div>

          {/* Chart Legend */}
          <div className="flex flex-col gap-2.5 max-w-[180px] w-full">
            {filteredData.map((item, index) => {
              const pct = ((item.value / total) * 100).toFixed(0);
              return (
                <div key={index} className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <span
                      className="w-3 h-3 rounded-full flex-shrink-0"
                      style={{ backgroundColor: item.color || '#3b82f6' }}
                    />
                    <span className="text-navy-600 dark:text-navy-300 font-medium truncate max-w-[100px]">
                      {item.label}
                    </span>
                  </div>
                  <span className="text-navy-900 dark:text-white font-bold ml-2">
                    {item.value} ({pct}%)
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

// 2. Bar Chart Component
export const BarChart: React.FC<ChartProps> = ({ title, data, emptyMessage = 'No data available' }) => {
  const maxValue = Math.max(...data.map((item) => item.value), 0);
  const total = data.reduce((sum, item) => sum + item.value, 0);

  return (
    <div className="glass p-6 rounded-2xl shadow-sm border border-navy-100 dark:border-navy-800 flex flex-col h-full">
      <h3 className="text-navy-900 dark:text-white font-semibold text-lg mb-4">{title}</h3>

      {total === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center min-h-[200px] text-center p-4">
          <div className="w-16 h-16 rounded-full bg-navy-100 dark:bg-navy-800 flex items-center justify-center text-navy-400 dark:text-navy-600 mb-3">
            <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 002 2h2a2 2 0 002-2z" />
            </svg>
          </div>
          <p className="text-navy-400 dark:text-navy-500 text-sm">{emptyMessage}</p>
        </div>
      ) : (
        <div className="flex-1 flex flex-col justify-end gap-4 min-h-[200px]">
          {data.map((item, index) => {
            const heightPercent = maxValue > 0 ? (item.value / maxValue) * 100 : 0;
            return (
              <div key={index} className="flex flex-col gap-1.5 w-full">
                <div className="flex justify-between items-center text-sm font-medium">
                  <span className="text-navy-600 dark:text-navy-300">{item.label}</span>
                  <span className="text-navy-950 dark:text-white font-bold">{item.value}</span>
                </div>
                {/* Horizontal Progress Bar */}
                <div className="w-full h-3 bg-navy-100 dark:bg-navy-800/60 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-1000 ease-out"
                    style={{
                      width: `${heightPercent}%`,
                      backgroundColor: item.color || '#3b82f6',
                    }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
