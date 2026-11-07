'use client';

import { useState, useEffect } from 'react';
import { db } from '@/lib/firebase';
import firebase from 'firebase/compat/app';
import imageCompression from 'browser-image-compression';

interface DiscontinuedProduct {
  id: string;
  name: string;
  category: string;
  tag?: string;
  price: number;
  description?: string;
  images?: string[];
  sku?: string;
  createdAt?: any;
  discontinuedAt?: any;
}

export default function AdminDiscontinuedListPage() {
  const [discontinuedMap, setDiscontinuedMap] = useState<{ [key: string]: DiscontinuedProduct }>({});
  const [allList, setAllList] = useState<DiscontinuedProduct[]>([]);
  const [filteredList, setFilteredList] = useState<DiscontinuedProduct[]>([]);
  const [searchKeyword, setSearchKeyword] = useState('');

  // 編輯 Modal 狀態
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editId, setEditId] = useState('');
  const [editName, setEditName] = useState('');
  const [editCategory, setEditCategory] = useState('ACCESSORY');
  const [editTag, setEditTag] = useState('');
  const [editPrice, setEditPrice] = useState('');
  const [editDescription, setEditDescription] = useState('');

  // 圖片編輯狀態
  const [existingImages, setExistingImages] = useState<string[]>([]);
  const [newImageFiles, setNewImageFiles] = useState<File[]>([]);
  const [newImagePreviews, setNewImagePreviews] = useState<string[]>([]);
  const [isUpdating, setIsUpdating] = useState(false);

  // 刪除確認 Modal 狀態
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<DiscontinuedProduct | null>(null);

  // 🌟 自定義網頁主題彈窗狀態 (替代 alert)
  const [customModal, setCustomModal] = useState<{
    isOpen: boolean;
    title?: string;
    message: string;
    isConfirm?: boolean;
    onConfirm?: () => void;
  }>({
    isOpen: false,
    message: '',
    isConfirm: false,
  });

  const showAlert = (message: string, title = '提示訊息') => {
    setCustomModal({
      isOpen: true,
      title,
      message,
      isConfirm: false,
    });
  };

  const showConfirm = (message: string, onConfirm: () => void, title = '確認操作') => {
    setCustomModal({
      isOpen: true,
      title,
      message,
      isConfirm: true,
      onConfirm,
    });
  };

  // 吐司提示
  const [toastMsg, setToastMsg] = useState('');
  const [isToastShow, setIsToastShow] = useState(false);

  // 初始化雲端即時監聽
  useEffect(() => {
    const unsubscribe = db.collection("discontinued_products").orderBy("createdAt", "desc").onSnapshot((querySnapshot) => {
      const map: { [key: string]: DiscontinuedProduct } = {};
      const list: DiscontinuedProduct[] = [];

      querySnapshot.forEach((doc) => {
        const data = { id: doc.id, ...doc.data() } as DiscontinuedProduct;
        map[doc.id] = data;
        list.push(data);
      });

      setDiscontinuedMap(map);
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

    const filtered = allList.filter(p => {
      const skuMatch = p.id && p.id.toLowerCase().includes(keyword);
      const nameMatch = p.name && p.name.toLowerCase().includes(keyword);
      const categoryMatch = p.category && p.category.toLowerCase().includes(keyword);
      return skuMatch || nameMatch || categoryMatch;
    });
    setFilteredList(filtered);
  }, [searchKeyword, allList]);

  const showToast = (message: string) => {
    setToastMsg(message);
    setIsToastShow(true);
    setTimeout(() => setIsToastShow(false), 3000);
  };

  // 開啟修改 Modal
  const openEditModal = (productId: string) => {
    const product = discontinuedMap[productId];
    if (!product) return;

    setEditId(product.id);
    setEditName(product.name || '');
    setEditCategory(product.category || 'ACCESSORY');
    setEditTag(product.tag || '');
    setEditPrice(String(product.price || 0));
    setEditDescription(product.description || '');

    setExistingImages(product.images ? [...product.images] : []);
    setNewImageFiles([]);
    setNewImagePreviews([]);

    setIsEditOpen(true);
  };

  const closeEditModal = () => {
    setIsEditOpen(false);
  };

  // 處理圖片壓縮與選擇
  const handleEditImageSelection = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const fileArray = Array.from(files).filter(f => f.type.startsWith('image/'));
    const totalCount = existingImages.length + newImageFiles.length + fileArray.length;

    if (totalCount > 15) {
      showAlert('商品圖片總數不能超過 15 張！', '數量限制');
      return;
    }

    const options = {
      maxSizeMB: 0.5,
      maxWidthOrHeight: 1200,
      useWebWorker: true,
    };

    const newFiles = [...newImageFiles];
    const newPreviews = [...newImagePreviews];

    for (const file of fileArray) {
      try {
        const compressedFile = await imageCompression(file, options);
        newFiles.push(compressedFile);
        newPreviews.push(URL.createObjectURL(compressedFile));
      } catch (error) {
        console.error('圖片壓縮失敗，改用原圖暫存:', error);
        newFiles.push(file);
        newPreviews.push(URL.createObjectURL(file));
      }
    }

    setNewImageFiles(newFiles);
    setNewImagePreviews(newPreviews);
    e.target.value = '';
  };

  const removeExistingImage = (index: number) => {
    setExistingImages(prev => prev.filter((_, i) => i !== index));
  };

  const removeNewImage = (index: number) => {
    setNewImageFiles(prev => prev.filter((_, i) => i !== index));
    setNewImagePreviews(prev => prev.filter((_, i) => i !== index));
  };

  // 儲存修改 (上傳至 Vercel Blob)
  const handleUpdateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsUpdating(true);

    try {
      const uploadPromises = newImageFiles.map(async (file, i) => {
        const filename = `products/${editId}/${Date.now()}_${i}_${file.name}`;
        
        const response = await fetch(`/api/upload?filename=${encodeURIComponent(filename)}`, {
          method: 'POST',
          body: file,
        });

        const data = await response.json();
        if (!response.ok) {
          throw new Error(data.error || '圖片上傳至 Vercel Blob 失敗');
        }

        return data.url;
      });

      const newlyUploadedUrls = await Promise.all(uploadPromises);
      const finalImages = [...existingImages, ...newlyUploadedUrls];

      const updatedData = {
        name: editName,
        category: editCategory,
        tag: editTag,
        price: parseFloat(editPrice),
        description: editDescription,
        images: finalImages,
      };

      await db.collection("discontinued_products").doc(editId).update(updatedData);

      showToast('✅ 已下架商品資料與圖片已成功更新！');
      setIsEditOpen(false);
    } catch (error: any) {
      showAlert('更新失敗： ' + error.message, '錯誤');
    } finally {
      setIsUpdating(false);
    }
  };

  // 重新上架
  const restoreProduct = async (id: string) => {
    const product = discontinuedMap[id];
    if (!product) return;

    try {
      await db.collection("products").doc(id).set({
        name: product.name,
        sku: product.sku || id,
        category: product.category,
        tag: product.tag || "",
        price: product.price,
        description: product.description || "",
        images: product.images || [],
        createdAt: firebase.firestore.FieldValue.serverTimestamp(),
      });

      await db.collection("discontinued_products").doc(id).delete();
      showToast('✅ 商品已重新上架！');
    } catch (error: any) {
      showAlert('操作失敗：' + error.message, '錯誤');
    }
  };

  // 永久刪除
  const openDeleteModal = (id: string) => {
    const product = discontinuedMap[id];
    if (product) {
      setDeleteTarget(product);
      setIsDeleteOpen(true);
    }
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    try {
      await db.collection("discontinued_products").doc(deleteTarget.id).delete();
      setIsDeleteOpen(false);
      showToast('🗑️ 商品已永久刪除！');
    } catch (error: any) {
      showAlert('刪除失敗：' + error.message, '錯誤');
    }
  };

  return (
    <>
      <div className="mb-6.25">
        <h1 className="text-[24px] font-serif font-semibold mb-1 text-[#382E2B]">已下架貨品</h1>
        <p className="text-[#7A6E65] text-[14px]">管理目前所有已下架的選品，可選擇重新上架或永久刪除。</p>
      </div>

      <div className="mb-6.25">
        <input 
          type="text" 
          value={searchKeyword}
          onChange={(e) => setSearchKeyword(e.target.value)}
          className="w-full max-w-100 p-[12px_18px] border border-[#EBE5DF] rounded-[30px] text-[14px] outline-none bg-white shadow-[0_2px_10px_rgba(56,46,43,0.02)] focus:border-[#B35B48] transition"
          placeholder="🔍 搜尋選品名稱或分類..." 
        />
      </div>

      <div className="bg-white rounded-2xl shadow-[0_4px_20px_rgba(56,46,43,0.03)] border border-[#EBE5DF] w-full overflow-hidden">
        <div className="overflow-x-auto w-full p-4 md:p-6.25">
          <table className="w-full md:min-w-187.5 border-collapse text-left text-[14px]">
            <thead className="hidden md:table-header-group">
              <tr className="border-b-2 border-[#EBE5DF]">
                <th className="p-3.75 text-[#7A6E65] font-semibold text-[15px] whitespace-nowrap">商品編號</th>
                <th className="p-3.75 text-[#7A6E65] font-semibold text-[15px] whitespace-nowrap">商品名稱</th>
                <th className="p-3.75 text-[#7A6E65] font-semibold text-[15px] whitespace-nowrap">分類</th>
                <th className="p-3.75 text-[#7A6E65] font-semibold text-[15px] whitespace-nowrap">售價 (HKD)</th>
                <th className="p-3.75 text-[#7A6E65] font-semibold text-[15px] whitespace-nowrap text-center">操作</th>
              </tr>
            </thead>
            <tbody>
              {allList.length === 0 ? (
                <tr><td colSpan={5} className="text-center text-[#7A6E65] py-7.5">目前沒有已下架的商品</td></tr>
              ) : filteredList.length === 0 ? (
                <tr><td colSpan={5} className="text-center text-[#7A6E65] py-7.5">沒有找到符合條件的已下架商品</td></tr>
              ) : (
                filteredList.map(p => (
                  <tr key={p.id} className="block md:table-row bg-white md:bg-transparent border md:border-none border-[#EBE5DF] rounded-lg md:rounded-none mb-3.75 md:mb-0 p-3.75 md:p-0 shadow-xs md:shadow-none hover:bg-[#FAF7F2] transition">
                    <td className="flex justify-between items-center py-1.5 md:py-3.75 md:px-3.75 md:table-cell md:border-b md:border-[#EBE5DF] md:align-middle font-medium text-[#382E2B] whitespace-break-spaces md:whitespace-nowrap">
                      <span className="md:hidden text-[#7A6E65] text-[12px] font-semibold">商品編號</span>
                      {p.id}
                    </td>
                    <td className="flex justify-between items-center py-1.5 md:py-3.75 md:px-3.75 md:table-cell md:border-b md:border-[#EBE5DF] md:align-middle font-medium text-[#382E2B] text-right md:text-left">
                      <span className="md:hidden text-[#7A6E65] text-[12px] font-semibold text-right">商品名稱</span>
                      <span className="w-50 md:w-auto">{p.name}</span>
                    </td>
                    <td className="flex justify-between items-center py-1.5 md:py-3.75 md:px-3.75 md:table-cell md:border-b md:border-[#EBE5DF] md:align-middle text-[#6E6058]">
                      <span className="md:hidden text-[#7A6E65] text-[12px] font-semibold">商品分類</span>
                      {p.category}
                    </td>
                    <td className="flex justify-between items-center py-1.5 md:py-3.75 md:px-3.75 md:table-cell md:border-b md:border-[#EBE5DF] md:align-middle md:w-22.5 font-medium text-[#382E2B]">
                      <span className="md:hidden text-[#7A6E65] text-[12px] font-semibold">售價</span>
                      HKD {Number(p.price).toFixed(1)}
                    </td>
                    <td className="flex flex-col md:table-cell py-3 md:py-3.75 md:px-3.75 border-t md:border-t-0 border-[#EBE5DF] md:border-b md:align-middle md:w-72.5 mt-3 md:mt-0 pt-3 md:pt-3.75 gap-2">
                      <div className="flex flex-col md:flex-row gap-2">
                        <button className="w-full md:w-auto bg-white text-[#382E2B] border border-[#EBE5DF] p-2.5 md:p-[6px_14px] rounded-md cursor-pointer text-[14px] md:text-[13px] hover:bg-[#F4F0EA] transition" onClick={() => openEditModal(p.id)}>資料修改</button>
                        <button className="w-full md:w-auto bg-[#B35B48] text-white border-none p-2.5 md:p-[6px_14px] rounded-md cursor-pointer text-[14px] md:text-[13px] hover:bg-[#9B4C3A] transition shadow-xs" onClick={() => restoreProduct(p.id)}>重新上架</button>
                        <button className="w-full md:w-auto bg-rose-700 text-white border-none p-2.5 md:p-[6px_14px] rounded-md cursor-pointer text-[14px] md:text-[13px] hover:bg-rose-800 transition shadow-xs" onClick={() => openDeleteModal(p.id)}>永久刪除</button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 修改已下架商品 Modal */}
      {isEditOpen && (
        <>
          <div className="fixed inset-0 bg-[#382E2B]/40 backdrop-blur-xs z-1500" onClick={closeEditModal} />
          <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[90%] max-w-137.5 max-h-[85vh] bg-[#FAF7F2] border border-[#EBE5DF] rounded-2xl shadow-2xl z-2500 flex flex-col overflow-hidden">
            <div className="p-6 border-b border-[#EBE5DF] flex justify-between items-center bg-[#F4F0EA]">
              <h2 className="text-[18px] font-serif font-semibold text-[#382E2B]">修改已下架商品資料</h2>
              <button className="bg-transparent border-none text-[26px] cursor-pointer text-[#7A6E65]" onClick={closeEditModal}>&times;</button>
            </div>
            <div className="p-6 overflow-y-auto">
              <form onSubmit={handleUpdateSubmit}>
                <div className="mb-5">
                  <label className="block text-[13px] font-semibold mb-2 text-[#6E6058]">商品名稱</label>
                  <input type="text" value={editName} onChange={(e) => setEditName(e.target.value)} className="w-full p-3 border border-[#EBE5DF] rounded-lg text-[14px] outline-none bg-white focus:border-[#B35B48]" required />
                </div>
                <div className="mb-5">
                  <label className="block text-[13px] font-semibold mb-2 text-[#6E6058]">商品分類</label>
                  <select value={editCategory} onChange={(e) => setEditCategory(e.target.value)} className="w-full p-3 border border-[#EBE5DF] rounded-lg text-[14px] outline-none bg-white focus:border-[#B35B48]" required>
                    <option value="ACCESSORY">精緻飾品 (ACCESSORY)</option>
                    <option value="DAILY WEAR">日常衣著 (DAILY WEAR)</option>
                    <option value="BAGS">包款配件 (BAGS)</option>
                  </select>
                </div>
                <div className="mb-5">
                  <label className="block text-[13px] font-semibold mb-2 text-[#6E6058]">行銷標籤</label>
                  <select value={editTag} onChange={(e) => setEditTag(e.target.value)} className="w-full p-3 border border-[#EBE5DF] rounded-lg text-[14px] outline-none bg-white focus:border-[#B35B48]">
                    <option value="">無標籤</option>
                    <option value="NEW">全新商品 (NEW)</option>
                    <option value="HOT">熱賣單品 (HOT)</option>
                  </select>
                </div>
                <div className="mb-5">
                  <label className="block text-[13px] font-semibold mb-2 text-[#6E6058]">商品售價 (HKD)</label>
                  <input type="number" value={editPrice} onChange={(e) => setEditPrice(e.target.value)} className="w-full p-3 border border-[#EBE5DF] rounded-lg text-[14px] outline-none bg-white focus:border-[#B35B48]" step="0.1" min="0" required />
                </div>

                <div className="mb-5">
                  <label className="block text-[13px] font-semibold mb-2 text-[#6E6058]">商品圖片 (最多 15 張)</label>
                  <div className="border-2 border-dashed border-[#EBE5DF] rounded-lg p-[25px_15px] text-center bg-white cursor-pointer hover:border-[#B35B48] transition relative">
                    <input type="file" accept="image/*" multiple onChange={handleEditImageSelection} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" />
                    <div className="text-[13px] text-[#7A6E65] pointer-events-none">
                      📁 <strong className="text-[#382E2B]">點擊此處</strong> 或將圖片檔案拖曳至此新增<br/>
                      <span className="text-[11px] text-[#8C7B70]">支援多張選取（自動高清壓縮與 Vercel Blob 上傳）</span>
                    </div>
                  </div>
                  <div className="grid grid-cols-[repeat(auto-fill,minmax(80px,1fr))] gap-2.5 mt-2.5">
                    {existingImages.map((url, idx) => (
                      <div key={`existing-${idx}`} className="relative w-20 h-20 rounded-lg border border-[#EBE5DF] overflow-hidden bg-[#F4F0EA] flex items-center justify-center">
                        <img src={url} alt="既有圖片" className="w-full h-full object-cover" />
                        <button type="button" onClick={() => removeExistingImage(idx)} className="absolute top-1 right-1 bg-[#382E2B]/60 text-white border-none rounded-full w-4.5 h-4.5 text-[10px] flex items-center justify-center cursor-pointer hover:bg-rose-700">&times;</button>
                      </div>
                    ))}
                    {newImagePreviews.map((url, idx) => (
                      <div key={`new-${idx}`} className="relative w-20 h-20 rounded-lg border border-[#EBE5DF] overflow-hidden bg-[#F4F0EA] flex items-center justify-center">
                        <img src={url} alt="新選取圖片" className="w-full h-full object-cover" />
                        <button type="button" onClick={() => removeNewImage(idx)} className="absolute top-1 right-1 bg-[#382E2B]/60 text-white border-none rounded-full w-4.5 h-4.5 text-[10px] flex items-center justify-center cursor-pointer hover:bg-rose-700">&times;</button>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="mb-5">
                  <label className="block text-[13px] font-semibold mb-2 text-[#6E6058]">商品詳細描述</label>
                  <textarea value={editDescription} onChange={(e) => setEditDescription(e.target.value)} className="w-full p-3 border border-[#EBE5DF] rounded-lg text-[14px] outline-none bg-white focus:border-[#B35B48] resize-y" rows={4} required />
                </div>

                <button type="submit" disabled={isUpdating} className="w-full bg-[#B35B48] text-white p-4 rounded-lg font-semibold cursor-pointer hover:bg-[#9B4C3A] transition mt-2 shadow-xs">
                  {isUpdating ? '正在上傳至 Vercel Blob 並更新資料...' : '儲存修改'}
                </button>
              </form>
            </div>
          </div>
        </>
      )}

      {/* 刪除確認 Modal */}
      {isDeleteOpen && deleteTarget && (
        <>
          <div className="fixed inset-0 bg-[#382E2B]/40 backdrop-blur-xs z-1500" onClick={() => setIsDeleteOpen(false)} />
          <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[90%] max-w-137.5 bg-[#FAF7F2] border border-[#EBE5DF] rounded-2xl shadow-2xl z-3000 flex flex-col overflow-hidden">
            <div className="p-6 border-b border-[#EBE5DF] flex justify-between items-center bg-[#F4F0EA]">
              <h2 className="text-[18px] font-serif font-semibold text-rose-700">刪除確認</h2>
              <button className="bg-transparent border-none text-[26px] cursor-pointer text-[#7A6E65]" onClick={() => setIsDeleteOpen(false)}>&times;</button>
            </div>
            <div className="p-6">
              <p className="text-[14px] text-[#6E6058] mb-6.25 leading-relaxed">
                確定要永久刪除「{deleteTarget.name}」這件商品嗎？此動作無法復原。
              </p>
              <button type="button" onClick={confirmDelete} className="w-full bg-rose-700 text-white p-4 rounded-lg font-semibold cursor-pointer hover:bg-rose-800 transition shadow-xs">
                永久刪除
              </button>
              <button type="button" onClick={() => setIsDeleteOpen(false)} className="w-full bg-[#F4F0EA] text-[#382E2B] p-4 rounded-lg font-semibold cursor-pointer hover:bg-[#EBE5DF] transition mt-2.5">
                取消
              </button>
            </div>
          </div>
        </>
      )}

      {/* 🌟 全域自定義網頁主題彈出介面 (替代 alert) */}
      {customModal.isOpen && (
        <div className="fixed inset-0 bg-[#382E2B]/40 backdrop-blur-xs z-5000 flex items-center justify-center p-4">
          <div className="bg-[#FAF7F2] border border-[#EBE5DF] rounded-2xl w-full max-w-sm p-6 shadow-[0_10px_40px_rgba(56,46,43,0.15)] animate-in fade-in zoom-in duration-200">
            <h3 className="text-base font-serif font-semibold text-[#382E2B] mb-2.5">
              {customModal.title || '提示訊息'}
            </h3>
            <p className="text-xs text-[#6E6058] mb-6 whitespace-pre-wrap leading-relaxed">
              {customModal.message}
            </p>
            <div className="flex justify-end gap-3">
              {customModal.isConfirm && (
                <button
                  type="button"
                  onClick={() => setCustomModal(prev => ({ ...prev, isOpen: false }))}
                  className="px-4 py-2 bg-[#F4F0EA] text-[#382E2B] border border-[#EBE5DF] rounded-lg text-xs font-semibold hover:bg-[#EBE5DF] transition cursor-pointer"
                >
                  取消
                </button>
              )}
              <button
                type="button"
                onClick={() => {
                  if (customModal.onConfirm) customModal.onConfirm();
                  setCustomModal(prev => ({ ...prev, isOpen: false }));
                }}
                className="px-5 py-2 bg-[#B35B48] text-white rounded-lg text-xs font-semibold hover:bg-[#9B4C3A] transition shadow-xs cursor-pointer"
              >
                確定
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 吐司通知 */}
      <div className={`fixed bottom-8 left-1/2 -translate-x-1/2 bg-[#382E2B] text-[#FAF7F2] px-6 py-3 rounded-full text-[13px] font-medium z-3000 transition-transform duration-500 shadow-md ${isToastShow ? 'translate-y-0' : 'translate-y-[300%]'}`}>
        {toastMsg}
      </div>
    </>
  );
}