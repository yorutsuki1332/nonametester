'use client';

import { useState, useEffect } from 'react';
import { db } from '@/lib/firebase';

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
  total?: number;
  status?: 'pending' | 'paid' | 'preparing' | 'shipping' | 'completed' | 'cancelled';
  items?: OrderItem[];
  createdAt?: any;
}

export default function AdminOrdersListPage() {
  const [ordersMap, setOrdersMap] = useState<{ [key: string]: Order }>({});
  const [allList, setAllList] = useState<Order[]>([]);
  const [filteredList, setFilteredList] = useState<Order[]>([]);
  const [searchKeyword, setSearchKeyword] = useState('');

  // 訂單詳情 Modal 狀態
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);

  // 通用狀態更新確認 Modal 狀態
  const [targetStatus, setTargetStatus] = useState<string>('');
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

  // 搜尋過濾
  useEffect(() => {
    const keyword = searchKeyword.trim().toLowerCase();
    if (!keyword) {
      setFilteredList(allList);
      return;
    }

    const filtered = allList.filter(o => {
      const idMatch = o.id && o.id.toLowerCase().includes(keyword);
      const nameMatch = o.name && o.name.toLowerCase().includes(keyword);
      const emailMatch = o.email && o.email.toLowerCase().includes(keyword);
      return idMatch || nameMatch || emailMatch;
    });
    setFilteredList(filtered);
  }, [searchKeyword, allList]);

  const showToast = (message: string) => {
    setToastMsg(message);
    setIsToastShow(true);
    setTimeout(() => setIsToastShow(false), 3000);
  };

  const openOrderModal = (orderId: string) => {
    const order = ordersMap[orderId];
    if (!order) return;
    setSelectedOrder(order);
    setIsDetailOpen(true);
  };

  const closeOrderModal = () => {
    setIsDetailOpen(false);
  };

  // 開啟狀態確認 Modal
  const openStatusConfirmModal = (status: string) => {
    setTargetStatus(status);
    setIsDetailOpen(false);
    setIsConfirmOpen(true);
  };

  // 執行狀態更新
  const executeUpdateStatus = async () => {
    if (!selectedOrder || !targetStatus) return;
    try {
      await db.collection("orders").doc(selectedOrder.id).update({ status: targetStatus });
      setIsConfirmOpen(false);
      
      const statusNames: { [key: string]: string } = {
        paid: '已確認付款',
        preparing: '已完成備貨',
        shipping: '已完成發貨',
        completed: '已完成訂單',
      };
      showToast(`✅ 訂單狀態已更新為：${statusNames[targetStatus] || targetStatus}`);
    } catch (error: any) {
      alert('更新失敗：' + error.message);
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
    } catch (error: any) {
      alert('操作失敗：' + error.message);
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

  return (
    <>
      <div className="mb-6.25">
        <h1 className="text-[24px] font-semibold mb-1">訂單管理</h1>
        <p className="text-[#888888] text-[14px]">依四階段嚴格控管訂單流程。請點擊「檢視詳情」進行步驟操作。</p>
      </div>

      <div className="mb-6.25">
        <input 
          type="text" 
          value={searchKeyword}
          onChange={(e) => setSearchKeyword(e.target.value)}
          className="w-full max-w-100 p-[12px_18px] border border-[#e5e5e5] rounded-[30px] text-[14px] outline-none bg-white shadow-[0_2px_10px_rgba(0,0,0,0.02)] focus:border-[#111] transition"
          placeholder="🔍 搜尋訂單 ID、收件人或信箱..." 
        />
      </div>

      <div className="bg-white rounded-2xl p-4 md:p-6.25 shadow-[0_4px_20px_rgba(0,0,0,0.03)] border border-[#e5e5e5] w-full">
        <table className="w-full border-collapse text-left text-[14px]">
          <thead className="hidden md:table-header-group">
            <tr>
              <th className="p-3.75 border-b-2 border-[#e5e5e5] text-[#888] font-semibold text-[16px]">訂單 ID</th>
              <th className="p-3.75 border-b-2 border-[#e5e5e5] text-[#888] font-semibold text-[16px]">收件人</th>
              <th className="p-3.75 border-b-2 border-[#e5e5e5] text-[#888] font-semibold text-[16px]">電子郵件</th>
              <th className="p-3.75 border-b-2 border-[#e5e5e5] text-[#888] font-semibold text-[16px]">總金額 (HKD)</th>
              <th className="p-3.75 border-b-2 border-[#e5e5e5] text-[#888] font-semibold text-[16px]">狀態</th>
              <th className="p-3.75 border-b-2 border-[#e5e5e5] text-[#888] font-semibold text-[16px]">操作</th>
            </tr>
          </thead>
          <tbody>
            {allList.length === 0 ? (
              <tr><td colSpan={6} className="text-center text-[#888] py-7.5">目前尚無任何訂單紀錄</td></tr>
            ) : filteredList.length === 0 ? (
              <tr><td colSpan={6} className="text-center text-[#888] py-7.5">沒有找到符合條件的訂單</td></tr>
            ) : (
              filteredList.map(o => {
                const status = o.status || 'pending';
                const badgeClass = status === 'completed' 
                  ? 'bg-[#8bfc9a] text-[#333]' 
                  : status === 'shipping'
                  ? 'bg-[#bae6fd] text-[#0369a1]'
                  : status === 'preparing'
                  ? 'bg-[#fef08a] text-[#854d0e]'
                  : status === 'paid'
                  ? 'bg-[#e9d5ff] text-[#6b21a8]'
                  : status === 'cancelled' 
                  ? 'bg-[#ff8585] text-white' 
                  : 'bg-[#FEF9C3] text-[#333]';

                return (
                  <tr key={o.id} className="block md:table-row bg-white md:bg-transparent border md:border-none border-[#e5e5e5] rounded-lg md:rounded-none mb-3.75 md:mb-0 p-3.75 md:p-0 shadow-sm md:shadow-none hover:bg-[#fafafa]">
                    <td className="flex justify-between items-center py-1.5 md:py-3.75 md:px-3.75 md:table-cell md:border-b md:border-[#e5e5e5] md:align-middle font-medium">
                      <span className="md:hidden text-[#888] text-[12px] font-semibold">訂單 ID</span>
                      {o.id}
                    </td>
                    <td className="flex justify-between items-center py-1.5 md:py-3.75 md:px-3.75 md:table-cell md:border-b md:border-[#e5e5e5] md:align-middle font-medium">
                      <span className="md:hidden text-[#888] text-[12px] font-semibold">收件人</span>
                      {o.name || '未提供'}
                    </td>
                    <td className="flex justify-between items-center py-1.5 md:py-3.75 md:px-3.75 md:table-cell md:border-b md:border-[#e5e5e5] md:align-middle">
                      <span className="md:hidden text-[#888] text-[12px] font-semibold">電子郵件</span>
                      {o.email || '未提供'}
                    </td>
                    <td className="flex justify-between items-center py-1.5 md:py-3.75 md:px-3.75 md:table-cell md:border-b md:border-[#e5e5e5] md:align-middle md:w-32.5">
                      <span className="md:hidden text-[#888] text-[12px] font-semibold">總金額</span>
                      HKD {Number(o.total || 0).toFixed(1)}
                    </td>
                    <td className="flex justify-between items-center py-1.5 md:py-3.75 md:px-3.75 md:table-cell md:border-b md:border-[#e5e5e5] md:align-middle">
                      <span className="md:hidden text-[#888] text-[12px] font-semibold">狀態</span>
                      <span className={`inline-block p-[4px_8px] rounded text-[11px] font-semibold ${badgeClass}`}>
                        {getStatusLabel(status)}
                      </span>
                    </td>
                    <td className="flex flex-col md:table-cell py-3 md:py-3.75 md:px-3.75 border-t md:border-t-0 border-[#e5e5e5] md:border-b md:border-[#e5e5e5] md:align-middle md:w-27.5 mt-3 md:mt-0 pt-3 md:pt-3.75 gap-2">
                      <button className="w-full md:w-auto bg-[#111] text-white border-none p-2.5 md:p-[6px_14px] rounded-md md:rounded-md cursor-pointer text-[14px] md:text-[13px] hover:bg-[#333] transition" onClick={() => openOrderModal(o.id)}>檢視詳情</button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* 訂單詳情 Modal */}
      {isDetailOpen && selectedOrder && (
        <>
          <div className="fixed inset-0 bg-white/60 backdrop-blur-sm z-1500" onClick={closeOrderModal} />
          <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[90%] max-w-125 max-h-[85vh] bg-white rounded-2xl shadow-2xl z-2500 flex flex-col overflow-hidden">
            <div className="p-6 border-b border-[#e5e5e5] flex justify-between items-center bg-[#fafafa]">
              <h2 className="text-[18px] font-semibold">訂單詳細資訊</h2>
              <button className="bg-transparent border-none text-[26px] cursor-pointer text-[#888]" onClick={closeOrderModal}>&times;</button>
            </div>
            <div className="p-6 overflow-y-auto">
              <div className="mb-5">
                <label className="block text-[13px] font-semibold mb-2 text-[#555]">收件人姓名</label>
                <input type="text" value={selectedOrder.name || ''} readOnly className="w-full p-3 border border-[#ddd] rounded-lg text-[14px] outline-none bg-white" />
              </div>
              <div className="mb-5">
                <label className="block text-[13px] font-semibold mb-2 text-[#555]">電子郵件</label>
                <input type="text" value={selectedOrder.email || ''} readOnly className="w-full p-3 border border-[#ddd] rounded-lg text-[14px] outline-none bg-white" />
              </div>
              <div className="mb-5">
                <label className="block text-[13px] font-semibold mb-2 text-[#555]">收件地址</label>
                <input type="text" value={selectedOrder.address || ''} readOnly className="w-full p-3 border border-[#ddd] rounded-lg text-[14px] outline-none bg-white" />
              </div>
              <div className="mb-5">
                <label className="block text-[13px] font-semibold mb-2 text-[#555]">訂單總金額 (HKD)</label>
                <input type="text" value={`HKD ${Number(selectedOrder.total || 0).toFixed(1)}`} readOnly className="w-full p-3 border border-[#ddd] rounded-lg text-[14px] outline-none bg-white" />
              </div>
              <div className="mb-5">
                <label className="block text-[13px] font-semibold mb-2 text-[#555]">購買商品明細</label>
                <div className="bg-[#f9f9f9] p-3 rounded-lg text-[13px] max-h-37.5 overflow-y-auto border border-[#ddd]">
                  {selectedOrder.items && selectedOrder.items.length > 0 ? (
                    selectedOrder.items.map((item, idx) => (
                      <div key={idx} className="flex justify-between mb-1.5 border-b border-dashed border-[#eee] pb-1.5">
                        <span><span className="font-semibold pr-1.5">[{item.id}]</span>{item.name} × {item.quantity}</span>
                        <span>HKD {Number(item.price * item.quantity).toFixed(1)}</span>
                      </div>
                    ))
                  ) : (
                    <span className="text-[#888]">無商品明細</span>
                  )}
                </div>
              </div>

              {/* 嚴格依階段控制的操作按鈕區塊 */}
              <div className="flex flex-col gap-2.5 mt-4">
                {(!selectedOrder.status || selectedOrder.status === 'pending') && (
                  <>
                    <button type="button" onClick={() => openStatusConfirmModal('paid')} className="w-full bg-[#7c3aed] text-white p-3.5 rounded-lg font-semibold cursor-pointer hover:bg-[#6d28d9] transition">
                      第一步：已確認付款
                    </button>
                    <button type="button" onClick={openDeleteConfirmModal} className="w-full bg-[#ff6b6b] text-white p-3.5 rounded-lg font-semibold cursor-pointer hover:bg-[#fa5252] transition mt-1">
                      取消訂單
                    </button>
                  </>
                )}

                {selectedOrder.status === 'paid' && (
                  <>
                    <button type="button" onClick={() => openStatusConfirmModal('preparing')} className="w-full bg-[#ca8a04] text-white p-3.5 rounded-lg font-semibold cursor-pointer hover:bg-[#a16207] transition">
                      第二步：已完成備貨
                    </button>
                    <button type="button" onClick={openDeleteConfirmModal} className="w-full bg-[#ff6b6b] text-white p-3.5 rounded-lg font-semibold cursor-pointer hover:bg-[#fa5252] transition mt-1">
                      取消訂單
                    </button>
                  </>
                )}

                {selectedOrder.status === 'preparing' && (
                  <>
                    <button type="button" onClick={() => openStatusConfirmModal('shipping')} className="w-full bg-[#0284c7] text-white p-3.5 rounded-lg font-semibold cursor-pointer hover:bg-[#0369a1] transition">
                      第三步：已完成發貨
                    </button>
                    <button type="button" onClick={openDeleteConfirmModal} className="w-full bg-[#ff6b6b] text-white p-3.5 rounded-lg font-semibold cursor-pointer hover:bg-[#fa5252] transition mt-1">
                      取消訂單
                    </button>
                  </>
                )}

                {selectedOrder.status === 'shipping' && (
                  <>
                    <button type="button" onClick={() => openStatusConfirmModal('completed')} className="w-full bg-[#2b8a3e] text-white p-3.5 rounded-lg font-semibold cursor-pointer hover:bg-[#236c31] transition">
                      第四步：已完成訂單
                    </button>
                    <button type="button" disabled className="w-full bg-stone-100 text-stone-400 border border-stone-200 p-3.5 rounded-lg font-semibold cursor-not-allowed transition mt-1">
                      訂單不可取消
                    </button>
                  </>
                )}

                {selectedOrder.status === 'completed' && (
                  <div className="text-center py-4 text-emerald-700 bg-emerald-50 rounded-lg font-semibold text-sm border border-emerald-200">
                    此訂單已全部完成，無可用操作
                  </div>
                )}

                {selectedOrder.status === 'cancelled' && (
                  <div className="text-center py-4 text-rose-700 bg-rose-50 rounded-lg font-semibold text-sm border border-rose-200">
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
          <div className="fixed inset-0 bg-white/60 backdrop-blur-sm z-1500" onClick={() => setIsConfirmOpen(false)} />
          <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[90%] max-w-125 bg-white rounded-2xl shadow-2xl z-3000 flex flex-col overflow-hidden">
            <div className="p-6 border-b border-[#e5e5e5] flex justify-between items-center bg-[#fafafa]">
              <h2 className="text-[18px] font-semibold">確認變更訂單進度</h2>
              <button className="bg-transparent border-none text-[26px] cursor-pointer text-[#888]" onClick={() => setIsConfirmOpen(false)}>&times;</button>
            </div>
            <div className="p-6">
              <p className="text-[14px] text-[#555] mb-6.25 leading-relaxed">
                確定要將收件人「{selectedOrder.name || '未提供'}」的訂單狀態推進至：
                <span className="font-bold text-black px-1">
                  {targetStatus === 'paid' && '「已確認付款」'}
                  {targetStatus === 'preparing' && '「已完成備貨」'}
                  {targetStatus === 'shipping' && '「已完成發貨」'}
                  {targetStatus === 'completed' && '「已完成訂單」'}
                </span>
                嗎？
              </p>
              <button type="button" onClick={executeUpdateStatus} className="w-full bg-[#111] text-white p-4 rounded-lg font-semibold cursor-pointer hover:bg-[#333] transition">
                確認執行
              </button>
              <button type="button" onClick={() => setIsConfirmOpen(false)} className="w-full bg-[#f5f5f5] text-[#333] p-4 rounded-lg font-semibold cursor-pointer hover:bg-[#eee] transition mt-2.5">
                返回
              </button>
            </div>
          </div>
        </>
      )}

      {/* 取消訂單確認 Modal */}
      {isCancelOpen && selectedOrder && (
        <>
          <div className="fixed inset-0 bg-white/60 backdrop-blur-sm z-1500" onClick={() => setIsCancelOpen(false)} />
          <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[90%] max-w-125 bg-white rounded-2xl shadow-2xl z-3000 flex flex-col overflow-hidden">
            <div className="p-6 border-b border-[#e5e5e5] flex justify-between items-center bg-[#fafafa]">
              <h2 className="text-[18px] font-semibold">確認取消訂單</h2>
              <button className="bg-transparent border-none text-[26px] cursor-pointer text-[#888]" onClick={() => setIsCancelOpen(false)}>&times;</button>
            </div>
            <div className="p-6">
              <p className="text-[14px] text-[#555] mb-6.25 leading-relaxed">
                確定要將收件人「{selectedOrder.name || '未提供'}」的這筆訂單標記為取消嗎？
              </p>
              <button type="button" onClick={executeDeleteOrder} className="w-full bg-[#ff6b6b] text-white p-4 rounded-lg font-semibold cursor-pointer hover:bg-[#fa5252] transition">
                確認取消
              </button>
              <button type="button" onClick={() => setIsCancelOpen(false)} className="w-full bg-[#f5f5f5] text-[#333] p-4 rounded-lg font-semibold cursor-pointer hover:bg-[#eee] transition mt-2.5">
                返回
              </button>
            </div>
          </div>
        </>
      )}

      {/* 吐司通知 */}
      <div className={`fixed bottom-0 left-1/2 -translate-x-1/2 bg-[#333] text-white px-6.25 py-3 rounded-[30px] text-[13px] font-medium z-3000 transition-transform duration-500 ${isToastShow ? 'translate-y-0' : 'translate-y-[200%]'}`}>
        {toastMsg}
      </div>
    </>
  );
}