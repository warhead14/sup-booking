import React, { useState, useEffect } from 'react';
import { Button } from '../../components/Button';
import { Input } from '../../components/Input';
import { PhoneInput } from '../../components/PhoneInput';
import { X, Plus } from 'lucide-react';

import { calculatePricing } from '../../utils/pricing';

const DEPOSIT_OPTIONS = ['Вод. удостоверение', 'Паспорт', 'СНИЛС', 'Фото паспорта', 'Деньги'];
const GEAR_OPTIONS = ['Насос', 'Жилет', 'Чехол', 'Гермомешок', 'Двойное весло', 'Эл. насос'];
const PAY_METHODS = ['Наличные', 'Карта', 'Перевод', 'QR'];

type Props = {
  date: string;
  prefill?: { 
    id?: string;
    name: string; phone: string; tgUsername?: string; quantity: number; 
    pickupTime: string; bookingId?: string; durationDays?: number;
    totalPrice?: number; prepayment?: number; paymentOnSite?: number;
    expectedReturnTime?: string; penalty?: number; paymentMethod?: string;
    depositTypes?: string[]; depositNote?: string; extraGear?: Record<string, number>;
  };
  onClose: () => void;
  onSubmit: (data: any) => Promise<void>;
  isEditing?: boolean;
  draftId?: string | null;
  password?: string;
};

function calculateReturnTime(time: string): string {
  if (!time || !time.includes(':')) return '16:30';
  const [h, m] = time.split(':').map(Number);
  if (isNaN(h) || isNaN(m)) return '16:30';
  let nm = m + 30;
  let nh = h + 6;
  if (nm >= 60) {
    nm -= 60;
    nh += 1;
  }
  nh = nh % 24;
  return `${String(nh).padStart(2, '0')}:${String(nm).padStart(2, '0')}`;
}

// We will use calculatePricing instead of calcPrice

import { apiClient } from '../../api/apiClient';

