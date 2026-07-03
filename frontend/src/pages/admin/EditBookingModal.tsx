import React, { useState } from 'react';
import { Button } from '../../components/Button';
import { Input } from '../../components/Input';
import { PhoneInput } from '../../components/PhoneInput';
import { X } from 'lucide-react';

type Props = {
  booking: {
    id: string;
    customer_name: string;
    customer_phone: string;
    customer_tg_username: string;
    customer_messenger: string;
    start_date: string;
    end_date: string;
    pickup_time: string;
    quantity: number;
    total_price: number;
    prepayment: number;
    note?: string;
  };
  onClose: () => void;
  onSubmit: (data: any) => Promise<void>;
};

export const EditBookingModal: React.FC<Props> = ({ booking, onClose, onSubmit }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [name, setName] = useState(booking.customer_name || '');
  const [phone, setPhone] = useState(booking.customer_phone || '');
  const [messenger, setMessenger] = useState(booking.customer_messenger || 'telegram');
  const [tgUsername, setTgUsername] = useState(booking.customer_tg_username || '');
  const [startDate, setStartDate] = useState(booking.start_date || '');
  const [endDate, setEndDate] = useState(booking.end_date || '');
  const [pickupTime, setPickupTime] = useState(booking.pickup_time || '10:00');
  const [quantity, setQuantity] = useState(booking.quantity || 1);
  const [totalPriceStr, setTotalPriceStr] = useState(String(booking.total_price || 0));
  const [prepayment, setPrepayment] = useState(String(booking.prepayment || 0));
  const [note, setNote] = useState(booking.note || '');

  const remaining = Math.max(0, (parseFloat(totalPriceStr) || 0) - (parseFloat(prepayment) || 0));

  const handleSubmit = async () => {
    if (!name.trim()) return setError('Укажите имя');
    if (!phone.trim()) return setError('Укажите телефон');
    if (startDate > endDate) return setError('Дата окончания не может быть раньше даты начала');

    setLoading(true);
    setError('');
    try {
      await onSubmit({
        customerName: name,
        customerPhone: phone,
        customerMessenger: messenger,
        customerTgUsername: tgUsername,
        startDate,
        endDate,
        pickupTime,
        quantity,
        totalPrice: parseFloat(totalPriceStr) || 0,
        prepayment: parseFloat(prepayment) || 0,
        note
      });
      // onSubmit itself should not close, the caller should close or we close here if no error
      // onClose is called in the try block
    } catch (e: any) {
      setError(e.message || 'Ошибка сохранения');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex justify-center items-end sm:items-center z-50">
      <div className="bg-white w-full max-w-[480px] rounded-t-2xl sm:rounded-2xl p-5 flex flex-col gap-3 max-h-[92vh] overflow-y-auto" style={{ scrollbarWidth: 'none' }}>
        <div className="flex justify-between items-center mb-1">
          <h2 className="text-lg font-bold">Редактирование брони</h2>
          <button onClick={onClose} className="p-2 text-gray-400 bg-gray-100 rounded-full hover:bg-gray-200">
            <X size={18} />
          </button>
        </div>

        {error && <div className="p-3 bg-red-50 text-red-600 rounded-lg text-sm">{error}</div>}

        <Input label="Имя" value={name} onChange={e => setName(e.target.value)} />
        
        <div className="flex gap-3">
          <div className="flex-1">
            <PhoneInput label="Телефон" value={phone} onChange={setPhone} />
          </div>
          <div className="w-1/3">
            <label className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1.5 block ml-1">Мессенджер</label>
            <select
              value={messenger}
              onChange={e => setMessenger(e.target.value)}
              className="w-full h-[52px] bg-gray-50 border border-gray-200 rounded-xl px-4 text-base outline-none focus:ring-2 focus:ring-teal-400"
            >
              <option value="telegram">Telegram</option>
              <option value="wa">WhatsApp</option>
              <option value="other">Другое</option>
            </select>
          </div>
        </div>

        <Input label="Ник в Telegram" placeholder="@username" value={tgUsername} onChange={e => setTgUsername(e.target.value.startsWith('@') ? e.target.value : (e.target.value ? '@' + e.target.value : ''))} />

        <div className="flex gap-3">
          <div className="flex-1">
            <Input type="date" label="Дата выдачи" value={startDate} onChange={e => setStartDate(e.target.value)} />
          </div>
          <div className="flex-1">
            <Input type="date" label="Дата возврата" value={endDate} onChange={e => setEndDate(e.target.value)} />
          </div>
        </div>

        <div className="flex gap-3">
          <div className="flex-1 flex flex-col gap-1">
            <label className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-0.5 ml-1 block">Сапов</label>
            <div className="flex border rounded-xl overflow-hidden h-[52px]">
              <button onClick={() => setQuantity(Math.max(1, quantity - 1))} className="w-12 bg-gray-50 border-r font-bold text-gray-600 hover:bg-gray-100 active:bg-gray-200 transition-colors">−</button>
              <div className="flex-1 flex items-center justify-center font-bold text-lg">{quantity}</div>
              <button onClick={() => setQuantity(quantity + 1)} className="w-12 bg-gray-50 border-l font-bold text-gray-600 hover:bg-gray-100 active:bg-gray-200 transition-colors">+</button>
            </div>
          </div>
          <div className="flex-1">
            <Input type="time" label="Время" value={pickupTime} onChange={e => setPickupTime(e.target.value)} />
          </div>
        </div>

        <div className="border-t pt-3 mt-1">
          <label className="text-xs text-gray-500 font-medium block mb-2">💰 Оплата</label>
          <div className="flex gap-2 mb-3">
            <div className="flex-1 flex flex-col gap-1">
              <label className="text-xs text-gray-400 ml-1">Итого ₽</label>
              <input
                type="number" step="100" value={totalPriceStr}
                onChange={e => setTotalPriceStr(e.target.value)}
                className="border rounded-xl h-[52px] px-4 text-lg font-bold text-teal-700 w-full focus:outline-none focus:ring-2 focus:ring-teal-300"
              />
            </div>
            <div className="flex-1 flex flex-col gap-1">
              <label className="text-xs text-gray-400 ml-1">Предоплата ₽</label>
              <input
                type="number" step="100" value={prepayment}
                onChange={e => setPrepayment(e.target.value)}
                className="border rounded-xl h-[52px] px-4 text-lg w-full focus:outline-none focus:ring-2 focus:ring-teal-300"
              />
            </div>
          </div>
          <div className="text-sm text-gray-500 ml-1 mb-2">
            Осталось доплатить: <span className="font-bold text-orange-600">{remaining} ₽</span>
          </div>
        </div>

        <Input label="Комментарий / Заметка" placeholder="Любая дополнительная информация" value={note} onChange={e => setNote(e.target.value)} />

        <div className="mt-2">
          <Button loading={loading} onClick={handleSubmit}>Сохранить изменения</Button>
        </div>
      </div>
    </div>
  );
};
