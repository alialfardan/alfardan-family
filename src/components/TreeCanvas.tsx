import React, { useEffect, useRef, useState, useMemo, useCallback } from 'react';
import * as d3 from 'd3';
import { ProcessedPerson, FamilyTreeProcessed } from '../types/family';
import {
  BRANCH_COLORS,
  getArabicInitial,
  searchFamilyMembers,
  getQuadLineageName,
  normalizeArabic,
  getChildrenOfSpouse
} from '../data/treeManager';
import { ZoomIn, ZoomOut, RotateCcw, Target, Maximize2, Minimize2, Plus, Search, X } from 'lucide-react';
import { MemberAvatar, sanitizeAvatarUrl, markAvatarUrlFailed } from './MemberAvatar';

interface TreeCanvasProps {
  registry: FamilyTreeProcessed;
  selectedKey: string;
  onSelectPerson: (key: string, opts?: { reveal?: boolean; center?: boolean }) => void;
  onAddChild: (parentKey: string, defaultGender?: 'm' | 'f') => void;
  expandedKeys: Set<string>;
  onToggleExpand: (key: string) => void;
  onExpandAll: () => void;
  onCollapseAll: () => void;
  filterBranch: string | null;
  isAuthorized?: boolean;
  onOpenSearchResults?: (query: string) => void;
  isPrivacyRestricted?: boolean;
}

export interface D3GroupNodeData {
  isGroup: true;
  groupType: 'sons' | 'daughters';
  key: string;
  parentKey: string;
  parentPerson: ProcessedPerson;
  name: string;
  count: number;
  branch: string;
  gender: 'm' | 'f';
  childrenKeys?: string[];
}

function getPersonSubtitle(person: ProcessedPerson, registry: FamilyTreeProcessed): string {
  if (person.title) return person.title;
  if (person.year) return `${person.gender === 'f' ? 'ولدت' : 'ولد'} ${person.year}م`;

  // Calculate offspring accurately for both males and females across all branches & generations
  let sons = 0;
  let daughters = 0;

  if (person.gender === 'f') {
    const seen = new Set<string>();
    (person.spouses || []).forEach(sp => {
      const spInfo = getChildrenOfSpouse(person.key, sp, registry.people);
      spInfo.all.forEach(c => {
        if (!c.deleted && !seen.has(c.key)) {
          seen.add(c.key);
          if (c.gender === 'f') daughters++;
          else sons++;
        }
      });
    });
    (person.childrenKeys || []).forEach(ck => {
      const c = registry.people.get(ck);
      if (c && !c.deleted && !seen.has(c.key)) {
        seen.add(c.key);
        if (c.gender === 'f') daughters++;
        else sons++;
      }
    });
  } else {
    const validChildren = person.childrenKeys
      .map(k => registry.people.get(k))
      .filter((c): c is ProcessedPerson => !!c && !c.deleted);
    sons = validChildren.filter(c => c.gender !== 'f').length;
    daughters = validChildren.filter(c => c.gender === 'f').length;
  }

  if (sons > 0 && daughters > 0) {
    return `${sons} ${sons === 1 ? 'ابن' : 'أبناء'} · ${daughters} ${daughters === 1 ? 'بنت' : 'بنات'}`;
  }
  if (daughters > 0) {
    return `${daughters} ${daughters === 1 ? 'بنت' : 'بنات'}`;
  }
  if (sons > 0) {
    return `${sons} ${sons === 1 ? 'ابن' : 'أبناء'}`;
  }

  if (person.spouses && person.spouses.length > 0) {
    return person.gender === 'f' ? `زوجة ${person.spouses[0].name}` : 'متزوج';
  }

  return '';
}

