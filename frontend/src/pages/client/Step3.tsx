import React, { useEffect } from 'react';
import { useBookingStore } from '../../store/bookingStore';
import { formatRangeUI } from '../../utils/dateFormatter';

export const Step3: React.FC = () => {
  const store = useBookingStore();

  useEffect(() => {
    // Optional: reset store if needed, but keeping details is nice for the summary.
  }, []);

  return (
    <div className="flex flex-col mt-10 gap-8 text-center items-center">
      <div className="w-20 h-20 rounded-full bg-teal-light flex justify-center items-center text-teal-base border-4 border-white shadow-lg">
        <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
        </svg>
      </div>

      <h1 className="text-2xl font-bold">Заявка отправлена!</h1>
      
      <div className="p-4 bg-white rounded-xl shadow-sm border border-gray-100 w-full text-left">
        <div className="flex justify-between py-2 border-b">
          <span className="text-gray-500">Даты</span>
          <span className="font-medium">{formatRangeUI(store.startDate, store.endDate)}</span>
        </div>
        <div className="flex justify-between py-2 border-b">
          <span className="text-gray-500">Время</span>
          <span className="font-medium">{store.pickupTime}</span>
        </div>
        <div className="flex justify-between py-2">
          <span className="text-gray-500">Количество</span>
          <span className="font-medium">{store.quantity} шт.</span>
        </div>
      </div>

      <p className="text-gray-600 text-lg leading-relaxed px-4">
        Мы напишем Вам в течение 5 минут для внесения предоплаты.
      </p>

      {/* Button wrapper for visual structure if user wants to reset flow */}
      <button 
        onClick={() => { store.reset(); window.location.href = '/' }} 
        className="text-teal-base font-semibold mt-4 py-2 px-4 rounded-lg active:bg-teal-light transition-colors">
        Вернуться на главную
      </button>
    </div>
  );
};
