import React, { useState, useEffect, useRef } from 'react';
import { Voucher } from './types/voucher';
import { User } from './types/user';
import { VoucherForm, emptyVoucher } from './components/VoucherForm';
import { VoucherPreview } from './components/VoucherPreview';
import { UserManagement } from './components/UserManagement';
import { ReportsModule } from './components/ReportsModule';
import { MaintenanceModule } from './components/MaintenanceModule';
import { SettingsModule } from './components/SettingsModule';
import { CompanySettings, defaultSettings } from './types/settings';
import { api } from './services/api';
import { Plus, Printer, Edit, Trash2, FileText, Download, X, Users, LogOut, Lock, CheckCircle, Settings, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, Filter, ChevronDown, ChevronUp, Minus, Loader2, BarChart3, LayoutDashboard, Wrench, Menu, XCircle, RefreshCw } from 'lucide-react';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

interface FilterCondition {
  id: string;
  field: string;
  value: string;
}

export default function App() {
  const [view, setView] = useState<'list' | 'create' | 'edit' | 'preview' | 'users' | 'reports' | 'maintenance' | 'settings'>('list');
  const [vouchers, setVouchers] = useState<Voucher[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [companySettings, setCompanySettings] = useState<CompanySettings>(defaultSettings);
  const [isLoading, setIsLoading] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [selectedVoucher, setSelectedVoucher] = useState<Voucher | null>(null);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  
  // Login State
  const [loginUsername, setLoginUsername] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  
  const [isChangePasswordModalOpen, setIsChangePasswordModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [changePasswordData, setChangePasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [changePasswordError, setChangePasswordError] = useState('');
  const [changePasswordSuccess, setChangePasswordSuccess] = useState('');
  const [voucherToDelete, setVoucherToDelete] = useState<string | null>(null);
  const [deleteReason, setDeleteReason] = useState('');
  const [customDeleteReason, setCustomDeleteReason] = useState('');
  
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [paymentData, setPaymentData] = useState({
    date: new Date().toISOString().split('T')[0],
    amount: 0,
    dni: '',
    ruc: ''
  });

  // Filter State
  const [isFiltersOpen, setIsFiltersOpen] = useState(false);
  const [filters, setFilters] = useState<FilterCondition[]>([{ id: '1', field: 'all', value: '' }]);

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const previewRef = useRef<HTMLDivElement>(null);

  const filterFields = [
    { value: 'all', label: 'Todos los campos' },
    { value: 'number', label: 'N° Comprobante' },
    { value: 'date', label: 'Fecha' },
    { value: 'year', label: 'Año' },
    { value: 'payeeName', label: 'Girado a' },
    { value: 'concept', label: 'Concepto' },
    { value: 'total', label: 'Monto' },
    { value: 'status', label: 'Estado' },
  ];

  // Filter Logic
  const filteredVouchers = vouchers.filter(voucher => {
    return filters.every(filter => {
      if (!filter.value) return true;
      
      const searchTerm = filter.value.toLowerCase();
      
      if (filter.field === 'all') {
        return (
          voucher.number.toLowerCase().includes(searchTerm) ||
          voucher.payeeName.toLowerCase().includes(searchTerm) ||
          voucher.concept.toLowerCase().includes(searchTerm) ||
          voucher.date.includes(searchTerm) ||
          voucher.total.toString().includes(searchTerm) ||
          (voucher.status === 'anulado' && 'anulado'.includes(searchTerm)) ||
          (voucher.status === 'pagado' && 'pagado'.includes(searchTerm)) ||
          (voucher.status === 'emitido' && 'emitido'.includes(searchTerm))
        );
      }
      
      if (filter.field === 'year') {
        return voucher.date.startsWith(searchTerm) || voucher.date.includes(searchTerm);
      }
      
      const fieldValue = voucher[filter.field as keyof Voucher];
      if (fieldValue === undefined || fieldValue === null) return false;
      
      return String(fieldValue).toLowerCase().includes(searchTerm);
    });
  });

  // Pagination Logic
  const sortedVouchers = [...filteredVouchers].sort((a, b) => {
    // Primary: compare by createdAt timestamp in descending order (newest first)
    if (a.createdAt && b.createdAt) {
      const timeA = new Date(a.createdAt).getTime();
      const timeB = new Date(b.createdAt).getTime();
      if (!isNaN(timeA) && !isNaN(timeB) && timeA !== timeB) {
        return timeB - timeA;
      }
    }
    
    // Primary/Fallback: Compare voucher numbers sequentially in descending order (e.g. 2026-000003 before 2026-000002)
    if (a.number && b.number) {
      return b.number.localeCompare(a.number);
    }
    
    // Fallback: standard simple date string fallback
    const dateA = new Date(a.date).getTime();
    const dateB = new Date(b.date).getTime();
    if (!isNaN(dateA) && !isNaN(dateB)) {
      return dateB - dateA;
    }
    return 0;
  });

  const totalPages = Math.ceil(sortedVouchers.length / itemsPerPage);
  const paginatedVouchers = sortedVouchers.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const handlePageChange = (page: number) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
    }
  };

  const getPageNumbers = () => {
    const pages: (number | string)[] = [];
    const maxVisiblePages = 5;
    
    if (totalPages <= maxVisiblePages) {
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      pages.push(1);
      
      const start = Math.max(2, currentPage - 1);
      const end = Math.min(totalPages - 1, currentPage + 1);
      
      if (start > 2) {
        pages.push('...');
      }
      
      for (let i = start; i <= end; i++) {
        pages.push(i);
      }
      
      if (end < totalPages - 1) {
        pages.push('...');
      }
      
      pages.push(totalPages);
    }
    
    return pages;
  };

  const fetchData = async () => {
    setIsLoading(true);
    try {
      // Load Users
      const fetchedUsers = await api.getUsers();
      if (fetchedUsers.length > 0) {
        setUsers(fetchedUsers);
      } else {
        // Initialize default admin user if no users exist
        const defaultAdmin: User = {
          id: 'admin-001',
          username: 'admin',
          password: 'admin', // In a real app, this should be hashed
          fullName: 'Administrador del Sistema',
          role: 'admin',
          status: 'active',
          createdAt: new Date().toISOString()
        };
        await api.saveUser(defaultAdmin);
        setUsers([defaultAdmin]);
      }

      // Load Vouchers
      const fetchedVouchers = await api.getVouchers();
      setVouchers(fetchedVouchers);

      // Load Settings
      const fetchedSettings = await api.getSettings();
      if (fetchedSettings && Object.keys(fetchedSettings).length > 0) {
        setCompanySettings({ ...defaultSettings, ...fetchedSettings });
      }
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSyncData = async () => {
    await fetchData();
  };

  useEffect(() => {
    fetchData();

    // Check for active session
    const sessionUser = localStorage.getItem('sessionUser');
    if (sessionUser) {
      setCurrentUser(JSON.parse(sessionUser));
    }
  }, []);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError('');

    const user = users.find(u => u.username === loginUsername && u.password === loginPassword);

    if (user) {
      if (user.status === 'inactive') {
        setLoginError('Usuario inactivo. Contacte al administrador.');
        return;
      }

      const updatedUser = { ...user, lastLogin: new Date().toISOString() };
      
      // Update last login in users array
      const newUsers = users.map(u => u.id === user.id ? updatedUser : u);
      setUsers(newUsers);
      localStorage.setItem('users', JSON.stringify(newUsers));

      setCurrentUser(updatedUser);
      localStorage.setItem('sessionUser', JSON.stringify(updatedUser));
      setLoginUsername('');
      setLoginPassword('');
    } else {
      setLoginError('Usuario o contraseña incorrectos');
    }
  };

  const handleLogout = () => {
    setCurrentUser(null);
    localStorage.removeItem('sessionUser');
    setView('list');
  };

  const handleChangePassword = (e: React.FormEvent) => {
    e.preventDefault();
    setChangePasswordError('');
    setChangePasswordSuccess('');

    if (!currentUser) return;

    if (changePasswordData.newPassword !== changePasswordData.confirmPassword) {
      setChangePasswordError('Las contraseñas nuevas no coinciden.');
      return;
    }

    if (changePasswordData.newPassword.length < 4) {
      setChangePasswordError('La contraseña debe tener al menos 4 caracteres.');
      return;
    }

    // Verify current password
    // In a real app, this would be an API call. Here we check against the loaded users array.
    const userIndex = users.findIndex(u => u.id === currentUser.id);
    if (userIndex === -1) return;

    if (users[userIndex].password !== changePasswordData.currentPassword) {
      setChangePasswordError('La contraseña actual es incorrecta.');
      return;
    }

    // Update password
    const updatedUser = { ...users[userIndex], password: changePasswordData.newPassword };
    const newUsers = [...users];
    newUsers[userIndex] = updatedUser;
    
    setUsers(newUsers);
    localStorage.setItem('users', JSON.stringify(newUsers));
    
    // Update current session user (though password usually isn't in session, we keep it consistent)
    setCurrentUser(updatedUser);
    localStorage.setItem('sessionUser', JSON.stringify(updatedUser));

    setChangePasswordSuccess('Contraseña actualizada exitosamente.');
    
    setTimeout(() => {
      setIsChangePasswordModalOpen(false);
      setChangePasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
      setChangePasswordSuccess('');
    }, 2000);
  };

  const getNextVoucherNumber = () => {
    const year = new Date().getFullYear();
    const yearPrefix = `${year}-`;
    const currentYearVouchers = vouchers.filter(v => v.number.startsWith(yearPrefix));
    
    if (currentYearVouchers.length === 0) {
      return `${year}-000001`;
    }
    
    const maxCorrelative = currentYearVouchers.reduce((max, v) => {
      const parts = v.number.split('-');
      if (parts.length === 2) {
        const num = parseInt(parts[1], 10);
        return !isNaN(num) && num > max ? num : max;
      }
      return max;
    }, 0);
    
    return `${year}-${(maxCorrelative + 1).toString().padStart(6, '0')}`;
  };

  const handleNewVoucher = () => {
    if (!currentUser) return;
    const nextNumber = getNextVoucherNumber();
    const newVoucher: Voucher = {
      ...emptyVoucher,
      id: crypto.randomUUID(),
      number: nextNumber,
      createdAt: new Date().toISOString(),
      createdBy: currentUser.fullName,
      status: 'emitido'
    };
    setSelectedVoucher(newVoucher);
    setView('create');
  };

  const saveVoucher = async (voucher: Voucher) => {
    setIsLoading(true);
    try {
      const result = await api.saveVoucher(voucher);
      if (result.success) {
        let newVouchers;
        // Check if we are editing an existing voucher in the list or adding a new one
        const exists = vouchers.some(v => v.id === voucher.id);
        if (exists) {
          newVouchers = vouchers.map(v => v.id === voucher.id ? voucher : v);
        } else {
          newVouchers = [...vouchers, voucher];
        }
        setVouchers(newVouchers);
        setView('list');
      } else {
        alert('Error al guardar el comprobante: ' + (result.error || 'Unknown error'));
      }
    } catch (error) {
      console.error('Error saving voucher:', error);
      alert('Error al guardar el comprobante');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteVoucher = (id: string) => {
    setVoucherToDelete(id);
    setDeleteReason('');
    setCustomDeleteReason('');
    setIsDeleteModalOpen(true);
  };

  const confirmDelete = async () => {
    if (voucherToDelete && currentUser) {
      const finalReason = deleteReason === 'otros' ? customDeleteReason : deleteReason;
      
      setIsLoading(true);
      try {
        const result = await api.deleteVoucher(voucherToDelete, finalReason, currentUser.fullName);
        
        if (result.success) {
          const newVouchers = vouchers.map(v => {
            if (v.id === voucherToDelete) {
              return {
                ...v,
                status: 'anulado',
                deletedAt: new Date().toISOString(),
                deletedBy: currentUser.fullName,
                deleteReason: finalReason
              } as Voucher;
            }
            return v;
          });
          setVouchers(newVouchers);
          setIsDeleteModalOpen(false);
          setVoucherToDelete(null);
        } else {
          alert('Error al anular el comprobante: ' + (result.error || 'Unknown error'));
        }
      } catch (error) {
        console.error('Error deleting voucher:', error);
        alert('Error al anular el comprobante');
      } finally {
        setIsLoading(false);
      }
    }
  };

  const handleRegisterPayment = (voucher: Voucher) => {
    // Try to extract RUC from payeeName (format: RUC / NAME)
    let extractedRuc = '';
    if (voucher.payeeName && voucher.payeeName.includes('/')) {
      extractedRuc = voucher.payeeName.split('/')[0].trim();
    }

    setSelectedVoucher(voucher);
    setPaymentData({
      date: new Date().toISOString().split('T')[0],
      amount: voucher.total,
      dni: voucher.receiverDni || '',
      ruc: extractedRuc || voucher.receiverRuc || ''
    });
    setIsPaymentModalOpen(true);
  };

  const confirmPayment = async () => {
    if (selectedVoucher && currentUser) {
      const updatedVoucher = {
        ...selectedVoucher,
        status: 'pagado',
        paymentDate: paymentData.date,
        paymentAmount: paymentData.amount,
        receiverDni: paymentData.dni,
        receiverRuc: paymentData.ruc,
        receiverDate: paymentData.date
      } as Voucher;

      setIsLoading(true);
      try {
        const result = await api.saveVoucher(updatedVoucher);
        
        if (result.success) {
          const newVouchers = vouchers.map(v => {
            if (v.id === selectedVoucher.id) {
              return updatedVoucher;
            }
            return v;
          });
          setVouchers(newVouchers);
          setIsPaymentModalOpen(false);
          setSelectedVoucher(null);
        } else {
          alert('Error al registrar el pago: ' + (result.error || 'Unknown error'));
        }
      } catch (error) {
        console.error('Error registering payment:', error);
        alert('Error al registrar el pago');
      } finally {
        setIsLoading(false);
      }
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const handleExportPDF = async () => {
    if (!previewRef.current || !selectedVoucher) return;

    try {
      const canvas = await html2canvas(previewRef.current, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff',
        windowWidth: 1200
      });

      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      });

      const imgWidth = 200; // Slightly less than 210mm to avoid cutting off
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      const margin = (210 - imgWidth) / 2; // Center it

      pdf.addImage(imgData, 'PNG', margin, 10, imgWidth, imgHeight);
      pdf.save(`comprobante-${selectedVoucher.number}.pdf`);
    } catch (error) {
      console.error('Error generating PDF:', error);
      alert('Hubo un error al generar el PDF. Por favor intente nuevamente.');
    }
  };

  if (!currentUser) {
    return (
      <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4">
        <div className="bg-white p-8 rounded-xl shadow-lg max-w-md w-full">
          <div className="flex flex-col items-center mb-6">
            <div className="bg-blue-100 p-3 rounded-full mb-4">
              <Lock className="h-8 w-8 text-blue-600" />
            </div>
            <h1 className="text-2xl font-bold text-slate-800">Acceso al Sistema</h1>
            <p className="text-slate-500 text-center mt-2">Ingrese sus credenciales para continuar</p>
          </div>
          
          {loginError && (
            <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm mb-4 flex items-center gap-2">
              <XCircle className="h-4 w-4" /> {loginError}
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Usuario</label>
              <input
                type="text"
                value={loginUsername}
                onChange={(e) => setLoginUsername(e.target.value)}
                className="w-full p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                placeholder="Ingrese su usuario"
                required
                autoFocus
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Contraseña</label>
              <input
                type="password"
                value={loginPassword}
                onChange={(e) => setLoginPassword(e.target.value)}
                className="w-full p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                placeholder="Ingrese su contraseña"
                required
              />
            </div>
            <button
              type="submit"
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-4 rounded-lg transition-colors flex items-center justify-center gap-2"
            >
              Iniciar Sesión
            </button>
          </form>
          <div className="mt-6 text-center text-xs text-slate-400">
            Credenciales por defecto: admin / admin
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900 font-sans flex">
      {/* Sidebar */}
      <aside 
        className={`bg-blue-900 text-white transition-all duration-300 flex flex-col print:hidden ${
          isSidebarOpen ? 'w-64' : 'w-20'
        }`}
      >
        <div className="p-4 border-b border-blue-800 flex items-center justify-between">
          {isSidebarOpen ? (
            <div className="flex items-center gap-2 overflow-hidden">
              <div className="bg-white p-1 rounded min-w-[32px]">
                {companySettings.logo ? (
                  <img src={companySettings.logo} alt="Logo" className="h-6 w-6 object-contain" />
                ) : (
                  <FileText className="h-6 w-6 text-blue-900" />
                )}
              </div>
              <span className="font-bold whitespace-nowrap truncate">{companySettings.name}</span>
            </div>
          ) : (
            <div className="mx-auto bg-white p-1 rounded">
              {companySettings.logo ? (
                <img src={companySettings.logo} alt="Logo" className="h-6 w-6 object-contain" />
              ) : (
                <FileText className="h-6 w-6 text-blue-900" />
              )}
            </div>
          )}
        </div>

        <nav className="flex-1 py-4 overflow-y-auto">
          <ul className="space-y-1 px-2">
            <li>
              <button 
                onClick={() => setView('list')}
                className={`w-full flex items-center gap-3 p-3 rounded-lg transition-colors ${
                  view === 'list' || view === 'create' || view === 'edit' || view === 'preview' 
                    ? 'bg-blue-800 text-white shadow-inner' 
                    : 'text-blue-100 hover:bg-blue-800/50'
                }`}
              >
                <LayoutDashboard size={20} className="min-w-[20px]" />
                {isSidebarOpen && <span className="font-medium">Comprobantes</span>}
              </button>
            </li>
            
            <li>
              <button 
                onClick={() => setView('reports')}
                className={`w-full flex items-center gap-3 p-3 rounded-lg transition-colors ${
                  view === 'reports' ? 'bg-blue-800 text-white shadow-inner' : 'text-blue-100 hover:bg-blue-800/50'
                }`}
              >
                <BarChart3 size={20} className="min-w-[20px]" />
                {isSidebarOpen && <span className="font-medium">Reportes</span>}
              </button>
            </li>

            {currentUser.role === 'admin' && (
              <>
                <li>
                  <button 
                    onClick={() => setView('users')}
                    className={`w-full flex items-center gap-3 p-3 rounded-lg transition-colors ${
                      view === 'users' ? 'bg-blue-800 text-white shadow-inner' : 'text-blue-100 hover:bg-blue-800/50'
                    }`}
                  >
                    <Users size={20} className="min-w-[20px]" />
                    {isSidebarOpen && <span className="font-medium">Usuarios</span>}
                  </button>
                </li>
                
                <li>
                  <button 
                    onClick={() => setView('maintenance')}
                    className={`w-full flex items-center gap-3 p-3 rounded-lg transition-colors ${
                      view === 'maintenance' ? 'bg-blue-800 text-white shadow-inner' : 'text-blue-100 hover:bg-blue-800/50'
                    }`}
                  >
                    <Wrench size={20} className="min-w-[20px]" />
                    {isSidebarOpen && <span className="font-medium">Mantenimiento</span>}
                  </button>
                </li>

                <li>
                  <button 
                    onClick={() => setView('settings')}
                    className={`w-full flex items-center gap-3 p-3 rounded-lg transition-colors ${
                      view === 'settings' ? 'bg-blue-800 text-white shadow-inner' : 'text-blue-100 hover:bg-blue-800/50'
                    }`}
                  >
                    <Settings size={20} className="min-w-[20px]" />
                    {isSidebarOpen && <span className="font-medium">Ajustes</span>}
                  </button>
                </li>
              </>
            )}
          </ul>
        </nav>

        <div className="p-4 border-t border-blue-800 space-y-2">
          <button 
            onClick={() => setIsChangePasswordModalOpen(true)}
            className="w-full flex items-center gap-3 p-2 text-blue-200 hover:text-white hover:bg-blue-800/50 rounded-lg transition-colors"
            title="Cambiar Contraseña"
          >
            <Settings size={18} className="min-w-[18px]" />
            {isSidebarOpen && <span className="text-sm">Configuración</span>}
          </button>
          
          <button 
            onClick={handleLogout}
            className="w-full flex items-center gap-3 p-2 text-red-300 hover:text-red-100 hover:bg-red-900/30 rounded-lg transition-colors"
            title="Cerrar Sesión"
          >
            <LogOut size={18} className="min-w-[18px]" />
            {isSidebarOpen && <span className="text-sm">Cerrar Sesión</span>}
          </button>
          
          <button 
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            className="w-full flex items-center gap-3 p-2 text-blue-400 hover:text-blue-200 transition-colors"
          >
            {isSidebarOpen ? <ChevronLeft size={18} /> : <ChevronRight size={18} />}
            {isSidebarOpen && <span className="text-xs uppercase tracking-widest font-bold">Contraer</span>}
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <header className="bg-white border-b border-slate-200 p-4 flex justify-between items-center print:hidden">
          <div className="flex items-center gap-4">
            <button 
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              className="lg:hidden p-2 text-slate-500 hover:bg-slate-100 rounded-lg"
            >
              <Menu size={20} />
            </button>
            <h2 className="text-lg font-bold text-slate-700">
              {view === 'list' && 'Gestión de Comprobantes'}
              {view === 'create' && 'Nuevo Comprobante'}
              {view === 'edit' && 'Editar Comprobante'}
              {view === 'preview' && 'Vista Previa'}
              {view === 'users' && 'Gestión de Usuarios'}
              {view === 'reports' && 'Reportes y Estadísticas'}
              {view === 'maintenance' && 'Mantenimiento del Sistema'}
              {view === 'settings' && 'Ajustes de Listas'}
            </h2>
          </div>

          <div className="flex items-center gap-3">
            <div className="hidden sm:flex flex-col items-end">
              <span className="text-sm font-bold text-slate-700 leading-none">{currentUser.fullName}</span>
              <span className="text-[10px] text-slate-400 uppercase tracking-wider font-bold">{currentUser.role}</span>
            </div>
            <div className="h-10 w-10 bg-blue-100 text-blue-700 rounded-full flex items-center justify-center font-bold border border-blue-200">
              {currentUser.username.substring(0, 2).toUpperCase()}
            </div>
          </div>
        </header>

        {/* Content */}
        <main className="flex-1 overflow-y-auto p-6 print:p-0">
          <div className="max-w-7xl mx-auto">
            {view === 'users' && currentUser.role === 'admin' ? (
              <UserManagement 
                currentUser={currentUser} 
                onClose={() => setView('list')} 
                onSync={handleSyncData}
              />
            ) : view === 'reports' ? (
              <ReportsModule vouchers={vouchers} onSync={handleSyncData} />
            ) : view === 'maintenance' && currentUser.role === 'admin' ? (
              <MaintenanceModule 
                currentSettings={companySettings} 
                onSettingsUpdate={setCompanySettings} 
                onSync={handleSyncData}
              />
            ) : view === 'settings' && currentUser.role === 'admin' ? (
              <SettingsModule 
                settings={companySettings} 
                onSync={handleSyncData}
                onSave={async (newSettings) => {
                  const result = await api.saveSettings(newSettings);
                  if (result.success) {
                    setCompanySettings(newSettings);
                  } else {
                    throw new Error(result.error);
                  }
                }} 
              />
            ) : (
              <>
                {view === 'list' && (
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <h2 className="text-xl font-bold text-slate-800">Listado de Comprobantes</h2>
                      <div className="flex items-center gap-2">
                        <button 
                          onClick={handleSyncData}
                          className="bg-white hover:bg-slate-50 text-slate-600 border border-slate-200 px-4 py-2 rounded-lg flex items-center gap-2 text-sm font-medium transition-colors shadow-sm"
                          title="Sincronizar con la base de datos"
                        >
                          <RefreshCw size={18} className={isLoading ? 'animate-spin' : ''} /> Sincronizar
                        </button>
                        {currentUser.role !== 'viewer' && (
                          <button 
                            onClick={handleNewVoucher}
                            className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-lg flex items-center gap-2 text-sm font-medium transition-colors shadow-sm"
                          >
                            <Plus size={18} /> Nuevo Comprobante
                          </button>
                        )}
                      </div>
                    </div>

                <div className="bg-white rounded-xl shadow-sm overflow-hidden border border-slate-200">
                  <button 
                    onClick={() => setIsFiltersOpen(!isFiltersOpen)}
                    className="w-full flex items-center justify-between p-4 bg-slate-50 hover:bg-slate-100 transition-colors text-slate-700 font-medium"
                  >
                    <div className="flex items-center gap-2">
                      <Filter size={18} />
                      <span>Filtros de Búsqueda</span>
                      {filters.some(f => f.value) && (
                        <span className="bg-blue-100 text-blue-700 text-xs px-2 py-0.5 rounded-full border border-blue-200">
                          {filters.filter(f => f.value).length} Activos
                        </span>
                      )}
                    </div>
                    {isFiltersOpen ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                  </button>
                  
                  {isFiltersOpen && (
                    <div className="p-4 border-t border-slate-200 space-y-3 bg-white">
                      {filters.map((filter, index) => (
                        <div key={filter.id} className="flex flex-col sm:flex-row gap-2 items-start sm:items-center">
                          <select
                            value={filter.field}
                            onChange={(e) => {
                              const newFilters = [...filters];
                              newFilters[index].field = e.target.value;
                              setFilters(newFilters);
                            }}
                            className="w-full sm:w-auto p-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none bg-white min-w-[180px]"
                          >
                            {filterFields.map(field => (
                              <option key={field.value} value={field.value}>{field.label}</option>
                            ))}
                          </select>
                          
                          <div className="flex-1 flex gap-2 w-full">
                            <input
                              type="text"
                              value={filter.value}
                              onChange={(e) => {
                                const newFilters = [...filters];
                                newFilters[index].value = e.target.value;
                                setFilters(newFilters);
                                setCurrentPage(1);
                              }}
                              placeholder="Buscar..."
                              className="flex-1 p-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                            />
                            
                            {filters.length > 1 && (
                              <button
                                onClick={() => {
                                  const newFilters = filters.filter(f => f.id !== filter.id);
                                  setFilters(newFilters);
                                }}
                                className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors border border-transparent hover:border-red-100"
                                title="Eliminar filtro"
                              >
                                <Minus size={18} />
                              </button>
                            )}
                          </div>
                        </div>
                      ))}
                      
                      <div className="flex justify-between pt-2">
                        <button
                          onClick={() => setFilters([...filters, { id: crypto.randomUUID(), field: 'all', value: '' }])}
                          className="flex items-center gap-1 text-sm text-blue-600 hover:text-blue-800 font-medium px-3 py-1.5 hover:bg-blue-50 rounded-lg transition-colors border border-transparent hover:border-blue-100"
                        >
                          <Plus size={16} /> Agregar filtro
                        </button>
                        
                        {filters.some(f => f.value) && (
                          <button
                            onClick={() => {
                              setFilters([{ id: crypto.randomUUID(), field: 'all', value: '' }]);
                              setCurrentPage(1);
                            }}
                            className="flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700 font-medium px-3 py-1.5 hover:bg-slate-50 rounded-lg transition-colors border border-transparent hover:border-slate-200"
                          >
                            <X size={16} /> Limpiar filtros
                          </button>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                <div className="bg-white rounded-xl shadow-sm overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                      <thead className="bg-slate-50 border-b border-slate-200">
                        <tr>
                          <th className="p-4 font-semibold text-slate-600">N°</th>
                          <th className="p-4 font-semibold text-slate-600">Fecha</th>
                          <th className="p-4 font-semibold text-slate-600">Girado a</th>
                          <th className="p-4 font-semibold text-slate-600">Concepto</th>
                          <th className="p-4 font-semibold text-slate-600 text-right">Monto</th>
                          <th className="p-4 font-semibold text-slate-600 text-center">Estado</th>
                          <th className="p-4 font-semibold text-slate-600 text-center">Acciones</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {paginatedVouchers.length === 0 ? (
                          <tr>
                            <td colSpan={7} className="p-8 text-center text-slate-500">
                              No hay comprobantes registrados.
                            </td>
                          </tr>
                        ) : (
                          paginatedVouchers.map(voucher => {
                            const isDeleted = voucher.status === 'anulado';
                            const isPaid = voucher.status === 'pagado';
                            return (
                              <tr key={voucher.id} className={`transition-colors ${isDeleted ? 'bg-red-50' : isPaid ? 'bg-green-50' : 'hover:bg-slate-50'}`}>
                                <td className="p-4 font-mono">
                                  {voucher.number}
                                </td>
                                <td className={`p-4 ${isDeleted ? 'text-slate-400' : ''}`}>{voucher.date}</td>
                                <td className={`p-4 font-medium ${isDeleted ? 'text-slate-400' : ''}`}>{voucher.payeeName}</td>
                                <td className={`p-4 max-w-xs break-words whitespace-normal ${isDeleted ? 'text-slate-400' : 'text-slate-500'}`}>{voucher.concept}</td>
                                <td className={`p-4 text-right font-mono ${isDeleted ? 'text-slate-400' : ''}`}>S/. {voucher.total.toFixed(2)}</td>
                                <td className="p-4 text-center">
                                  {isDeleted && (
                                    <span className="px-2 py-1 text-xs font-bold text-red-600 bg-red-100 rounded-full border border-red-200">
                                      ANULADO
                                    </span>
                                  )}
                                  {isPaid && (
                                    <span className="px-2 py-1 text-xs font-bold text-green-600 bg-green-100 rounded-full border border-green-200">
                                      PAGADO
                                    </span>
                                  )}
                                  {(!isDeleted && !isPaid) && (
                                    <span className="px-2 py-1 text-xs font-bold text-blue-600 bg-blue-100 rounded-full border border-blue-200">
                                      EMITIDO
                                    </span>
                                  )}
                                </td>
                                <td className="p-4 flex justify-center gap-2">
                                  <button 
                                    onClick={() => { setSelectedVoucher(voucher); setView('preview'); }}
                                    className="p-2 text-slate-600 hover:bg-blue-50 hover:text-blue-600 rounded-lg"
                                    title="Ver / Imprimir"
                                  >
                                    <Printer size={18} />
                                  </button>
                                  {!isDeleted && (currentUser.role === 'admin' || currentUser.role === 'viewer') && (
                                    <>
                                      {!isPaid && currentUser.role === 'admin' && (
                                        <button 
                                          onClick={() => handleRegisterPayment(voucher)}
                                          className="p-2 text-slate-600 hover:bg-green-50 hover:text-green-600 rounded-lg"
                                          title="Registrar Pago"
                                        >
                                          <CheckCircle size={18} />
                                        </button>
                                      )}
                                      <button 
                                        onClick={() => { setSelectedVoucher(voucher); setView('edit'); }}
                                        className={`p-2 text-slate-600 rounded-lg ${currentUser.role === 'viewer' || isPaid ? 'hover:bg-slate-50 hover:text-slate-600' : 'hover:bg-amber-50 hover:text-amber-600'}`}
                                        title={currentUser.role === 'viewer' || isPaid ? "Ver Detalle" : "Editar"}
                                      >
                                        {currentUser.role === 'viewer' || isPaid ? <FileText size={18} /> : <Edit size={18} />}
                                      </button>
                                      {currentUser.role === 'admin' && !isPaid && (
                                        <button 
                                          onClick={() => handleDeleteVoucher(voucher.id)}
                                          className="p-2 text-slate-600 hover:bg-red-50 hover:text-red-600 rounded-lg"
                                          title="Anular"
                                        >
                                          <Trash2 size={18} />
                                        </button>
                                      )}
                                    </>
                                  )}
                                </td>
                              </tr>
                            );
                          })
                        )}
                      </tbody>
                    </table>
                  </div>
                  
                  {/* Pagination Controls */}
                  {sortedVouchers.length > itemsPerPage && (
                    <div className="flex items-center justify-between border-t border-slate-200 px-4 py-4 sm:px-6 bg-slate-50/50">
                      
                      {/* Mobile Pagination View */}
                      <div className="flex flex-1 justify-between sm:hidden items-center">
                        <button
                          onClick={() => handlePageChange(currentPage - 1)}
                          disabled={currentPage === 1}
                          className="relative inline-flex items-center rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-sm"
                        >
                          Anterior
                        </button>
                        
                        <div className="mx-2">
                          <select
                            id="mobile-page-select"
                            value={currentPage}
                            onChange={(e) => handlePageChange(Number(e.target.value))}
                            className="bg-white border border-slate-300 text-slate-700 rounded-lg px-2.5 py-1.5 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-sm cursor-pointer"
                          >
                            {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                              <option key={page} value={page}>
                                Pág. {page} de {totalPages}
                              </option>
                            ))}
                          </select>
                        </div>

                        <button
                          onClick={() => handlePageChange(currentPage + 1)}
                          disabled={currentPage === totalPages}
                          className="relative inline-flex items-center rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-sm"
                        >
                          Siguiente
                        </button>
                      </div>

                      {/* Desktop Pagination View */}
                      <div className="hidden sm:flex sm:flex-1 sm:items-center sm:justify-between">
                        <div>
                          <p className="text-sm text-slate-600">
                            Mostrando <span className="font-semibold text-slate-800">{(currentPage - 1) * itemsPerPage + 1}</span> a{' '}
                            <span className="font-semibold text-slate-800">
                              {Math.min(currentPage * itemsPerPage, sortedVouchers.length)}
                            </span>{' '}
                            de <span className="font-semibold text-slate-800">{sortedVouchers.length}</span> comprobantes
                          </p>
                        </div>
                        <div className="flex items-center gap-3">
                          {/* Dropdown Page Relation Selector */}
                          <div className="flex items-center gap-1.5 text-xs text-slate-500 bg-white border border-slate-200 rounded-lg px-3 py-1.5 shadow-sm hover:border-slate-300 transition-colors">
                            <span className="font-medium text-slate-600">Ir a página:</span>
                            <select
                              value={currentPage}
                              onChange={(e) => handlePageChange(Number(e.target.value))}
                              className="bg-transparent border-0 text-slate-850 font-bold focus:ring-0 focus:outline-none cursor-pointer pr-1 text-xs"
                            >
                              {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                                <option key={page} value={page}>
                                  Pág. {page}
                                </option>
                              ))}
                            </select>
                          </div>

                          <nav className="isolate inline-flex -space-x-px rounded-lg shadow-sm bg-white" aria-label="Pagination">
                            {/* First Page button */}
                            <button
                              onClick={() => handlePageChange(1)}
                              disabled={currentPage === 1}
                              className="relative inline-flex items-center rounded-l-lg px-2.5 py-2 text-slate-400 ring-1 ring-inset ring-slate-200 hover:bg-slate-50 focus:z-20 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                              title="Primera Página"
                            >
                              <span className="sr-only">Primera Página</span>
                              <ChevronsLeft className="h-4 w-4" aria-hidden="true" />
                            </button>

                            {/* Previous page button */}
                            <button
                              onClick={() => handlePageChange(currentPage - 1)}
                              disabled={currentPage === 1}
                              className="relative inline-flex items-center px-2.5 py-2 text-slate-400 ring-1 ring-inset ring-slate-200 hover:bg-slate-50 focus:z-20 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                              title="Página Anterior"
                            >
                              <span className="sr-only">Anterior</span>
                              <ChevronLeft className="h-4 w-4" aria-hidden="true" />
                            </button>
                            
                            {/* Number Buttons with Ellipses */}
                            {getPageNumbers().map((page, index) => {
                              if (page === '...') {
                                return (
                                  <span
                                    key={`ellipsis-${index}`}
                                    className="relative inline-flex items-center px-3 py-2 text-sm font-semibold text-slate-400 ring-1 ring-inset ring-slate-200 select-none bg-slate-50/50"
                                  >
                                    ...
                                  </span>
                                );
                              }

                              const isCurrent = page === currentPage;
                              return (
                                <button
                                  key={page}
                                  onClick={() => handlePageChange(Number(page))}
                                  aria-current={isCurrent ? 'page' : undefined}
                                  className={`relative inline-flex items-center px-4 py-2 text-sm font-semibold transition-all ${
                                    isCurrent
                                      ? 'z-10 bg-blue-600 text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 shadow-sm border-blue-600'
                                      : 'text-slate-700 ring-1 ring-inset ring-slate-200 hover:bg-slate-50 focus:z-20 focus:outline-offset-0'
                                  }`}
                                >
                                  {page}
                                </button>
                              );
                            })}

                            {/* Next Page button */}
                            <button
                              onClick={() => handlePageChange(currentPage + 1)}
                              disabled={currentPage === totalPages}
                              className="relative inline-flex items-center px-2.5 py-2 text-slate-400 ring-1 ring-inset ring-slate-200 hover:bg-slate-50 focus:z-20 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                              title="Siguiente Página"
                            >
                              <span className="sr-only">Siguiente</span>
                              <ChevronRight className="h-4 w-4" aria-hidden="true" />
                            </button>

                            {/* Last Page button */}
                            <button
                              onClick={() => handlePageChange(totalPages)}
                              disabled={currentPage === totalPages}
                              className="relative inline-flex items-center rounded-r-lg px-2.5 py-2 text-slate-400 ring-1 ring-inset ring-slate-200 hover:bg-slate-50 focus:z-20 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                              title="Última Página"
                            >
                              <span className="sr-only">Última Página</span>
                              <ChevronsRight className="h-4 w-4" aria-hidden="true" />
                            </button>
                          </nav>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {view === 'create' && (
              <VoucherForm 
                initialData={selectedVoucher || undefined}
                onSave={saveVoucher} 
                onCancel={() => setView('list')} 
                companySettings={companySettings}
              />
            )}

            {view === 'edit' && selectedVoucher && (
              <VoucherForm 
                initialData={selectedVoucher} 
                onSave={saveVoucher} 
                onCancel={() => { setSelectedVoucher(null); setView('list'); }}
                readOnly={currentUser.role === 'viewer' || selectedVoucher.status === 'pagado' || selectedVoucher.status === 'anulado'}
                companySettings={companySettings}
              />
            )}

            {view === 'preview' && selectedVoucher && (
              <div className="space-y-6">
                <div className="flex justify-between items-center print:hidden">
                  <button 
                    onClick={() => setView('list')}
                    className="text-slate-600 hover:text-slate-900 flex items-center gap-2"
                  >
                    ← Volver al listado
                  </button>
                  <div className="flex gap-2">
                    <button 
                      onClick={handleExportPDF}
                      className="bg-green-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 shadow-lg hover:bg-green-500 transition-all"
                    >
                      <Download size={20} /> Exportar PDF
                    </button>
                    <button 
                      onClick={handlePrint}
                      className="bg-blue-900 text-white px-4 py-2 rounded-lg flex items-center gap-2 shadow-lg hover:bg-blue-800 transition-all"
                    >
                      <Printer size={20} /> Imprimir
                    </button>
                  </div>
                </div>
                
                <div className="flex justify-center print:block">
                  <div ref={previewRef} className="w-full max-w-[200mm]">
                    <VoucherPreview voucher={selectedVoucher} companySettings={companySettings} />
                  </div>
                </div>
              </div>
            )}
          </>
        )}
          </div>
        </main>
      </div>

      {/* Change Password Modal */}
      {isChangePasswordModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full overflow-hidden">
            <div className="bg-blue-50 p-4 border-b border-blue-100 flex justify-between items-center">
              <h3 className="text-lg font-bold text-blue-800 flex items-center gap-2">
                <Lock size={20} /> Cambiar Contraseña
              </h3>
              <button 
                onClick={() => {
                  setIsChangePasswordModalOpen(false);
                  setChangePasswordError('');
                  setChangePasswordSuccess('');
                  setChangePasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
                }}
                className="text-blue-400 hover:text-blue-600 transition-colors"
              >
                <X size={20} />
              </button>
            </div>
            
            <form onSubmit={handleChangePassword} className="p-6 space-y-4">
              {changePasswordError && (
                <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm flex items-center gap-2">
                  <XCircle className="h-4 w-4" /> {changePasswordError}
                </div>
              )}
              {changePasswordSuccess && (
                <div className="bg-green-50 text-green-600 p-3 rounded-lg text-sm flex items-center gap-2">
                  <CheckCircle className="h-4 w-4" /> {changePasswordSuccess}
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Contraseña Actual</label>
                <input
                  type="password"
                  value={changePasswordData.currentPassword}
                  onChange={(e) => setChangePasswordData({...changePasswordData, currentPassword: e.target.value})}
                  className="w-full p-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Nueva Contraseña</label>
                <input
                  type="password"
                  value={changePasswordData.newPassword}
                  onChange={(e) => setChangePasswordData({...changePasswordData, newPassword: e.target.value})}
                  className="w-full p-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Confirmar Nueva Contraseña</label>
                <input
                  type="password"
                  value={changePasswordData.confirmPassword}
                  onChange={(e) => setChangePasswordData({...changePasswordData, confirmPassword: e.target.value})}
                  className="w-full p-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                  required
                />
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <button 
                  type="button"
                  onClick={() => setIsChangePasswordModalOpen(false)}
                  className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg font-medium transition-colors"
                >
                  Cancelar
                </button>
                <button 
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors shadow-sm"
                >
                  Actualizar Contraseña
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Payment Modal */}
      {isPaymentModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full overflow-hidden">
            <div className="bg-green-50 p-4 border-b border-green-100 flex justify-between items-center">
              <h3 className="text-lg font-bold text-green-800 flex items-center gap-2">
                <CheckCircle size={20} /> Registrar Pago
              </h3>
              <button 
                onClick={() => setIsPaymentModalOpen(false)}
                className="text-green-400 hover:text-green-600 transition-colors"
              >
                <X size={20} />
              </button>
            </div>
            
            <div className="p-6 space-y-4">
              <p className="text-slate-600 mb-4">
                Ingrese los detalles del pago para el comprobante <span className="font-bold">{selectedVoucher?.number}</span>
              </p>
              
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Fecha de Pago</label>
                <input 
                  type="date" 
                  value={paymentData.date}
                  onChange={(e) => setPaymentData({...paymentData, date: e.target.value})}
                  className="w-full p-2 border border-slate-300 rounded text-sm focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">DNI Receptor</label>
                  <input 
                    type="text" 
                    value={paymentData.dni}
                    onChange={(e) => setPaymentData({...paymentData, dni: e.target.value})}
                    placeholder="DNI"
                    className="w-full p-2 border border-slate-300 rounded text-sm focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">RUC Receptor</label>
                  <input 
                    type="text" 
                    value={paymentData.ruc}
                    onChange={(e) => setPaymentData({...paymentData, ruc: e.target.value})}
                    placeholder="RUC"
                    className="w-full p-2 border border-slate-300 rounded text-sm focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none"
                  />
                </div>
              </div>
              
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Importe Pagado</label>
                <input 
                  type="number" 
                  value={paymentData.amount}
                  onChange={(e) => setPaymentData({...paymentData, amount: parseFloat(e.target.value)})}
                  className="w-full p-2 border border-slate-300 rounded text-sm focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none bg-slate-100 text-slate-500 cursor-not-allowed"
                  disabled
                />
              </div>
            </div>
            
            <div className="bg-slate-50 p-4 flex justify-end gap-3 border-t border-slate-100">
              <button 
                onClick={() => setIsPaymentModalOpen(false)}
                className="px-4 py-2 text-slate-600 hover:bg-slate-200 rounded-lg font-medium transition-colors"
              >
                Cancelar
              </button>
              <button 
                onClick={confirmPayment}
                className="px-4 py-2 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 transition-colors shadow-md flex items-center gap-2"
              >
                <CheckCircle size={18} /> Confirmar Pago
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {isDeleteModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full overflow-hidden">
            <div className="bg-red-50 p-4 border-b border-red-100 flex justify-between items-center">
              <h3 className="text-lg font-bold text-red-800 flex items-center gap-2">
                <Trash2 size={20} /> Eliminar Comprobante
              </h3>
              <button 
                onClick={() => setIsDeleteModalOpen(false)}
                className="text-red-400 hover:text-red-600 transition-colors"
              >
                <X size={20} />
              </button>
            </div>
            
            <div className="p-6 space-y-4">
              <p className="text-slate-600 mb-4">
                ¿Está seguro que desea eliminar este registro? Esta acción no se puede deshacer.
              </p>
              
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Fecha de Registro</label>
                <input 
                  type="text" 
                  value={new Date().toLocaleString('es-PE')} 
                  disabled 
                  className="w-full p-2 bg-slate-100 border border-slate-200 rounded text-slate-500 text-sm"
                />
              </div>
              
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Usuario que Registra</label>
                <input 
                  type="text" 
                  value={currentUser?.fullName || ''} 
                  disabled 
                  className="w-full p-2 bg-slate-100 border border-slate-200 rounded text-slate-500 text-sm"
                />
              </div>
              
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Motivo de Eliminación</label>
                <select 
                  value={deleteReason}
                  onChange={(e) => setDeleteReason(e.target.value)}
                  className="w-full p-2 border border-slate-300 rounded text-sm focus:ring-2 focus:ring-red-500 focus:border-red-500 outline-none"
                >
                  <option value="">Seleccione un motivo...</option>
                  <option value="error_digitacion">Error de digitación</option>
                  <option value="duplicidad">Duplicidad</option>
                  <option value="anulacion">Anulación</option>
                  <option value="otros">Otros</option>
                </select>
              </div>
              
              {deleteReason === 'otros' && (
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Especifique el motivo</label>
                  <textarea
                    value={customDeleteReason}
                    onChange={(e) => setCustomDeleteReason(e.target.value)}
                    className="w-full p-2 border border-slate-300 rounded text-sm focus:ring-2 focus:ring-red-500 focus:border-red-500 outline-none"
                    placeholder="Ingrese la justificación..."
                    rows={3}
                  />
                </div>
              )}
            </div>
            
            <div className="bg-slate-50 p-4 flex justify-end gap-3 border-t border-slate-100">
              <button 
                onClick={() => setIsDeleteModalOpen(false)}
                className="px-4 py-2 text-slate-600 hover:bg-slate-200 rounded-lg font-medium transition-colors"
              >
                Cancelar
              </button>
              <button 
                onClick={confirmDelete}
                disabled={!deleteReason || (deleteReason === 'otros' && !customDeleteReason.trim())}
                className={`px-4 py-2 text-white rounded-lg font-medium flex items-center gap-2 transition-colors ${
                  (deleteReason && (deleteReason !== 'otros' || customDeleteReason.trim())) 
                    ? 'bg-red-600 hover:bg-red-700 shadow-md' 
                    : 'bg-red-300 cursor-not-allowed'
                }`}
              >
                <Trash2 size={18} /> Confirmar Eliminación
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Loading Overlay */}
      {isLoading && (
        <div className="fixed inset-0 bg-black/20 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-xl shadow-xl flex flex-col items-center gap-4">
            <Loader2 className="h-10 w-10 text-blue-600 animate-spin" />
            <p className="text-slate-600 font-medium">Procesando...</p>
          </div>
        </div>
      )}
    </div>
  );
}

