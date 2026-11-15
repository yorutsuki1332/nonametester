'use client';

import { useState, useEffect, useMemo } from 'react';
import { db } from '@/lib/firebase';
import firebase from 'firebase/compat/app';
import { errorMessage } from '@/lib/errors';

interface OrderItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
}

interface Order {
  id: string;
  name?: string;
  email?: string;
  address?: string;
  deliveryMethod?: string;
  deliveryLabel?: string;
  shippingFee?: number;
  trackingNumber?: string;
  trackingCarrier?: string;
  total?: number;
  status?: 'pending' | 'paid' | 'preparing' | 'shipping' | 'completed' | 'cancelled';
  items?: OrderItem[];
  createdAt?: firebase.firestore.Timestamp;
}

export default function AdminOrdersListPage() {
  const [ordersMap, setOrdersMap] = useState<{ [key: string]: Order }>({});
  const [allList, setAllList] = useState<Order[]>([]);
  const [searchKeyword, setSearchKeyword] = useState('');
  const [selectedOrderIds, setSelectedOrderIds] = useState<{ [id: string]: boolean }>({});
  const [isBatchShipOpen, setIsBatchShipOpen] = useState(false);
  const [batchTracking, setBatchTracking] = useState<{ [id: string]: string }>({});
  const [isBatchShipping, setIsBatchShipping] = useState(false);

  // 訂單詳情 Modal 狀態
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);

  // 通用狀態更新確認 Modal 狀態
  const [targetStatus, setTargetStatus] = useState<string>('');
  const [trackingDraft, setTrackingDraft] = useState('');
  const [shipTrackingDraft, setShipTrackingDraft] = useState('');
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);

  // 取消/刪除確認 Modal 狀態
  const [isCancelOpen, setIsCancelOpen] = useState(false);

  // 吐司提示
  const [toastMsg, setToastMsg] = useState('');
  const [isToastShow, setIsToastShow] = useState(false);

  // 初始化雲端即時監聽
  useEffect(() => {
    const unsubscribe = db.collection("orders").orderBy("createdAt", "desc").onSnapshot((querySnapshot) => {
      const map: { [key: string]: Order } = {};
      const list: Order[] = [];

      querySnapshot.forEach((doc) => {
        const data = { id: doc.id, ...doc.data() } as Order;
        map[doc.id] = data;
        list.push(data);
      });

      setOrdersMap(map);
      setAllList(list);
    });

    return () => unsubscribe();
  }, []);

  const filteredList = useMemo(() => {
    const keyword = searchKeyword.trim().toLowerCase();
    if (!keyword) return allList;

    return allList.filter(o => {
      const idMatch = o.id && o.id.toLowerCase().includes(keyword);
      const nameMatch = o.name && o.name.toLowerCase().includes(keyword);
      const emailMatch = o.email && o.email.toLowerCase().includes(keyword);
      return idMatch || nameMatch || emailMatch;
    });
  }, [searchKeyword, allList]);

  const handleOrderEmailDisplay = (email?: string) => {
    if (!email) return '未提供';
    const [deleted, deleteId, emailPart] = email.split('_');
    if (deleted === 'deleted' && deleteId && emailPart) {
      return `${emailPart}
        [已刪除帳號]`;
    }
    return email;
  };

  const showToast = (message: string) => {
    setToastMsg(message);
    setIsToastShow(true);
    setTimeout(() => setIsToastShow(false), 3000);
  };

  const openOrderModal = (orderId: string) => {
    const order = ordersMap[orderId];
    if (!order) return;
    setSelectedOrder(order);
    setShipTrackingDraft(order.trackingNumber || '');
    setIsDetailOpen(true);
  };

  const deliverableEmail = (email?: string) => {
    if (!email) return '';
    const deleted = email.match(/^deleted_\d+_(.+)$/);
    return deleted?.[1] || email;
  };

  const notifyShipped = async (order: Order, trackingNumber: string) => {
    const email = deliverableEmail(order.email);
    if (!email) return '，訂單沒有信箱，出貨通知未寄出';
    try {
      const mailResponse = await fetch('/api/send-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          kind: 'shipped',
          email,
          orderId: order.id,
          name: order.name || '',
          trackingNumber,
          deliveryLabel: order.deliveryLabel || '',
          address: order.address || '',
        }),
      });
      const mailResult = await mailResponse.json().catch(() => null);
      return mailResponse.ok && mailResult?.success ? '，出貨通知已寄出' : '，出貨通知未能寄出';
    } catch (mailError) {
      console.error('出貨通知寄送失敗:', mailError);
      return '，出貨通知未能寄出';
    }
  };

  const closeOrderModal = () => {
    setIsDetailOpen(false);
  };

  // 開啟狀態確認 Modal
  const openStatusConfirmModal = (status: string) => {
    setTargetStatus(status);
    setTrackingDraft(status === 'shipping' ? (selectedOrder?.trackingNumber || '') : '');
    setIsDetailOpen(false);
    setIsConfirmOpen(true);
  };

  // 執行狀態更新
  const executeUpdateStatus = async () => {
    if (!selectedOrder || !targetStatus) return;
    const trackingNumber = trackingDraft.trim();
    if (targetStatus === 'shipping' && !trackingNumber) {
      alert('請填寫物流追蹤編號');
      return;
    }
    try {
      const update: { status: string; trackingNumber?: string; trackingCarrier?: string; shippedAt?: firebase.firestore.FieldValue } = {
        status: targetStatus,
      };
      if (targetStatus === 'shipping') {
        update.trackingNumber = trackingNumber;
        update.trackingCarrier = '順豐速遞';
        update.shippedAt = firebase.firestore.FieldValue.serverTimestamp();
      }
      await db.collection("orders").doc(selectedOrder.id).update(update);
      setIsConfirmOpen(false);

      const statusNames: { [key: string]: string } = {
        paid: '已確認付款',
        preparing: '已完成備貨',
        shipping: '已完成發貨',
        completed: '已完成訂單',
      };
      const emailNote = targetStatus === 'shipping' ? await notifyShipped(selectedOrder, trackingNumber) : '';
      showToast(`✅ 訂單狀態已更新為：${statusNames[targetStatus] || targetStatus}${emailNote}`);
    } catch (error: unknown) {
      alert('更新失敗：' + errorMessage(error));
    }
  };

  // 取消訂單流程
  const openDeleteConfirmModal = () => {
    setIsDetailOpen(false);
    setIsCancelOpen(true);
  };

  const executeDeleteOrder = async () => {
    if (!selectedOrder) return;
    try {
      await db.collection("orders").doc(selectedOrder.id).update({ status: 'cancelled' });
      setIsCancelOpen(false);
      showToast('⚠️ 訂單已更改為取消狀態！');
    } catch (error: unknown) {
      alert('操作失敗：' + errorMessage(error));
    }
  };

  const getStatusLabel = (status?: string) => {
    switch (status) {
      case 'paid': return '已確認付款';
      case 'preparing': return '備貨中';
      case 'shipping': return '配送中';
      case 'completed': return '已完成訂單';
      case 'cancelled': return '已取消';
      default: return '待處理 / 確認中';
    }
  };

  const canBatchShip = (status?: string) => (status || 'pending') === 'preparing';
  const shippableOrders = filteredList.filter((order) => canBatchShip(order.status));
  const selectedShipOrders = shippableOrders.filter((order) => selectedOrderIds[order.id]);
  const selectedShipCount = selectedShipOrders.length;
  const allShippableSelected = shippableOrders.length > 0 && shippableOrders.every((order) => selectedOrderIds[order.id]);

  const toggleOrderSelection = (orderId: string) => {
    setSelectedOrderIds((current) => ({ ...current, [orderId]: !current[orderId] }));
  };

  const toggleAllShippable = () => {
    if (allShippableSelected) {
      setSelectedOrderIds({});
      return;
    }
    const next: { [id: string]: boolean } = {};
    shippableOrders.forEach((order) => {
      next[order.id] = true;
    });
    setSelectedOrderIds(next);
  };

  const openBatchShipModal = () => {
    if (selectedShipOrders.length === 0) return;
    const drafts: { [id: string]: string } = {};
    selectedShipOrders.forEach((order) => {
      drafts[order.id] = order.trackingNumber || '';
    });
    setBatchTracking(drafts);
    setIsBatchShipOpen(true);
  };

  const confirmBatchShip = async () => {
    const missing = selectedShipOrders.find((order) => !batchTracking[order.id]?.trim());
    if (missing) {
      alert(`請填寫訂單 ${missing.id} 的物流追蹤編號`);
      return;
    }
    const tooLong = selectedShipOrders.find((order) => batchTracking[order.id].trim().length > 40);
    if (tooLong) {
      alert(`訂單 ${tooLong.id} 的追蹤編號過長`);
      return;
    }
    setIsBatchShipping(true);
    try {
      const batch = db.batch();
      selectedShipOrders.forEach((order) => {
        batch.update(db.collection('orders').doc(order.id), {
          status: 'shipping',
          trackingNumber: batchTracking[order.id].trim(),
          trackingCarrier: '順豐速遞',
          shippedAt: firebase.firestore.FieldValue.serverTimestamp(),
        });
      });
      await batch.commit();
      const notes = await Promise.all(selectedShipOrders.map((order) => notifyShipped(order, batchTracking[order.id].trim())));
      const failed = notes.filter((note) => note !== '，出貨通知已寄出').length;
      setSelectedOrderIds({});
      setIsBatchShipOpen(false);
      showToast(failed
        ? `已標記 ${selectedShipOrders.length} 筆出貨，其中 ${failed} 封通知未能寄出`
        : `已標記 ${selectedShipOrders.length} 筆出貨，出貨通知已寄出`);
    } catch (error: unknown) {
      alert('批次出貨失敗：' + errorMessage(error));
    } finally {
      setIsBatchShipping(false);
    }
  };

  return (
    <>
      <div className="mb-6.25">
        <h1 className="text-[24px] font-serif font-semibold mb-1 text-[#382E2B]">訂單管理</h1>
        <p className="text-[#7A6E65] text-[14px]">備貨中的訂單可以勾選多筆，一次填上追蹤編號並標記出貨。</p>
      </div>

      <div className="mb-6.25 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <input 
          type="text" 
          value={searchKeyword}
          onChange={(e) => setSearchKeyword(e.target.value)}
          className="w-full max-w-100 p-[12px_18px] border border-[#EBE5DF] rounded-[30px] text-[14px] outline-none bg-white shadow-[0_2px_10px_rgba(56,46,43,0.02)] focus:border-[#B35B48] transition"
          placeholder="🔍 搜尋訂單 ID、收件人或信箱..." 
        />
        {selectedShipCount > 0 && (
          <button
            type="button"
            onClick={openBatchShipModal}
            className="cursor-pointer rounded-xl bg-[#B35B48] px-5 py-2.5 text-xs font-semibold text-white shadow-xs hover:bg-[#9B4C3A]"
          >
            批次標記出貨 ({selectedShipCount})
          </button>
        )}
      </div>
      {allList.length > 0 && allList.every((order) => !canBatchShip(order.status)) && (
        <p className="mb-4 text-[12px] text-[#8C7B70]">目前沒有備貨中的訂單。只有備貨中的訂單可以勾選並批次標記出貨。</p>
      )}

      <div className="bg-white rounded-2xl shadow-[0_4px_20px_rgba(56,46,43,0.03)] border border-[#EBE5DF] w-full overflow-hidden">
        <div className="overflow-x-auto w-full p-4 md:p-6.25">
          <table className="w-full md:min-w-187.5 border-collapse text-left text-[14px]">
            <thead className="hidden md:table-header-group">
              <tr className= "border-b-2 border-[#EBE5DF]">
                <th className="w-12 p-3.75 text-center text-[15px] font-semibold text-[#7A6E65]">
                  <input
                    type="checkbox"
                    checked={allShippableSelected}
                    disabled={shippableOrders.length === 0}
                    onChange={toggleAllShippable}
                    aria-label="全選備貨中的訂單"
                    className="cursor-pointer accent-[#B35B48] disabled:cursor-not-allowed"
                  />
                </th>
                <th className="p-3.75 text-[#7A6E65] font-semibold text-[15px]">訂單 ID</th>
                <th className="p-3.75 text-[#7A6E65] font-semibold text-[15px]">收件人</th>
                <th className="p-3.75 text-[#7A6E65] font-semibold text-[15px]">電子郵件</th>
                <th className="p-3.75 text-[#7A6E65] font-semibold text-[15px]">總金額 (HKD)</th>
                <th className="p-3.75 text-[#7A6E65] font-semibold text-[15px]">狀態</th>
                <th className="p-3.75 text-[#7A6E65] font-semibold text-[15px]">操作</th>
              </tr>
            </thead>
            <tbody>
              {allList.length === 0 ? (
                <tr><td colSpan={7} className="text-center text-[#7A6E65] py-7.5">目前尚無任何訂單紀錄</td></tr>
              ) : filteredList.length === 0 ? (
                <tr><td colSpan={7} className="text-center text-[#7A6E65] py-7.5">沒有找到符合條件的訂單</td></tr>
              ) : (
                filteredList.map(o => {
                  const status = o.status || 'pending';
                  const badgeClass = status === 'completed' 
                    ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' 
                    : status === 'shipping'
                    ? 'bg-blue-50 text-blue-800 border border-blue-200'
                    : status === 'preparing'
                    ? 'bg-amber-50 text-amber-900 border border-amber-200'
                    : status === 'paid'
                    ? 'bg-purple-50 text-purple-800 border border-purple-200'
                    : status === 'cancelled' 
                    ? 'bg-rose-50 text-rose-800 border border-rose-200' 
                    : 'bg-[#F4F0EA] text-[#6E6058] border border-[#EBE5DF]';

                  return (
                    <tr key={o.id} className="block md:table-row bg-white md:bg-transparent border md:border-none border-[#EBE5DF] rounded-lg md:rounded-none mb-3.75 md:mb-0 p-3.75 md:p-0 shadow-xs md:shadow-none hover:bg-[#FAF7F2]">
                      <td className="py-1.5 text-center md:table-cell md:border-b md:border-[#EBE5DF] md:px-3.75 md:py-3.75 md:align-middle">
                        <input
                          type="checkbox"
                          checked={!!selectedOrderIds[o.id]}
                          disabled={!canBatchShip(status)}
                          onChange={() => toggleOrderSelection(o.id)}
                          aria-label={canBatchShip(status) ? `選取訂單 ${o.id}` : `訂單 ${o.id} 不是備貨中，不能批次出貨`}
                          className="cursor-pointer accent-[#B35B48] disabled:cursor-not-allowed"
                        />
                      </td>
                      <td className="flex justify-between items-center py-1.5 md:py-3.75 md:px-3.75 md:table-cell md:border-b md:border-[#EBE5DF] md:align-middle font-medium text-[#382E2B] whitespace-nowrap">
                        <span className="md:hidden text-[#7A6E65] text-[12px] font-semibold">訂單 ID</span>
                        {o.id}
                      </td>
                      <td className="flex justify-between items-center py-1.5 md:py-3.75 md:px-3.75 md:table-cell md:border-b md:border-[#EBE5DF] md:align-middle font-medium text-[#382E2B] text-right md:text-left">
                        <span className="md:hidden text-[#7A6E65] text-[12px] font-semibold">收件人</span>
                        {o.name || '未提供'}
                      </td>
                      <td className="flex justify-between items-center py-1.5 md:py-3.75 md:px-3.75 md:table-cell md:border-b md:border-[#EBE5DF] md:align-middle  text-[#382E2B] whitespace-break-spaces md:whitespace-nowrap text-right md:text-left">
                        <span className="md:hidden text-[#7A6E65] text-[12px] font-semibold">電子郵件</span>
                        {handleOrderEmailDisplay(o.email) || '未提供'}
                      </td>
                      <td className="flex justify-between items-center py-1.5 md:py-3.75 md:px-3.75 md:table-cell md:border-b md:border-[#EBE5DF] md:align-middle text-[#382E2B] md:whitespace-nowrap">
                        <span className="md:hidden text-[#7A6E65] text-[12px] font-semibold">總金額</span>
                        HKD {Number(o.total || 0).toFixed(1)}
                      </td>
                      <td className="flex justify-between items-center py-1.5 md:py-3.75 md:px-3.75 md:table-cell md:border-b md:border-[#EBE5DF] md:align-middle text-[#382E2B] md:whitespace-nowrap">
                        <span className="md:hidden text-[#7A6E65] text-[12px] font-semibold">狀態</span>
                        <span className={`inline-block p-[4px_8px] rounded text-[11px] font-semibold ${badgeClass}`}>
                          {getStatusLabel(status)}
                        </span>
                      </td>
                      <td className="flex flex-col md:table-cell py-3 md:py-3.75 md:px-3.75 border-t md:border-t-0 border-[#EBE5DF] md:border-b md:border-[#EBE5DF] md:align-middle mt-3 md:mt-0 pt-3 md:pt-3.75 md:whitespace-nowrap md:text-right">
                        <button className="w-full md:w-auto bg-[#B35B48] text-white border-none p-2.5 md:p-[6px_14px] rounded-md cursor-pointer text-[14px] md:text-[13px] hover:bg-[#9B4C3A] transition shadow-xs" onClick={() => openOrderModal(o.id)}>檢視詳情</button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {isBatchShipOpen && (
        <>
          <div className="fixed inset-0 z-1500 bg-[#382E2B]/40 backdrop-blur-xs" onClick={() => !isBatchShipping && setIsBatchShipOpen(false)} />
          <div className="fixed top-1/2 left-1/2 z-3000 flex max-h-[85vh] w-[90%] max-w-135 -translate-x-1/2 -translate-y-1/2 flex-col overflow-hidden rounded-2xl border border-[#EBE5DF] bg-[#FAF7F2] shadow-2xl">
            <div className="flex items-center justify-between border-b border-[#EBE5DF] bg-[#F4F0EA] p-6">
              <h2 className="font-serif text-[18px] font-semibold text-[#382E2B]">批次標記出貨</h2>
              <button type="button" className="cursor-pointer border-none bg-transparent text-[26px] text-[#7A6E65]" onClick={() => !isBatchShipping && setIsBatchShipOpen(false)}>&times;</button>
            </div>
            <div className="overflow-y-auto p-6">
              <p className="mb-4 text-[13px] leading-relaxed text-[#6E6058]">每筆訂單各自填順豐運單編號。確認後狀態改為配送中，並寄出貨通知。</p>
              <div className="flex flex-col gap-3">
                {selectedShipOrders.map((order) => (
                  <label key={order.id} className="rounded-lg border border-[#EBE5DF] bg-white p-3 text-[13px]">
                    <span className="block font-semibold text-[#382E2B]">#{order.id} · {order.name || '未提供'}</span>
                    <input
                      value={batchTracking[order.id] || ''}
                      onChange={(event) => setBatchTracking((current) => ({ ...current, [order.id]: event.target.value }))}
                      aria-label={`訂單 ${order.id} 的物流追蹤編號`}
                      placeholder="順豐運單編號"
                      autoComplete="off"
                      className="mt-2 w-full rounded-lg border border-[#EBE5DF] p-2.5 font-mono text-[14px] outline-none focus:border-[#B35B48]"
                    />
                  </label>
                ))}
              </div>
              <button type="button" disabled={isBatchShipping} onClick={confirmBatchShip} className="mt-5 w-full cursor-pointer rounded-lg border-none bg-[#B35B48] p-4 font-semibold text-white hover:bg-[#9B4C3A] disabled:opacity-60">
                {isBatchShipping ? '正在標記出貨...' : '確認出貨並寄通知'}
              </button>
              <button type="button" disabled={isBatchShipping} onClick={() => setIsBatchShipOpen(false)} className="mt-2.5 w-full cursor-pointer rounded-lg bg-[#F4F0EA] p-4 font-semibold text-[#382E2B] hover:bg-[#EBE5DF] disabled:opacity-60">
                返回
              </button>
            </div>
          </div>
        </>
      )}

      {/* 訂單詳情 Modal */}
      {isDetailOpen && selectedOrder && (
        <>
          <div className="fixed inset-0 bg-[#382E2B]/40 backdrop-blur-xs z-1500" onClick={closeOrderModal} />
          <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[90%] max-w-125 max-h-[85vh] bg-[#FAF7F2] border border-[#EBE5DF] rounded-2xl shadow-2xl z-2500 flex flex-col overflow-hidden">
            <div className="p-6 border-b border-[#EBE5DF] flex justify-between items-center bg-[#F4F0EA]">
              <h2 className="text-[18px] font-serif font-semibold text-[#382E2B]">訂單詳細資訊</h2>
              <button className="bg-transparent border-none text-[26px] cursor-pointer text-[#7A6E65]" onClick={closeOrderModal}>&times;</button>
            </div>
            <div className="p-6 overflow-y-auto">
              <div className="mb-5">
                <label className="block text-[13px] font-semibold mb-2 text-[#6E6058]">收件人姓名</label>
                <input type="text" value={selectedOrder.name || ''} readOnly className="w-full p-3 border border-[#EBE5DF] rounded-lg text-[14px] outline-none bg-white" />
              </div>
              <div className="mb-5">
                <label className="block text-[13px] font-semibold mb-2 text-[#6E6058]">電子郵件</label>
                <input type="text" value={selectedOrder.email || ''} readOnly className="w-full p-3 border border-[#EBE5DF] rounded-lg text-[14px] outline-none bg-white" />
              </div>
              <div className="mb-5">
                <label className="block text-[13px] font-semibold mb-2 text-[#6E6058]">送貨方式</label>
                <input type="text" value={selectedOrder.deliveryLabel ? `${selectedOrder.deliveryLabel}${Number(selectedOrder.shippingFee) > 0 ? ` · 運費 HKD ${Number(selectedOrder.shippingFee).toFixed(1)}` : ' · 免運'}` : '未記錄'} readOnly className="w-full p-3 border border-[#EBE5DF] rounded-lg text-[14px] outline-none bg-white" />
              </div>
              <div className="mb-5">
                <label className="block text-[13px] font-semibold mb-2 text-[#6E6058]">{selectedOrder.deliveryMethod === 'sf-pickup' ? '順豐自取點' : '收件地址'}</label>
                <input type="text" value={selectedOrder.address || ''} readOnly className="w-full p-3 border border-[#EBE5DF] rounded-lg text-[14px] outline-none bg-white" />
              </div>
              <div className="mb-5">
                <label className="block text-[13px] font-semibold mb-2 text-[#6E6058]">物流追蹤編號</label>
                {selectedOrder.status === 'shipping' && !selectedOrder.trackingNumber ? (
                  <div className="flex flex-col gap-2">
                    <input
                      value={shipTrackingDraft}
                      onChange={(event) => setShipTrackingDraft(event.target.value)}
                      className="w-full rounded-lg border border-[#EBE5DF] bg-white p-3 font-mono text-[14px] outline-none focus:border-[#B35B48]"
                      placeholder="順豐運單編號"
                      autoComplete="off"
                    />
                    <button
                      type="button"
                      onClick={async () => {
                        const trackingNumber = shipTrackingDraft.trim();
                        if (!trackingNumber) {
                          alert('請填寫物流追蹤編號');
                          return;
                        }
                        try {
                          await db.collection("orders").doc(selectedOrder.id).update({
                            trackingNumber,
                            trackingCarrier: '順豐速遞',
                            shippedAt: firebase.firestore.FieldValue.serverTimestamp(),
                          });
                          const emailNote = await notifyShipped(selectedOrder, trackingNumber);
                          setSelectedOrder({ ...selectedOrder, trackingNumber, trackingCarrier: '順豐速遞' });
                          showToast(`已儲存追蹤編號${emailNote}`);
                        } catch (error: unknown) {
                          alert('儲存失敗：' + errorMessage(error));
                        }
                      }}
                      className="w-full cursor-pointer rounded-lg border-none bg-[#B35B48] p-3.5 font-semibold text-white hover:bg-[#9B4C3A]"
                    >
                      儲存編號並寄出貨通知
                    </button>
                  </div>
                ) : (
                  <input type="text" value={selectedOrder.trackingNumber ? `${selectedOrder.trackingCarrier || '順豐速遞'} · ${selectedOrder.trackingNumber}` : '尚未出貨'} readOnly className="w-full p-3 border border-[#EBE5DF] rounded-lg text-[14px] outline-none bg-white font-mono" />
                )}
              </div>
              <div className="mb-5">
                <label className="block text-[13px] font-semibold mb-2 text-[#6E6058]">訂單總金額 (HKD)</label>
                <input type="text" value={`HKD ${Number(selectedOrder.total || 0).toFixed(1)}`} readOnly className="w-full p-3 border border-[#EBE5DF] rounded-lg text-[14px] outline-none bg-white font-mono" />
              </div>
              <div className="mb-5">
                <label className="block text-[13px] font-semibold mb-2 text-[#6E6058]">購買選品明細</label>
                <div className="bg-white p-3 rounded-lg text-[13px] max-h-37.5 overflow-y-auto border border-[#EBE5DF]">
                  {selectedOrder.items && selectedOrder.items.length > 0 ? (
                    selectedOrder.items.map((item, idx) => (
                      <div key={idx} className="flex justify-between mb-1.5 border-b border-dashed border-[#EBE5DF] pb-1.5">
                        <span><span className="font-semibold pr-1.5 text-[#B35B48]">[{item.id}]</span>{item.name} × {item.quantity}</span>
                        <span className="font-mono">HKD {Number(item.price * item.quantity).toFixed(1)}</span>
                      </div>
                    ))
                  ) : (
                    <span className="text-[#7A6E65]">無選品明細</span>
                  )}
                </div>
              </div>

              {/* 操作按鈕區塊 */}
              <div className="flex flex-col gap-2.5 mt-4">
                {(!selectedOrder.status || selectedOrder.status === 'pending') && (
                  <>
                    <button type="button" onClick={() => openStatusConfirmModal('paid')} className="w-full bg-[#382E2B] text-white p-3.5 rounded-lg font-semibold cursor-pointer hover:bg-[#4E403B] transition shadow-xs">
                      第一步：已確認付款
                    </button>
                    <button type="button" onClick={openDeleteConfirmModal} className="w-full bg-rose-700 text-white p-3.5 rounded-lg font-semibold cursor-pointer hover:bg-rose-800 transition mt-1 shadow-xs">
                      取消訂單
                    </button>
                  </>
                )}

                {selectedOrder.status === 'paid' && (
                  <>
                    <button type="button" onClick={() => openStatusConfirmModal('preparing')} className="w-full bg-[#C28C7A] text-white p-3.5 rounded-lg font-semibold cursor-pointer hover:bg-[#B35B48] transition shadow-xs">
                      第二步：已完成備貨
                    </button>
                    <button type="button" onClick={openDeleteConfirmModal} className="w-full bg-rose-700 text-white p-3.5 rounded-lg font-semibold cursor-pointer hover:bg-rose-800 transition mt-1 shadow-xs">
                      取消訂單
                    </button>
                  </>
                )}

                {selectedOrder.status === 'preparing' && (
                  <>
                    <button type="button" onClick={() => openStatusConfirmModal('shipping')} className="w-full bg-[#B35B48] text-white p-3.5 rounded-lg font-semibold cursor-pointer hover:bg-[#9B4C3A] transition shadow-xs">
                      第三步：已完成發貨
                    </button>
                    <button type="button" onClick={openDeleteConfirmModal} className="w-full bg-rose-700 text-white p-3.5 rounded-lg font-semibold cursor-pointer hover:bg-rose-800 transition mt-1 shadow-xs">
                      取消訂單
                    </button>
                  </>
                )}

                {selectedOrder.status === 'shipping' && (
                  <>
                    <button type="button" onClick={() => openStatusConfirmModal('completed')} className="w-full bg-emerald-700 text-white p-3.5 rounded-lg font-semibold cursor-pointer hover:bg-emerald-800 transition shadow-xs">
                      第四步：已完成訂單
                    </button>
                    <button type="button" disabled className="w-full bg-[#F4F0EA] text-[#8C7B70] border border-[#EBE5DF] p-3.5 rounded-lg font-semibold cursor-not-allowed transition mt-1">
                      訂單不可取消
                    </button>
                  </>
                )}

                {selectedOrder.status === 'completed' && (
                  <div className="text-center py-4 text-emerald-800 bg-emerald-50 rounded-lg font-semibold text-sm border border-emerald-200">
                    此訂單已全部完成，無可用操作
                  </div>
                )}

                {selectedOrder.status === 'cancelled' && (
                  <div className="text-center py-4 text-rose-800 bg-rose-50 rounded-lg font-semibold text-sm border border-rose-200">
                    此訂單已取消
                  </div>
                )}
              </div>
            </div>
          </div>
        </>
      )}

      {/* 狀態更新確認 Modal */}
      {isConfirmOpen && selectedOrder && (
        <>
          <div className="fixed inset-0 bg-[#382E2B]/40 backdrop-blur-xs z-1500" onClick={() => setIsConfirmOpen(false)} />
          <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[90%] max-w-125 bg-[#FAF7F2] border border-[#EBE5DF] rounded-2xl shadow-2xl z-3000 flex flex-col overflow-hidden">
            <div className="p-6 border-b border-[#EBE5DF] flex justify-between items-center bg-[#F4F0EA]">
              <h2 className="text-[18px] font-serif font-semibold text-[#382E2B]">確認變更訂單進度</h2>
              <button className="bg-transparent border-none text-[26px] cursor-pointer text-[#7A6E65]" onClick={() => setIsConfirmOpen(false)}>&times;</button>
            </div>
            <div className="p-6">
              <p className="text-[14px] text-[#6E6058] mb-6.25 leading-relaxed">
                確定要將收件人「{selectedOrder.name || '未提供'}」的訂單狀態推進至：
                <span className="font-bold text-[#382E2B] px-1">
                  {targetStatus === 'paid' && '「已確認付款」'}
                  {targetStatus === 'preparing' && '「已完成備貨」'}
                  {targetStatus === 'shipping' && '「已完成發貨」'}
                  {targetStatus === 'completed' && '「已完成訂單」'}
                </span>
                嗎？
              </p>
              {targetStatus === 'shipping' && (
                <label className="mb-5 block text-[13px] font-semibold text-[#6E6058]">
                  物流追蹤編號
                  <input
                    value={trackingDraft}
                    onChange={(event) => setTrackingDraft(event.target.value)}
                    className="mt-2 w-full rounded-lg border border-[#EBE5DF] bg-white p-3 font-mono text-[14px] font-normal outline-none focus:border-[#B35B48]"
                    placeholder="順豐運單編號"
                    autoComplete="off"
                  />
                  <span className="mt-1 block text-[12px] font-normal leading-relaxed text-[#8C7B70]">確認後會把編號存進訂單，並寄出貨通知到收件信箱。</span>
                </label>
              )}
              <button type="button" onClick={executeUpdateStatus} className="w-full bg-[#B35B48] text-white p-4 rounded-lg font-semibold cursor-pointer hover:bg-[#9B4C3A] transition shadow-xs">
                確認執行
              </button>
              <button type="button" onClick={() => setIsConfirmOpen(false)} className="w-full bg-[#F4F0EA] text-[#382E2B] p-4 rounded-lg font-semibold cursor-pointer hover:bg-[#EBE5DF] transition mt-2.5">
                返回
              </button>
            </div>
          </div>
        </>
      )}

      {/* 取消訂單確認 Modal */}
      {isCancelOpen && selectedOrder && (
        <>
          <div className="fixed inset-0 bg-[#382E2B]/40 backdrop-blur-xs z-1500" onClick={() => setIsCancelOpen(false)} />
          <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[90%] max-w-125 bg-[#FAF7F2] border border-[#EBE5DF] rounded-2xl shadow-2xl z-3000 flex flex-col overflow-hidden">
            <div className="p-6 border-b border-[#EBE5DF] flex justify-between items-center bg-[#F4F0EA]">
              <h2 className="text-[18px] font-serif font-semibold text-rose-700">確認取消訂單</h2>
              <button className="bg-transparent border-none text-[26px] cursor-pointer text-[#7A6E65]" onClick={() => setIsCancelOpen(false)}>&times;</button>
            </div>
            <div className="p-6">
              <p className="text-[14px] text-[#6E6058] mb-6.25 leading-relaxed">
                確定要將收件人「{selectedOrder.name || '未提供'}」的這筆訂單標記為取消嗎？
              </p>
              <button type="button" onClick={executeDeleteOrder} className="w-full bg-rose-700 text-white p-4 rounded-lg font-semibold cursor-pointer hover:bg-rose-800 transition shadow-xs">
                確認取消
              </button>
              <button type="button" onClick={() => setIsCancelOpen(false)} className="w-full bg-[#F4F0EA] text-[#382E2B] p-4 rounded-lg font-semibold cursor-pointer hover:bg-[#EBE5DF] transition mt-2.5">
                返回
              </button>
            </div>
          </div>
        </>
      )}

      {/* 吐司通知 */}
      <div className={`fixed bottom-8 left-1/2 -translate-x-1/2 bg-[#382E2B] text-[#FAF7F2] px-6 py-3 rounded-full text-[13px] font-medium z-3000 transition-transform duration-500 shadow-md ${isToastShow ? 'translate-y-0' : 'translate-y-[300%]'}`}>
        {toastMsg}
      </div>
    </>
  );
}