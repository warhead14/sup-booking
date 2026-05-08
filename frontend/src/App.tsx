import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Step1 } from './pages/client/Step1';
import { Step2 } from './pages/client/Step2';
import { Step3 } from './pages/client/Step3';
import { Login } from './pages/admin/Login';
import { Dashboard } from './pages/admin/Dashboard';

const App: React.FC = () => {
  return (
    <div className="min-h-screen bg-summer-mesh text-[#111827] p-4">
      {/* Mobile-first centered container */}
      <div className="w-full max-w-[480px] mx-auto bg-white rounded-2xl shadow-[0_4px_20px_rgba(0,0,0,0.05)] p-4 sm:p-6 h-fit mt-4 sm:mt-10" style={{overflow: 'hidden'}}>
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Step1 />} />
            <Route path="/step2" element={<Step2 />} />
            <Route path="/step3" element={<Step3 />} />
            
            <Route path="/admin" element={<Login />} />
            <Route path="/admin/dashboard" element={<Dashboard />} />
          </Routes>
        </BrowserRouter>
      </div>
    </div>
  );
};

export default App;
