export const normalizePhone = (phone) => {
  if (!phone) return '';
  let cleaned = phone.toString().replace(/\D/g, '');
  if (cleaned.startsWith('0020')) cleaned = cleaned.slice(4);
  else if (cleaned.startsWith('20')) cleaned = cleaned.slice(2);
  while (cleaned.startsWith('0')) {
    cleaned = cleaned.slice(1);
  }
  return cleaned;
};

export const normalizeSize = (size) => {
  if (!size) return '';
  const trimmed = String(size).trim().toUpperCase();
  // Alias resolution: Convert 2XL to XXL, 3XL to XXXL, etc.
  if (trimmed === '2XL') return 'XXL';
  if (trimmed === '3XL') return 'XXXL';
  if (trimmed === '4XL') return 'XXXXL';
  return trimmed;
};

export const getAvailableStock = (product, size) => {
  if (!product || !size) return 0;
  const norm = normalizeSize(size);
  const rawStr = String(size).trim();
  const rawUpper = rawStr.toUpperCase();

  // Keys to check in order of priority:
  // 1. Normalized size (e.g. 'XXL')
  // 2. Raw uppercase / trimmed
  // 3. Alternative aliases (e.g. if 'XXL', check '2XL'; if '2XL', check 'XXL')
  const keys = [norm, rawUpper, rawStr];
  if (norm === 'XXL' || rawUpper === '2XL') {
    keys.push('XXL', '2XL');
  } else if (norm === 'XXXL' || rawUpper === '3XL') {
    keys.push('XXXL', '3XL');
  } else if (norm === 'XXXXL' || rawUpper === '4XL') {
    keys.push('XXXXL', '4XL');
  }
  const uniqueKeys = Array.from(new Set(keys.filter(Boolean)));

  // 1. Resolve Initial Stock (support dynamic object, legacy flat keys, aliases, and case-insensitivity)
  let initial = undefined;
  for (const k of uniqueKeys) {
    const val = product.initialStock?.[k] 
             ?? product.initial?.[k] 
             ?? product[`initialStock${k}`] 
             ?? product[`initialStock${k.toLowerCase()}`]
             ?? product[`stock${k}`] 
             ?? product[`stock${k.toLowerCase()}`];
    if (val !== undefined && val !== null) {
      initial = Number(val);
      break;
    }
  }
  if (initial === undefined) initial = 0;
  
  // 2. Resolve Sold Count
  let sold = undefined;
  for (const k of uniqueKeys) {
    const val = product.sold?.[k] 
             ?? product[`sold${k}`] 
             ?? product[`sold${k.toLowerCase()}`];
    if (val !== undefined && val !== null) {
      sold = Number(val);
      break;
    }
  }
  if (sold === undefined) sold = 0;

  return Math.max(0, Number(initial) - Number(sold));
};

export const getProductSizes = (product) => {
  if (!product) return ['M', 'L', 'XL', 'XXL'];
  const sizes = new Set();
  
  // 1. From dynamic initialStock object
  if (product.initialStock && typeof product.initialStock === 'object') {
    Object.keys(product.initialStock).forEach(s => {
      const n = normalizeSize(s);
      if (n) sizes.add(n);
    });
  }
  
  // 2. From dynamic initial object (fallback)
  if (product.initial && typeof product.initial === 'object') {
    Object.keys(product.initial).forEach(s => {
      const n = normalizeSize(s);
      if (n) sizes.add(n);
    });
  }

  // 3. From dynamic sold object
  if (product.sold && typeof product.sold === 'object') {
    Object.keys(product.sold).forEach(s => {
      const n = normalizeSize(s);
      if (n) sizes.add(n);
    });
  }
  
  // 4. From legacy flat keys (initialStockM, stockM, soldM, etc.)
  const candidateSizes = ['XS', 'S', 'M', 'L', 'XL', 'XXL', '2XL', 'XXXL', '3XL', 'XXXXL', '4XL', 'Oversize', 'Free Size'];
  candidateSizes.forEach(s => {
    if (
      product[`initialStock${s}`] !== undefined || 
      product[`initialStock${s.toLowerCase()}`] !== undefined || 
      product[`stock${s}`] !== undefined || 
      product[`stock${s.toLowerCase()}`] !== undefined || 
      product[`sold${s}`] !== undefined ||
      product[`sold${s.toLowerCase()}`] !== undefined
    ) {
      const n = normalizeSize(s);
      if (n) sizes.add(n);
    }
  });

  if (sizes.size === 0) {
    return ['M', 'L', 'XL', 'XXL'];
  }

  const standardOrder = ['XS', 'S', 'M', 'L', 'XL', 'XXL', 'XXXL', 'XXXXL', 'Oversize', 'Free Size'];
  const arr = Array.from(sizes);
  arr.sort((a, b) => {
    const idxA = standardOrder.indexOf(a);
    const idxB = standardOrder.indexOf(b);
    if (idxA !== -1 && idxB !== -1) return idxA - idxB;
    if (idxA !== -1) return -1;
    if (idxB !== -1) return 1;
    return a.localeCompare(b);
  });

  return arr;
};
