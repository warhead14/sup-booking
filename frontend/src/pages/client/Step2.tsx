import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useBookingStore } from '../../store/bookingStore';
import { formatRangeUI } from '../../utils/dateFormatter';
import { calculatePricing } from '../../utils/pricing';
import { apiClient } from '../../api/apiClient';
import { Button } from '../../components/Button';
import { Input } from '../../components/Input';
import { PhoneInput } from '../../components/PhoneInput';
import { Select } from '../../components/Select';
import { ArrowLeft } from 'lucide-react';

export const Step2: React.FC = () => {
  const navigate = useNavigate();
  const store = useBookingStore();
  
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [messenger, setMessenger] = useState('telegram');
  const [tgUsername, setTgUsername] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Protect against entering Step2 directly
  if (!store.availableQuantity) {
    navigate('/');
    return null;
  }

  const pricing = calculatePricing(store.startDate, store.endDate, store.quantity);

  const getSupWord = (q: number) => {
    const mod10 = q % 10;
    const mod100 = q % 100;
    if (mod10 === 1 && mod100 !== 11) return 'сапборд';
    if (mod10 >= 2 && mod10 <= 4 && (mod100 < 10 || mod100 >= 20)) return 'сапборда';
    return 'сапбордов';
  };

  // 18 chars is exactly "+7 (XXX) XXX-XX-XX"
  const isValid = name.length >= 2 && phone.length === 18;

  const handleSubmit = async () => {
    if (!isValid) return;
    setLoading(true);
    setError('');
    
    try {
      const res = await apiClient.createBooking({
        fullName: name,
        phone,
        messenger,
        tgUsername: messenger === 'telegram' ? tgUsername.replace('@', '') : '',
        startDate: store.startDate,
        endDate: store.endDate,
        pickupTime: store.pickupTime,
        quantity: store.quantity,
        totalPrice: pricing.totalPrice,
        prepayment: pricing.prepayment
      });
      
      if (res.paymentUrl) {
        window.location.href = res.paymentUrl;
      } else {
        // Fallback if payment initialization fails or is skipped for some reason
        navigate('/step3');
      }
    } catch (err: any) {
      setError(err.message || 'Ошибка сети');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center gap-3">
        <button onClick={() => navigate('/')} className="w-10 h-10 flex border rounded-full items-center justify-center text-gray-500 active:bg-gray-100">
          <ArrowLeft size={20} />
        </button>
        <h1 className="text-2xl font-bold">Ваши контакты</h1>
      </div>

      <div className="p-3 bg-gray-100/50 rounded-lg text-sm text-gray-700 flex flex-col gap-1">
        <div className="font-semibold">{formatRangeUI(store.startDate, store.endDate)}</div>
        <div className="text-gray-500">
          {store.pickupTime} <span className="mx-1">•</span> {store.quantity} {getSupWord(store.quantity)}
        </div>
      </div>

      <div className="flex flex-col gap-4">
        <Input 
          label="Имя и фамилия" 
          placeholder="Иван Иванов" 
          value={name} 
          onChange={(e) => setName(e.target.value)} 
        />
        <PhoneInput 
          label="Телефон" 
          value={phone} 
          onChange={setPhone} 
        />
        <Select 
          label="Удобный мессенджер" 
          value={messenger}
          onChange={(e) => setMessenger(e.target.value)}
          options={[
            { value: 'telegram', label: 'Telegram' },
            { value: 'max', label: 'Макс' },
            { value: 'other', label: 'Другой' }
          ]} 
        />

        <div className={`flex flex-col gap-1 overflow-hidden transition-all duration-300 ${messenger === 'telegram' ? 'max-h-32 opacity-100 mt-2' : 'max-h-0 opacity-0'}`}>
          <label className="text-sm text-gray-500 font-medium">Ник в Telegram</label>
          <div className="relative">
            <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 font-medium">@</span>
            <input 
              className="h-12 w-full px-3.5 pl-8 rounded-lg border border-gray-200 outline-none transition-all focus:border-teal-base focus:ring-1 focus:ring-teal-base focus:ring-inset text-sm"
              placeholder="Необязательно, но так нам проще связаться"
              value={tgUsername}
              onChange={(e) => setTgUsername(e.target.value.replace('@', ''))}
            />
          </div>
        </div>
      </div>

      {error && <div className="text-red-500 text-sm text-center">{error}</div>}

      <div className="p-4 bg-teal-50 border border-teal-100 rounded-xl flex flex-col gap-3">
        <div className="flex justify-between items-center text-teal-900 text-sm">
          <span>Итого</span>
          <span className="font-bold">{pricing.totalPrice.toLocaleString('ru')} ₽</span>
        </div>
        <div className="flex justify-between items-center text-teal-900 text-sm">
          <span>Сейчас к оплате</span>
          <span className="font-bold">{pricing.prepayment.toLocaleString('ru')} ₽</span>
        </div>
        <div className="flex justify-between items-center text-teal-900 text-sm border-t border-teal-200/50 pt-2">
          <span className="font-medium">Остаток при получении</span>
          <span className="font-bold text-lg">{(pricing.totalPrice - pricing.prepayment).toLocaleString('ru')} ₽</span>
        </div>
      </div>

      <div className="mt-8 flex flex-col gap-3">
        <Button onClick={handleSubmit} disabled={!isValid} loading={loading}>
          Оплатить {pricing.prepayment.toLocaleString('ru')} ₽
        </Button>
        <div className="text-xs text-gray-500 text-center leading-relaxed">
          После оплаты бронь подтвердится автоматически.
        </div>
      </div>
    </div>
  );
};
