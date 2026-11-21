import React from 'react';
import { FamilyTreeProcessed } from '../types/family';
import { Users, RotateCcw, Eye, EyeOff } from 'lucide-react';

interface BranchLegendProps {
  registry: FamilyTreeProcessed;
  onSelectPerson: (key: string, opts?: { reveal?: boolean; center?: boolean; openDrawer?: boolean }) => void;
  activeBranchFilter: string | null;
  onFilterBranch: (branchKey: string | null) => void;
  onResetTree: () => void;
  isFamilyMember?: boolean;
  showFemales?: boolean;
  onToggleFemales?: () => void;
}

export const BranchLegend: React.FC<BranchLegendProps> = ({
  registry,
  activeBranchFilter,
  onFilterBranch,
  onResetTree,
  isFamilyMember,
  showFemales = true,
  onToggleFemales,
}) => {
  return (
    <div className="flex items-center gap-2 overflow-x-auto py-1 scrollbar-none max-w-full bg-transparent w-fit touch-pan-x">
      {/* All Branches Button */}
      <button
        onClick={() => onFilterBranch(null)}
        className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all border cursor-pointer min-h-[40px] flex-shrink-0 ${
          activeBranchFilter === null
            ? 'bg-slate-900 text-white border-slate-900 shadow-sm'
            : 'bg-white hover:bg-slate-50 text-slate-700 border-slate-200'
        }`}
      >
        <Users className="w-4 h-4" />
        <span>جميع الفروع ({registry.stats.totalCount})</span>
      </button>

      {/* Reset Tree / Fardan Button */}
      <button
        onClick={onResetTree}
        className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all border bg-amber-50 hover:bg-amber-100 text-amber-900 border-amber-300 shadow-xs cursor-pointer min-h-[40px] flex-shrink-0"
        title="إعادة ضبط الشجرة والتركيز على الجد فردان"
      >
        <RotateCcw className="w-4 h-4 text-amber-700" />
        <span>إعادة ضبط الشجرة</span>
      </button>

      {/* Toggle Females Button (Family Members Only) */}
      {isFamilyMember && onToggleFemales && (
        <button
          onClick={onToggleFemales}
          className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all border cursor-pointer min-h-[40px] flex-shrink-0 ${
            showFemales === false
              ? 'bg-rose-50 text-rose-800 border-rose-300 shadow-xs'
              : 'bg-white hover:bg-slate-50 text-slate-700 border-slate-200'
          }`}
          title={showFemales === false ? 'إظهار البنات في الشجرة' : 'إخفاء البنات في الشجرة'}
        >
          {showFemales === false ? <EyeOff className="w-4 h-4 text-rose-600" /> : <Eye className="w-4 h-4 text-slate-600" />}
          <span>{showFemales === false ? 'إظهار البنات' : 'إخفاء البنات'}</span>
        </button>
      )}
    </div>
  );
};
