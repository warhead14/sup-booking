import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { apiClient } from '../../api/apiClient';
import { useBookingStore } from '../../store/bookingStore';

export const PaymentResult: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const store = useBookingStore();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');

  useEffect(() => {
    const bookingId = searchParams.get('bookingId');
    if (!bookingId) {
      setStatus('error');
      return;
    }

    const verify = async () => {
      try {
        const res = await apiClient.verifyPayment(bookingId);
        if (res.status === 'paid') {
          setStatus('success');
        } else if (res.status === 'failed') {
          setStatus('error');
        } else {
          // 'pending' -> we could show a different message, or check again later. For now let's treat it as error/pending
          setStatus('error');
        }
      } catch (err) {
        console.error('Payment verification failed:', err);
        setStatus('error');
      }
    };

    verify();
  }, [searchParams]);

  return (
    <div className="flex flex-col mt-10 gap-8 text-center items-center">
      {status === 'loading' && (
        <>
          <div className="w-20 h-20 rounded-full bg-gray-200 animate-pulse flex justify-center items-center" />
          <h1 className="text-2xl font-bold">Проверяем статус оплаты...</h1>
        </>
      )}

      {status === 'success' && (
        <>
          <div className="w-20 h-20 rounded-full bg-teal-light flex justify-center items-center text-teal-base border-4 border-white shadow-lg">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold">Оплата прошла успешно!</h1>
          <p className="text-gray-600 text-lg leading-relaxed px-4">
            Ваша бронь подтверждена. Мы скоро свяжемся с вами.
          </p>
          <button 
            onClick={() => { store.reset(); navigate('/'); }} 
            className="text-teal-base font-semibold mt-4 py-2 px-4 rounded-lg active:bg-teal-light transition-colors">
            Вернуться на главную
          </button>
        </>
      )}

      {status === 'error' && (
        <>
          <div className="w-20 h-20 rounded-full bg-red-100 flex justify-center items-center text-red-500 border-4 border-white shadow-lg">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold">Проблема с оплатой</h1>
          <p className="text-gray-600 text-lg leading-relaxed px-4">
            Не удалось подтвердить оплату. Пожалуйста, попробуйте снова или свяжитесь с нами.
          </p>
          <button 
            onClick={() => { navigate('/'); }} 
            className="text-red-500 font-semibold mt-4 py-2 px-4 rounded-lg active:bg-red-50 transition-colors">
            Вернуться на главную
          </button>
        </>
      )}
    </div>
  );
};
