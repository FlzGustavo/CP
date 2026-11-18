export interface User {
  id: string;
  username: string;
  password?: string; // Optional for display/editing, required for creation/login
  fullName: string;
  role: 'admin' | 'user' | 'viewer';
  status: 'active' | 'inactive';
  createdAt: string;
  lastLogin?: string;
}
