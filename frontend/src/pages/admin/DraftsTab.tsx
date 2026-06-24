import React, { useState, useEffect } from 'react';
import { apiClient } from '../../api/apiClient';
import { FileEdit, Trash2, CalendarDays, Ship } from 'lucide-react';

type Props = {
  password: string;
  onOpenDraft: (draft: any) => void;
};

export const DraftsTab: React.FC<Props> = ({ password, onOpenDraft }) => {
  const [drafts, setDrafts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadDrafts = async () => {
    setLoading(true);
    try {
      const data = await apiClient.getDrafts(password);
      setDrafts(data);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDrafts();
  }, [password]);

  const handleDelete = async (id: string) => {
    if (!confirm('Точно удалить черновик?')) return;
    try {
      await apiClient.deleteDraft(password, id);
      await loadDrafts();
    } catch (e: any) {
      alert(`Ошибка: ${e.message}`);
    }
  };

  if (loading) return <div className="p-8 text-center text-gray-500">Загрузка черновиков...</div>;
  if (error) return <div className="p-8 text-center text-red-500">{error}</div>;

  if (drafts.length === 0) {
    return (
      <div className="p-8 text-center text-gray-500">
        <FileEdit className="mx-auto mb-4 text-gray-300" size={48} />
        Нет сохраненных черновиков
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-8 max-w-4xl mx-auto animate-in fade-in">
      <h2 className="text-2xl font-bold text-gray-800 mb-6 flex items-center gap-2">
        <FileEdit className="text-teal-600" />
        Черновики ({drafts.length})
      </h2>
      
      <div className="bg-white border rounded-xl shadow-sm overflow-hidden">
        <ul className="divide-y">
          {drafts.map((draft) => {
            const isBooking = draft.type === 'booking';
            const dateStr = new Date(draft.updated_at).toLocaleString('ru-RU', {
              day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit'
            });

            return (
              <li key={draft.id} className="p-4 hover:bg-gray-50 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-start gap-3">
                  <div className={`mt-1 p-2 rounded-lg ${isBooking ? 'bg-blue-100 text-blue-600' : 'bg-teal-100 text-teal-600'}`}>
                    {isBooking ? <CalendarDays size={20} /> : <Ship size={20} />}
                  </div>
                  <div>
                    <div className="font-medium text-gray-800">
                      {draft.title || 'Без имени'}
                      <span className="ml-2 text-xs font-normal text-gray-500 px-2 py-0.5 bg-gray-100 rounded-full">
                        {isBooking ? 'Бронь' : 'Выдача'}
                      </span>
                    </div>
                    <div className="text-sm text-gray-500 mt-1">
                      Сохранено: {dateStr}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 self-end sm:self-auto">
                  <button
                    onClick={() => onOpenDraft(draft)}
                    className="px-4 py-2 text-sm font-medium text-teal-700 bg-teal-50 hover:bg-teal-100 rounded-lg transition-colors"
                  >
                    Открыть
                  </button>
                  <button
                    onClick={() => handleDelete(draft.id)}
                    className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                    title="Удалить"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
};
