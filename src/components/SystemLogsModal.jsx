import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  Search,
  Filter,
  Download,
  RefreshCw,
  Copy,
  Check,
  ChevronDown,
  ChevronRight,
  ShieldAlert,
  AlertTriangle,
  AlertCircle,
  Flame,
  Info,
  Bug,
  Calendar,
  Layers,
  Database,
  Terminal,
  Activity,
  Zap,
  ExternalLink,
  ChevronLeft,
  ChevronsLeft,
  ChevronsRight
} from 'lucide-react';
import { useStore } from '../store/useStore';
import { translations } from '../translations';
import { logger, LogLevel } from '../utils/logger';

export default function SystemLogsModal({ onClose }) {
  const { userRole, language, activityLogs } = useStore();
  const t = translations[language] || translations.en;
  const isRtl = language === 'ar';

  // Active View Tab: 'system' (Structured JSON) or 'activity' (Human Feed)
  const [activeTab, setActiveTab] = useState('system');

  // Firestore remote logs + local ring merged
  const [remoteLogs, setRemoteLogs] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLiveSync, setIsLiveSync] = useState(true);
  const [flushStatus, setFlushStatus] = useState(null);

  // Filters State
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedLevel, setSelectedLevel] = useState('ALL');
  const [selectedModule, setSelectedModule] = useState('ALL');
  const [dateFilter, setDateFilter] = useState('all'); // 'all', 'today', '7days', 'custom'
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');

  // Expandable row state
  const [expandedLogId, setExpandedLogId] = useState(null);
  const [copiedLogId, setCopiedLogId] = useState(null);

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 25;

  // Real-time Firestore Subscription
  useEffect(() => {
    if (userRole !== 'admin') return;

    setIsLoading(true);
    let unsubscribe = null;

    if (isLiveSync) {
      unsubscribe = logger.subscribeSystemLogs({
        limitCount: 300,
        onUpdate: (logs) => {
          setRemoteLogs(logs);
          setIsLoading(false);
        },
        onError: (err) => {
          console.warn('Real-time subscription warning:', err);
          setIsLoading(false);
        }
      });
    } else {
      logger.fetchSystemLogs({ limitCount: 300 }).then((logs) => {
        setRemoteLogs(logs);
        setIsLoading(false);
      });
    }

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, [userRole, isLiveSync]);

  // Merge remote Firestore logs with any pending un-flushed in-memory logs
  const combinedLogs = useMemo(() => {
    const memoryRing = logger.inMemoryRing || [];
    const remoteIds = new Set(remoteLogs.map(l => l.id || `${l.timestamp}_${l.requestId}`));

    const pendingLocal = memoryRing.filter(
      l => !remoteIds.has(l.id || `${l.timestamp}_${l.requestId}`)
    );

    return [...pendingLocal, ...remoteLogs];
  }, [remoteLogs]);

  // Filtered Logs
  const filteredLogs = useMemo(() => {
    return combinedLogs.filter((log) => {
      // 1. Level Filter
      if (selectedLevel !== 'ALL' && log.level !== selectedLevel) {
        return false;
      }

      // 2. Module Filter
      if (selectedModule !== 'ALL' && log.module?.toLowerCase() !== selectedModule.toLowerCase()) {
        return false;
      }

      // 3. Date Filter
      if (dateFilter !== 'all' && log.timestamp) {
        const logDate = new Date(log.timestamp);
        const now = new Date();

        if (dateFilter === 'today') {
          const isToday =
            logDate.getDate() === now.getDate() &&
            logDate.getMonth() === now.getMonth() &&
            logDate.getFullYear() === now.getFullYear();
          if (!isToday) return false;
        } else if (dateFilter === '7days') {
          const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          if (logDate < sevenDaysAgo) return false;
        } else if (dateFilter === 'custom') {
          if (customStartDate) {
            const start = new Date(customStartDate);
            start.setHours(0, 0, 0, 0);
            if (logDate < start) return false;
          }
          if (customEndDate) {
            const end = new Date(customEndDate);
            end.setHours(23, 59, 59, 999);
            if (logDate > end) return false;
          }
        }
      }

      // 4. Search Query across Message, Action, RequestId, UserId, Payload, Error
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase().trim();
        const msg = (log.message || '').toLowerCase();
        const action = (log.action || '').toLowerCase();
        const reqId = (log.requestId || '').toLowerCase();
        const userId = (log.userId || '').toLowerCase();
        const userName = (log.userName || '').toLowerCase();
        const userEmail = (log.userEmail || '').toLowerCase();
        const payloadStr = log.payload ? JSON.stringify(log.payload).toLowerCase() : '';
        const errorStr = log.error ? JSON.stringify(log.error).toLowerCase() : '';

        const match =
          msg.includes(query) ||
          action.includes(query) ||
          reqId.includes(query) ||
          userId.includes(query) ||
          userName.includes(query) ||
          userEmail.includes(query) ||
          payloadStr.includes(query) ||
          errorStr.includes(query);

        if (!match) return false;
      }

      return true;
    });
  }, [combinedLogs, selectedLevel, selectedModule, dateFilter, customStartDate, customEndDate, searchQuery]);

  // Level Counts for quick badges
  const levelCounts = useMemo(() => {
    const counts = { ALL: combinedLogs.length, FATAL: 0, ERROR: 0, WARN: 0, INFO: 0, DEBUG: 0 };
    combinedLogs.forEach((log) => {
      if (counts[log.level] !== undefined) {
        counts[log.level]++;
      }
    });
    return counts;
  }, [combinedLogs]);

  // Paginated Slice
  const totalPages = Math.max(1, Math.ceil(filteredLogs.length / itemsPerPage));
  const currentLogsPage = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredLogs.slice(start, start + itemsPerPage);
  }, [filteredLogs, currentPage]);

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, selectedLevel, selectedModule, dateFilter, customStartDate, customEndDate]);

  // Copy structured JSON to clipboard
  const handleCopyJson = (log) => {
    const content = JSON.stringify(log, null, 2);
    navigator.clipboard.writeText(content);
    setCopiedLogId(log.id || log.requestId);
    setTimeout(() => setCopiedLogId(null), 2000);
  };

  // Export JSON file
  const handleExportJson = () => {
    const jsonString = `data:text/json;charset=utf-8,${encodeURIComponent(
      JSON.stringify(filteredLogs, null, 2)
    )}`;
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', jsonString);
    downloadAnchor.setAttribute(
      'download',
      `toja_system_logs_${new Date().toISOString().slice(0, 10)}.json`
    );
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  // Export CSV file
  const handleExportCsv = () => {
    const headers = [
      'Timestamp',
      'Level',
      'RequestId',
      'User',
      'UserRole',
      'Module',
      'Action',
      'Message',
      'Payload',
      'Error'
    ];

    const rows = filteredLogs.map((log) => [
      `"${log.timestamp || ''}"`,
      `"${log.level || ''}"`,
      `"${log.requestId || ''}"`,
      `"${log.userName || log.userId || ''}"`,
      `"${log.userRole || ''}"`,
      `"${log.module || ''}"`,
      `"${log.action || ''}"`,
      `"${(log.message || '').replace(/"/g, '""')}"`,
      `"${JSON.stringify(log.payload || {}).replace(/"/g, '""')}"`,
      `"${log.error ? JSON.stringify(log.error).replace(/"/g, '""') : ''}"`
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `toja_system_logs_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    link.remove();
  };

  // Manual Buffer Flush Trigger
  const handleFlushBuffer = async () => {
    try {
      await logger.flush();
      setFlushStatus(t.bufferFlushed || 'Buffer flushed to cloud store');
      setTimeout(() => setFlushStatus(null), 3000);
    } catch {
      setFlushStatus('Failed to flush');
      setTimeout(() => setFlushStatus(null), 3000);
    }
  };

  // Level Badge Renderer
  const renderLevelBadge = (level) => {
    switch (level) {
      case LogLevel.FATAL:
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-black uppercase tracking-wider bg-rose-600 text-white shadow-sm shadow-rose-600/30">
            <Flame size={12} className="animate-pulse" /> {level}
          </span>
        );
      case LogLevel.ERROR:
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-black uppercase tracking-wider bg-red-100 text-red-700 border border-red-200">
            <AlertCircle size={12} /> {level}
          </span>
        );
      case LogLevel.WARN:
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-black uppercase tracking-wider bg-amber-100 text-amber-800 border border-amber-200">
            <AlertTriangle size={12} /> {level}
          </span>
        );
      case LogLevel.INFO:
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-black uppercase tracking-wider bg-emerald-100 text-emerald-800 border border-emerald-200">
            <Info size={12} /> {level}
          </span>
        );
      case LogLevel.DEBUG:
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-black uppercase tracking-wider bg-slate-100 text-slate-700 border border-slate-200">
            <Bug size={12} /> {level}
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-bold uppercase bg-slate-100 text-slate-700">
            {level}
          </span>
        );
    }
  };

  // Non-Admin RBAC Guard
  if (userRole !== 'admin') {
    return (
      <div dir={isRtl ? 'rtl' : 'ltr'} className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-md p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="w-full max-w-md bg-white rounded-3xl shadow-2xl p-6 sm:p-8 text-center border border-slate-100"
        >
          <div className="w-16 h-16 bg-rose-50 text-rose-500 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-rose-100 shadow-inner">
            <ShieldAlert size={32} />
          </div>
          <h2 className="text-xl font-extrabold text-[#181E1C] mb-2">{t.accessRestricted}</h2>
          <p className="text-sm text-slate-500 mb-6 leading-relaxed">
            {t.adminOnlyLogs || 'Centralized Structured Logs are restricted to Administrator roles.'}
          </p>
          <button
            onClick={onClose}
            className="w-full py-3 bg-[#181E1C] text-white rounded-2xl text-sm font-bold shadow-md hover:bg-slate-800 transition-colors"
          >
            {t.cancel || 'Close'}
          </button>
        </motion.div>
      </div>
    );
  }

  return (
    <div dir={isRtl ? 'rtl' : 'ltr'} className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 backdrop-blur-md p-2 sm:p-4 md:p-6">
      <motion.div
        initial={{ opacity: 0, y: 20, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 20, scale: 0.98 }}
        className="w-full max-w-7xl h-[94vh] bg-white rounded-3xl shadow-2xl flex flex-col overflow-hidden border border-slate-200/80"
      >
        {/* Top Header Bar */}
        <div className="bg-[#181E1C] text-white p-5 sm:p-6 flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-white/10 shrink-0">
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-2xl bg-white/10 border border-white/15 flex items-center justify-center text-white shrink-0 shadow-inner">
              <Terminal size={22} className="text-emerald-400" />
            </div>
            <div>
              <div className="flex items-center gap-2.5">
                <h2 className="text-xl font-extrabold tracking-tight text-white">{t.structuredLogs}</h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-purple-500/20 text-purple-300 border border-purple-500/30">
                  {t.roleAdmin}
                </span>
                {isLiveSync && (
                  <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                    {t.liveSync}
                  </span>
                )}
              </div>
              <p className="text-xs text-white/50 mt-0.5 font-medium">{t.centralizedLogsDesc}</p>
            </div>
          </div>

          {/* Action Buttons in Header */}
          <div className="flex items-center gap-2.5 flex-wrap justify-end">
            {/* View Switcher Tabs */}
            <div className="flex items-center bg-white/10 rounded-xl p-1 border border-white/10">
              <button
                onClick={() => setActiveTab('system')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                  activeTab === 'system' ? 'bg-white text-[#181E1C] shadow-sm' : 'text-white/70 hover:text-white'
                }`}
              >
                <Database size={13} /> {t.systemLogsTab || 'System Telemetry'}
              </button>
              <button
                onClick={() => setActiveTab('activity')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                  activeTab === 'activity' ? 'bg-white text-[#181E1C] shadow-sm' : 'text-white/70 hover:text-white'
                }`}
              >
                <Activity size={13} /> {t.activityFeedTab || 'Activity Feed'}
              </button>
            </div>

            {/* Flush Buffer Button */}
            <button
              onClick={handleFlushBuffer}
              title={t.flushBuffer}
              className="px-3 py-2 rounded-xl bg-white/10 hover:bg-white/15 text-white/90 hover:text-white text-xs font-bold transition-all border border-white/15 flex items-center gap-1.5"
            >
              <Zap size={13} className="text-amber-400" />
              <span className="hidden sm:inline">{flushStatus || t.flushBuffer}</span>
            </button>

            {/* Toggle Live Sync */}
            <button
              onClick={() => setIsLiveSync(!isLiveSync)}
              className={`px-3 py-2 rounded-xl text-xs font-bold transition-all border flex items-center gap-1.5 ${
                isLiveSync
                  ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30 hover:bg-emerald-500/30'
                  : 'bg-white/10 text-white/70 border-white/15 hover:bg-white/20'
              }`}
            >
              <RefreshCw size={13} className={isLiveSync ? 'animate-spin' : ''} />
              <span className="hidden sm:inline">{isLiveSync ? 'Pause Sync' : 'Resume'}</span>
            </button>

            {/* Export Dropdown / Buttons */}
            <button
              onClick={handleExportJson}
              className="px-3 py-2 rounded-xl bg-[#597867] hover:bg-[#4a6556] text-white text-xs font-bold transition-all shadow-sm flex items-center gap-1.5"
            >
              <Download size={13} /> JSON
            </button>
            <button
              onClick={handleExportCsv}
              className="px-3 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-bold transition-all border border-white/15 flex items-center gap-1.5"
            >
              <Download size={13} /> CSV
            </button>

            {/* Close Button */}
            <button
              onClick={onClose}
              className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-colors"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Modal Body */}
        {activeTab === 'system' ? (
          <div className="flex-1 flex flex-col overflow-hidden bg-slate-50/60">
            {/* Filter Controls Bar */}
            <div className="p-4 sm:p-5 bg-white border-b border-slate-200 flex flex-col gap-3.5 shadow-sm">
              <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
                {/* Search Bar */}
                <div className="relative flex-1">
                  <Search size={16} className={`absolute top-1/2 -translate-y-1/2 text-slate-400 ${isRtl ? 'right-3.5' : 'left-3.5'}`} />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder={t.searchLogsPlaceholder}
                    className={`w-full text-xs font-semibold rounded-2xl border border-slate-200 bg-slate-50/80 py-2.5 outline-none focus:border-[#597867] focus:bg-white focus:ring-2 focus:ring-[#597867]/20 transition-all ${
                      isRtl ? 'pr-10 pl-4' : 'pl-10 pr-4'
                    }`}
                  />
                  {searchQuery && (
                    <button
                      onClick={() => setSearchQuery('')}
                      className={`absolute top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 ${isRtl ? 'left-3' : 'right-3'}`}
                    >
                      <X size={14} />
                    </button>
                  )}
                </div>

                {/* Module Selector & Date Filters */}
                <div className="flex items-center gap-2 flex-wrap">
                  {/* Module Dropdown */}
                  <select
                    value={selectedModule}
                    onChange={(e) => setSelectedModule(e.target.value)}
                    className="text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200/80 rounded-xl px-3 py-2 border border-slate-200 outline-none focus:border-[#597867] cursor-pointer"
                  >
                    <option value="ALL">{t.allModules}</option>
                    <option value="orders">Orders</option>
                    <option value="inventory">Inventory</option>
                    <option value="finance">Finance</option>
                    <option value="crm">CRM</option>
                    <option value="auth">Auth</option>
                    <option value="system">System</option>
                  </select>

                  {/* Date Filter Dropdown */}
                  <select
                    value={dateFilter}
                    onChange={(e) => setDateFilter(e.target.value)}
                    className="text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200/80 rounded-xl px-3 py-2 border border-slate-200 outline-none focus:border-[#597867] cursor-pointer"
                  >
                    <option value="all">{t.allTime || 'All Time'}</option>
                    <option value="today">{t.today}</option>
                    <option value="7days">{t.last7Days}</option>
                    <option value="custom">{t.customRange}</option>
                  </select>

                  {/* Custom Date Pickers */}
                  {dateFilter === 'custom' && (
                    <div className="flex items-center gap-1.5">
                      <input
                        type="date"
                        value={customStartDate}
                        onChange={(e) => setCustomStartDate(e.target.value)}
                        className="text-xs font-semibold bg-white border border-slate-200 rounded-xl px-2.5 py-1.5 outline-none focus:border-[#597867]"
                      />
                      <span className="text-xs text-slate-400 font-bold">-</span>
                      <input
                        type="date"
                        value={customEndDate}
                        onChange={(e) => setCustomEndDate(e.target.value)}
                        className="text-xs font-semibold bg-white border border-slate-200 rounded-xl px-2.5 py-1.5 outline-none focus:border-[#597867]"
                      />
                    </div>
                  )}
                </div>
              </div>

              {/* Log Level Pills */}
              <div className="flex items-center gap-1.5 flex-wrap pt-1 border-t border-slate-100">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mr-1">
                  {t.logLevel}:
                </span>
                {['ALL', 'FATAL', 'ERROR', 'WARN', 'INFO', 'DEBUG'].map((level) => {
                  const count = levelCounts[level] || 0;
                  const isActive = selectedLevel === level;
                  return (
                    <button
                      key={level}
                      onClick={() => setSelectedLevel(level)}
                      className={`px-3 py-1 rounded-xl text-xs font-black tracking-wide transition-all flex items-center gap-1.5 ${
                        isActive
                          ? level === 'FATAL'
                            ? 'bg-rose-600 text-white shadow-sm'
                            : level === 'ERROR'
                            ? 'bg-red-500 text-white shadow-sm'
                            : level === 'WARN'
                            ? 'bg-amber-500 text-white shadow-sm'
                            : level === 'INFO'
                            ? 'bg-emerald-600 text-white shadow-sm'
                            : level === 'DEBUG'
                            ? 'bg-slate-700 text-white shadow-sm'
                            : 'bg-[#181E1C] text-white shadow-sm'
                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200/70 border border-slate-200/60'
                      }`}
                    >
                      <span>{level}</span>
                      <span
                        className={`text-[10px] px-1.5 py-0.2 rounded-md font-bold ${
                          isActive ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-600'
                        }`}
                      >
                        {count}
                      </span>
                    </button>
                  );
                })}

                <div className="ml-auto text-xs text-slate-500 font-medium hidden sm:block">
                  {t.filteredLogs}: <strong className="text-slate-800">{filteredLogs.length}</strong> / {combinedLogs.length}
                </div>
              </div>
            </div>

            {/* Logs List Table */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-2.5">
              {isLoading ? (
                <div className="h-64 flex flex-col items-center justify-center text-slate-400 gap-3">
                  <RefreshCw size={28} className="animate-spin text-[#597867]" />
                  <p className="text-sm font-semibold">Connecting to telemetry store...</p>
                </div>
              ) : filteredLogs.length === 0 ? (
                <div className="h-64 flex flex-col items-center justify-center text-slate-400 gap-3">
                  <Database size={36} className="text-slate-300" />
                  <p className="text-sm font-semibold">{t.noLogsFound}</p>
                </div>
              ) : (
                currentLogsPage.map((log) => {
                  const logKey = log.id || `${log.timestamp}_${log.requestId}`;
                  const isExpanded = expandedLogId === logKey;
                  const isCopied = copiedLogId === logKey;

                  return (
                    <div
                      key={logKey}
                      className={`rounded-2xl border transition-all overflow-hidden ${
                        isExpanded
                          ? 'bg-white border-[#597867]/40 shadow-md ring-1 ring-[#597867]/20'
                          : log.level === LogLevel.FATAL
                          ? 'bg-rose-50/40 border-rose-200 hover:border-rose-300'
                          : log.level === LogLevel.ERROR
                          ? 'bg-red-50/30 border-red-200 hover:border-red-300'
                          : log.level === LogLevel.WARN
                          ? 'bg-amber-50/20 border-amber-200 hover:border-amber-300'
                          : 'bg-white border-slate-200/80 hover:border-slate-300 shadow-sm'
                      }`}
                    >
                      {/* Log Row Header */}
                      <div
                        onClick={() => setExpandedLogId(isExpanded ? null : logKey)}
                        className="p-3.5 sm:p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 cursor-pointer select-none"
                      >
                        <div className="flex items-start sm:items-center gap-3 flex-1 min-w-0">
                          {/* Chevron */}
                          <button className="text-slate-400 hover:text-slate-600 mt-0.5 sm:mt-0 shrink-0">
                            {isExpanded ? <ChevronDown size={16} /> : isRtl ? <ChevronLeft size={16} /> : <ChevronRight size={16} />}
                          </button>

                          {/* Level Badge */}
                          <div className="shrink-0">{renderLevelBadge(log.level)}</div>

                          {/* Module Badge */}
                          <span className="shrink-0 text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 border border-slate-200">
                            {log.module || 'system'}
                          </span>

                          {/* Action Name */}
                          <span className="shrink-0 font-mono text-xs font-black text-slate-900 bg-slate-100/70 px-2 py-0.5 rounded">
                            {log.action}
                          </span>

                          {/* Message */}
                          <p className="text-xs font-semibold text-slate-700 truncate min-w-0 flex-1">
                            {log.message}
                          </p>
                        </div>

                        {/* Metadata Right/End */}
                        <div className="flex items-center gap-2.5 text-xs text-slate-500 shrink-0">
                          {/* User Badge */}
                          <span className="text-[11px] font-semibold text-slate-600 bg-slate-100 px-2 py-0.5 rounded-md">
                            {log.userName || log.userId || 'anon'}
                          </span>

                          {/* Timestamp */}
                          <span className="text-[11px] font-mono text-slate-400">
                            {log.timestamp ? new Date(log.timestamp).toLocaleTimeString() : ''}
                          </span>
                        </div>
                      </div>

                      {/* Collapsible Inspector Drawer */}
                      <AnimatePresence>
                        {isExpanded && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            className="border-t border-slate-100 bg-slate-900 text-slate-100 p-4 sm:p-6"
                          >
                            {/* Drawer Action Bar */}
                            <div className="flex flex-wrap items-center justify-between gap-3 mb-4 pb-3 border-b border-slate-800">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="text-xs font-mono text-emerald-400 font-bold">
                                  {log.timestamp}
                                </span>
                                <span className="text-slate-600">•</span>
                                <span className="text-xs font-mono text-slate-400">
                                  RequestId: <strong className="text-slate-200 font-bold">{log.requestId}</strong>
                                </span>
                                <span className="text-slate-600">•</span>
                                <span className="text-xs font-mono text-slate-400">
                                  Role: <strong className="text-slate-200 font-bold">{log.userRole || 'admin'}</strong>
                                </span>
                              </div>

                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleCopyJson(log);
                                }}
                                className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold transition-all flex items-center gap-1.5 border border-slate-700"
                              >
                                {isCopied ? <Check size={13} className="text-emerald-400" /> : <Copy size={13} />}
                                <span>{isCopied ? t.copied : t.copyJson}</span>
                              </button>
                            </div>

                            {/* Error Callout if Log has error */}
                            {log.error && (
                              <div className="mb-4 p-4 rounded-xl bg-red-950/60 border border-red-800 text-red-200">
                                <div className="flex items-center gap-2 font-bold text-red-300 text-xs mb-1">
                                  <AlertCircle size={15} />
                                  <span>{log.error.name || 'Error'}: {log.error.message}</span>
                                  {log.error.code && (
                                    <span className="px-1.5 py-0.5 rounded bg-red-900 text-[10px] text-red-200">
                                      {log.error.code}
                                    </span>
                                  )}
                                </div>
                                {log.error.stack && (
                                  <pre className="text-[11px] font-mono text-red-300/80 overflow-x-auto whitespace-pre-wrap mt-2 p-2 rounded bg-black/30">
                                    {log.error.stack}
                                  </pre>
                                )}
                              </div>
                            )}

                            {/* Payload JSON Inspector */}
                            <div>
                              <div className="flex items-center justify-between mb-1.5 text-xs font-bold text-slate-400 uppercase tracking-wider">
                                <span>{t.payloadContext}</span>
                                <span className="text-[10px] text-slate-500 font-mono">sanitized</span>
                              </div>
                              <div className="bg-black/60 rounded-xl p-4 font-mono text-xs overflow-x-auto border border-slate-800 text-emerald-300">
                                <pre>{JSON.stringify(log.payload || {}, null, 2)}</pre>
                              </div>
                            </div>

                            {/* Client & Correlation Meta */}
                            {log.clientInfo && (
                              <div className="mt-3 text-[11px] text-slate-500 font-mono flex items-center gap-4 flex-wrap">
                                <span>URL: {log.clientInfo.url}</span>
                                <span>UA: {log.clientInfo.userAgent?.substring(0, 60)}...</span>
                              </div>
                            )}
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  );
                })
              )}
            </div>

            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div className="p-3 sm:p-4 bg-white border-t border-slate-200 flex items-center justify-between gap-4">
                <span className="text-xs text-slate-500 font-semibold">
                  {t.page} <strong>{currentPage}</strong> {t.of} <strong>{totalPages}</strong> ({filteredLogs.length} total entries)
                </span>

                <div className="flex items-center gap-1.5">
                  <button
                    disabled={currentPage === 1}
                    onClick={() => setCurrentPage(1)}
                    className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-100 disabled:opacity-40 disabled:pointer-events-none text-slate-600 transition-colors"
                  >
                    <ChevronsLeft size={16} />
                  </button>
                  <button
                    disabled={currentPage === 1}
                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                    className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-100 disabled:opacity-40 disabled:pointer-events-none text-slate-600 transition-colors"
                  >
                    <ChevronLeft size={16} />
                  </button>
                  <button
                    disabled={currentPage === totalPages}
                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                    className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-100 disabled:opacity-40 disabled:pointer-events-none text-slate-600 transition-colors"
                  >
                    <ChevronRight size={16} />
                  </button>
                  <button
                    disabled={currentPage === totalPages}
                    onClick={() => setCurrentPage(totalPages)}
                    className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-100 disabled:opacity-40 disabled:pointer-events-none text-slate-600 transition-colors"
                  >
                    <ChevronsRight size={16} />
                  </button>
                </div>
              </div>
            )}
          </div>
        ) : (
          /* Activity Feed Human Timeline Tab */
          <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-3.5 bg-slate-50/70">
            {activityLogs.length === 0 ? (
              <div className="h-64 flex flex-col items-center justify-center text-slate-400 gap-2">
                <Activity size={32} className="text-slate-300" />
                <p className="text-sm font-semibold">No activity logs recorded yet.</p>
              </div>
            ) : (
              activityLogs.map((log) => (
                <div
                  key={log.id}
                  className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm hover:shadow-md transition-shadow flex items-start justify-between gap-4"
                >
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-xl bg-[#597867]/10 text-[#597867] flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">
                      {log.user ? log.user.charAt(0).toUpperCase() : 'U'}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-slate-900">{log.user}</span>
                        <span className="text-[10px] text-slate-400 font-mono">
                          {log.timestamp ? new Date(log.timestamp).toLocaleString() : ''}
                        </span>
                      </div>
                      <p className="text-sm text-slate-700 font-medium mt-1 leading-relaxed">
                        {log.action}
                      </p>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </motion.div>
    </div>
  );
}
