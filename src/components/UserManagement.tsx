import React, { useState, useEffect } from 'react';
import { User } from '../types/user';
import { api } from '../services/api';
import { formatDateTime } from '../utils/dateUtils';
import { Plus, Edit, Trash2, User as UserIcon, Shield, CheckCircle, XCircle, Search, RefreshCw } from 'lucide-react';

interface UserManagementProps {
  currentUser: User;
  onClose: () => void;
  onSync?: () => void;
}

export const UserManagement: React.FC<UserManagementProps> = ({ currentUser, onClose, onSync }) => {
  const [users, setUsers] = useState<User[]>([]);
  const [view, setView] = useState<'list' | 'form'>('list');
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterRole, setFilterRole] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [isRefreshing, setIsRefreshing] = useState(false);

  const fetchUsers = async () => {
    setIsRefreshing(true);
    const fetchedUsers = await api.getUsers();
    setUsers(fetchedUsers);
    setIsRefreshing(false);
  };

  const handleSync = async () => {
    if (onSync) {
      setIsRefreshing(true);
      await onSync();
      // After global sync, we also want to refresh the local users list
      const fetchedUsers = await api.getUsers();
      setUsers(fetchedUsers);
      setIsRefreshing(false);
    } else {
      await fetchUsers();
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  // Form state
  const [formData, setFormData] = useState<Partial<User>>({
    username: '',
    password: '',
    fullName: '',
    role: 'user',
    status: 'active'
  });

  const handleEdit = (user: User) => {
    setEditingUser(user);
    setFormData({
      username: user.username,
      fullName: user.fullName,
      role: user.role,
      status: user.status,
      password: '' // Don't show password
    });
    setView('form');
  };

  const handleDelete = async (userId: string) => {
    if (userId === currentUser.id) {
      alert('No puedes eliminar tu propio usuario.');
      return;
    }
    if (confirm('¿Está seguro de eliminar este usuario?')) {
      const result = await api.deleteUser(userId);
      if (result.success) {
        const newUsers = users.filter(u => u.id !== userId);
        setUsers(newUsers);
      } else {
        alert('Error al eliminar usuario: ' + (result.error || 'Unknown error'));
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    let userToSave: User;

    if (editingUser) {
      // Update existing user
      userToSave = {
        ...editingUser,
        username: formData.username!,
        fullName: formData.fullName!,
        role: formData.role as 'admin' | 'user' | 'viewer',
        status: formData.status as 'active' | 'inactive',
        // Only update password if provided
        ...(formData.password ? { password: formData.password } : {})
      };
    } else {
      // Create new user
      if (!formData.password) {
        alert('La contraseña es obligatoria para nuevos usuarios.');
        return;
      }
      
      // Check if username exists
      if (users.some(u => u.username === formData.username)) {
        alert('El nombre de usuario ya existe.');
        return;
      }

      userToSave = {
        id: '', // Let backend generate ID
        username: formData.username!,
        password: formData.password!,
        fullName: formData.fullName!,
        role: formData.role as 'admin' | 'user' | 'viewer',
        status: formData.status as 'active' | 'inactive',
        createdAt: new Date().toISOString()
      };
    }
    
    const result = await api.saveUser(userToSave);
    
    if (result.success) {
      if (editingUser) {
        setUsers(users.map(u => u.id === userToSave.id ? userToSave : u));
      } else {
        // Use the ID returned from the server
        const newUserWithId = { ...userToSave, id: result.id || userToSave.id };
        setUsers([...users, newUserWithId]);
      }
      
      setView('list');
      setEditingUser(null);
      setFormData({
        username: '',
        password: '',
        fullName: '',
        role: 'user',
        status: 'active'
      });
    } else {
      alert('Error al guardar usuario: ' + (result.error || 'Unknown error'));
    }
  };

  const filteredUsers = users.filter(user => {
    const matchesSearch = user.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.username.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesRole = filterRole === 'all' || user.role === filterRole;
    const matchesStatus = filterStatus === 'all' || user.status === filterStatus;
    
    return matchesSearch && matchesRole && matchesStatus;
  });

  if (view === 'form') {
    return (
      <div className="bg-white rounded-xl shadow-sm p-6 max-w-2xl mx-auto">
        <h2 className="text-xl font-bold text-slate-800 mb-6 flex items-center gap-2">
          {editingUser ? <Edit size={24} /> : <Plus size={24} />}
          {editingUser ? 'Editar Usuario' : 'Nuevo Usuario'}
        </h2>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Nombre de Usuario</label>
              <input
                type="text"
                value={formData.username}
                onChange={(e) => setFormData({...formData, username: e.target.value})}
                className="w-full p-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                {editingUser ? 'Contraseña (dejar en blanco para mantener)' : 'Contraseña'}
              </label>
              <input
                type="password"
                value={formData.password}
                onChange={(e) => setFormData({...formData, password: e.target.value})}
                className="w-full p-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                required={!editingUser}
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Nombre Completo</label>
            <input
              type="text"
              value={formData.fullName}
              onChange={(e) => setFormData({...formData, fullName: e.target.value})}
              className="w-full p-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
              required
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Rol</label>
              <select
                value={formData.role}
                onChange={(e) => setFormData({...formData, role: e.target.value as 'admin' | 'user' | 'viewer'})}
                className="w-full p-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
              >
                <option value="user">Usuario</option>
                <option value="admin">Administrador</option>
                <option value="viewer">Visualizador</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Estado</label>
              <select
                value={formData.status}
                onChange={(e) => setFormData({...formData, status: e.target.value as 'active' | 'inactive'})}
                className="w-full p-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
              >
                <option value="active">Activo</option>
                <option value="inactive">Inactivo</option>
              </select>
            </div>
          </div>

          <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={() => {
                setView('list');
                setEditingUser(null);
              }}
              className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg font-medium transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors shadow-sm"
            >
              Guardar Usuario
            </button>
          </div>
        </form>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center bg-white p-4 rounded-xl shadow-sm">
        <div>
          <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
            <UserIcon className="text-blue-600" /> Gestión de Usuarios
          </h2>
          <p className="text-sm text-slate-500">Administra el acceso al sistema</p>
        </div>
        <div className="flex gap-3">
          <button 
            onClick={handleSync}
            className="bg-white hover:bg-slate-50 text-slate-600 border border-slate-200 px-4 py-2 rounded-lg flex items-center gap-2 text-sm font-medium transition-colors shadow-sm"
            title="Sincronizar con la base de datos"
          >
            <RefreshCw size={18} className={isRefreshing ? 'animate-spin' : ''} /> Sincronizar
          </button>
          <button
            onClick={onClose}
            className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg font-medium transition-colors"
          >
            Volver
          </button>
          <button
            onClick={() => {
              setEditingUser(null);
              setFormData({
                username: '',
                password: '',
                fullName: '',
                role: 'user',
                status: 'active'
              });
              setView('form');
            }}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors shadow-sm flex items-center gap-2"
          >
            <Plus size={18} /> Nuevo Usuario
          </button>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex flex-col md:flex-row gap-4 justify-between items-center">
          <div className="relative w-full md:w-96">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 h-5 w-5" />
            <input
              type="text"
              placeholder="Buscar usuarios..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
            />
          </div>
          
          <div className="flex gap-2 w-full md:w-auto">
            <select
              value={filterRole}
              onChange={(e) => setFilterRole(e.target.value)}
              className="p-2 border border-slate-200 rounded-lg text-sm text-slate-600 focus:ring-2 focus:ring-blue-500 outline-none"
            >
              <option value="all">Todos los Roles</option>
              <option value="admin">Administrador</option>
              <option value="user">Usuario</option>
              <option value="viewer">Visualizador</option>
            </select>
            
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="p-2 border border-slate-200 rounded-lg text-sm text-slate-600 focus:ring-2 focus:ring-blue-500 outline-none"
            >
              <option value="all">Todos los Estados</option>
              <option value="active">Activo</option>
              <option value="inactive">Inactivo</option>
            </select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="p-4 font-semibold text-slate-600">Usuario</th>
                <th className="p-4 font-semibold text-slate-600">Nombre Completo</th>
                <th className="p-4 font-semibold text-slate-600">Rol</th>
                <th className="p-4 font-semibold text-slate-600">Estado</th>
                <th className="p-4 font-semibold text-slate-600">Último Acceso</th>
                <th className="p-4 font-semibold text-slate-600 text-center">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredUsers.map(user => (
                <tr key={user.id} className="hover:bg-slate-50 transition-colors">
                  <td className="p-4 font-medium text-slate-900">{user.username}</td>
                  <td className="p-4 text-slate-600">{user.fullName}</td>
                  <td className="p-4">
                    <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${
                      user.role === 'admin' ? 'bg-purple-100 text-purple-700' : 
                      user.role === 'viewer' ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'
                    }`}>
                      {user.role === 'admin' ? <Shield size={12} /> : user.role === 'viewer' ? <Search size={12} /> : <UserIcon size={12} />}
                      {user.role === 'admin' ? 'Administrador' : user.role === 'viewer' ? 'Visualizador' : 'Usuario'}
                    </span>
                  </td>
                  <td className="p-4">
                    <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${
                      user.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-500'
                    }`}>
                      {user.status === 'active' ? <CheckCircle size={12} /> : <XCircle size={12} />}
                      {user.status === 'active' ? 'Activo' : 'Inactivo'}
                    </span>
                  </td>
                  <td className="p-4 text-slate-500 text-xs">
                    {formatDateTime(user.lastLogin)}
                  </td>
                  <td className="p-4 flex justify-center gap-2">
                    <button
                      onClick={() => handleEdit(user)}
                      className="p-2 text-slate-600 hover:bg-amber-50 hover:text-amber-600 rounded-lg transition-colors"
                      title="Editar"
                    >
                      <Edit size={18} />
                    </button>
                    {user.id !== currentUser.id && (
                      <button
                        onClick={() => handleDelete(user.id)}
                        className="p-2 text-slate-600 hover:bg-red-50 hover:text-red-600 rounded-lg transition-colors"
                        title="Eliminar"
                      >
                        <Trash2 size={18} />
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
