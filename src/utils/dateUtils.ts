export const parseDateParts = (dateStr: string | undefined) => {
  const now = new Date();
  const defaultParts = {
    day: now.getDate().toString().padStart(2, '0'),
    month: (now.getMonth() + 1).toString().padStart(2, '0'),
    year: now.getFullYear().toString()
  };

  if (!dateStr) return defaultParts;

  // Handle YYYY-MM-DD (ISO date part)
  // This avoids timezone issues by not using new Date() for simple dates
  if (dateStr.includes('T')) {
    dateStr = dateStr.split('T')[0];
  }

  const isoMatch = dateStr.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (isoMatch) {
    return {
      day: isoMatch[3],
      month: isoMatch[2],
      year: isoMatch[1]
    };
  }

  // Handle DD/MM/YYYY or DD-MM-YYYY
  const dmyMatch = dateStr.match(/^(\d{1,2})[\/-](\d{1,2})[\/-](\d{4})$/);
  if (dmyMatch) {
    return {
      day: dmyMatch[1].padStart(2, '0'),
      month: dmyMatch[2].padStart(2, '0'),
      year: dmyMatch[3]
    };
  }

  // Fallback to Date object
  const date = new Date(dateStr);
  if (!isNaN(date.getTime())) {
    return {
      day: date.getDate().toString().padStart(2, '0'),
      month: (date.getMonth() + 1).toString().padStart(2, '0'),
      year: date.getFullYear().toString()
    };
  }

  return defaultParts;
};

export const formatDateTime = (dateStr: string | undefined) => {
  if (!dateStr) return '-';
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return dateStr;
  
  const day = date.getDate().toString().padStart(2, '0');
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const year = date.getFullYear();
  const hours = date.getHours().toString().padStart(2, '0');
  const minutes = date.getMinutes().toString().padStart(2, '0');
  
  return `${day}/${month}/${year} ${hours}:${minutes}`;
};

export const formatDate = (dateStr: string | undefined) => {
  if (!dateStr) return '-';
  const parts = parseDateParts(dateStr);
  return `${parts.day}/${parts.month}/${parts.year}`;
};
