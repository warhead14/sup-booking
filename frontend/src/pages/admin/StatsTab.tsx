import React, { useState, useEffect, useCallback } from 'react';
import { apiClient } from '../../api/apiClient';
import { formatRangeUI } from '../../utils/dateFormatter';
import { ChevronLeft, ChevronRight, Download } from 'lucide-react';

type Period = 'day' | 'week' | 'month' | 'custom';

function formatLocalYYYYMMDD(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

const MONTHS_SHORT = ['Янв', 'Фев', 'Мар', 'Апр', 'Май', 'Июнь', 'Июль', 'Авг', 'Сент.', 'Окт', 'Ноя', 'Дек'];
const MONTHS_FULL = ['Января', 'Февраля', 'Марта', 'Апреля', 'Мая', 'Июня', 'Июля', 'Августа', 'Сентября', 'Октября', 'Ноября', 'Декабря'];

function formatDayHuman(date: Date): string {
  const day = date.getDate();
  const month = MONTHS_SHORT[date.getMonth()];
  const dayNames = ['Воскресенье', 'Понедельник', 'Вторник', 'Среда', 'Четверг', 'Пятница', 'Суббота'];
  return `${day} ${month}, ${dayNames[date.getDay()]}`;
}

function formatRangeHuman(start: Date, end: Date): string {
  const d1 = start.getDate();
  const m1 = start.getMonth();
  const d2 = end.getDate();
  const m2 = end.getMonth();

  if (m1 === m2) {
    const monthLabel = (m1 === 5 || m1 === 6) ? MONTHS_FULL[m1] : MONTHS_SHORT[m1];
    return `${d1} — ${d2} ${monthLabel}`;
  }
  const monthLabel1 = (m1 === 5 || m1 === 6) ? MONTHS_FULL[m1] : MONTHS_SHORT[m1];
  const monthLabel2 = (m2 === 5 || m2 === 6) ? MONTHS_FULL[m2] : MONTHS_SHORT[m2];
  return `${d1} ${monthLabel1} — ${d2} ${monthLabel2}`;
}

function getPeriodRange(period: Period, date: Date, customRange?: { start: string, end: string }): { start: string; end: string; label: string } {
  if (period === 'custom' && customRange) {
    return { start: customRange.start, end: customRange.end, label: 'Период' };
  }
  
  if (period === 'day') {
    const s = formatLocalYYYYMMDD(date);
    return { start: s, end: s, label: formatDayHuman(date) };
  }
  if (period === 'week') {
    const day = date.getDay();
    const mon = new Date(date);
    mon.setDate(date.getDate() - (day === 0 ? 6 : day - 1));
    const sun = new Date(mon);
    sun.setDate(mon.getDate() + 6);
    
    return { 
      start: formatLocalYYYYMMDD(mon), 
      end: formatLocalYYYYMMDD(sun), 
      label: formatRangeHuman(mon, sun) 
    };
  }
  // month
  const start = new Date(date.getFullYear(), date.getMonth(), 1);
  const end = new Date(date.getFullYear(), date.getMonth() + 1, 0);
  
  const monthNames = ['Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь', 'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'];
  return { start: formatLocalYYYYMMDD(start), end: formatLocalYYYYMMDD(end), label: `${monthNames[date.getMonth()]} ${date.getFullYear()}` };
}

type StatsData = {
  totalIncome: number;
  totalPrepayment: number;
  totalOnSite: number;
  totalPenalty: number;
  totalSups: number;
  rentalCount: number;
  gearTotals: Record<string, number>;
  incomeList?: { id: string, name: string, sum: number, sups: number, days: number }[];
  rentalList?: { id: string, name: string, sups: number, days: number }[];
  prepaymentList?: { id: string, name: string, sum: number, time: string }[];
  onSiteList?: { id: string, name: string, sum: number, time: string, method: string }[];
  onSiteBreakdown?: Record<string, number>;
};

const GEAR_EMOJI: Record<string, string> = {
  'Насос': '🌬️', 'Жилет': '🦺', 'Чехол': '📱',
  'Гермомешок': '🎒', 'Двойное весло': '🚣', 'Эл. насос': '⚡'
};

type Props = { password: string };

export const StatsTab: React.FC<Props> = ({ password }) => {
  const [period, setPeriod] = useState<Period>('day');
  const [currentDate, setCurrentDate] = useState(new Date());
  const [customRange, setCustomRange] = useState({ start: formatLocalYYYYMMDD(new Date()), end: formatLocalYYYYMMDD(new Date()) });
  const [stats, setStats] = useState<StatsData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  const [expandedCard, setExpandedCard] = useState<string | null>(null);

  const { start, end, label } = getPeriodRange(period, currentDate, customRange);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await apiClient.getStats(password, start, end);
      setStats(data);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [password, start, end]);

  useEffect(() => { load(); }, [load]);

  const navigate = (dir: 'prev' | 'next') => {
    const d = new Date(currentDate);
    const amount = dir === 'prev' ? -1 : 1;
    if (period === 'day') d.setDate(d.getDate() + amount);
    else if (period === 'week') d.setDate(d.getDate() + amount * 7);
    else if (period === 'month') d.setMonth(d.getMonth() + amount);
    setCurrentDate(d);
  };

  const StatCard = ({ label, value, sub, color, cardId, listData, renderItem }: { label: string; value: string; sub?: string; color?: string; cardId?: string; listData?: any[]; renderItem?: (item: any, idx: number) => React.ReactNode }) => {
    const isExpanded = expandedCard === cardId;
    const canExpand = cardId && listData && listData.length > 0;
    
    return (
      <div 
        className={`bg-white rounded-xl border shadow-sm p-4 flex flex-col gap-1 ${canExpand ? 'cursor-pointer active:bg-gray-50' : ''}`}
        onClick={() => {
          if (canExpand) {
            setExpandedCard(isExpanded ? null : cardId);
          }
        }}
      >
        <div className="flex justify-between items-start">
          <div className="text-xs text-gray-500">{label}</div>
          {canExpand && <div className="text-xs text-gray-400">{isExpanded ? 'Скрыть' : 'Детали'}</div>}
        </div>
        <div className={`text-2xl font-bold ${color || 'text-gray-800'}`}>{value}</div>
        {sub && <div className="text-xs text-gray-400">{sub}</div>}
        
        {isExpanded && listData && (
          <div className="mt-3 pt-3 border-t border-gray-100 flex flex-col gap-2">
            {listData.map((item, idx) => renderItem ? renderItem(item, idx) : null)}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="flex flex-col gap-4">
      {/* Period selector */}
      <div className="flex bg-gray-100 rounded-xl p-1 gap-1">
        {(['day', 'week', 'month', 'custom'] as Period[]).map(p => (
          <button
            key={p}
            onClick={() => setPeriod(p)}
            className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-colors ${period === p ? 'bg-white shadow text-gray-800' : 'text-gray-500'}`}
          >
            {p === 'day' ? 'День' : p === 'week' ? 'Нед' : p === 'month' ? 'Мес' : 'Свой'}
          </button>
        ))}
      </div>

      {period === 'custom' ? (
        <div className="flex gap-2 items-end">
          <div className="flex-1">
            <label className="text-[10px] text-gray-400 ml-1">От</label>
            <input type="date" value={customRange.start} onChange={e => setCustomRange({...customRange, start: e.target.value})} className="w-full bg-white border rounded-lg p-2 text-sm" />
          </div>
          <div className="flex-1">
            <label className="text-[10px] text-gray-400 ml-1">До</label>
            <input type="date" value={customRange.end} onChange={e => setCustomRange({...customRange, end: e.target.value})} className="w-full bg-white border rounded-lg p-2 text-sm" />
          </div>
        </div>
      ) : (
        <div className="flex justify-between items-center bg-white p-3 rounded-xl shadow-sm border">
          <button className="p-1 text-gray-500 active:bg-gray-100 rounded" onClick={() => navigate('prev')}><ChevronLeft size={24} /></button>
          <div className="flex flex-col items-center">
            <div className="font-bold text-sm text-gray-800">{label}</div>
            {period === 'month' && <div className="text-[10px] text-gray-400 font-medium tracking-tight">{formatRangeUI(start, end)}</div>}
          </div>
          <button className="p-1 text-gray-500 active:bg-gray-100 rounded" onClick={() => navigate('next')}><ChevronRight size={24} /></button>
        </div>
      )}

      <button 
        onClick={() => {
          const url = `${(import.meta as any).env.VITE_API_BASE_URL || 'http://localhost:3000/api'}/admin/stats/export?startDate=${start}&endDate=${end}&password=${password}`;
          // Since it's a file download and we need to pass the password header, 
          // we can either use a direct link (if the backend supports password in query) 
          // or use fetch and create a blob.
          // Let's use fetch to keep the auth header consistent.
          fetch(url, {
            headers: { 'x-admin-password': password }
          })
          .then(res => res.blob())
          .then(blob => {
            const link = document.createElement('a');
            link.href = window.URL.createObjectURL(blob);
            link.download = `stats_${start}_${end}.csv`;
            link.click();
          });
        }}
        className="flex items-center justify-center gap-2 w-full py-3 bg-gray-100 text-gray-700 rounded-xl text-sm font-bold hover:bg-gray-200 transition-colors"
      >
        <Download size={18} />
        Экспортировать в CSV
      </button>

      {loading && <div className="text-center text-gray-400 py-10">Загрузка...</div>}
      {error && <div className="text-red-500 text-sm text-center">{error}</div>}

      {!loading && stats && (
        <>
          {/* Main income cards */}
          <div className="grid grid-cols-2 gap-3">
            <StatCard 
              label="Общий доход" 
              value={`${stats.totalIncome.toLocaleString('ru')} ₽`} 
              color="text-teal-600" 
              cardId="income"
              listData={stats.incomeList}
              renderItem={(item) => (
                <div key={item.id} className="flex justify-between items-center text-sm">
                  <div className="font-medium truncate mr-2">{item.name}</div>
                  <div className="text-right whitespace-nowrap">
                    <div className="font-bold">{item.sum.toLocaleString('ru')} ₽</div>
                    <div className="text-[10px] text-gray-400">{item.sups} сап / {item.days} дн.</div>
                  </div>
                </div>
              )}
            />
            
            <StatCard 
              label="Выдач сапов" 
              value={String(stats.rentalCount)} 
              sub={`${stats.totalSups} шт.`} 
              cardId="rentals"
              listData={stats.rentalList}
              renderItem={(item) => (
                <div key={item.id} className="flex justify-between items-center text-sm">
                  <div className="font-medium truncate mr-2">{item.name}</div>
                  <div className="text-right text-gray-500 text-xs whitespace-nowrap">
                    {item.sups} шт. на {item.days} дн.
                  </div>
                </div>
              )}
            />
            
            <StatCard 
              label="Предоплаты" 
              value={`${stats.totalPrepayment.toLocaleString('ru')} ₽`} 
              color="text-blue-600" 
              cardId="prepayment"
              listData={stats.prepaymentList}
              renderItem={(item, idx) => (
                <div key={`${item.id}-${idx}`} className="flex justify-between items-center text-sm">
                  <div className="font-medium truncate mr-2">{item.name}</div>
                  <div className="font-bold text-blue-600 whitespace-nowrap">{item.sum.toLocaleString('ru')} ₽</div>
                </div>
              )}
            />
            
            <StatCard 
              label="Доплаты на месте" 
              value={`${stats.totalOnSite.toLocaleString('ru')} ₽`} 
              color="text-orange-600" 
              cardId="onSite"
              listData={stats.onSiteBreakdown ? Object.entries(stats.onSiteBreakdown).filter(([_, sum]) => sum > 0) : undefined}
              renderItem={([method, sum], _idx) => (
                <div key={method} className="flex justify-between items-center text-sm">
                  <div className="font-medium truncate mr-2">{method}</div>
                  <div className="font-bold text-orange-600 whitespace-nowrap">{Number(sum).toLocaleString('ru')} ₽</div>
                </div>
              )}
            />
          </div>

          {stats.totalPenalty > 0 && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-4">
              <div className="text-xs text-red-400 mb-1">Штрафы / потери</div>
              <div className="text-2xl font-bold text-red-600">{stats.totalPenalty.toLocaleString('ru')} ₽</div>
            </div>
          )}

          {/* Gear stats */}
          {Object.keys(stats.gearTotals).length > 0 && (
            <div className="bg-white rounded-xl border shadow-sm p-4">
              <div className="text-xs text-gray-500 font-medium mb-3">🎒 Доп. инвентарь</div>
              <div className="flex flex-col gap-2">
                {Object.entries(stats.gearTotals).map(([name, qty]) => (
                  <div key={name} className="flex justify-between items-center">
                    <span className="text-sm">{GEAR_EMOJI[name] || '📦'} {name}</span>
                    <span className="font-bold text-teal-600">{qty} шт.</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {stats.rentalCount === 0 && (
            <div className="text-center text-gray-400 py-6">Нет выдач за этот период</div>
          )}
        </>
      )}
    </div>
  );
};
