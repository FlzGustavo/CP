import { Voucher } from '../types/voucher';
import { User } from '../types/user';

const API_URL = 'https://script.google.com/macros/s/AKfycbyNaFgt8jv8c54YY0_vitJJNVMzNjfi78lpr6u_iLQr-XKTB3Pirz0sDcH4f1-NZzkRgw/exec';

// Helper to check if running in GAS environment
const isGasEnvironment = () => {
  return typeof window !== 'undefined' && (window as any).google && (window as any).google.script;
};

// Helper to wrap google.script.run in a Promise
const runGoogleScript = (functionName: string, ...args: any[]): Promise<any> => {
  return new Promise((resolve, reject) => {
    if (!isGasEnvironment()) {
      reject(new Error('google.script.run not available'));
      return;
    }

    (window as any).google.script.run
      .withSuccessHandler((result: any) => {
        resolve(result);
      })
      .withFailureHandler((error: Error) => {
        reject(error);
      })
      [functionName](...args);
  });
};

export const api = {
  getUsers: async (): Promise<User[]> => {
    try {
      if (isGasEnvironment()) {
        return await runGoogleScript('apiGetUsers');
      } else {
        const response = await fetch(`${API_URL}?action=getUsers`);
        if (!response.ok) throw new Error('Failed to fetch users');
        return await response.json();
      }
    } catch (error) {
      console.error('Error fetching users:', error);
      return [];
    }
  },

  getVouchers: async (): Promise<Voucher[]> => {
    try {
      if (isGasEnvironment()) {
        return await runGoogleScript('apiGetVouchers');
      } else {
        const response = await fetch(`${API_URL}?action=getVouchers`);
        if (!response.ok) throw new Error('Failed to fetch vouchers');
        return await response.json();
      }
    } catch (error) {
      console.error('Error fetching vouchers:', error);
      return [];
    }
  },

  saveVoucher: async (voucher: Voucher): Promise<{ success: boolean; id?: string; error?: string }> => {
    try {
      if (isGasEnvironment()) {
        return await runGoogleScript('apiSaveVoucher', voucher);
      } else {
        const response = await fetch(API_URL, {
          method: 'POST',
          body: JSON.stringify({ action: 'saveVoucher', voucher }),
          headers: { 'Content-Type': 'text/plain' },
        });
        return await response.json();
      }
    } catch (error) {
      console.error('Error saving voucher:', error);
      return { success: false, error: String(error) };
    }
  },

  deleteVoucher: async (id: string, reason: string, user: string): Promise<{ success: boolean; error?: string }> => {
    try {
      if (isGasEnvironment()) {
        return await runGoogleScript('apiDeleteVoucher', id, reason, user);
      } else {
        const response = await fetch(API_URL, {
          method: 'POST',
          body: JSON.stringify({ action: 'deleteVoucher', id, reason, user }),
          headers: { 'Content-Type': 'text/plain' },
        });
        return await response.json();
      }
    } catch (error) {
      console.error('Error deleting voucher:', error);
      return { success: false, error: String(error) };
    }
  },

  saveUser: async (user: User): Promise<{ success: boolean; id?: string; error?: string }> => {
    try {
      if (isGasEnvironment()) {
        return await runGoogleScript('apiSaveUser', user);
      } else {
        const response = await fetch(API_URL, {
          method: 'POST',
          body: JSON.stringify({ action: 'saveUser', user }),
          headers: { 'Content-Type': 'text/plain' },
        });
        return await response.json();
      }
    } catch (error) {
      console.error('Error saving user:', error);
      return { success: false, error: String(error) };
    }
  },
  
  deleteUser: async (id: string): Promise<{ success: boolean; error?: string }> => {
      try {
      if (isGasEnvironment()) {
        return await runGoogleScript('apiDeleteUser', id);
      } else {
        const response = await fetch(API_URL, {
          method: 'POST',
          body: JSON.stringify({ action: 'deleteUser', id }),
          headers: { 'Content-Type': 'text/plain' },
        });
        return await response.json();
      }
    } catch (error) {
      console.error('Error deleting user:', error);
      return { success: false, error: String(error) };
    }
  },
  
  login: async (username: string, password: string): Promise<{ success: boolean; user?: User; message?: string }> => {
      try {
        if (isGasEnvironment()) {
          return await runGoogleScript('apiLogin', username, password);
        } else {
          const response = await fetch(API_URL, {
            method: 'POST',
            body: JSON.stringify({ action: 'login', username, password }),
            headers: { 'Content-Type': 'text/plain' },
          });
          return await response.json();
        }
      } catch (error) {
        console.error('Error logging in:', error);
        return { success: false, message: String(error) };
      }
  },

  getSettings: async (): Promise<any> => {
    try {
      if (isGasEnvironment()) {
        return await runGoogleScript('apiGetSettings');
      } else {
        const response = await fetch(`${API_URL}?action=getSettings`);
        if (!response.ok) throw new Error('Failed to fetch settings');
        return await response.json();
      }
    } catch (error) {
      console.error('Error fetching settings:', error);
      return {};
    }
  },

  saveSettings: async (settings: any): Promise<{ success: boolean; error?: string }> => {
    try {
      if (isGasEnvironment()) {
        return await runGoogleScript('apiSaveSettings', settings);
      } else {
        const response = await fetch(API_URL, {
          method: 'POST',
          body: JSON.stringify({ action: 'saveSettings', settings }),
          headers: { 'Content-Type': 'text/plain' },
        });
        return await response.json();
      }
    } catch (error) {
      console.error('Error saving settings:', error);
      return { success: false, error: String(error) };
    }
  }
};

