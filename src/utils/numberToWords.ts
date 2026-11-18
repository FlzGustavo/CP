export function numberToWords(amount: number): string {
  const integerPart = Math.floor(amount);
  const decimalPart = Math.round((amount - integerPart) * 100);
  
  const units = ['', 'UN', 'DOS', 'TRES', 'CUATRO', 'CINCO', 'SEIS', 'SIETE', 'OCHO', 'NUEVE'];
  const tens = ['', 'DIEZ', 'VEINTE', 'TREINTA', 'CUARENTA', 'CINCUENTA', 'SESENTA', 'SETENTA', 'OCHENTA', 'NOVENTA'];
  const teens = ['DIEZ', 'ONCE', 'DOCE', 'TRECE', 'CATORCE', 'QUINCE', 'DIECISEIS', 'DIECISIETE', 'DIECIOCHO', 'DIECINUEVE'];
  const hundreds = ['', 'CIENTO', 'DOSCIENTOS', 'TRESCIENTOS', 'CUATROCIENTOS', 'QUINIENTOS', 'SEISCIENTOS', 'SETECIENTOS', 'OCHOCIENTOS', 'NOVECIENTOS'];

  function convertGroup(n: number): string {
    if (n === 0) return '';
    if (n === 100) return 'CIEN';
    
    let str = '';
    
    // Hundreds
    const h = Math.floor(n / 100);
    const remainder = n % 100;
    if (h > 0) str += hundreds[h] + ' ';
    
    // Tens and Units
    if (remainder > 0) {
      if (remainder < 10) {
        str += units[remainder];
      } else if (remainder < 20) {
        str += teens[remainder - 10];
      } else {
        const t = Math.floor(remainder / 10);
        const u = remainder % 10;
        str += tens[t];
        if (u > 0) {
          if (t === 2) str = 'VEINTI' + units[u]; // Veintiuno, Veintidos...
          else str += ' Y ' + units[u];
        }
      }
    }
    return str.trim();
  }

  let words = '';
  
  if (integerPart === 0) words = 'CERO';
  else if (integerPart >= 1000) {
    const thousands = Math.floor(integerPart / 1000);
    const remainder = integerPart % 1000;
    
    if (thousands === 1) words += 'MIL ';
    else words += convertGroup(thousands) + ' MIL ';
    
    if (remainder > 0) words += convertGroup(remainder);
  } else {
    words += convertGroup(integerPart);
  }
  
  return `${words} Y ${decimalPart.toString().padStart(2, '0')}/100 SOLES`;
}
