import React, { useState, useMemo, useRef } from 'react';
import {
  Award,
  Search,
  X,
  Plus,
  Edit3,
  Trash2,
  BookOpen,
  ScrollText,
  Calendar,
  Sparkles,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Download,
  Upload,
  Check,
  Lock,
  GitBranch,
  UserCheck,
  FileText
} from 'lucide-react';
import { NotableFigure, NotableManuscript } from '../types/family';
import { FamilyTreeProcessed, DEFAULT_NOTABLE_FIGURES, formatLineageString, normalizeArabic } from '../data/treeManager';
import { MemberAvatar } from './MemberAvatar';
import { downloadImageSmoothly, compressImageFile, fastCompressAvatar } from '../utils/imageDownload';

interface NotableFiguresViewProps {
  notableFigures?: NotableFigure[];
  registry: FamilyTreeProcessed;
  isAuthorized: boolean;
  onGoToTree: (personKey: string) => void;
  onSaveNotableFigure: (figure: NotableFigure) => void;
  onDeleteNotableFigure: (figureId: string) => void;
  onOpenAuthModal: () => void;
  onShowToast?: (message: string, type?: 'success' | 'info') => void;
}

const BRANCH_FILTER_OPTIONS = [
  { id: 'all', label: 'جميع الأعلام' },
  { id: 'سلسلة الأجداد المؤسسين', label: 'الأجداد المؤسسون' },
  { id: 'ذرية محمد', label: 'ذرية محمد' },
  { id: 'ذرية حسين', label: 'ذرية حسين' },
  { id: 'ذرية عبدالله', label: 'ذرية عبدالله' }
];

