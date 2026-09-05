import React, { useRef } from 'react';
import { motion } from 'framer-motion';
import { X, Printer, Package, MapPin, Phone, User, CheckCircle } from 'lucide-react';
import { translations } from '../translations';
import { useStore } from '../store/useStore';

export default function ThermalShippingLabelModal({ isOpen, onClose, order }) {
  const { language } = useStore();
  const t = translations[language];

  if (!isOpen || !order) return null;

  const handlePrint = () => {
    window.print();
  };

  const displayId = order.displayId || order.orderId || order.id?.slice(0, 8)?.toUpperCase() || 'ORD-0000';
  const orderTotal = Number(order.total ?? order.totals?.grandTotal ?? 0);
  const items = order.items || [];
  const totalPieces = items.reduce((sum, item) => sum + (Number(item.qty || item.quantity) || 1), 0);
  const carrier = order.courierDetails?.carrierName || order.courierReconciliation?.carrierName || 'Bosta Express';
  const trackingNumber = order.courierDetails?.trackingNumber || order.trackingNumber || displayId;

  // Visual Barcode generator
  const renderBarcodeBars = () => {
    const pattern = [2, 1, 3, 1, 2, 4, 1, 2, 3, 1, 1, 3, 2, 1, 4, 1, 2, 1, 3, 2, 1, 4, 2, 1, 3, 1, 2, 1, 4, 2];
    return (
      <div className="flex items-stretch justify-center h-12 gap-[2px] my-1 overflow-hidden px-4">
        {pattern.map((width, idx) => (
          <div
            key={idx}
            className="bg-black"
            style={{ width: `${width * 2}px` }}
          />
        ))}
      </div>
    );
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm overflow-y-auto">
      {/* Print Stylesheet */}
      <style>{`
        @media print {
          body * {
            visibility: hidden !important;
          }
          #thermal-label-print, #thermal-label-print * {
            visibility: visible !important;
          }
          #thermal-label-print {
            position: fixed !important;
            left: 0 !important;
            top: 0 !important;
            width: 100vw !important;
            height: 100vh !important;
            margin: 0 !important;
            padding: 12px !important;
            background: #ffffff !important;
            color: #000000 !important;
            box-shadow: none !important;
            border: 2px solid #000 !important;
            z-index: 99999 !important;
          }
          @page {
            size: 4in 6in;
            margin: 0;
          }
        }
      `}</style>

      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="bg-slate-100 rounded-3xl shadow-2xl max-w-lg w-full flex flex-col overflow-hidden border border-slate-300 my-auto"
      >
        {/* Modal Top Bar */}
        <div className="p-4 bg-white border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-2 text-slate-800">
            <Printer size={18} className="text-[#597867]" />
            <span className="font-extrabold text-sm">{t.thermalShippingLabel} (4×6")</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="flex items-center gap-1.5 px-4 py-1.5 rounded-xl bg-[#597867] hover:bg-[#465f52] text-white text-xs font-bold shadow-sm transition-colors"
            >
              <Printer size={14} />
              <span>{t.printThermal}</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* 4x6 Thermal Label Sticker Preview */}
        <div className="p-6 flex justify-center bg-slate-200/70 overflow-y-auto max-h-[80vh]">
          <div
            id="thermal-label-print"
            className="w-[380px] bg-white text-black p-4 border-2 border-black rounded-lg shadow-md font-sans text-xs flex flex-col justify-between"
            style={{ minHeight: '540px' }}
          >
            {/* Header: Brand & Return Info */}
            <div>
              <div className="flex items-center justify-between border-b-2 border-black pb-2">
                <div>
                  <h1 className="text-xl font-black tracking-wider uppercase font-mono">TOJA</h1>
                  <p className="text-[9px] font-bold text-slate-600 uppercase tracking-widest">Premium Egyptian Apparel</p>
                </div>
                <div className="text-right text-[9px] leading-tight">
                  <p className="font-black uppercase tracking-wider">{t.senderReturnAddress}</p>
                  <p className="font-semibold">Cairo / Giza, Egypt</p>
                  <p className="font-mono font-bold">Tel: 01000000000</p>
                </div>
              </div>

              {/* Carrier & Barcode Block */}
              <div className="my-2 border-b-2 border-black pb-2 text-center">
                <div className="flex items-center justify-between px-1 text-[10px] font-extrabold uppercase">
                  <span>Carrier: {carrier}</span>
                  <span className="font-mono">{new Date(order.createdAt || Date.now()).toISOString().slice(0, 10)}</span>
                </div>

                {renderBarcodeBars()}

                <div className="flex justify-between items-center px-2 font-mono text-[11px] font-black">
                  <span>*{displayId}*</span>
                  <span>TRK: {trackingNumber}</span>
                </div>
              </div>

              {/* Consignee / Recipient Block */}
              <div className="border-b-2 border-black pb-3 pt-1">
                <div className="flex items-start justify-between gap-2 mb-1.5">
                  <div className="text-[10px] font-black uppercase tracking-wider bg-black text-white px-1.5 py-0.5 rounded">
                    {t.shipTo}
                  </div>
                  <div className="border-2 border-black px-2 py-0.5 font-black text-xs uppercase tracking-wider bg-slate-100">
                    📍 {order.governorate || 'GIZA'}
                  </div>
                </div>

                <div className="space-y-1 mt-2">
                  <p className="text-base font-black uppercase text-black leading-tight">
                    {order.customerName || 'Customer'}
                  </p>
                  <p className="text-sm font-extrabold font-mono text-black">
                    📞 {order.phone}
                  </p>
                  <p className="text-[11px] font-bold text-slate-800 leading-snug">
                    {order.address || 'Address details not specified'}
                  </p>
                  {order.notes && order.notes.length > 0 && (
                    <div className="mt-1 p-1 bg-slate-100 border border-black text-[10px] font-bold">
                      Note: {order.notes[order.notes.length - 1]?.text || order.notes[0]?.text}
                    </div>
                  )}
                </div>
              </div>

              {/* Packing Slip Items */}
              <div className="py-2 border-b-2 border-black">
                <div className="flex justify-between items-center text-[10px] font-black uppercase mb-1">
                  <span>{t.packingSlip}</span>
                  <span>{totalPieces} {totalPieces === 1 ? 'Piece' : 'Pieces'}</span>
                </div>
                <table className="w-full text-start border-collapse text-[10px]">
                  <thead>
                    <tr className="border-b border-black text-slate-600">
                      <th className="py-0.5 text-start font-black">Item</th>
                      <th className="py-0.5 text-center font-black">Size</th>
                      <th className="py-0.5 text-end font-black">Qty</th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((item, idx) => (
                      <tr key={idx} className="border-b border-dashed border-slate-300">
                        <td className="py-1 text-start font-bold truncate max-w-[200px]">
                          {item.productName || 'Garment'}
                        </td>
                        <td className="py-1 text-center font-black text-xs">
                          {item.size}
                        </td>
                        <td className="py-1 text-end font-mono font-extrabold">
                          x{item.qty || item.quantity || 1}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Bottom COD Block & Courier Notice */}
            <div className="pt-2">
              {/* High Contrast COD Box */}
              <div className="border-4 border-black p-2.5 text-center bg-black text-white rounded">
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-200">
                  {t.cashOnDeliveryAmount}
                </p>
                <p className="text-2xl font-black tracking-tight font-mono my-0.5">
                  {orderTotal.toLocaleString('en-EG')} EGP
                </p>
                <p className="text-[9px] font-bold text-slate-300">
                  (Shipping & Taxes Included)
                </p>
              </div>

              {/* Customer Notice Footer */}
              <div className="mt-2 text-center text-[9px] font-extrabold text-slate-700 leading-tight">
                <p>{t.inspectionAllowed}</p>
                <p className="mt-0.5 text-[8px] font-mono text-slate-400 uppercase">Printed via TOJA ERP System</p>
              </div>
            </div>
          </div>
        </div>

        {/* Modal Footer Controls */}
        <div className="p-4 bg-white border-t border-slate-200 flex justify-end gap-2">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 transition-colors"
          >
            {t.close || 'Close'}
          </button>
          <button
            onClick={handlePrint}
            className="flex items-center gap-2 px-5 py-2 rounded-xl bg-[#597867] hover:bg-[#465f52] text-white text-xs font-bold shadow-md transition-colors"
          >
            <Printer size={15} />
            <span>{t.printShippingLabel}</span>
          </button>
        </div>
      </motion.div>
    </div>
  );
}