export const IssueModal: React.FC<Props> = ({ date, prefill, onClose, onSubmit, isEditing, draftId, password }) => {
  const [loading, setLoading] = useState(false);
  const [_error, setError] = useState('');
  const [name, setName] = useState(prefill?.name || '');
  const [phone, setPhone] = useState(prefill?.phone || '');
  const [tgUsername, setTgUsername] = useState(prefill?.tgUsername || '');
  const [quantity, setQuantity] = useState(prefill?.quantity || 1);
  const [pickupTime, setPickupTime] = useState(prefill?.pickupTime || '10:00');
  const [expectedReturn, setExpectedReturn] = useState(prefill?.expectedReturnTime || calculateReturnTime(prefill?.pickupTime || '10:00'));
  const [isReturnTimeManuallyEdited, setIsReturnTimeManuallyEdited] = useState(() => 
    prefill?.expectedReturnTime ? prefill.expectedReturnTime !== calculateReturnTime(prefill.pickupTime || '10:00') : false
  );
  const [durationDays] = useState(prefill?.durationDays || 1);

  const [localDate, setLocalDate] = useState(date);
  
  // Pricing calculation helper
  const getPricing = (startStr: string, qty: number, days: number) => {
    const d = new Date(startStr + 'T12:00:00');
    d.setDate(d.getDate() + days - 1);
    const endStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    return calculatePricing(startStr, endStr, qty, true);
  };

  const initialPricing = getPricing(localDate, prefill?.quantity || 1, prefill?.durationDays || 1);
  const [_totalPrice, setTotalPrice] = useState(prefill?.totalPrice ?? initialPricing.totalPrice);
  const [totalPriceStr, setTotalPriceStr] = useState(String(prefill?.totalPrice ?? initialPricing.totalPrice));
  const [prepayment, setPrepayment] = useState(String(prefill?.prepayment ?? initialPricing.prepayment));
  const [paymentOnSite, setPaymentOnSite] = useState(String(prefill?.paymentOnSite ?? ((prefill?.totalPrice ?? initialPricing.totalPrice) - (prefill?.prepayment ?? initialPricing.prepayment))));
  const [penalty, setPenalty] = useState(prefill?.penalty ? String(prefill.penalty) : '');

  const isInitialSplit = Boolean(prefill?.paymentMethod && prefill.paymentMethod.startsWith('['));
  const [isSplitMode, setIsSplitMode] = useState(isInitialSplit);
  const [splitPayments, setSplitPayments] = useState<{method: string, amount: number}[]>(() => {
    if (isInitialSplit) {
      try { return JSON.parse(prefill!.paymentMethod!); } catch { return []; }
    }
    return [];
  });
  const [paymentMethod, setPaymentMethod] = useState(!isInitialSplit ? (prefill?.paymentMethod || '') : '');
  const [splitMethod, setSplitMethod] = useState(PAY_METHODS[0]);
  const [splitAmount, setSplitAmount] = useState('');

  // Deposit
  const [depositTypes, setDepositTypes] = useState<string[]>(prefill?.depositTypes || []);
  const [depositNote, setDepositNote] = useState(prefill?.depositNote || '');

  // Gear
  const [gear, setGear] = useState<Record<string, number>>(prefill?.extraGear || {});

  // Auto-recalc total when quantity changes
  const isFirstRender = React.useRef(true);
  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    const p = getPricing(localDate, quantity, durationDays);
    setTotalPrice(p.totalPrice);
    setTotalPriceStr(String(p.totalPrice));
    setPrepayment(String(p.prepayment));
    setPaymentOnSite(String(p.totalPrice - p.prepayment));
  }, [quantity, localDate, durationDays]);

  const toggleDeposit = (d: string) => {
    setDepositTypes(prev => prev.includes(d) ? prev.filter(x => x !== d) : [...prev, d]);
  };

  const setGearQty = (g: string, qty: number) => {
    setGear(prev => {
      const next = { ...prev };
      if (qty <= 0) delete next[g]; else next[g] = qty;
      return next;
    });
  };

  const handleTotalChange = (val: string) => {
    setTotalPriceStr(val);
    const n = parseFloat(val) || 0;
    setTotalPrice(n);
    const prepayNum = parseFloat(prepayment) || 0;
    setPaymentOnSite(String(Math.max(0, n - prepayNum)));
  };

  const handlePrepaymentChange = (val: string) => {
    setPrepayment(val);
    const prepayNum = parseFloat(val) || 0;
    const totalNum = parseFloat(totalPriceStr) || 0;
    setPaymentOnSite(String(Math.max(0, totalNum - prepayNum)));
  };

  const handleSubmit = async () => {
    setLoading(true);
    setError('');
    try {
      await onSubmit({
        id: prefill?.id,
        bookingId: prefill?.bookingId || undefined,
        customerName: name || '-',
        customerPhone: phone || '-',
        customerTgUsername: tgUsername,
        quantity,
        pickupTime: pickupTime || '-',
        rentalDate: localDate,
        endDate: (() => {
          const d = new Date(localDate + 'T12:00:00');
          d.setDate(d.getDate() + durationDays - 1);
          return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
        })(),
        expectedReturnTime: expectedReturn || '-',
        prepayment: parseFloat(prepayment) || 0,
        paymentOnSite: isSplitMode ? splitPayments.reduce((s, p) => s + p.amount, 0) : (parseFloat(paymentOnSite) || 0),
        totalPrice: parseFloat(totalPriceStr) || 0,
        penalty: parseFloat(penalty) || 0,
        paymentMethod: isSplitMode ? JSON.stringify(splitPayments) : (paymentMethod || '-'),
        depositTypes,
        depositNote: depositNote || '-',
        extraGear: Object.entries(gear).map(([n, q]) => ({ name: n, qty: q }))
      });
      onClose();
    } catch (e: any) {
      setError(e.message || 'Ошибка');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveDraft = async () => {
    if (!password) return;
    setLoading(true);
    try {
      await apiClient.saveDraft(password, {
        id: draftId || undefined,
        type: 'rental',
        title: name || 'Без имени',
        payload: {
          name, phone, tgUsername, quantity, pickupTime, expectedReturnTime: expectedReturn,
          durationDays, rentalDate: localDate, totalPrice: parseFloat(totalPriceStr) || 0,
          prepayment: parseFloat(prepayment) || 0, paymentOnSite: parseFloat(paymentOnSite) || 0,
          penalty: parseFloat(penalty) || 0,
          paymentMethod: isSplitMode ? JSON.stringify(splitPayments) : paymentMethod,
          depositTypes, depositNote, extraGear: gear,
          bookingId: prefill?.bookingId
        }
      });
      onClose();
    } catch (e: any) {
      alert(`Ошибка сохранения черновика: ${e.message}`);
    } finally {
      setLoading(false);
    }
  };

  const Chip = ({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) => (
    <button
      onClick={onClick}
      className={`px-3 py-2 rounded-lg text-sm font-medium border transition-colors ${active ? 'bg-teal-600 text-white border-teal-600' : 'bg-white text-gray-600 border-gray-200 active:bg-gray-50'}`}
    >
      {label}
    </button>
  );



  return (
    <div className="fixed inset-0 bg-black/40 flex justify-center items-end sm:items-center z-50">
      <div className="bg-white w-full max-w-[480px] rounded-t-2xl sm:rounded-2xl p-5 flex flex-col gap-3 max-h-[92vh] overflow-y-auto" style={{ scrollbarWidth: 'none' }}>
        <div className="flex justify-between items-center mb-1">
          <h2 className="text-lg font-bold flex items-center gap-2">
            {isEditing ? 'Редактирование' : prefill ? 'Выдача по брони' : 'Быстрая выдача'}
            <input type="date" value={localDate} onChange={e => setLocalDate(e.target.value)} className="text-sm font-normal text-gray-500 bg-transparent outline-none cursor-pointer border-b border-dashed border-gray-300 pb-0.5" />
          </h2>
          <button onClick={onClose} className="p-2 text-gray-400 bg-gray-100 rounded-full"><X size={18}/></button>
        </div>

        {/* Removed static rate hint, as pricing is now exact per day */}

        <Input label="Имя" placeholder="Имя" value={name} onChange={e => setName(e.target.value)} />
        <div className="flex gap-3">
          <div className="flex-1">
            <PhoneInput label="Телефон" value={phone} onChange={setPhone} />
          </div>
          <div className="flex-1">
            <Input label="Telegram" placeholder="@username" value={tgUsername} onChange={e => setTgUsername(e.target.value.startsWith('@') ? e.target.value : (e.target.value ? '@' + e.target.value : ''))} />
          </div>
        </div>

        <div className="flex gap-3">
          <div className="flex-1 flex flex-col gap-1">
            <label className="text-xs text-gray-500 font-medium">Сапов</label>
            <div className="flex border rounded-lg overflow-hidden h-11">
              <button onClick={() => setQuantity(Math.max(1, quantity - 1))} className="w-10 bg-gray-50 border-r font-bold text-gray-600">−</button>
              <div className="flex-1 flex items-center justify-center font-bold">{quantity}</div>
              <button onClick={() => setQuantity(quantity + 1)} className="w-10 bg-gray-50 border-l font-bold text-gray-600">+</button>
            </div>
          </div>
          <div className="flex-1">
            <Input 
              type="time" 
              label="Время выдачи" 
              value={pickupTime} 
              onChange={e => {
                const newPickup = e.target.value;
                setPickupTime(newPickup);
                if (!isReturnTimeManuallyEdited) {
                  setExpectedReturn(calculateReturnTime(newPickup));
                }
              }} 
            />
          </div>
        </div>

        <Input 
          type="time" 
          label="Ожидаемый возврат" 
          value={expectedReturn} 
          onChange={e => {
            setExpectedReturn(e.target.value);
            setIsReturnTimeManuallyEdited(true);
          }} 
        />

        {/* Pricing section */}
        <div className="border-t pt-3 mt-1">
          <label className="text-xs text-gray-500 font-medium block mb-2">💰 Оплата</label>
          <div className="flex gap-2 mb-3">
            <div className="flex-1 flex flex-col gap-1">
              <label className="text-xs text-gray-400">Итого ₽</label>
              <input
                type="number"
                step="100"
                value={totalPriceStr}
                onChange={e => handleTotalChange(e.target.value)}
                className="border rounded-lg h-11 px-3 text-base font-bold text-teal-700 w-full focus:outline-none focus:ring-2 focus:ring-teal-300"
                placeholder="₽"
              />
            </div>
            <div className="flex-1 flex flex-col gap-1">
              <label className="text-xs text-gray-400">Предоплата ₽</label>
              <input
                type="number"
                step="100"
                value={prepayment}
                onChange={e => handlePrepaymentChange(e.target.value)}
                className="border rounded-lg h-11 px-3 text-base w-full focus:outline-none focus:ring-2 focus:ring-teal-300"
                placeholder="₽"
              />
            </div>
          </div>
          <div className="flex gap-2">
            <div className="flex-1 flex flex-col gap-1">
              <label className="text-xs text-gray-400">Доплата на месте ₽</label>
              <input
                type="number"
                step="100"
                value={paymentOnSite}
                onChange={e => setPaymentOnSite(e.target.value)}
                className="border rounded-lg h-11 px-3 text-base w-full focus:outline-none focus:ring-2 focus:ring-teal-300"
                placeholder="₽"
              />
            </div>
            <div className="flex-1 flex flex-col gap-1">
              <label className="text-xs text-gray-400">Штраф / потеря ₽</label>
              <input
                type="number"
                step="100"
                value={penalty}
                onChange={e => setPenalty(e.target.value)}
                className="border rounded-lg h-11 px-3 text-base w-full focus:outline-none focus:ring-2 focus:ring-teal-300"
                placeholder="0"
              />
            </div>
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="text-xs text-gray-500 font-medium">Способ оплаты</label>
            <button 
              className="text-xs text-teal-600 font-bold active:text-teal-700"
              onClick={() => setIsSplitMode(!isSplitMode)}
            >
              {isSplitMode ? 'Обычная оплата' : 'Раздельная оплата'}
            </button>
          </div>

          {!isSplitMode ? (
            <div className="flex flex-wrap gap-2">
              {PAY_METHODS.map(m => <Chip key={m} label={m} active={paymentMethod === m} onClick={() => setPaymentMethod(paymentMethod === m ? '' : m)} />)}
            </div>
          ) : (
            <div className="flex flex-col gap-3 bg-gray-50 p-3 rounded-xl border border-gray-100">
              {splitPayments.length > 0 && (
                <div className="flex flex-col gap-2 mb-1">
                  {splitPayments.map((sp, idx) => (
                    <div key={idx} className="flex justify-between items-center text-sm bg-white p-2 rounded-lg border shadow-sm">
                      <div><span className="font-bold text-gray-700">{sp.method}</span> • {sp.amount} ₽</div>
                      <button onClick={() => setSplitPayments(prev => prev.filter((_, i) => i !== idx))} className="text-red-400 p-1 bg-red-50 rounded active:bg-red-100"><X size={14}/></button>
                    </div>
                  ))}
                  <div className="flex justify-between items-center mt-1 pt-2 border-t border-gray-200 text-sm">
                    <span className="text-gray-500">Оплачено:</span>
                    <span className="font-bold text-teal-600">{splitPayments.reduce((s, p) => s + p.amount, 0)} ₽</span>
                  </div>
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-gray-500">Осталось доплатить:</span>
                    <span className="font-bold text-orange-600">{Math.max(0, (parseFloat(paymentOnSite) || 0) - splitPayments.reduce((s, p) => s + p.amount, 0))} ₽</span>
                  </div>
                </div>
              )}
              
              <div className="flex gap-2">
                <select 
                  className="bg-white border rounded-lg px-2 text-sm focus:ring-2 focus:ring-teal-300 outline-none"
                  value={splitMethod} onChange={e => setSplitMethod(e.target.value)}
                >
                  {PAY_METHODS.map(m => <option key={m} value={m}>{m}</option>)}
                </select>
                <input 
                  type="number" step="100" placeholder="Сумма" 
                  value={splitAmount} onChange={e => setSplitAmount(e.target.value)}
                  className="bg-white border rounded-lg px-3 py-2 text-sm flex-1 focus:ring-2 focus:ring-teal-300 outline-none w-full min-w-0"
                />
                <button 
                  onClick={() => {
                    const amt = parseFloat(splitAmount);
                    if (amt > 0) {
                      setSplitPayments([...splitPayments, { method: splitMethod, amount: amt }]);
                      setSplitAmount('');
                    }
                  }}
                  className="bg-teal-500 text-white font-bold w-10 shrink-0 rounded-lg flex items-center justify-center shadow-sm active:bg-teal-600"
                >
                  <Plus size={18}/>
                </button>
              </div>
            </div>
          )}
        </div>

        <div className="border-t pt-3 mt-1">
          <label className="text-xs text-gray-500 font-medium block mb-2">🔐 Залог</label>
          <div className="flex flex-wrap gap-2 mb-2">
            {DEPOSIT_OPTIONS.map(d => <Chip key={d} label={d} active={depositTypes.includes(d)} onClick={() => toggleDeposit(d)} />)}
          </div>
          <Input label="" placeholder="Примечание к залогу (напр. 5000₽)" value={depositNote} onChange={e => setDepositNote(e.target.value)} />
        </div>

        <div className="border-t pt-3 mt-1">
          <label className="text-xs text-gray-500 font-medium block mb-2">🎒 Доп. инвентарь</label>
          <div className="flex flex-col gap-2">
            {GEAR_OPTIONS.map(g => {
              const qty = gear[g] || 0;
              return (
                <div key={g} className="flex items-center justify-between bg-gray-50 rounded-lg px-3 py-2">
                  <span className="text-sm">{g}</span>
                  <div className="flex items-center gap-2">
                    {qty > 0 && <button onClick={() => setGearQty(g, qty - 1)} className="w-8 h-8 bg-white border rounded font-bold text-gray-500">−</button>}
                    <span className={`w-6 text-center font-bold ${qty > 0 ? 'text-teal-600' : 'text-gray-400'}`}>{qty}</span>
                    <button onClick={() => setGearQty(g, qty + 1)} className="w-8 h-8 bg-white border rounded font-bold text-gray-500">+</button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>


        <div className="flex gap-2">
          {!isEditing && (
            <Button loading={loading} onClick={handleSaveDraft} className="!w-auto px-5 bg-white border border-gray-300 !text-gray-500 hover:!text-teal-base hover:border-teal-base hover:bg-teal-50/30 !text-sm !font-medium">В черновики</Button>
          )}
          <Button loading={loading} onClick={handleSubmit} className="flex-1">{isEditing ? 'Сохранить изменения' : 'Выдать'}</Button>
        </div>
      </div>
    </div>
  );
};
