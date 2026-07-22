import React from 'react';

export const PageSkeleton: React.FC = () => {
  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto animate-pulse">
      {/* Header Skeleton */}
      <div className="flex justify-between items-center">
        <div className="space-y-2">
          <div className="h-8 w-64 bg-slate-200 rounded-lg"></div>
          <div className="h-4 w-48 bg-slate-100 rounded-md"></div>
        </div>
        <div className="h-10 w-32 bg-slate-200 rounded-lg"></div>
      </div>

      {/* Grid of Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="bg-white p-5 rounded-xl border border-slate-100 shadow-sm h-32 flex flex-col justify-between">
            <div className="flex justify-between">
              <div className="space-y-2">
                <div className="h-3 w-16 bg-slate-200 rounded"></div>
                <div className="h-7 w-12 bg-slate-200 rounded"></div>
              </div>
              <div className="h-8 w-8 bg-slate-200 rounded-full"></div>
            </div>
            <div className="h-2 w-full bg-slate-100 rounded"></div>
          </div>
        ))}
      </div>

      {/* Chart Section Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Large Chart Area */}
        <div className="lg:col-span-2 bg-white p-6 rounded-xl border border-slate-100 shadow-sm h-96 flex flex-col justify-between">
          <div className="flex justify-between items-center">
            <div className="h-5 w-40 bg-slate-200 rounded"></div>
            <div className="h-4 w-24 bg-slate-100 rounded"></div>
          </div>
          <div className="flex-1 flex items-end gap-3 mt-6">
            {[35, 45, 60, 20, 80, 50, 90, 40, 75, 55].map((h, idx) => (
              <div
                key={idx}
                style={{ height: `${h}%` }}
                className="flex-1 bg-slate-200 rounded-t"
              ></div>
            ))}
          </div>
          <div className="h-4 w-full bg-slate-100 rounded mt-4"></div>
        </div>

        {/* Sidebar Mini List Area */}
        <div className="bg-white p-6 rounded-xl border border-slate-100 shadow-sm h-96 flex flex-col justify-between">
          <div className="h-5 w-32 bg-slate-200 rounded mb-4"></div>
          <div className="space-y-4 flex-1">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="flex items-center gap-3">
                <div className="h-10 w-10 bg-slate-200 rounded-full shrink-0"></div>
                <div className="space-y-2 flex-1">
                  <div className="h-3 w-3/4 bg-slate-200 rounded"></div>
                  <div className="h-2 w-1/2 bg-slate-100 rounded"></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Table Area */}
      <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-6 space-y-4">
        <div className="flex justify-between items-center">
          <div className="h-5 w-36 bg-slate-200 rounded"></div>
          <div className="h-8 w-28 bg-slate-100 rounded"></div>
        </div>
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex justify-between items-center py-3 border-b border-slate-50 last:border-0">
              <div className="h-4 w-1/4 bg-slate-200 rounded"></div>
              <div className="h-4 w-1/6 bg-slate-100 rounded"></div>
              <div className="h-4 w-12 bg-slate-200 rounded"></div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default PageSkeleton;
