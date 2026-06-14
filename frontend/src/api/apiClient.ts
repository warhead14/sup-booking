const API_BASE = (import.meta as any).env.VITE_API_BASE_URL || '/api';

export const apiClient = {
  checkAvailability: async (startDate: string, endDate: string): Promise<number> => {
    const res = await fetch(`${API_BASE}/availability?startDate=${startDate}&endDate=${endDate}`);
    if (!res.ok) throw new Error('Ошибка сети');
    const data = await res.json();
    return data.availableQuantity;
  },

  createBooking: async (payload: any): Promise<void> => {
    const res = await fetch(`${API_BASE}/bookings`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    if (!res.ok) throw new Error('Не удалось отправить заявку');
  },

  getAdminBookings: async (password: string): Promise<any[]> => {
    const res = await fetch(`${API_BASE}/admin/bookings`, {
      headers: { 'x-admin-password': password }
    });
    if (!res.ok) {
      if (res.status === 401) throw new Error('Неверный пароль');
      throw new Error('Ошибка сети');
    }
    return res.json();
  },

  updateBookingStatus: async (password: string, id: string, action: 'approve' | 'reject' | 'cancel'): Promise<void> => {
    const res = await fetch(`${API_BASE}/admin/bookings/${id}/status`, {
      method: 'PATCH',
      headers: { 
        'Content-Type': 'application/json',
        'x-admin-password': password 
      },
      body: JSON.stringify({ action })
    });
    
    if (!res.ok) {
      const data = await res.json();
      throw new Error(data.message || 'Не удалось обновить статус');
    }
  },

  adminCreateBooking: async (password: string, payload: any): Promise<void> => {
    const res = await fetch(`${API_BASE}/admin/bookings`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'x-admin-password': password 
      },
      body: JSON.stringify(payload)
    });
    if (!res.ok) throw new Error('Не удалось создать заявку');
  },

  getAdminRentals: async (password: string): Promise<any[]> => {
    const res = await fetch(`${API_BASE}/admin/rentals`, {
      headers: { 'x-admin-password': password }
    });
    if (!res.ok) throw new Error('Ошибка сети');
    return res.json();
  },

  issueRental: async (password: string, payload: any): Promise<void> => {
    const res = await fetch(`${API_BASE}/admin/rentals`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'x-admin-password': password 
      },
      body: JSON.stringify(payload)
    });
    if (!res.ok) {
      let msg = 'Не удалось оформить выдачу. Проверьте правильность заполнения полей.';
      try {
        const body = await res.json();
        if (body.error === 'Validation Error') {
          msg = 'Пожалуйста, заполните все обязательные поля корректно.';
        } else if (body.error) {
          msg = body.error;
        }
      } catch (e) {}
      throw new Error(msg);
    }
  },

  updateRental: async (password: string, id: string, payload: any): Promise<void> => {
    const res = await fetch(`${API_BASE}/admin/rentals/${id}`, {
      method: 'PUT',
      headers: { 
        'Content-Type': 'application/json',
        'x-admin-password': password 
      },
      body: JSON.stringify(payload)
    });
    if (!res.ok) {
      let msg = 'Не удалось обновить выдачу. Проверьте правильность заполнения полей.';
      try {
        const body = await res.json();
        if (body.error === 'Validation Error') {
          msg = 'Пожалуйста, заполните все обязательные поля корректно.';
        } else if (body.error) {
          msg = body.error;
        }
      } catch (e) {}
      throw new Error(msg);
    }
  },

  returnRental: async (password: string, id: string): Promise<void> => {
    const res = await fetch(`${API_BASE}/admin/rentals/${id}/return`, {
      method: 'PATCH',
      headers: { 'x-admin-password': password }
    });
    if (!res.ok) throw new Error('Не удалось оформить возврат');
  },

  getStats: async (password: string, startDate: string, endDate: string): Promise<any> => {
    const res = await fetch(`${API_BASE}/admin/stats?startDate=${startDate}&endDate=${endDate}`, {
      headers: { 'x-admin-password': password }
    });
    if (!res.ok) throw new Error('Ошибка загрузки статистики');
    return res.json();
  },

  deleteBooking: async (password: string, id: string): Promise<void> => {
    console.log('🚀 [API] DELETE BOOKING REQUEST', { id, url: `${API_BASE}/admin/bookings/${id}` });
    const res = await fetch(`${API_BASE}/admin/bookings/${id}`, {
      method: 'DELETE',
      headers: { 'x-admin-password': password }
    });
    if (!res.ok) {
      let msg = 'Не удалось удалить заявку';
      try { const body = await res.json(); if (body.message) msg = body.message; else if (body.error) msg = body.error; } catch(e){}
      throw new Error(msg);
    }
  },

  deleteRental: async (password: string, id: string): Promise<void> => {
    console.log('🚀 [API] DELETE RENTAL REQUEST', { id, url: `${API_BASE}/admin/rentals/${id}` });
    const res = await fetch(`${API_BASE}/admin/rentals/${id}`, {
      method: 'DELETE',
      headers: { 'x-admin-password': password }
    });
    if (!res.ok) {
      let msg = 'Не удалось удалить выдачу';
      try { const body = await res.json(); if (body.message) msg = body.message; else if (body.error) msg = body.error; } catch(e){}
      throw new Error(msg);
    }
  },

  getClients: async (password: string, query?: string): Promise<any[]> => {
    const qs = query ? `?q=${encodeURIComponent(query)}` : '';
    const res = await fetch(`${API_BASE}/admin/clients${qs}`, {
      headers: { 'x-admin-password': password }
    });
    if (!res.ok) throw new Error('Ошибка загрузки клиентов');
    return res.json();
  },

  getClientProfile: async (password: string, id: string): Promise<any> => {
    const res = await fetch(`${API_BASE}/admin/clients/${encodeURIComponent(id)}`, {
      headers: { 'x-admin-password': password }
    });
    if (!res.ok) throw new Error('Ошибка загрузки профиля');
    return res.json();
  },


  updateClientNote: async (password: string, id: string, note: string): Promise<void> => {
    const res = await fetch(`${API_BASE}/admin/clients/${encodeURIComponent(id)}/note`, {
      method: 'PATCH',
      headers: { 'x-admin-password': password, 'Content-Type': 'application/json' },
      body: JSON.stringify({ note }),
    });
    if (!res.ok) throw new Error('Ошибка сохранения примечания');
  },

  splitRecord: async (password: string, clientId: string, data: any): Promise<any> => {
    const res = await fetch(`${API_BASE}/admin/clients/${encodeURIComponent(clientId)}/split-record`, {
      method: 'POST',
      headers: { 'x-admin-password': password, 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    let result;
    try { result = await res.json(); } catch(e){}
    if (!res.ok) throw new Error(result?.error || 'Ошибка разделения записи');
    return result;
  },

  // ── Products ──────────────────────────────────────────────────────────────
  getProducts: async (password: string): Promise<any[]> => {
    const res = await fetch(`${API_BASE}/admin/products`, {
      headers: { 'x-admin-password': password }
    });
    if (!res.ok) throw new Error('Ошибка загрузки товаров');
    return res.json();
  },

  createProduct: async (password: string, data: { name: string; default_price: number; default_cost_price: number }): Promise<any> => {
    const res = await fetch(`${API_BASE}/admin/products`, {
      method: 'POST',
      headers: { 'x-admin-password': password, 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error('Ошибка создания товара');
    return res.json();
  },

  updateProduct: async (password: string, id: string, data: Partial<{ name: string; default_price: number; default_cost_price: number; is_active: number }>): Promise<any> => {
    const res = await fetch(`${API_BASE}/admin/products/${encodeURIComponent(id)}`, {
      method: 'PUT',
      headers: { 'x-admin-password': password, 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error('Ошибка обновления товара');
    return res.json();
  },

  // ── Sales ─────────────────────────────────────────────────────────────────
  getSales: async (password: string, params?: { startDate?: string; endDate?: string }): Promise<any[]> => {
    const qs = new URLSearchParams();
    if (params?.startDate) qs.set('startDate', params.startDate);
    if (params?.endDate)   qs.set('endDate', params.endDate);
    const res = await fetch(`${API_BASE}/admin/sales?${qs}`, {
      headers: { 'x-admin-password': password }
    });
    if (!res.ok) throw new Error('Ошибка загрузки продаж');
    return res.json();
  },

  createSale: async (password: string, data: {
    clientId?: string;
    clientName?: string;
    clientPhone?: string;
    paymentMethod: string;
    note?: string;
    items: Array<{ productId?: string; productName: string; sellPrice: number; costPrice: number; quantity: number }>;
  }): Promise<any> => {
    const res = await fetch(`${API_BASE}/admin/sales`, {
      method: 'POST',
      headers: { 'x-admin-password': password, 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error('Ошибка создания продажи');
    return res.json();
  },

  deleteSale: async (password: string, id: string): Promise<void> => {
    const res = await fetch(`${API_BASE}/admin/sales/${encodeURIComponent(id)}`, {
      method: 'DELETE',
      headers: { 'x-admin-password': password }
    });
    if (!res.ok) throw new Error('Ошибка удаления продажи');
  },

  getSalesStats: async (password: string, params?: { startDate?: string; endDate?: string }): Promise<any> => {
    const qs = new URLSearchParams();
    if (params?.startDate) qs.set('startDate', params.startDate);
    if (params?.endDate)   qs.set('endDate', params.endDate);
    const res = await fetch(`${API_BASE}/admin/sales/stats?${qs}`, {
      headers: { 'x-admin-password': password }
    });
    if (!res.ok) throw new Error('Ошибка загрузки статистики продаж');
    return res.json();
  },

  deleteClient: async (password: string, id: string): Promise<void> => {
    const res = await fetch(`${API_BASE}/admin/clients/${encodeURIComponent(id)}`, {
      method: 'DELETE',
      headers: { 'x-admin-password': password }
    });
    if (!res.ok) throw new Error('Ошибка удаления клиента');
  },
};


