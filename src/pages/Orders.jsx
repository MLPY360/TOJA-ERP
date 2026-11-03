import React from 'react';
import OrdersView from '../components/OrdersView';

/**
 * Orders Page Component
 * Wraps and renders the canonical OrdersView table with comprehensive governorate guards.
 */
export default function Orders() {
  return (
    <div className="w-full">
      <OrdersView />
    </div>
  );
}

export { OrdersView };

