import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useBookingStore } from '../../store/bookingStore';
import { apiClient } from '../../api/apiClient';
import { Button } from '../../components/Button';
import { Input } from '../../components/Input';
import { Select } from '../../components/Select';
import { Stepper } from '../../components/Stepper';

const MONTHS_GENITIVE = ['января', 'февраля', 'марта', 'апреля', 'мая', 'июня', 'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря'];

const formatClientDate = (dateStr: string) => {
  if (!dateStr) return '';
  const parts = dateStr.split('-');
  if (parts.length !== 3) return dateStr;
  const day = parseInt(parts[2], 10);
  const month = MONTHS_GENITIVE[parseInt(parts[1], 10) - 1];
  return `${day} ${month}`;
};

function getPlural(n: number, one: string, two: string, five: string) {
  let x = Math.abs(n) % 100;
  let y = x % 10;
  if (x > 10 && x < 20) return five;
  if (y > 1) {
    if (y < 5) return two;
    return five;
  }
  if (y === 1) return one;
  return five;
}

const generateTimeSlots = () => {
  const slots = [];
  for (let h = 9; h <= 22; h++) {
    slots.push(`${h.toString().padStart(2, '0')}:00`);
    if (h !== 22) slots.push(`${h.toString().padStart(2, '0')}:30`);
  }
  return slots.map(v => ({ value: v, label: v }));
};

export const Step1: React.FC = () => {
  const navigate = useNavigate();
  const store = useBookingStore();
  const [loading, setLoading] = useState(false);
  const [apiError, setApiError] = useState(false);

  // Default to today
  useEffect(() => {
    if (!store.startDate) {
      // Create 'YYYY-MM-DD' formatted date exactly in UTC+7 (Krasnoyarsk)
      const dateFormatter = new Intl.DateTimeFormat('en-CA', { 
        timeZone: 'Asia/Krasnoyarsk', 
        year: 'numeric', 
        month: '2-digit', 
        day: '2-digit' 
      });
      const str = dateFormatter.format(new Date());
      store.setDates(str, str);
    }
  }, []);

  // Effect to check availability whenever dates change
  useEffect(() => {
    if (!store.startDate || !store.endDate) return;
    
    setLoading(true);
    setApiError(false);
    
    apiClient.checkAvailability(store.startDate, store.endDate)
      .then(qty => {
        store.setAvailableQuantity(qty);
        if (store.quantity > qty && qty > 0) store.setQuantity(qty);
        if (qty === 0) store.setQuantity(1); // will be blocked anyway
      })
      .catch(() => {
        setApiError(true);
        store.setAvailableQuantity(null);
      })
      .finally(() => setLoading(false));
  }, [store.startDate, store.endDate]);

  const isValid = !apiError && store.availableQuantity !== null && store.availableQuantity > 0 && store.quantity <= store.availableQuantity;

  const durationDays = store.startDate && store.endDate 
    ? Math.round((new Date(store.endDate + 'T12:00:00').getTime() - new Date(store.startDate + 'T12:00:00').getTime()) / (1000 * 3600 * 24)) + 1
    : 1;

  const updateDuration = (days: number) => {
    if (days < 1 || !store.startDate) return;
    const d = new Date(store.startDate + 'T12:00:00');
    d.setDate(d.getDate() + days - 1);
    const endStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    store.setDates(store.startDate, endStr);
  };

  const updateStartDate = (newStart: string) => {
    if (!newStart) return;
    const d = new Date(newStart + 'T12:00:00');
    d.setDate(d.getDate() + durationDays - 1);
    const endStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    store.setDates(newStart, endStr);
  };

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold">Аренда сапбордов</h1>
        <p className="text-sm text-gray-500 mt-1">Здесь можно забронировать один или несколько сапов</p>
      </div>
      
      <div className="flex flex-wrap gap-4 items-end w-full">
        <div className="flex-1 min-w-[130px]">
          <Input 
            type="date" 
            label="Какого числа?" 
            value={store.startDate} 
            onChange={(e) => updateStartDate(e.target.value)}
          />
        </div>
        
        <div className="flex flex-col gap-1">
          <label className="text-sm text-gray-500 font-medium">На сколько дней?</label>
          <Stepper 
            value={durationDays} 
            onChange={updateDuration} 
            max={30} 
          />
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-sm text-gray-500 font-medium">Сколько сапбордов?</label>
          <Stepper 
            value={store.quantity} 
            onChange={store.setQuantity} 
            max={store.availableQuantity || 0} 
          />
        </div>
      </div>

      <Select 
        label="Удобное время получения" 
        value={store.pickupTime}
        onChange={(e) => store.setPickupTime(e.target.value)}
        options={generateTimeSlots()} 
      />

      <div className={`p-4 rounded-xl border transition-colors ${apiError || store.availableQuantity === 0 ? 'bg-red-50 border-red-200' : 'bg-white border-gray-200'}`}>
        {loading ? (
          <span className="text-gray-500">Считаем свободные доски...</span>
        ) : apiError ? (
          <span className="text-red-500 font-medium">Не удалось проверить доступность, попробуйте позже</span>
        ) : store.availableQuantity === null ? (
          <span className="text-gray-500">Выберите даты</span>
        ) : store.availableQuantity === 0 ? (
          <span className="text-red-500 font-medium">На эти даты сапов нет, выберите другие</span>
        ) : (
          <div className="flex flex-col gap-0.5">
            <span className="text-xs text-gray-400 font-medium">
              {store.startDate === store.endDate 
                ? `На ${formatClientDate(store.startDate)}` 
                : `С ${formatClientDate(store.startDate)} по ${formatClientDate(store.endDate)}`}
            </span>
            <span className={store.availableQuantity < 5 ? "text-orange-600 font-bold" : "text-teal-active font-bold"}>
              {store.availableQuantity < 5 
                ? `Осталось всего ${store.availableQuantity} ${getPlural(store.availableQuantity, 'сап', 'сапа', 'сапов')}`
                : `Доступно ${store.availableQuantity} ${getPlural(store.availableQuantity, 'сап', 'сапа', 'сапов')}`
              }
            </span>
          </div>
        )}
      </div>

      <div className="mt-8">
        <Button onClick={() => navigate('/step2')} disabled={!isValid}>
          Далее
        </Button>
      </div>
    </div>
  );
};