export const TreeCanvas: React.FC<TreeCanvasProps> = ({
  registry,
  selectedKey,
  onSelectPerson,
  onAddChild,
  expandedKeys,
  onToggleExpand,
  onExpandAll,
  onCollapseAll,
  filterBranch,
  isAuthorized = false,
  onOpenSearchResults,
  isPrivacyRestricted = false,
}) => {
  const svgRef = useRef<SVGSVGElement | null>(null);
  const zoomGRef = useRef<SVGGElement | null>(null);
  const zoomBehaviorRef = useRef<d3.ZoomBehavior<SVGSVGElement, unknown> | null>(null);

  const [currentZoom, setCurrentZoom] = useState<number>(0.85);
  // Track manually collapsed sons/daughters group sections
  const [collapsedGroupKeys, setCollapsedGroupKeys] = useState<Set<string>>(new Set());

  const handleToggleGroup = useCallback((groupKey: string) => {
    setCollapsedGroupKeys(prev => {
      const next = new Set(prev);
      if (next.has(groupKey)) {
        next.delete(groupKey);
      } else {
        next.add(groupKey);
      }
      return next;
    });
  }, []);

  // Quick Search within Interactive Tree
  const [quickSearchQuery, setQuickSearchQuery] = useState('');
  const [isQuickSearchOpen, setIsQuickSearchOpen] = useState(false);
  const quickSearchRef = useRef<HTMLDivElement>(null);

  const quickResults = useMemo(() => {
    if (!quickSearchQuery.trim()) return [];
    return searchFamilyMembers(quickSearchQuery, registry.people, 20, { excludeFemales: isPrivacyRestricted });
  }, [quickSearchQuery, registry, isPrivacyRestricted]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (quickSearchRef.current && !quickSearchRef.current.contains(event.target as Node)) {
        setIsQuickSearchOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelectFromQuickSearch = (key: string) => {
    setQuickSearchQuery('');
    setIsQuickSearchOpen(false);
    onSelectPerson(key, { reveal: true, center: true });
  };

  const NODE_HEIGHT = 44;
  const NODE_AVATAR_RADIUS = 15;
  const LEVEL_SPACING = 210;
  const SIBLING_SPACING = 56;

  // Build the hierarchical tree data structure based on expandedKeys
  // and splitting into Sons & Daughters sections when daughters exist
  const hierarchyData = useMemo(() => {
    const rootPerson = registry.people.get(registry.rootKey);
    if (!rootPerson) return null;

    function buildNode(person: ProcessedPerson): any {
      if (person.deleted) return null;
      if (filterBranch && person.branch !== 'b0' && person.branch !== filterBranch) {
        return null;
      }

      const isExpanded = expandedKeys.has(person.key);

      // Deduplicate valid children by key (and exact duplicate added entries) without hiding distinct siblings
      const seenChildKeys = new Set<string>();
      const seenAddedSignatures = new Set<string>();
      const uniqueChildren: ProcessedPerson[] = [];

      for (const ck of person.childrenKeys) {
        if (seenChildKeys.has(ck)) continue;
        const c = registry.people.get(ck);
        if (!c || c.deleted) continue;
        seenChildKeys.add(ck);

        if (c.isNew) {
          const exactName = (c.name || '').trim();
          const motherTag = c.mother?.personKey || c.mother?.name || '';
          const addedSig = `${exactName}_${c.gender || 'm'}_${motherTag}`;
          if (seenAddedSignatures.has(addedSig) && c.childrenKeys.length === 0) {
            continue;
          }
          seenAddedSignatures.add(addedSig);
        }

        uniqueChildren.push(c);
      }

      const sons = uniqueChildren.filter(c => c.gender !== 'f');
      const daughters = isPrivacyRestricted ? [] : uniqueChildren.filter(c => c.gender === 'f');

      // Rule:
      // If the individual has daughters (daughters.length > 0):
      // Two sections emerge from him:
      // 1) Section for Sons (if sons.length > 0)
      // 2) Section for Daughters
      // If the individual did NOT have daughters:
      // The daughters section does NOT appear; his sons emerge directly.
      if (daughters.length > 0) {
        const sections: any[] = [];

        // 1. Sons Section (if any sons exist)
        if (sons.length > 0) {
          const sonsGroupKey = `group_sons_${person.key}`;
          const isSonsExpanded = !collapsedGroupKeys.has(sonsGroupKey);
          const builtSons = sons.map(buildNode).filter(Boolean);

          sections.push({
            isGroup: true,
            groupType: 'sons',
            key: sonsGroupKey,
            parentKey: person.key,
            parentPerson: person,
            name: 'الأبناء (الرجال)',
            count: sons.length,
            branch: person.branch,
            gender: 'm',
            children: isExpanded && isSonsExpanded ? builtSons : null,
            _allChildren: builtSons,
          });
        }

        // 2. Daughters Section (always added because daughters.length > 0)
        const daughtersGroupKey = `group_daughters_${person.key}`;
        const isDaughtersExpanded = !collapsedGroupKeys.has(daughtersGroupKey);
        const builtDaughters = daughters.map(buildNode).filter(Boolean);

        sections.push({
          isGroup: true,
          groupType: 'daughters',
          key: daughtersGroupKey,
          parentKey: person.key,
          parentPerson: person,
          name: 'البنات',
          count: daughters.length,
          branch: person.branch,
          gender: 'f',
          children: isExpanded && isDaughtersExpanded ? builtDaughters : null,
          _allChildren: builtDaughters,
        });

        return {
          ...person,
          isGroup: false,
          children: isExpanded ? sections : null,
          _allChildren: sections
        };
      } else {
        // No daughters! Only sons (or no children at all)
        const builtSons = sons.map(buildNode).filter(Boolean);
        return {
          ...person,
          isGroup: false,
          children: isExpanded && builtSons.length > 0 ? builtSons : null,
          _allChildren: builtSons
        };
      }
    }

    const tree = buildNode(rootPerson);
    return tree ? d3.hierarchy(tree) : null;
  }, [registry, expandedKeys, filterBranch, collapsedGroupKeys, isPrivacyRestricted]);

  // Compute D3 Tree layout
  const { nodes, links } = useMemo(() => {
    if (!hierarchyData) return { nodes: [], links: [] };

    const treeLayout = d3.tree<any>()
      .nodeSize([SIBLING_SPACING, LEVEL_SPACING])
      .separation((a, b) => (a.parent === b.parent ? 1.05 : 1.25));

    const root = treeLayout(hierarchyData);
    const descendantNodes = root.descendants();
    const treeLinks = root.links();

    return {
      nodes: descendantNodes,
      links: treeLinks
    };
  }, [hierarchyData]);

  // Initialize D3 Zoom
  useEffect(() => {
    if (!svgRef.current || !zoomGRef.current) return;

    const svg = d3.select(svgRef.current);
    const g = d3.select(zoomGRef.current);

    const zoom = d3.zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.15, 2.5])
      .on('zoom', (event) => {
        g.attr('transform', event.transform);
        setCurrentZoom(event.transform.k);
      });

    zoomBehaviorRef.current = zoom;
    svg.call(zoom).on('dblclick.zoom', null);

    // Initial center on Fardan or selected person
    centerOnKey(selectedKey || registry.fardanKey, 0.85);
  }, []);

  // Center view on a specific person
  const centerOnKey = useCallback((targetKey: string, scale?: number) => {
    if (!svgRef.current || !zoomBehaviorRef.current) return;
    const svg = d3.select(svgRef.current);
    const targetNode = nodes.find(n => n.data.key === targetKey);
    const width = svgRef.current.clientWidth || window.innerWidth;
    const height = svgRef.current.clientHeight || window.innerHeight;

    const k = scale || currentZoom;

    // In our RTL tree: horizontal position is -n.y, vertical is n.x
    const targetX = targetNode ? -targetNode.y : 0;
    const targetY = targetNode ? targetNode.x : 0;

    // Offset slightly to leave room for the right sidebar on desktop
    const offsetX = width > 768 ? width * 0.42 : width * 0.5;
    const offsetY = height * 0.48;

    const transform = d3.zoomIdentity
      .translate(offsetX - targetX * k, offsetY - targetY * k)
      .scale(k);

    svg.transition().duration(550).ease(d3.easeCubicOut).call(zoomBehaviorRef.current.transform, transform);
  }, [nodes, currentZoom]);

  // Handle Zoom In
  const handleZoomIn = () => {
    if (!svgRef.current || !zoomBehaviorRef.current) return;
    d3.select(svgRef.current).transition().duration(250).call(zoomBehaviorRef.current.scaleBy, 1.3);
  };

  // Handle Zoom Out
  const handleZoomOut = () => {
    if (!svgRef.current || !zoomBehaviorRef.current) return;
    d3.select(svgRef.current).transition().duration(250).call(zoomBehaviorRef.current.scaleBy, 1 / 1.3);
  };

  // Handle Reset to Fardan
  const handleResetToFardan = () => {
    centerOnKey(registry.fardanKey, 0.85);
    onSelectPerson(registry.fardanKey);
  };

  // Curve generator for connecting links (RTL: right to left)
  const generateLinkPath = (link: d3.HierarchyLink<any>) => {
    const sourceX = -(link.source.y ?? 0);
    const sourceY = link.source.x ?? 0;
    const targetX = -(link.target.y ?? 0);
    const targetY = link.target.x ?? 0;

    const isSourceGroup = !!link.source.data.isGroup;
    const isTargetGroup = !!link.target.data.isGroup;

    // Node card widths offset
    const sCardWidth = isSourceGroup ? 144 : 160;
    const tCardWidth = isTargetGroup ? 144 : 160;

    const sOffsetX = -sCardWidth / 2; // left edge of source (towards left in RTL)
    const tOffsetX = tCardWidth / 2;  // right edge of target (from right in RTL)

    const startX = sourceX + sOffsetX;
    const startY = sourceY;
    const endX = targetX + tOffsetX;
    const endY = targetY;

    const midX = (startX + endX) / 2;
    return `M ${startX} ${startY} C ${midX} ${startY}, ${midX} ${endY}, ${endX} ${endY}`;
  };

  return (
    <div className="relative w-full h-full overflow-hidden bg-[#f4f6f1] select-none">
      {/* Background Dot Grid */}
      <div 
        className="absolute inset-0 pointer-events-none opacity-40"
        style={{
          backgroundImage: 'radial-gradient(#b2bec3 1.2px, transparent 1.2px)',
          backgroundSize: '24px 24px',
        }}
      />

      {/* SVG Canvas */}
      <svg
        ref={svgRef}
        className="w-full h-full cursor-grab active:cursor-grabbing"
      >
        <defs>
          <clipPath id="avatar-clip">
            <circle cx="0" cy="0" r={NODE_AVATAR_RADIUS} />
          </clipPath>
          <filter id="card-shadow" x="-10%" y="-10%" width="120%" height="130%">
            <feDropShadow dx="0" dy="2" stdDeviation="3" floodColor="#121714" floodOpacity="0.08" />
          </filter>
          <filter id="card-shadow-active" x="-15%" y="-15%" width="130%" height="140%">
            <feDropShadow dx="0" dy="4" stdDeviation="6" floodColor="#059669" floodOpacity="0.25" />
          </filter>
        </defs>

        <g ref={zoomGRef}>
          {/* Links */}
          <g className="links">
            {links.map((link, idx) => {
              const isSelectedPath = link.target.data.key === selectedKey || link.source.data.key === selectedKey;
              const branchInfo = BRANCH_COLORS[link.target.data.branch] || BRANCH_COLORS.b0;

              const isDaughterPath = (link.target.data.isGroup && link.target.data.groupType === 'daughters') ||
                                     (link.source.data.isGroup && link.source.data.groupType === 'daughters') ||
                                     (link.target.data.gender === 'f');

              return (
                <path
                  key={`link-${link.source.data.key}-${link.target.data.key}-${idx}`}
                  d={generateLinkPath(link)}
                  fill="none"
                  stroke={
                    isSelectedPath
                      ? branchInfo.accent
                      : '#cbd5e1'
                  }
                  strokeWidth={isSelectedPath ? 2.5 : 1.5}
                  className="transition-colors duration-200"
                />
              );
            })}
          </g>

          {/* Nodes */}
          <g className="nodes">
            {nodes.map(node => {
              const isGroupNode = !!node.data.isGroup;

              // SECTION CARD (الأبناء / البنات)
              if (isGroupNode) {
                const group: D3GroupNodeData = node.data;
                const isSons = group.groupType === 'sons';
                const isExpanded = !collapsedGroupKeys.has(group.key);
                const cardWidth = 144;
                const cardHeight = 36;
                const posX = -node.y;
                const posY = node.x;

                return (
                  <g
                    key={`group-node-${group.key}`}
                    transform={`translate(${posX}, ${posY})`}
                    className="cursor-pointer group"
                    onClick={() => handleToggleGroup(group.key)}
                  >
                    {/* Background card */}
                    <rect
                      x={-cardWidth / 2}
                      y={-cardHeight / 2}
                      width={cardWidth}
                      height={cardHeight}
                      rx={12}
                      fill={isSons ? '#f0fdf4' : '#fff1f2'}
                      stroke={isSons ? '#10b981' : '#f43f5e'}
                      strokeWidth={1.8}
                      filter="url(#card-shadow)"
                      className="transition-all duration-200 group-hover:scale-[1.02]"
                    />

                    {/* Accent stripe on right edge (in RTL) */}
                    <rect
                      x={cardWidth / 2 - 5}
                      y={-cardHeight / 2 + 7}
                      width={3}
                      height={cardHeight - 14}
                      rx={1.5}
                      fill={isSons ? '#059669' : '#e11d48'}
                    />

                    {/* Emblem Icon */}
                    <g transform={`translate(${cardWidth / 2 - 18}, 0)`}>
                      <circle
                        cx="0"
                        cy="0"
                        r="9.5"
                        fill={isSons ? '#d1fae5' : '#ffe4e6'}
                        stroke={isSons ? '#34d399' : '#fbcfe8'}
                        strokeWidth="1"
                      />
                      <text
                        x="0"
                        y="1"
                        textAnchor="middle"
                        dominantBaseline="central"
                        fontSize="10"
                      >
                        {isSons ? '👨' : '🧕'}
                      </text>
                    </g>

                    {/* Title & Count Label */}
                    <g transform={`translate(${cardWidth / 2 - 34}, 0)`}>
                      <text
                        x="0"
                        y="-4"
                        textAnchor="start"
                        dominantBaseline="central"
                        fill={isSons ? '#065f46' : '#881337'}
                        fontSize="11"
                        fontWeight="700"
                        className="font-['Alexandria']"
                        direction="rtl"
                      >
                        {group.name}
                      </text>
                      <text
                        x="0"
                        y="8"
                        textAnchor="start"
                        dominantBaseline="central"
                        fill={isSons ? '#047857' : '#9f1239'}
                        fontSize="9"
                        fontWeight="600"
                        className="font-['Readex_Pro']"
                        direction="rtl"
                      >
                        {isSons
                          ? `${group.count} ${group.count === 1 ? 'ابن' : 'أبناء'}`
                          : `${group.count} ${group.count === 1 ? 'بنت' : 'بنات'}`}
                      </text>
                    </g>

                    {/* Collapse / Expand Toggle Button on left edge */}
                    <g
                      transform={`translate(${-cardWidth / 2 - 10}, 0)`}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleToggleGroup(group.key);
                      }}
                      className="cursor-pointer transition-transform hover:scale-110"
                    >
                      <title>{isExpanded ? 'طي هذا القسم' : 'توسيع هذا القسم'}</title>
                      <circle
                        cx="0"
                        cy="0"
                        r="9"
                        fill={isExpanded ? (isSons ? '#065f46' : '#881337') : '#ffffff'}
                        stroke={isSons ? '#10b981' : '#f43f5e'}
                        strokeWidth="1.5"
                      />
                      <text
                        x="0"
                        y="1"
                        textAnchor="middle"
                        dominantBaseline="central"
                        fill={isExpanded ? '#ffffff' : (isSons ? '#065f46' : '#881337')}
                        fontSize="9.5"
                        fontWeight="bold"
                      >
                        {isExpanded ? '−' : '+'}
                      </text>
                    </g>

                    {/* Quick Add Child to this section (Authorized Only) */}
                    {isAuthorized && (
                      <g
                        transform={`translate(${-cardWidth / 2 + 10}, ${-cardHeight / 2 + 2})`}
                        className="opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={(e) => {
                          e.stopPropagation();
                          onAddChild(group.parentKey, isSons ? 'm' : 'f');
                        }}
                      >
                        <title>{isSons ? 'إضافة ابن إلى هذا القسم' : 'إضافة ابنة إلى هذا القسم'}</title>
                        <circle cx="0" cy="0" r="8" fill={isSons ? '#059669' : '#e11d48'} />
                        <text
                          x="0"
                          y="1"
                          textAnchor="middle"
                          dominantBaseline="central"
                          fill="#ffffff"
                          fontSize="11"
                          fontWeight="bold"
                        >
                          +
                        </text>
                      </g>
                    )}
                  </g>
                );
              }

              // REGULAR PERSON NODE
              const person: ProcessedPerson = node.data;
              const isSelected = person.key === selectedKey;
              const branchInfo = BRANCH_COLORS[person.branch] || BRANCH_COLORS.b0;
              const isFardan = person.key === registry.fardanKey;
              const isFemale = person.gender === 'f';
              const visibleChildrenCount = isPrivacyRestricted
                ? person.childrenKeys
                    .map(k => registry.people.get(k))
                    .filter(c => c && !c.deleted && c.gender !== 'f').length
                : person.childrenKeys.length;
              const hasChildren = visibleChildrenCount > 0;
              const isExpanded = expandedKeys.has(person.key);

              // Position coordinates: RTL flip
              const posX = -node.y;
              const posY = node.x;

              const cardWidth = 160;
              const cardHeight = NODE_HEIGHT;

              return (
                <g
                  key={`node-${person.key}`}
                  transform={`translate(${posX}, ${posY})`}
                  className="cursor-pointer group"
                  onClick={() => onSelectPerson(person.key, { reveal: true })}
                >
                  {/* Card Background */}
                  <rect
                    x={-cardWidth / 2}
                    y={-cardHeight / 2}
                    width={cardWidth}
                    height={cardHeight}
                    rx={14}
                    fill={isSelected ? '#121714' : '#ffffff'}
                    stroke={
                      isSelected
                        ? branchInfo.accent
                        : isFardan
                        ? '#d97706'
                        : '#e2e8f0'
                    }
                    strokeWidth={isSelected ? 2.5 : isFardan ? 2 : 1}
                    filter={isSelected ? 'url(#card-shadow-active)' : 'url(#card-shadow)'}
                    className="transition-all duration-200 group-hover:stroke-[#059669]"
                  />

                  {/* Branch / Gender Color Accent Stripe (Right edge in RTL) */}
                  <path
                    d={`M ${cardWidth / 2} ${-cardHeight / 2 + 10} A 10 10 0 0 1 ${cardWidth / 2} ${cardHeight / 2 - 10}`}
                    stroke={isFemale ? '#f43f5e' : branchInfo.accent}
                    strokeWidth={3.5}
                    strokeLinecap="round"
                  />

                  {/* Avatar / Photo Container */}
                  <g transform={`translate(${cardWidth / 2 - 24}, 0)`}>
                    <circle
                      cx="0"
                      cy="0"
                      r={NODE_AVATAR_RADIUS}
                      fill={isFemale ? '#fff1f2' : branchInfo.bg}
                      stroke={isFemale ? '#fbcfe8' : branchInfo.border}
                      strokeWidth={1}
                    />
                    {/* Always render initial letter in case image fails to load or is not present */}
                    <text
                      x="0"
                      y="1"
                      textAnchor="middle"
                      dominantBaseline="central"
                      fill={isFemale ? '#e11d48' : branchInfo.accent}
                      fontSize="12"
                      fontWeight="700"
                      className="font-['Alexandria']"
                    >
                      {getArabicInitial(person.name)}
                    </text>
                    {(() => {
                      const safeNodePhoto = sanitizeAvatarUrl(person.photo, person.key);
                      if (!safeNodePhoto) return null;
                      return (
                        <image
                          href={safeNodePhoto}
                          x={-NODE_AVATAR_RADIUS}
                          y={-NODE_AVATAR_RADIUS}
                          width={NODE_AVATAR_RADIUS * 2}
                          height={NODE_AVATAR_RADIUS * 2}
                          clipPath="url(#avatar-clip)"
                          preserveAspectRatio="xMidYMid slice"
                          onError={(e) => {
                            markAvatarUrlFailed(safeNodePhoto);
                            (e.currentTarget as SVGElement).style.display = 'none';
                          }}
                        />
                      );
                    })()}
                  </g>

                  {/* Person Name & Subtitle */}
                  {(() => {
                    const subtitle = getPersonSubtitle(person, registry);
                    const maxLen = person.isDeceased ? 11 : 14;
                    const displayName = person.name.length > maxLen ? person.name.slice(0, maxLen - 1) + '…' : person.name;

                    return (
                      <g transform={`translate(${cardWidth / 2 - 48}, 0)`}>
                        <text
                          x="0"
                          y={subtitle ? -5 : 1}
                          textAnchor="start"
                          dominantBaseline="central"
                          fill={isSelected ? '#ffffff' : '#121714'}
                          fontSize="13"
                          fontWeight={isSelected || isFardan ? '700' : '600'}
                          className="font-['Readex_Pro']"
                          direction="rtl"
                        >
                          {displayName}
                        </text>

                        {/* Subtitle: Accurate sons & daughters counts, birth year, or title */}
                        {subtitle ? (
                          <text
                            x="0"
                            y={9}
                            textAnchor="start"
                            dominantBaseline="central"
                            fill={isSelected ? '#9ca3af' : '#64748b'}
                            fontSize="9.5"
                            className="font-['Readex_Pro']"
                            direction="rtl"
                          >
                            {person.isDeceased && subtitle.length > 14
                              ? subtitle.slice(0, 13) + '…'
                              : subtitle}
                          </text>
                        ) : null}
                      </g>
                    );
                  })()}

                  {/* Deceased Mark: Large Black Circle at the FAR END of the box (طلب المستخدم: في أقصى المربع الذي فيه الاسم) */}
                  {person.isDeceased && (
                    <g transform={`translate(${-cardWidth / 2 + 19}, 0)`} className="cursor-help">
                      <title>{person.deathYear ? `متوفى (سنة الوفاة: ${person.deathYear}م)` : 'متوفى (رحمه الله)'}</title>
                      <circle
                        cx="0"
                        cy="0"
                        r="10"
                        fill="#09090b"
                        stroke={isSelected ? '#38bdf8' : '#ffffff'}
                        strokeWidth="1.8"
                      />
                      <circle
                        cx="0"
                        cy="0"
                        r="4.5"
                        fill="#18181b"
                        stroke="#52525b"
                        strokeWidth="0.8"
                      />
                    </g>
                  )}

                  {/* Expand / Collapse Button (Left side in RTL) */}
                  {hasChildren && (
                    <g
                      transform={`translate(${-cardWidth / 2 - 12}, 0)`}
                      onClick={(e) => {
                        e.stopPropagation();
                        onToggleExpand(person.key);
                      }}
                      className="cursor-pointer transition-transform hover:scale-110"
                    >
                      <circle
                        cx="0"
                        cy="0"
                        r="11"
                        fill={isExpanded ? '#121714' : '#ffffff'}
                        stroke={isSelected ? branchInfo.accent : isFemale ? '#fb7185' : '#94a3b8'}
                        strokeWidth="1.5"
                      />
                      <text
                        x="0"
                        y="1"
                        textAnchor="middle"
                        dominantBaseline="central"
                        fill={isExpanded ? '#ffffff' : '#334155'}
                        fontSize="10"
                        fontWeight="700"
                      >
                        {isExpanded ? '−' : visibleChildrenCount}
                      </text>
                    </g>
                  )}

                  {/* Quick Add Child Button (appears on card hover - Authorized Only) */}
                  {isAuthorized && (
                    <g
                      transform={`translate(${-cardWidth / 2 + 10}, ${-cardHeight / 2 + 2})`}
                      className="opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={(e) => {
                        e.stopPropagation();
                        onAddChild(person.key);
                      }}
                    >
                      <title>إضافة ابن أو ابنة</title>
                      <circle cx="0" cy="0" r="9" fill={isFemale ? '#e11d48' : branchInfo.accent} />
                      <text
                        x="0"
                        y="1"
                        textAnchor="middle"
                        dominantBaseline="central"
                        fill="#ffffff"
                        fontSize="12"
                        fontWeight="bold"
                      >
                        +
                      </text>
                    </g>
                  )}
                </g>
              );
            })}
          </g>
        </g>
      </svg>

      {/* Floating Quick Search Bar in Interactive Tree */}
      <div
        ref={quickSearchRef}
        className="absolute top-3 left-3 sm:top-4 sm:left-5 z-30 w-64 sm:w-80 md:w-88 max-w-[calc(100vw-5rem)] pointer-events-auto font-['Readex_Pro',sans-serif]"
      >
        <div className="relative bg-white/95 backdrop-blur-md rounded-2xl shadow-xl border border-slate-200/90 p-1 transition-all">
          <div className="relative flex items-center">
            <Search className="w-4 h-4 absolute right-3 text-emerald-700 pointer-events-none" />
            <input
              type="text"
              value={quickSearchQuery}
              onChange={e => {
                setQuickSearchQuery(e.target.value);
                setIsQuickSearchOpen(true);
              }}
              onFocus={() => setIsQuickSearchOpen(true)}
              onKeyDown={e => {
                if (e.key === 'Enter' && quickSearchQuery.trim() && onOpenSearchResults) {
                  setIsQuickSearchOpen(false);
                  onOpenSearchResults(quickSearchQuery.trim());
                }
              }}
              placeholder="بحث سريع في الشجرة..."
              className="w-full pr-9 pl-8 py-2 bg-slate-50 hover:bg-slate-100/70 focus:bg-white text-xs text-slate-800 placeholder-slate-400 font-medium rounded-xl border border-transparent focus:border-emerald-500 focus:outline-none transition-all"
            />
            {quickSearchQuery && (
              <button
                onClick={() => {
                  setQuickSearchQuery('');
                  setIsQuickSearchOpen(false);
                }}
                className="absolute left-2.5 p-0.5 text-slate-400 hover:text-slate-600 rounded-full cursor-pointer"
                title="مسح"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Quick Search Autocomplete Dropdown */}
        {isQuickSearchOpen && quickSearchQuery.trim().length > 0 && (
          <div className="absolute top-full right-0 left-0 mt-2 bg-white rounded-2xl shadow-2xl border border-slate-200 max-h-80 overflow-y-auto z-40 p-1.5 animate-in fade-in">
            <div className="flex items-center justify-between px-2.5 py-1.5 border-b border-slate-100 text-[10px] font-bold text-slate-500">
              <span>المطابقات في الشجرة ({quickResults.length})</span>
              {onOpenSearchResults && (
                <button
                  onClick={() => {
                    setIsQuickSearchOpen(false);
                    onOpenSearchResults(quickSearchQuery.trim());
                  }}
                  className="text-emerald-800 hover:text-emerald-950 font-bold cursor-pointer"
                >
                  إطار منفرد ⇱
                </button>
              )}
            </div>

            {quickResults.length === 0 ? (
              <div className="p-4 text-center text-xs text-slate-500">
                لا توجد نتائج تطابق "{quickSearchQuery}"
              </div>
            ) : (
              <div className="space-y-0.5 py-1">
                {quickResults.map(result => {
                  const branchInfo = BRANCH_COLORS[result.branch] || BRANCH_COLORS.b0;
                  const parent = result.parentKey ? registry.people.get(result.parentKey) : null;

                  return (
                    <button
                      key={`quick-tree-res-${result.key}`}
                      onClick={() => handleSelectFromQuickSearch(result.key)}
                      className="w-full flex items-center justify-between p-2 hover:bg-emerald-50 rounded-xl transition-colors text-right cursor-pointer group"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div
                          className="w-9 h-9 rounded-xl flex items-center justify-center font-bold text-xs flex-shrink-0 shadow-2xs overflow-hidden relative"
                          style={{
                            backgroundColor: branchInfo.bg,
                            color: branchInfo.accent,
                            border: result.photo ? '1.5px solid #059669' : `1px solid ${branchInfo.border}`
                          }}
                        >
                          <MemberAvatar
                            src={result.photo}
                            personKey={result.key}
                            name={result.name}
                            gender={result.gender}
                            imgClassName="w-full h-full object-cover group-hover:scale-105 transition-transform"
                          />
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span className="block text-xs font-bold text-slate-800 group-hover:text-emerald-900 truncate">
                              {result.name}
                            </span>
                            {result.photo && (
                              <span className="text-[9px] px-1.5 py-0.2 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded font-medium">
                                صورة 📷
                              </span>
                            )}
                          </div>
                          <span className="block text-[10px] text-slate-500 truncate mt-0.5" title={getQuadLineageName(result.key, registry.people, 4)}>
                            {getQuadLineageName(result.key, registry.people, 4) || (parent ? `${result.gender === 'f' ? 'بنت' : 'بن'} ${parent.name}` : '')}
                            {result.branchName ? ` · ${result.branchName}` : ''}
                          </span>
                        </div>
                      </div>

                      <span className="text-[10px] px-2 py-0.5 bg-slate-100 text-slate-600 rounded-full flex-shrink-0 font-medium">
                        الجيل {result.generation}
                      </span>
                    </button>
                  );
                })}

                {onOpenSearchResults && (
                  <div className="pt-1.5 mt-1 border-t border-slate-100">
                    <button
                      onClick={() => {
                        setIsQuickSearchOpen(false);
                        onOpenSearchResults(quickSearchQuery.trim());
                      }}
                      className="w-full py-1.5 px-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-900 font-bold text-xs rounded-xl flex items-center justify-center gap-1 transition-colors cursor-pointer"
                    >
                      <span>عرض كامل النتائج في إطار منفرد ({quickResults.length})</span>
                      <span className="text-emerald-700">←</span>
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Floating Canvas Controls (Bottom Left in RTL) */}
      <div className="absolute bottom-4 left-3 sm:bottom-5 sm:left-5 z-20 flex items-center gap-1 sm:gap-1.5 bg-white/95 backdrop-blur-md px-2 sm:px-3 py-1.5 sm:py-2 rounded-2xl shadow-xl border border-slate-200 text-slate-700">
        <button
          onClick={handleZoomIn}
          title="تكبير"
          className="p-1.5 sm:p-2 hover:bg-slate-100 active:bg-slate-200 rounded-xl transition-colors"
        >
          <ZoomIn className="w-4 h-4 sm:w-5 sm:h-5" />
        </button>

        <button
          onClick={handleZoomOut}
          title="تصغير"
          className="p-1.5 sm:p-2 hover:bg-slate-100 active:bg-slate-200 rounded-xl transition-colors"
        >
          <ZoomOut className="w-4 h-4 sm:w-5 sm:h-5" />
        </button>

        <div className="w-[1px] h-5 sm:h-6 bg-slate-200 mx-0.5 sm:mx-1" />

        <button
          onClick={() => centerOnKey(selectedKey)}
          title="الانتقال إلى الشخص المحدد"
          className="flex items-center gap-1 px-2 py-1.5 hover:bg-slate-100 active:bg-slate-200 rounded-xl text-xs font-semibold transition-colors"
        >
          <Target className="w-4 h-4 text-emerald-600" />
          <span className="hidden sm:inline">المحدد</span>
        </button>

        <button
          onClick={handleResetToFardan}
          title="العودة إلى عمود النسب التأسيسي"
          className="flex items-center gap-1 px-2 py-1.5 hover:bg-slate-100 active:bg-slate-200 rounded-xl text-xs font-semibold transition-colors"
        >
          <RotateCcw className="w-4 h-4 text-amber-600" />
          <span className="hidden sm:inline">الأجداد</span>
        </button>

        <div className="w-[1px] h-5 sm:h-6 bg-slate-200 mx-0.5 sm:mx-1" />

        <button
          onClick={() => {
            setCollapsedGroupKeys(new Set());
            onExpandAll();
          }}
          title="توسيع جميع الفروع"
          className="flex items-center gap-1 px-2 py-1.5 hover:bg-slate-100 active:bg-slate-200 rounded-xl text-xs font-semibold transition-colors"
        >
          <Maximize2 className="w-4 h-4 text-blue-600" />
          <span className="hidden md:inline">توسيع الكل</span>
        </button>

        <button
          onClick={() => {
            setCollapsedGroupKeys(new Set());
            onCollapseAll();
          }}
          title="طي الشجرة"
          className="flex items-center gap-1 px-2 py-1.5 hover:bg-slate-100 active:bg-slate-200 rounded-xl text-xs font-semibold transition-colors"
        >
          <Minimize2 className="w-4 h-4 text-slate-600" />
          <span className="hidden md:inline">طي</span>
        </button>
      </div>

      {/* Quick Add floating action button for mobile - placed above canvas toolbar */}
      <button
        onClick={() => onAddChild(selectedKey || registry.fardanKey)}
        className="md:hidden absolute bottom-18 left-3 z-20 flex items-center justify-center w-11 h-11 bg-emerald-800 text-white rounded-full shadow-2xl active:scale-95 transition-transform"
        title="إضافة ابن أو ابنة"
      >
        <Plus className="w-5 h-5" />
      </button>
    </div>
  );
};
