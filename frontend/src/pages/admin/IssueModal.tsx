import React, { useState, useEffect } from 'react';
import { Button } from '../../components/Button';
import { Input } from '../../components/Input';
import { PhoneInput } from '../../components/PhoneInput';
import { X } from 'lucide-react';
import { formatDateUI } from '../../utils/dateFormatter';
import { calculatePricing } from '../../utils/pricing';

const DEPOSIT_OPTIONS = ['Вод. удостоверение', 'Паспорт', 'СНИЛС', 'Фото паспорта', 'Деньги'];
const GEAR_OPTIONS = ['Насос', 'Жилет', 'Чехол', 'Гермомешок', 'Двойное весло', 'Эл. насос'];
const PAY_METHODS = ['Наличные', 'Карта', 'Перевод', 'QR'];

type Props = {
  date: string;
  prefill?: { name: string; phone: string; tgUsername?: string; quantity: number; pickupTime: string; bookingId: string; durationDays?: number, totalPrice?: number, prepayment?: number };
  onClose: () => void;
  onSubmit: (data: any) => Promise<void>;
};

function addHours(time: string, hours: number): string {
  const [h, m] = time.split(':').map(Number);
  const nh = (h + hours) % 24;
  return `${String(nh).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

// We will use calculatePricing instead of calcPrice

export const IssueModal: React.FC<Props> = ({ date, prefill, onClose, onSubmit }) => {
  const [loading, setLoading] = useState(false);
  const [_error, setError] = useState('');
  const [name, setName] = useState(prefill?.name || '');
  const [phone, setPhone] = useState(prefill?.phone || '');
  const [tgUsername, setTgUsername] = useState(prefill?.tgUsername || '');
  const [quantity, setQuantity] = useState(prefill?.quantity || 1);
  const [pickupTime, setPickupTime] = useState(prefill?.pickupTime || '10:00');
  const [expectedReturn, setExpectedReturn] = useState(addHours(prefill?.pickupTime || '10:00', 7));
  const [durationDays] = useState(prefill?.durationDays || 1);

  // Pricing calculation helper
  const getPricing = (startStr: string, qty: number, days: number) => {
    const d = new Date(startStr + 'T12:00:00');
    d.setDate(d.getDate() + days - 1);
    const endStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    return calculatePricing(startStr, endStr, qty);
  };

  const initialPricing = getPricing(date, prefill?.quantity || 1, prefill?.durationDays || 1);
  const [_totalPrice, setTotalPrice] = useState(prefill?.totalPrice ?? initialPricing.totalPrice);
  const [totalPriceStr, setTotalPriceStr] = useState(String(prefill?.totalPrice ?? initialPricing.totalPrice));
  const [prepayment, setPrepayment] = useState(String(prefill?.prepayment ?? initialPricing.prepayment));
  const [paymentOnSite, setPaymentOnSite] = useState(String((prefill?.totalPrice ?? initialPricing.totalPrice) - (prefill?.prepayment ?? initialPricing.prepayment)));
  const [penalty, setPenalty] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('');

  // Deposit
  const [depositTypes, setDepositTypes] = useState<string[]>([]);
  const [depositNote, setDepositNote] = useState('');

  // Gear
  const [gear, setGear] = useState<Record<string, number>>({});

  // Auto-recalc total when quantity changes
  const isFirstRender = React.useRef(true);
  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    const p = getPricing(date, quantity, durationDays);
    setTotalPrice(p.totalPrice);
    setTotalPriceStr(String(p.totalPrice));
    setPrepayment(String(p.prepayment));
    setPaymentOnSite(String(p.totalPrice - p.prepayment));
  }, [quantity, date, durationDays]);

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

  const handleTotalChange = (v: string) => {
    setTotalPriceStr(v);
    const n = parseFloat(v) || 0;
    setTotalPrice(n);
    setPrepayment(String(Math.round(n / 2)));
    setPaymentOnSite(String(Math.round(n / 2)));
  };

  const handleSubmit = async () => {
    setLoading(true);
    setError('');
    try {
      await onSubmit({
        bookingId: prefill?.bookingId || undefined,
        customerName: name || '-',
        customerPhone: phone || '-',
        customerTgUsername: tgUsername,
        quantity,
        pickupTime: pickupTime || '-',
        rentalDate: date,
        endDate: (() => {
          const d = new Date(date + 'T12:00:00');
          d.setDate(d.getDate() + durationDays - 1);
          return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
        })(),
        expectedReturnTime: expectedReturn || '-',
        prepayment: parseFloat(prepayment) || 0,
        paymentOnSite: parseFloat(paymentOnSite) || 0,
        totalPrice: parseFloat(totalPriceStr) || 0,
        penalty: parseFloat(penalty) || 0,
        paymentMethod: paymentMethod || '-',
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
          <h2 className="text-lg font-bold">
            {prefill ? 'Выдача по брони' : 'Быстрая выдача'}{' '}
            <span className="text-gray-400 text-sm font-normal">({formatDateUI(date)})</span>
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
            <Input type="time" label="Время выдачи" value={pickupTime} onChange={e => setPickupTime(e.target.value)} />
          </div>
        </div>

        <Input type="time" label="Ожидаемый возврат" value={expectedReturn} onChange={e => setExpectedReturn(e.target.value)} />

        {/* Pricing section */}
        <div className="border-t pt-3 mt-1">
          <label className="text-xs text-gray-500 font-medium block mb-2">💰 Оплата</label>
          <div className="flex gap-2 mb-3">
            <div className="flex-1 flex flex-col gap-1">
              <label className="text-xs text-gray-400">Итого ₽</label>
              <input
                type="number"
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
                value={prepayment}
                onChange={e => setPrepayment(e.target.value)}
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
                value={penalty}
                onChange={e => setPenalty(e.target.value)}
                className="border rounded-lg h-11 px-3 text-base w-full focus:outline-none focus:ring-2 focus:ring-teal-300"
                placeholder="0"
              />
            </div>
          </div>
        </div>

        <div>
          <label className="text-xs text-gray-500 font-medium block mb-2">Способ оплаты</label>
          <div className="flex flex-wrap gap-2">
            {PAY_METHODS.map(m => <Chip key={m} label={m} active={paymentMethod === m} onClick={() => setPaymentMethod(paymentMethod === m ? '' : m)} />)}
          </div>
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


        <Button loading={loading} onClick={handleSubmit}>Выдать</Button>
      </div>
    </div>
  );
};
