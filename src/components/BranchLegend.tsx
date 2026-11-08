import React from 'react';
import { FamilyTreeProcessed, ProcessedPerson } from '../types/family';
import { BRANCH_COLORS } from '../data/treeManager';
import { Users, Filter } from 'lucide-react';

interface BranchLegendProps {
  registry: FamilyTreeProcessed;
  onSelectPerson: (key: string, opts?: { reveal?: boolean; center?: boolean }) => void;
  activeBranchFilter: string | null;
  onFilterBranch: (branchKey: string | null) => void;
}

export const BranchLegend: React.FC<BranchLegendProps> = ({
  registry,
  onSelectPerson,
  activeBranchFilter,
  onFilterBranch,
}) => {
  return (
    <div className="flex items-center gap-2 overflow-x-auto py-1 px-1 scrollbar-none max-w-full">
      {/* All Branches Button */}
      <button
        onClick={() => onFilterBranch(null)}
        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all border ${
          activeBranchFilter === null
            ? 'bg-slate-900 text-white border-slate-900 shadow-sm'
            : 'bg-white/80 hover:bg-white text-slate-700 border-slate-200 shadow-sm'
        }`}
      >
        <Users className="w-3.5 h-3.5" />
        <span>جميع الفروع ({registry.stats.totalCount})</span>
      </button>

      {/* Individual Heads / Branches */}
      {registry.heads.map((head: ProcessedPerson) => {
        const branchInfo = BRANCH_COLORS[head.branch] || BRANCH_COLORS.b0;
        const branchStat = registry.stats.branchesStats.find((b: { key: string }) => b.key === head.key);
        const count = branchStat ? branchStat.count : 0;
        const isActive = activeBranchFilter === head.branch;

        return (
          <div key={`legend-${head.key}`} className="flex items-center">
            <button
              onClick={() => {
                onFilterBranch(isActive ? null : head.branch);
                onSelectPerson(head.key, { reveal: true, center: true });
              }}
              className={`group flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all border shadow-sm ${
                isActive
                  ? 'bg-white ring-2 ring-emerald-600 border-emerald-600 text-slate-900 font-bold'
                  : 'bg-white/85 hover:bg-white text-slate-800 border-slate-200'
              }`}
            >
              <span
                className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                style={{ backgroundColor: branchInfo.accent }}
              />
              <span>ذرية {head.name}</span>
              <span className="text-[11px] text-slate-500 font-normal tabular-nums bg-slate-100 px-1.5 py-0.5 rounded-full">
                {count}
              </span>
            </button>
          </div>
        );
      })}
    </div>
  );
};
