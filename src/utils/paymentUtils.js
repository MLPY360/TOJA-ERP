/**
 * TOJA ERP Payment Identification & Utility Helpers
 */

export const isOrderPaidOnline = (order) => {
  if (!order) return false;
  if (order.paidOnline === true) return true;
  const status = (order.paymentStatus || '').toLowerCase();
  if (status === 'paid') return true;
  const code = (order.paymentMethodCode || '').toLowerCase();
  if (code === 'card') return true;
  const method = (order.paymentMethod || '').toLowerCase();
  if (
    method.includes('card') ||
    method.includes('visa') ||
    method.includes('mastercard') ||
    method.includes('meeza') ||
    method.includes('online')
  ) {
    return true;
  }
  return false;
};

export const getOrderPaymentInfo = (order, isArabic = false) => {
  if (!order) {
    return {
      type: 'cod',
      label: isArabic ? 'الدفع عند الاستلام' : 'Cash on Delivery',
      isPaid: false,
      collectAmount: 0
    };
  }

  const total = Number(
    order.totalAmount || order.total || order.totals?.total || order.totals?.grandTotal || 0
  );

  if (isOrderPaidOnline(order)) {
    return {
      type: 'card',
      label: isArabic ? 'بطاقة بنكية (فيزا / ماستركارد)' : 'Online Card (Visa/MC)',
      badgeText: isArabic ? 'مدفوع مسبقاً - تحصيل 0 ج.م' : 'PAID ONLINE • Collect 0 EGP',
      isPaid: true,
      collectAmount: 0,
      transactionId: order.transactionId || order.paymentDetails?.transactionId || null,
      cardBrand: order.paymentDetails?.cardBrand || 'Visa / Mastercard'
    };
  }

  const code = (order.paymentMethodCode || '').toLowerCase();
  const method = (order.paymentMethod || '').toLowerCase();

  if (
    code === 'wallet' ||
    method.includes('wallet') ||
    method.includes('instapay') ||
    method.includes('محفظة')
  ) {
    const isWalletPaid = (order.paymentStatus || '').toLowerCase() === 'paid';
    return {
      type: 'wallet',
      label: isArabic ? 'محفظة إلكترونية / إنستاباي' : 'Mobile Wallet / InstaPay',
      badgeText: isArabic
        ? isWalletPaid
          ? 'محفظة (مدفوع)'
          : 'محفظة (بانتظار التأكيد)'
        : isWalletPaid
        ? 'Wallet (Confirmed)'
        : 'Wallet (Pending)',
      isPaid: isWalletPaid,
      collectAmount: isWalletPaid ? 0 : total,
      transactionId: order.transactionId || null
    };
  }

  // Default: Cash on Delivery (COD)
  return {
    type: 'cod',
    label: isArabic ? 'الدفع عند الاستلام (COD)' : 'Cash on Delivery (COD)',
    badgeText: isArabic
      ? `تحصيل: ${total.toLocaleString('en-EG')} ج.م`
      : `COD: Collect ${total.toLocaleString('en-EG')} EGP`,
    isPaid: false,
    collectAmount: total
  };
};

