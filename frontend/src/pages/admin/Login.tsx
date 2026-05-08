import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Input } from '../../components/Input';
import { Button } from '../../components/Button';
import { apiClient } from '../../api/apiClient';

export const Login: React.FC = () => {
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleLogin = async () => {
    setLoading(true);
    setError('');
    try {
      // Test the password against the API
      await apiClient.getAdminBookings(password);
      localStorage.setItem('admin_pwd', password);
      navigate('/admin/dashboard');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col justify-center min-h-[60vh] gap-6">
      <h1 className="text-2xl font-bold text-center">Админ-панель</h1>
      
      <Input
        label="Пароль"
        type="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        error={error}
        placeholder="Введите пароль"
      />

      <Button onClick={handleLogin} loading={loading} disabled={!password}>
        Войти
      </Button>
    </div>
  );
};