export const NotableFiguresView: React.FC<NotableFiguresViewProps> = ({
  notableFigures,
  registry,
  isAuthorized,
  onGoToTree,
  onSaveNotableFigure,
  onDeleteNotableFigure,
  onOpenAuthModal,
  onShowToast
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedBranch, setSelectedBranch] = useState<string>('all');
  const [selectedFigure, setSelectedFigure] = useState<NotableFigure | null>(null);
  const [activeManuscript, setActiveManuscript] = useState<NotableManuscript | null>(null);
  const [msZoom, setMsZoom] = useState<number>(1);

  // Admin Add / Edit Modal state
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [editingFigure, setEditingFigure] = useState<NotableFigure | null>(null);
  const [personSearchQuery, setPersonSearchQuery] = useState('');
  const [formPersonKey, setFormPersonKey] = useState('oF');
  const [formName, setFormName] = useState('');
  const [formTitle, setFormTitle] = useState('');
  const [formBranch, setFormBranch] = useState('ذرية محمد');
  const [formBirthDeath, setFormBirthDeath] = useState('');
  const [formEra, setFormEra] = useState('');
  const [formBiography, setFormBiography] = useState('');
  const [formAchievementsText, setFormAchievementsText] = useState('');
  const [formPhoto, setFormPhoto] = useState<string>('');
  const [formManuscripts, setFormManuscripts] = useState<NotableManuscript[]>([]);

  // New manuscript sub-form inside Admin Modal
  const [newMsTitle, setNewMsTitle] = useState('');
  const [newMsEra, setNewMsEra] = useState('');
  const [newMsDesc, setNewMsDesc] = useState('');
  const [newMsUrl, setNewMsUrl] = useState('');
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  const [isUploadingMs, setIsUploadingMs] = useState(false);

  const photoInputRef = useRef<HTMLInputElement>(null);
  const msInputRef = useRef<HTMLInputElement>(null);

  const figuresList = useMemo(() => {
    const source = Array.isArray(notableFigures) ? notableFigures : DEFAULT_NOTABLE_FIGURES;
    return source
      .filter((fig) => fig && !fig.deleted && fig.name)
      .map((fig) => {
        const treePerson = fig.personKey ? registry.people.get(fig.personKey) : undefined;
        return {
          ...fig,
          photo: fig.photo || treePerson?.photo || undefined
        };
      });
  }, [notableFigures, registry]);

  const filteredFigures = useMemo(() => {
    const normQuery = normalizeArabic(searchQuery);
    return figuresList.filter((fig) => {
      if (selectedBranch !== 'all' && fig.branch !== selectedBranch) {
        return false;
      }
      if (!normQuery) return true;
      const haystack = normalizeArabic(
        `${fig.name} ${fig.title} ${fig.branch} ${fig.biography} ${fig.birthDeath} ${(fig.achievements || []).join(' ')}`
      );
      return haystack.includes(normQuery);
    });
  }, [figuresList, selectedBranch, searchQuery]);

  // Tree member search for Admin picker
  const matchingTreePeople = useMemo(() => {
    const q = normalizeArabic(personSearchQuery);
    if (!q) return [];
    const results: { key: string; name: string; lineage: string; branchName: string }[] = [];
    for (const [key, p] of registry.people.entries()) {
      if (p.deleted) continue;
      const fullLineage = formatLineageString(key, registry.people);
      if (normalizeArabic(p.name).includes(q) || normalizeArabic(fullLineage).includes(q)) {
        results.push({
          key,
          name: p.name,
          lineage: fullLineage,
          branchName: p.branchName || 'سلسلة الأجداد المؤسسين'
        });
        if (results.length >= 12) break;
      }
    }
    return results;
  }, [personSearchQuery, registry]);

  const handleOpenAdd = () => {
    if (!isAuthorized) {
      onShowToast?.('إضافة وتعديل أعلام العائلة مخصص للمشرفين والمصرح لهم فقط', 'info');
      onOpenAuthModal();
      return;
    }
    setEditingFigure(null);
    setFormPersonKey('oF');
    setFormName('');
    setFormTitle('');
    setFormBranch('ذرية محمد');
    setFormBirthDeath('');
    setFormEra('');
    setFormBiography('');
    setFormAchievementsText('');
    setFormPhoto('');
    setFormManuscripts([]);
    setPersonSearchQuery('');
    setNewMsTitle('');
    setNewMsEra('');
    setNewMsDesc('');
    setNewMsUrl('');
    setIsEditorOpen(true);
  };

  const handleOpenEdit = (fig: NotableFigure, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (!isAuthorized) {
      onShowToast?.('تعديل بيانات أعلام العائلة مخصص للمشرفين والمصرح لهم فقط', 'info');
      onOpenAuthModal();
      return;
    }
    setEditingFigure(fig);
    setFormPersonKey(fig.personKey || 'oF');
    setFormName(fig.name);
    setFormTitle(fig.title);
    setFormBranch(fig.branch);
    setFormBirthDeath(fig.birthDeath);
    setFormEra(fig.era || '');
    setFormBiography(fig.biography);
    setFormAchievementsText((fig.achievements || []).join('\n'));
    setFormPhoto(fig.photo || '');
    setFormManuscripts(fig.manuscripts || []);
    setPersonSearchQuery('');
    setNewMsTitle('');
    setNewMsEra('');
    setNewMsDesc('');
    setNewMsUrl('');
    setIsEditorOpen(true);
  };

  const handleDelete = (fig: NotableFigure, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (!isAuthorized) {
      onShowToast?.('حذف البطاقة مخصص للمشرفين والمصرح لهم فقط', 'info');
      onOpenAuthModal();
      return;
    }
    onDeleteNotableFigure(fig.id);
    if (selectedFigure?.id === fig.id) {
      setSelectedFigure(null);
    }
  };

  const handleSelectTreeMemberForForm = (key: string) => {
    const p = registry.people.get(key);
    if (!p) return;
    const fullLineage = formatLineageString(key, registry.people);
    setFormPersonKey(key);
    if (!formName.trim()) {
      setFormName(fullLineage.split(' ').slice(0, 7).join(' '));
    }
    if (p.branchName) {
      setFormBranch(p.branchName);
    }
    if (p.photo && !formPhoto) {
      setFormPhoto(p.photo);
    }
    if (p.deathYear) {
      setFormBirthDeath(`توفي عام ${p.deathYear} م (رحمه الله)`);
    } else if (p.isDeceased) {
      setFormBirthDeath('رحمه الله');
    }
    setPersonSearchQuery('');
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsUploadingPhoto(true);
    try {
      const compressed = await fastCompressAvatar(file, 400, 0.8);
      setFormPhoto(compressed);
    } catch {
      const reader = new FileReader();
      reader.onload = (ev) => {
        if (typeof ev.target?.result === 'string') {
          setFormPhoto(ev.target.result);
        }
      };
      reader.readAsDataURL(file);
    } finally {
      setIsUploadingPhoto(false);
    }
  };

  const handleManuscriptUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsUploadingMs(true);
    try {
      const compressed = await compressImageFile(file, 1200, 300000);
      setNewMsUrl(compressed);
    } catch {
      const reader = new FileReader();
      reader.onload = (ev) => {
        if (typeof ev.target?.result === 'string') {
          setNewMsUrl(ev.target.result);
        }
      };
      reader.readAsDataURL(file);
    } finally {
      setIsUploadingMs(false);
    }
  };

  const handleAddManuscriptToForm = () => {
    if (!newMsTitle.trim() || !newMsUrl.trim()) {
      onShowToast?.('يرجى إدخال عنوان المخطوطة ورفع صورتها أولاً', 'info');
      return;
    }
    const newItem: NotableManuscript = {
      id: 'ms_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 5),
      title: newMsTitle.trim(),
      url: newMsUrl.trim(),
      era: newMsEra.trim() || 'الأرشيف التوثيقي',
      description: newMsDesc.trim()
    };
    setFormManuscripts((prev) => [...prev, newItem]);
    setNewMsTitle('');
    setNewMsEra('');
    setNewMsDesc('');
    setNewMsUrl('');
  };

  const handleRemoveManuscriptFromForm = (msId: string) => {
    setFormManuscripts((prev) => prev.filter((m) => m.id !== msId));
  };

  const handleSubmitForm = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim()) {
      onShowToast?.('يرجى إدخال اسم العلم الكامل', 'info');
      return;
    }
    const now = Date.now();
    const achievements = formAchievementsText
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean);

    const finalManuscripts = [...formManuscripts];
    if (newMsTitle.trim() && newMsUrl.trim()) {
      finalManuscripts.push({
        id: 'ms_' + now.toString(36) + Math.random().toString(36).slice(2, 5),
        title: newMsTitle.trim(),
        url: newMsUrl.trim(),
        era: newMsEra.trim() || 'الأرشيف التوثيقي',
        description: newMsDesc.trim()
      });
    }

    const saved: NotableFigure = {
      id: editingFigure?.id || ('notable_' + now.toString(36) + Math.random().toString(36).slice(2, 5)),
      personKey: formPersonKey || 'oF',
      name: formName.trim(),
      title: formTitle.trim() || 'من أعلام ورجالات عائلة الفردان',
      branch: formBranch.trim() || 'عائلة الفردان',
      birthDeath: formBirthDeath.trim() || 'رحمه الله',
      era: formEra.trim() || undefined,
      biography: formBiography.trim(),
      achievements,
      photo: formPhoto.trim() || undefined,
      manuscripts: finalManuscripts,
      createdAt: editingFigure?.createdAt || now,
      updatedAt: now,
      deleted: false
    };

    onSaveNotableFigure(saved);
    setIsEditorOpen(false);
    if (selectedFigure && selectedFigure.id === saved.id) {
      setSelectedFigure(saved);
    }
  };

  const getBranchBadgeStyle = (branch: string) => {
    if (branch.includes('محمد')) {
      return 'bg-emerald-50 text-emerald-800 border-emerald-200';
    }
    if (branch.includes('حسين')) {
      return 'bg-purple-50 text-purple-800 border-purple-200';
    }
    if (branch.includes('عبدالله')) {
      return 'bg-blue-50 text-blue-800 border-blue-200';
    }
    return 'bg-amber-50 text-amber-900 border-amber-200';
  };

  return (
    <div className="max-w-6xl mx-auto p-4 sm:p-6 space-y-6 pb-24">
      {/* Dignified Hero Header */}
      <div className="relative bg-gradient-to-l from-[#0f291e] via-[#133829] to-[#1a4731] rounded-3xl p-6 sm:p-8 text-white shadow-xl overflow-hidden border border-emerald-800/60">
        <div className="absolute -left-16 -top-16 w-64 h-64 bg-amber-400/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute right-12 -bottom-20 w-72 h-72 bg-emerald-400/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
          <div className="space-y-2.5 max-w-3xl">
            <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-amber-400/15 border border-amber-300/30 text-amber-200 text-xs font-bold">
              <Award className="w-4 h-4 text-amber-300" />
              <span>سجل الخالدين والرواد والمؤرخين</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white flex items-center gap-3">
              <span>أعلام ورجالات عائلة الفردان</span>
            </h1>
            <p className="text-xs sm:text-sm text-emerald-100/90 leading-relaxed">
              توثيق تاريخي لسيرة ومآثر الأجداد المؤسسين، وأعيان وعلماء وخطباء ومؤرخي عائلة الفردان الكرزكاني في مملكة البحرين، مع المخطوطات والوثائق المرتبطة بهم وربطهم المباشر بمواقعهم في الشجرة التفاعلية.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3 self-stretch lg:self-center">
            <div className="px-4 py-2.5 rounded-2xl bg-white/10 border border-white/15 backdrop-blur-sm text-center">
              <div className="text-lg sm:text-xl font-black text-amber-300">{figuresList.length}</div>
              <div className="text-[11px] text-emerald-100 font-medium">علم ومؤسس موثق</div>
            </div>

            {isAuthorized ? (
              <button
                onClick={handleOpenAdd}
                className="flex items-center gap-2 px-4 py-3 rounded-2xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-black text-xs sm:text-sm shadow-lg transition-all cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>+ إضافة علم جديد</span>
              </button>
            ) : (
              <button
                onClick={onOpenAuthModal}
                className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-2xl bg-white/10 hover:bg-white/15 text-emerald-100 border border-white/15 text-xs font-bold transition-all cursor-pointer"
                title="دخول المشرف لإضافة أو تعديل أعلام العائلة"
              >
                <Lock className="w-3.5 h-3.5 text-amber-300" />
                <span>إدارة الأعلام (للمشرف)</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Search & Branch Filter Bar */}
      <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-200/90 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="ابحث في أسماء الأعلام، الألقاب، السيرة التاريخية، أو المآثر..."
            className="w-full pr-10 pl-9 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-600 focus:bg-white transition-all"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0 no-scrollbar">
          {BRANCH_FILTER_OPTIONS.map((opt) => {
            const active = selectedBranch === opt.id;
            return (
              <button
                key={opt.id}
                onClick={() => setSelectedBranch(opt.id)}
                className={`px-3 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
                  active
                    ? 'bg-emerald-800 text-white shadow-sm'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {opt.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Notable Figures Grid */}
      {filteredFigures.length === 0 ? (
        <div className="bg-white rounded-3xl p-12 text-center border border-slate-200/80 space-y-3">
          <Award className="w-12 h-12 text-slate-300 mx-auto" />
          <p className="text-base font-bold text-slate-700">لا توجد نتائج مطابقة لبحثك في سجل أعلام العائلة</p>
          <button
            onClick={() => {
              setSearchQuery('');
              setSelectedBranch('all');
            }}
            className="px-4 py-2 rounded-xl bg-emerald-50 text-emerald-800 text-xs font-bold hover:bg-emerald-100 transition-colors"
          >
            عرض جميع أعلام العائلة
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {filteredFigures.map((fig) => {
            const lineageStr =
              fig.personKey && registry.people.has(fig.personKey)
                ? formatLineageString(fig.personKey, registry.people)
                : '';

            return (
              <div
                key={fig.id}
                onClick={() => setSelectedFigure(fig)}
                className="group bg-white rounded-3xl border border-slate-200/90 hover:border-emerald-600/50 shadow-sm hover:shadow-xl transition-all duration-200 overflow-hidden flex flex-col justify-between cursor-pointer"
              >
                {/* Card Top Header */}
                <div className="p-5 sm:p-6 space-y-4">
                  <div className="flex items-start gap-4">
                    <div className="relative shrink-0">
                      <MemberAvatar
                        personKey={fig.personKey}
                        name={fig.name}
                        src={fig.photo}
                        className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl object-cover border-2 border-amber-400/70 shadow-md bg-emerald-50 text-emerald-800 text-xl"
                      />
                      <div className="absolute -bottom-1.5 -right-1.5 w-6 h-6 rounded-full bg-amber-400 text-slate-950 flex items-center justify-center shadow border border-white">
                        <Award className="w-3.5 h-3.5" />
                      </div>
                    </div>

                    <div className="flex-1 min-w-0 space-y-1.5">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg text-[11px] font-bold border ${getBranchBadgeStyle(
                            fig.branch
                          )}`}
                        >
                          <GitBranch className="w-3 h-3" />
                          <span>{fig.branch}</span>
                        </span>
                        {fig.birthDeath && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg text-[11px] font-medium bg-slate-100 text-slate-600">
                            <Calendar className="w-3 h-3 text-slate-400" />
                            <span>{fig.birthDeath}</span>
                          </span>
                        )}
                      </div>

                      <h2 className="text-base sm:text-lg font-black text-slate-900 group-hover:text-emerald-800 transition-colors leading-snug">
                        {fig.name}
                      </h2>

                      <p className="text-xs font-bold text-amber-800 bg-amber-50/90 border border-amber-200/60 px-2.5 py-1 rounded-lg inline-block">
                        {fig.title}
                      </p>
                    </div>

                    {isAuthorized && (
                      <div className="flex items-center gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
                        <button
                          onClick={(e) => handleOpenEdit(fig, e)}
                          className="p-2 rounded-xl text-slate-500 hover:text-emerald-700 hover:bg-emerald-50 transition-colors"
                          title="تعديل السيرة أو المخطوطات"
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={(e) => handleDelete(fig, e)}
                          className="p-2 rounded-xl text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                          title="حذف البطاقة"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Lineage Pill if linked to tree */}
                  {lineageStr && (
                    <div className="px-3 py-2 rounded-xl bg-slate-50 border border-slate-200/70 text-[11px] text-slate-600 leading-relaxed">
                      <span className="font-bold text-slate-800 ml-1">عمود النسب:</span>
                      <span>{lineageStr}</span>
                    </div>
                  )}

                  {/* Biography Excerpt */}
                  <p className="text-xs sm:text-sm text-slate-600 leading-relaxed line-clamp-3">
                    {fig.biography}
                  </p>

                  {/* Achievements Preview */}
                  {fig.achievements && fig.achievements.length > 0 && (
                    <div className="space-y-1.5 pt-1">
                      {fig.achievements.slice(0, 2).map((ach, idx) => (
                        <div key={idx} className="flex items-start gap-2 text-xs text-slate-700">
                          <Sparkles className="w-3.5 h-3.5 text-amber-500 shrink-0 mt-0.5" />
                          <span className="line-clamp-1">{ach}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Card Footer Actions */}
                <div className="px-5 py-3.5 bg-slate-50/90 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedFigure(fig);
                      }}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white hover:bg-emerald-50 text-slate-700 hover:text-emerald-800 border border-slate-200 text-xs font-bold transition-colors cursor-pointer"
                    >
                      <BookOpen className="w-3.5 h-3.5 text-emerald-700" />
                      <span>السيرة والمخطوطات</span>
                      {fig.manuscripts && fig.manuscripts.length > 0 && (
                        <span className="px-1.5 py-0.2 rounded-full bg-amber-100 text-amber-900 text-[10px] font-black">
                          {fig.manuscripts.length}
                        </span>
                      )}
                    </button>
                  </div>

                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onGoToTree(fig.personKey || 'oF');
                    }}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-800 hover:bg-emerald-700 text-white text-xs font-bold shadow-sm transition-all cursor-pointer"
                  >
                    <span>موقعه في الشجرة التفاعلية 🌳</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Detailed Biography & Manuscripts Modal */}
      {selectedFigure && (
        <div
          className="fixed inset-0 z-50 bg-slate-950/75 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6 overflow-y-auto"
          onClick={() => setSelectedFigure(null)}
        >
          <div
            className="bg-white w-full max-w-3xl rounded-3xl shadow-2xl border border-slate-200 overflow-hidden my-auto max-h-[90vh] flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="bg-gradient-to-l from-[#0f291e] via-[#133829] to-[#1a4731] p-5 sm:p-6 text-white flex items-start justify-between gap-4">
              <div className="flex items-center gap-4">
                <MemberAvatar
                  personKey={selectedFigure.personKey}
                  name={selectedFigure.name}
                  src={selectedFigure.photo}
                  className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl object-cover border-2 border-amber-400 shadow-lg bg-emerald-50 text-emerald-800 text-xl shrink-0"
                />
                <div className="space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="px-2.5 py-0.5 rounded-lg bg-amber-400/20 border border-amber-300/40 text-amber-200 text-[11px] font-bold">
                      {selectedFigure.branch}
                    </span>
                    {selectedFigure.birthDeath && (
                      <span className="px-2.5 py-0.5 rounded-lg bg-white/10 text-emerald-100 text-[11px]">
                        {selectedFigure.birthDeath}
                      </span>
                    )}
                  </div>
                  <h2 className="text-lg sm:text-2xl font-black text-white">{selectedFigure.name}</h2>
                  <p className="text-xs sm:text-sm text-amber-300 font-bold">{selectedFigure.title}</p>
                </div>
              </div>

              <button
                onClick={() => setSelectedFigure(null)}
                className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-5 sm:p-6 overflow-y-auto space-y-6 flex-1">
              {/* Full Lineage Chain */}
              {selectedFigure.personKey && registry.people.has(selectedFigure.personKey) && (
                <div className="p-4 rounded-2xl bg-emerald-50/70 border border-emerald-200/80 space-y-1">
                  <div className="text-xs font-black text-emerald-900 flex items-center gap-1.5">
                    <GitBranch className="w-4 h-4 text-emerald-700" />
                    <span>عمود النسب الموثق في الشجرة:</span>
                  </div>
                  <p className="text-xs sm:text-sm font-bold text-emerald-950 leading-relaxed">
                    {formatLineageString(selectedFigure.personKey, registry.people)}
                  </p>
                </div>
              )}

              {/* Full Historical Biography */}
              <div className="space-y-2.5">
                <h3 className="text-sm sm:text-base font-black text-slate-900 flex items-center gap-2">
                  <BookOpen className="w-4 h-4 text-emerald-700" />
                  <span>السيرة التاريخية والمكانة الاجتماعية</span>
                </h3>
                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 text-xs sm:text-sm text-slate-700 leading-loose whitespace-pre-line">
                  {selectedFigure.biography}
                </div>
              </div>

              {/* Achievements & Legacy */}
              {selectedFigure.achievements && selectedFigure.achievements.length > 0 && (
                <div className="space-y-2.5">
                  <h3 className="text-sm sm:text-base font-black text-slate-900 flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-amber-600" />
                    <span>أبرز المآثر والإسهامات الموثقة</span>
                  </h3>
                  <div className="grid grid-cols-1 gap-2">
                    {selectedFigure.achievements.map((ach, idx) => (
                      <div
                        key={idx}
                        className="flex items-start gap-2.5 p-3 rounded-xl bg-amber-50/60 border border-amber-200/70 text-xs sm:text-sm text-slate-800 font-medium"
                      >
                        <span className="w-5 h-5 rounded-full bg-amber-400 text-slate-950 text-[11px] font-black flex items-center justify-center shrink-0 mt-0.5">
                          {idx + 1}
                        </span>
                        <span>{ach}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Associated Manuscripts & Documents */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm sm:text-base font-black text-slate-900 flex items-center gap-2">
                    <ScrollText className="w-4 h-4 text-emerald-700" />
                    <span>المخطوطات والوثائق المرتبطة به</span>
                  </h3>
                  {isAuthorized && (
                    <button
                      onClick={(e) => handleOpenEdit(selectedFigure, e)}
                      className="text-xs font-bold text-emerald-700 hover:text-emerald-800 flex items-center gap-1"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>إضافة أو تعديل مخطوطة</span>
                    </button>
                  )}
                </div>

                {(!selectedFigure.manuscripts || selectedFigure.manuscripts.length === 0) ? (
                  <div className="p-6 rounded-2xl bg-slate-50 border border-dashed border-slate-200 text-center text-xs text-slate-500">
                    لا توجد مخطوطات مرفقة حالياً لهذا العلم.
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {selectedFigure.manuscripts.map((ms) => (
                      <div
                        key={ms.id}
                        onClick={() => {
                          setActiveManuscript(ms);
                          setMsZoom(1);
                        }}
                        className="group rounded-2xl border border-slate-200 overflow-hidden bg-slate-50 hover:border-emerald-600/60 hover:shadow-md transition-all cursor-pointer flex flex-col"
                      >
                        <div className="relative h-44 bg-slate-900 overflow-hidden">
                          <img
                            src={ms.url}
                            alt={ms.title}
                            loading="lazy"
                            decoding="async"
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent flex items-end p-3">
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white/90 text-slate-900 text-[11px] font-bold shadow">
                              <ZoomIn className="w-3.5 h-3.5 text-emerald-700" />
                              <span>فتح وتكبير المخطوطة</span>
                            </span>
                          </div>
                        </div>
                        <div className="p-3.5 space-y-1 flex-1">
                          {ms.era && (
                            <span className="text-[10px] font-bold text-amber-800 bg-amber-100 px-2 py-0.5 rounded-md inline-block">
                              {ms.era}
                            </span>
                          )}
                          <h4 className="text-xs sm:text-sm font-black text-slate-900">{ms.title}</h4>
                          {ms.description && (
                            <p className="text-xs text-slate-600 leading-relaxed">{ms.description}</p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 sm:p-5 bg-slate-50 border-t border-slate-200 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                {isAuthorized && (
                  <>
                    <button
                      onClick={(e) => handleOpenEdit(selectedFigure, e)}
                      className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 text-xs font-bold transition-colors cursor-pointer"
                    >
                      <Edit3 className="w-3.5 h-3.5 text-emerald-700" />
                      <span>تعديل بيانات العلم</span>
                    </button>
                    <button
                      onClick={(e) => handleDelete(selectedFigure, e)}
                      className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 text-xs font-bold transition-colors cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5 text-red-600" />
                      <span>حذف وتثبيت</span>
                    </button>
                  </>
                )}
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    const targetKey = selectedFigure.personKey || 'oF';
                    setSelectedFigure(null);
                    onGoToTree(targetKey);
                  }}
                  className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-800 hover:bg-emerald-700 text-white text-xs sm:text-sm font-black shadow-md transition-all cursor-pointer"
                >
                  <span>موقعه في الشجرة التفاعلية 🌳</span>
                </button>
                <button
                  onClick={() => setSelectedFigure(null)}
                  className="px-4 py-2.5 rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-800 text-xs font-bold transition-colors cursor-pointer"
                >
                  إغلاق
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Interactive Zoomable Manuscript Lightbox */}
      {activeManuscript && (
        <div
          className="fixed inset-0 z-[60] bg-slate-950/90 backdrop-blur-md flex flex-col"
          onClick={() => setActiveManuscript(null)}
        >
          <div
            className="flex items-center justify-between px-4 sm:px-6 py-3.5 bg-slate-900/90 border-b border-slate-800 text-white"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="min-w-0">
              <h3 className="text-sm sm:text-base font-black truncate">{activeManuscript.title}</h3>
              {activeManuscript.era && (
                <p className="text-[11px] text-amber-300">{activeManuscript.era}</p>
              )}
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setMsZoom((z) => Math.min(4, +(z + 0.4).toFixed(1)))}
                className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white transition-colors"
                title="تكبير"
              >
                <ZoomIn className="w-4 h-4" />
              </button>
              <button
                onClick={() => setMsZoom((z) => Math.max(0.6, +(z - 0.4).toFixed(1)))}
                className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white transition-colors"
                title="تصغير"
              >
                <ZoomOut className="w-4 h-4" />
              </button>
              <button
                onClick={() => setMsZoom(1)}
                className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white transition-colors"
                title="إعادة ضبط الحجم"
              >
                <RotateCcw className="w-4 h-4" />
              </button>
              <button
                onClick={() => downloadImageSmoothly(activeManuscript.url, `${activeManuscript.title}.jpg`, onShowToast)}
                className="p-2 rounded-xl bg-emerald-700 hover:bg-emerald-600 text-white transition-colors"
                title="تنزيل المخطوطة"
              >
                <Download className="w-4 h-4" />
              </button>
              <button
                onClick={() => setActiveManuscript(null)}
                className="p-2 rounded-xl bg-red-600/80 hover:bg-red-600 text-white transition-colors"
                title="إغلاق"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          <div
            className="flex-1 overflow-auto flex items-center justify-center p-4"
            onClick={(e) => e.stopPropagation()}
          >
            <img
              src={activeManuscript.url}
              alt={activeManuscript.title}
              style={{ transform: `scale(${msZoom})`, transformOrigin: 'center center' }}
              className="max-w-full max-h-full object-contain transition-transform duration-150 rounded-xl shadow-2xl"
            />
          </div>

          {activeManuscript.description && (
            <div
              className="px-6 py-3 bg-slate-900/95 border-t border-slate-800 text-center text-xs sm:text-sm text-slate-200"
              onClick={(e) => e.stopPropagation()}
            >
              {activeManuscript.description}
            </div>
          )}
        </div>
      )}

      {/* Admin Add / Edit Notable Figure Modal */}
      {isEditorOpen && isAuthorized && (
        <div
          className="fixed inset-0 z-50 bg-slate-950/75 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6 overflow-y-auto"
          onClick={() => setIsEditorOpen(false)}
        >
          <div
            className="bg-white w-full max-w-2xl rounded-3xl shadow-2xl border border-slate-200 overflow-hidden my-auto max-h-[92vh] flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="bg-emerald-900 px-6 py-4 text-white flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <Award className="w-5 h-5 text-amber-300" />
                <h3 className="text-base sm:text-lg font-black">
                  {editingFigure ? `تعديل بيانات: ${editingFigure.name}` : 'إضافة علم جديد إلى سجل أعلام العائلة'}
                </h3>
              </div>
              <button
                onClick={() => setIsEditorOpen(false)}
                className="p-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSubmitForm} className="p-5 sm:p-6 overflow-y-auto space-y-4 flex-1">
              {/* Step 1: Link to Tree Member */}
              <div className="p-4 rounded-2xl bg-emerald-50/70 border border-emerald-200 space-y-2.5">
                <label className="block text-xs font-black text-emerald-950">
                  1. ربط العلم بموقعه في الشجرة التفاعلية (ابحث بالاسم لاختياره تلقائياً):
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={personSearchQuery}
                    onChange={(e) => setPersonSearchQuery(e.target.value)}
                    placeholder="اكتب اسم الفرد للبحث في الشجرة (مثال: كاظم، ملا حسين، الفردان...)"
                    className="w-full px-3.5 py-2 rounded-xl bg-white border border-emerald-300 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-emerald-600"
                  />
                  {matchingTreePeople.length > 0 && (
                    <div className="mt-1.5 bg-white rounded-xl border border-slate-200 shadow-lg max-h-44 overflow-y-auto divide-y divide-slate-100">
                      {matchingTreePeople.map((item) => (
                        <button
                          type="button"
                          key={item.key}
                          onClick={() => handleSelectTreeMemberForForm(item.key)}
                          className="w-full text-right px-3.5 py-2 hover:bg-emerald-50 transition-colors flex items-center justify-between gap-2"
                        >
                          <div className="min-w-0">
                            <div className="text-xs font-black text-slate-900">{item.name}</div>
                            <div className="text-[11px] text-slate-500 truncate">{item.lineage}</div>
                          </div>
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 shrink-0">
                            {item.branchName}
                          </span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {formPersonKey && registry.people.has(formPersonKey) && (
                  <div className="flex items-center gap-2 text-xs text-emerald-900 font-bold bg-white px-3 py-1.5 rounded-xl border border-emerald-200">
                    <UserCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>مرتبط في الشجرة بـ: {formatLineageString(formPersonKey, registry.people)}</span>
                  </div>
                )}
              </div>

              {/* Name & Title */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">الاسم الكامل للعلم *</label>
                  <input
                    type="text"
                    required
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    placeholder="مثال: الحاج كاظم بن إبراهيم الفردان"
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-xs sm:text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">اللقب أو الصفة التاريخية *</label>
                  <input
                    type="text"
                    value={formTitle}
                    onChange={(e) => setFormTitle(e.target.value)}
                    placeholder="مثال: مؤرخ العائلة وناسخ مخطوطة النسب"
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-xs sm:text-sm"
                  />
                </div>
              </div>

              {/* Branch & Birth/Death */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">الفرع العائلي</label>
                  <select
                    value={formBranch}
                    onChange={(e) => setFormBranch(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-xs sm:text-sm bg-white"
                  >
                    <option value="سلسلة الأجداد المؤسسين">سلسلة الأجداد المؤسسين</option>
                    <option value="ذرية محمد">ذرية محمد</option>
                    <option value="ذرية حسين">ذرية حسين</option>
                    <option value="ذرية عبدالله">ذرية عبدالله</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">تاريخ الميلاد / الوفاة أو الحقبة</label>
                  <input
                    type="text"
                    value={formBirthDeath}
                    onChange={(e) => setFormBirthDeath(e.target.value)}
                    placeholder="مثال: توفي عام 2020 م (رحمه الله)"
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-xs sm:text-sm"
                  />
                </div>
              </div>

              {/* Personal Photo Upload */}
              <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <MemberAvatar
                    personKey={formPersonKey}
                    name={formName || 'علم'}
                    src={formPhoto}
                    className="w-14 h-14 rounded-2xl object-cover border border-slate-300 bg-emerald-50 text-emerald-800"
                  />
                  <div>
                    <div className="text-xs font-bold text-slate-800">الصورة الشخصية للعلم</div>
                    <div className="text-[11px] text-slate-500">
                      تظهر تلقائياً من الشجرة أو يمكنك رفع صورة مخصصة
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    ref={photoInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handlePhotoUpload}
                    className="hidden"
                  />
                  <button
                    type="button"
                    onClick={() => photoInputRef.current?.click()}
                    disabled={isUploadingPhoto}
                    className="px-3 py-1.5 rounded-xl bg-white border border-slate-300 hover:bg-slate-100 text-xs font-bold text-slate-700 flex items-center gap-1.5"
                  >
                    <Upload className="w-3.5 h-3.5" />
                    <span>{isUploadingPhoto ? 'جاري الضغط...' : 'رفع صورة'}</span>
                  </button>
                </div>
              </div>

              {/* Detailed Biography */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  النبذة التاريخية المفصلة عن حياته وسيرته ومآثره *
                </label>
                <textarea
                  rows={4}
                  required
                  value={formBiography}
                  onChange={(e) => setFormBiography(e.target.value)}
                  placeholder="اكتب السيرة التاريخية المفصلة ومآثر العلم وإسهاماته..."
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs sm:text-sm leading-relaxed"
                />
              </div>

              {/* Achievements */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  أبرز المآثر والإسهامات (سطر لكل مأثرة)
                </label>
                <textarea
                  rows={3}
                  value={formAchievementsText}
                  onChange={(e) => setFormAchievementsText(e.target.value)}
                  placeholder={'تحقيق ونسخ شجرة العائلة\nتأسيس المجلس العلمي...'}
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-xs sm:text-sm"
                />
              </div>

              {/* Associated Manuscripts Manager */}
              <div className="p-4 rounded-2xl bg-amber-50/50 border border-amber-200/80 space-y-3">
                <div className="text-xs font-black text-amber-950 flex items-center gap-1.5">
                  <FileText className="w-4 h-4 text-amber-700" />
                  <span>المخطوطات والوثائق المرتبطة بهذا العلم ({formManuscripts.length})</span>
                </div>

                {formManuscripts.length > 0 && (
                  <div className="space-y-2">
                    {formManuscripts.map((ms) => (
                      <div
                        key={ms.id}
                        className="flex items-center justify-between gap-3 p-2.5 rounded-xl bg-white border border-amber-200"
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <img
                            src={ms.url}
                            alt={ms.title}
                            loading="lazy"
                            className="w-10 h-10 rounded-lg object-cover border border-slate-200 shrink-0"
                          />
                          <div className="min-w-0">
                            <div className="text-xs font-bold text-slate-900 truncate">{ms.title}</div>
                            {ms.era && <div className="text-[10px] text-slate-500">{ms.era}</div>}
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleRemoveManuscriptFromForm(ms.id)}
                          className="p-1.5 rounded-lg text-red-600 hover:bg-red-50"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {/* Add new manuscript sub-box */}
                <div className="p-3 rounded-xl bg-white border border-amber-200/80 space-y-2.5">
                  <div className="text-[11px] font-bold text-slate-700">إرفاق مخطوطة أو وثيقة جديدة لهذا العلم:</div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <input
                      type="text"
                      value={newMsTitle}
                      onChange={(e) => setNewMsTitle(e.target.value)}
                      placeholder="عنوان المخطوطة أو الوثيقة"
                      className="px-3 py-1.5 rounded-lg border border-slate-300 text-xs"
                    />
                    <input
                      type="text"
                      value={newMsEra}
                      onChange={(e) => setNewMsEra(e.target.value)}
                      placeholder="تاريخ أو حقبة المخطوطة"
                      className="px-3 py-1.5 rounded-lg border border-slate-300 text-xs"
                    />
                  </div>
                  <input
                    type="text"
                    value={newMsDesc}
                    onChange={(e) => setNewMsDesc(e.target.value)}
                    placeholder="وصف مختصر للمخطوطة..."
                    className="w-full px-3 py-1.5 rounded-lg border border-slate-300 text-xs"
                  />
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <input
                        ref={msInputRef}
                        type="file"
                        accept="image/*"
                        onChange={handleManuscriptUpload}
                        className="hidden"
                      />
                      <button
                        type="button"
                        onClick={() => msInputRef.current?.click()}
                        disabled={isUploadingMs}
                        className="px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold flex items-center gap-1"
                      >
                        <Upload className="w-3.5 h-3.5" />
                        <span>{isUploadingMs ? 'جاري ضغط المخطوطة...' : 'اختيار صورة المخطوطة'}</span>
                      </button>
                      {newMsUrl && (
                        <span className="text-[11px] text-emerald-700 font-bold flex items-center gap-1">
                          <Check className="w-3.5 h-3.5" /> جاهزة للإضافة
                        </span>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={handleAddManuscriptToForm}
                      className="px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-black"
                    >
                      + أدرج المخطوطة في البطاقة
                    </button>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setIsEditorOpen(false)}
                  className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-emerald-800 hover:bg-emerald-700 text-white text-xs sm:text-sm font-black shadow-md flex items-center gap-1.5 cursor-pointer"
                >
                  <Check className="w-4 h-4" />
                  <span>حفظ وتثبيت في جميع المواقع</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
