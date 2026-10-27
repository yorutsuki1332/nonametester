'use client';

import { useState, useEffect } from 'react';
import { db } from '@/lib/firebase';
import firebase from 'firebase/compat/app';
import imageCompression from 'browser-image-compression';

interface Product {
  id: string;
  name: string;
  category: string;
  tag?: string;
  price: number;
  description?: string;
  images?: string[];
  sku?: string;
  createdAt?: any;
}

export default function AdminProductsListPage() {
  const [productsMap, setProductsMap] = useState<{ [key: string]: Product }>({});
  const [allProductsList, setAllProductsList] = useState<Product[]>([]);
  const [filteredList, setFilteredList] = useState<Product[]>([]);
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

  // 下架 Modal 狀態
  const [isDiscontinueOpen, setIsDiscontinueOpen] = useState(false);
  const [discontinueTarget, setDiscontinueTarget] = useState<Product | null>(null);

  // 吐司提示
  const [toastMsg, setToastMsg] = useState('');
  const [isToastShow, setIsToastShow] = useState(false);

  // 初始化雲端即時監聽
  useEffect(() => {
    const unsubscribe = db.collection("products").orderBy("createdAt", "desc").onSnapshot((querySnapshot) => {
      const map: { [key: string]: Product } = {};
      const list: Product[] = [];

      querySnapshot.forEach((doc) => {
        const data = { id: doc.id, ...doc.data() } as Product;
        map[doc.id] = data;
        list.push(data);
      });

      setProductsMap(map);
      setAllProductsList(list);
    });

    return () => unsubscribe();
  }, []);

  // 搜尋過濾
  useEffect(() => {
    const keyword = searchKeyword.trim().toLowerCase();
    if (!keyword) {
      setFilteredList(allProductsList);
      return;
    }

    const filtered = allProductsList.filter(p => {
      const skuMatch = p.id && p.id.toLowerCase().includes(keyword);
      const nameMatch = p.name && p.name.toLowerCase().includes(keyword);
      const categoryMatch = p.category && p.category.toLowerCase().includes(keyword);
      return skuMatch || nameMatch || categoryMatch;
    });
    setFilteredList(filtered);
  }, [searchKeyword, allProductsList]);

  const showToast = (message: string) => {
    setToastMsg(message);
    setIsToastShow(true);
    setTimeout(() => setIsToastShow(false), 3000);
  };

  // 開啟修改 Modal
  const openEditModal = (productId: string) => {
    const product = productsMap[productId];
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

  // 處理編輯時選取的圖片與壓縮
  const handleEditImageSelection = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const fileArray = Array.from(files).filter(f => f.type.startsWith('image/'));
    const totalCount = existingImages.length + newImageFiles.length + fileArray.length;

    if (totalCount > 15) {
      alert('商品圖片總數不能超過 15 張！');
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

  // 儲存修改 (已改為上傳至 Vercel Blob)
  const handleUpdateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsUpdating(true);

    try {
      // 1. 將新選取的圖片平行上傳至 Vercel Blob API
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

        return data.url; // 取得 Vercel Blob 的公開圖片網址
      });

      const newlyUploadedUrls = await Promise.all(uploadPromises);
      const finalImages = [...existingImages, ...newlyUploadedUrls];

      // 2. 更新 Firebase Firestore 中的資料
      const updatedData = {
        name: editName,
        category: editCategory,
        tag: editTag,
        price: parseFloat(editPrice),
        description: editDescription,
        images: finalImages, // 包含既有與新上傳的 Vercel Blob 網址
      };

      await db.collection("products").doc(editId).update(updatedData);

      showToast('✅ 商品資料與圖片已成功更新！');
      setIsEditOpen(false);
    } catch (error: any) {
      alert('更新失敗： ' + error.message);
    } finally {
      setIsUpdating(false);
    }
  };

  // 下架相關
  const openDiscontinueModalFromEdit = () => {
    const product = productsMap[editId];
    setIsEditOpen(false);
    if (product) {
      setDiscontinueTarget(product);
      setIsDiscontinueOpen(true);
    }
  };

  const openDiscontinueModal = (productId: string) => {
    const product = productsMap[productId];
    if (product) {
      setDiscontinueTarget(product);
      setIsDiscontinueOpen(true);
    }
  };

  const confirmDiscontinue = async () => {
    if (!discontinueTarget) return;
    const productId = discontinueTarget.id;

    try {
      await db.collection("discontinued_products").doc(productId).set({
        name: discontinueTarget.name,
        sku: discontinueTarget.sku || productId,
        category: discontinueTarget.category,
        tag: discontinueTarget.tag || "",
        price: discontinueTarget.price,
        description: discontinueTarget.description || "",
        images: discontinueTarget.images || [],
        createdAt: discontinueTarget.createdAt || firebase.firestore.FieldValue.serverTimestamp(),
        discontinuedAt: firebase.firestore.FieldValue.serverTimestamp(),
      });

      await db.collection("products").doc(productId).delete();

      setIsDiscontinueOpen(false);
      showToast('📥 商品已成功下架並移至已下架頁面！');
    } catch (error: any) {
      alert('下架失敗： ' + error.message);
    }
  };

  return (
    <>
      <div className="mb-[25px]">
        <h1 className="text-[24px] font-semibold mb-1">現時上架貨品</h1>
        <p className="text-[#888888] text-[14px]">管理目前所有在雲端資料庫中的商品清單，可直接進行修改或下架。</p>
      </div>

      <div className="mb-[25px]">
        <input 
          type="text" 
          value={searchKeyword}
          onChange={(e) => setSearchKeyword(e.target.value)}
          className="w-full max-w-[400px] p-[12px_18px] border border-[#e5e5e5] rounded-[30px] text-[14px] outline-none bg-white shadow-[0_2px_10px_rgba(0,0,0,0.02)] focus:border-[#111] transition"
          placeholder="🔍 搜尋商品名稱或分類..." 
        />
      </div>

      <div className="bg-white rounded-[16px] p-4 md:p-[25px] shadow-[0_4px_20px_rgba(0,0,0,0.03)] border border-[#e5e5e5] w-full">
        <table className="w-full border-collapse text-left text-[14px]">
          <thead className="hidden md:table-header-group">
            <tr>
              <th className="p-[15px] border-b-2 border-[#e5e5e5] text-[#888] font-semibold">商品編號</th>
              <th className="p-[15px] border-b-2 border-[#e5e5e5] text-[#888] font-semibold">商品名稱</th>
              <th className="p-[15px] border-b-2 border-[#e5e5e5] text-[#888] font-semibold">分類</th>
              <th className="p-[15px] border-b-2 border-[#e5e5e5] text-[#888] font-semibold">標籤</th>
              <th className="p-[15px] border-b-2 border-[#e5e5e5] text-[#888] font-semibold">售價 (HKD)</th>
              <th className="p-[15px] border-b-2 border-[#e5e5e5] text-[#888] font-semibold">操作</th>
            </tr>
          </thead>
          <tbody>
            {allProductsList.length === 0 ? (
              <tr><td colSpan={6} className="text-center text-[#888] py-[30px]">目前尚無任何上架商品</td></tr>
            ) : filteredList.length === 0 ? (
              <tr><td colSpan={6} className="text-center text-[#888] py-[30px]">沒有找到符合條件的商品</td></tr>
            ) : (
              filteredList.map(p => (
                <tr key={p.id} className="block md:table-row bg-white md:bg-transparent border md:border-none border-[#e5e5e5] rounded-lg md:rounded-none mb-4 md:mb-0 p-4 md:p-0 shadow-sm md:shadow-none hover:bg-[#fafafa]">
                  <td className="block md:table-cell p-[6px_0] md:p-[15px] border-none md:border-b border-[#e5e5e5] flex justify-between items-center font-medium">
                    <span className="md:hidden text-[#888] text-[12px] font-semibold">商品編號</span>
                    {p.id}
                  </td>
                  <td className="block md:table-cell p-[6px_0] md:p-[15px] border-none md:border-b border-[#e5e5e5] flex justify-between items-center font-medium">
                    <span className="md:hidden text-[#888] text-[12px] font-semibold">商品名稱</span>
                    {p.name}
                  </td>
                  <td className="block md:table-cell p-[6px_0] md:p-[15px] border-none md:border-b border-[#e5e5e5] flex justify-between items-center">
                    <span className="md:hidden text-[#888] text-[12px] font-semibold">分類</span>
                    {p.category}
                  </td>
                  <td className="block md:table-cell p-[6px_0] md:p-[15px] border-none md:border-b border-[#e5e5e5] flex justify-between items-center">
                    <span className="md:hidden text-[#888] text-[12px] font-semibold">標籤</span>
                    {p.tag ? <span className={`inline-block p-[4px_8px] rounded text-[11px] font-semibold ${p.tag.toLowerCase() === 'hot' ? 'bg-[#ff6b6b] text-white' : 'bg-[#111] text-white'}`}>{p.tag}</span> : <span className="text-[#aaa]">無</span>}
                  </td>
                  <td className="block md:table-cell p-[6px_0] md:p-[15px] border-none md:border-b border-[#e5e5e5] flex justify-between items-center md:w-[100px]">
                    <span className="md:hidden text-[#888] text-[12px] font-semibold">售價 (HKD)</span>
                    HKD {Number(p.price).toFixed(1)}
                  </td>
                  <td className="block md:table-cell p-[6px_0] md:p-[15px] border-none md:border-b border-[#e5e5e5] flex flex-col md:flex-row gap-2 mt-3 md:mt-0 pt-3 md:pt-0 border-t md:border-t-0">
                    <button className="w-full md:w-auto bg-[#111] text-white border-none p-[8px_14px] md:p-[6px_14px] rounded-md cursor-pointer text-[14px] md:text-[13px] hover:bg-[#333] transition" onClick={() => openEditModal(p.id)}>修改</button>
                    <button className="w-full md:w-auto bg-[#ff6b6b] text-white border-none p-[8px_14px] md:p-[6px_14px] rounded-md cursor-pointer text-[14px] md:text-[13px] hover:bg-[#fa5252] transition" onClick={() => openDiscontinueModal(p.id)}>下架</button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* 修改商品 Modal */}
      {isEditOpen && (
        <>
          <div className="fixed inset-0 bg-white/60 backdrop-blur-sm z-[1500]" onClick={closeEditModal} />
          <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[90%] max-w-[550px] max-h-[85vh] bg-white rounded-[16px] shadow-2xl z-[2500] flex flex-col overflow-hidden">
            <div className="p-6 border-b border-[#e5e5e5] flex justify-between items-center bg-[#fafafa]">
              <h2 className="text-[18px] font-semibold">修改商品資料</h2>
              <button className="bg-transparent border-none text-[26px] cursor-pointer text-[#888]" onClick={closeEditModal}>&times;</button>
            </div>
            <div className="p-6 overflow-y-auto">
              <form onSubmit={handleUpdateSubmit}>
                <div className="mb-5">
                  <label className="block text-[13px] font-semibold mb-2 text-[#555]">商品名稱</label>
                  <input type="text" value={editName} onChange={(e) => setEditName(e.target.value)} className="w-full p-3 border border-[#ddd] rounded-lg text-[14px] outline-none bg-white focus:border-black" required />
                </div>
                <div className="mb-5">
                  <label className="block text-[13px] font-semibold mb-2 text-[#555]">商品分類</label>
                  <select value={editCategory} onChange={(e) => setEditCategory(e.target.value)} className="w-full p-3 border border-[#ddd] rounded-lg text-[14px] outline-none bg-white focus:border-black" required>
                    <option value="ACCESSORY">精緻飾品 (ACCESSORY)</option>
                    <option value="DAILY WEAR">日常衣著 (DAILY WEAR)</option>
                    <option value="BAGS">包款配件 (BAGS)</option>
                  </select>
                </div>
                <div className="mb-5">
                  <label className="block text-[13px] font-semibold mb-2 text-[#555]">行銷標籤</label>
                  <select value={editTag} onChange={(e) => setEditTag(e.target.value)} className="w-full p-3 border border-[#ddd] rounded-lg text-[14px] outline-none bg-white focus:border-black">
                    <option value="">無標籤</option>
                    <option value="NEW">全新商品 (NEW)</option>
                    <option value="HOT">熱賣單品 (HOT)</option>
                  </select>
                </div>
                <div className="mb-5">
                  <label className="block text-[13px] font-semibold mb-2 text-[#555]">商品售價 (HKD)</label>
                  <input type="number" value={editPrice} onChange={(e) => setEditPrice(e.target.value)} className="w-full p-3 border border-[#ddd] rounded-lg text-[14px] outline-none bg-white focus:border-black" step="0.1" min="0" required />
                </div>

                <div className="mb-5">
                  <label className="block text-[13px] font-semibold mb-2 text-[#555]">商品圖片 (最多 15 張)</label>
                  <div className="border-2 border-dashed border-[#e5e5e5] rounded-lg p-[25px_15px] text-center bg-[#fafaf9] cursor-pointer hover:border-[#111] transition relative">
                    <input type="file" accept="image/*" multiple onChange={handleEditImageSelection} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" />
                    <div className="text-[13px] text-[#888] pointer-events-none">
                      📁 <strong className="text-[#333]">點擊此處</strong> 或將圖片檔案拖曳至此新增<br/>
                      <span className="text-[11px] text-[#888]">支援多張選取（自動高清壓縮與 Vercel Blob 上傳）</span>
                    </div>
                  </div>
                  <div className="grid grid-cols-[repeat(auto-fill,minmax(80px,1fr))] gap-2.5 mt-2.5">
                    {existingImages.map((url, idx) => (
                      <div key={`existing-${idx}`} className="relative w-[80px] h-[80px] rounded-lg border border-[#e5e5e5] overflow-hidden bg-[#f4f4f2] flex items-center justify-center">
                        <img src={url} alt="既有圖片" className="w-full h-full object-cover" />
                        <button type="button" onClick={() => removeExistingImage(idx)} className="absolute top-1 right-1 bg-black/60 text-white border-none rounded-full w-[18px] h-[18px] text-[10px] flex items-center justify-center cursor-pointer hover:bg-[#ff6b6b]">&times;</button>
                      </div>
                    ))}
                    {newImagePreviews.map((url, idx) => (
                      <div key={`new-${idx}`} className="relative w-[80px] h-[80px] rounded-lg border border-[#e5e5e5] overflow-hidden bg-[#f4f4f2] flex items-center justify-center">
                        <img src={url} alt="新選取圖片" className="w-full h-full object-cover" />
                        <button type="button" onClick={() => removeNewImage(idx)} className="absolute top-1 right-1 bg-black/60 text-white border-none rounded-full w-[18px] h-[18px] text-[10px] flex items-center justify-center cursor-pointer hover:bg-[#ff6b6b]">&times;</button>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="mb-5">
                  <label className="block text-[13px] font-semibold mb-2 text-[#555]">商品詳細描述</label>
                  <textarea value={editDescription} onChange={(e) => setEditDescription(e.target.value)} className="w-full p-3 border border-[#ddd] rounded-lg text-[14px] outline-none bg-white focus:border-black resize-y" rows={4} required />
                </div>
                
                <button type="submit" disabled={isUpdating} className="w-full bg-[#FEF9C3] text-[#111] p-4 rounded-lg font-semibold cursor-pointer hover:bg-[#f0e9aa] transition mt-2">
                  {isUpdating ? '正在上傳至 Vercel Blob 並更新資料...' : '儲存修改'}
                </button>
                <button type="button" onClick={openDiscontinueModalFromEdit} className="w-full bg-[#ff6b6b] text-white p-4 rounded-lg font-semibold cursor-pointer hover:bg-[#fa5252] transition mt-3">
                  下架商品
                </button>
              </form>
            </div>
          </div>
        </>
      )}

      {/* 下架確認 Modal */}
      {isDiscontinueOpen && discontinueTarget && (
        <>
          <div className="fixed inset-0 bg-white/60 backdrop-blur-sm z-[1500]" onClick={() => setIsDiscontinueOpen(false)} />
          <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[90%] max-w-[550px] bg-white rounded-[16px] shadow-2xl z-[2500] flex flex-col overflow-hidden">
            <div className="p-6 border-b border-[#e5e5e5] flex justify-between items-center bg-[#fafafa]">
              <h2 className="text-[18px] font-semibold">確認下架商品</h2>
              <button className="bg-transparent border-none text-[26px] cursor-pointer text-[#888]" onClick={() => setIsDiscontinueOpen(false)}>&times;</button>
            </div>
            <div className="p-6">
              <p className="text-[14px] text-[#555] mb-[25px] leading-relaxed">
                確定要將「{discontinueTarget.name}」下架嗎？下架後將移至已下架頁面。
              </p>
              <button type="button" onClick={confirmDiscontinue} className="w-full bg-[#ff6b6b] text-white p-4 rounded-lg font-semibold cursor-pointer hover:bg-[#fa5252] transition">
                確認下架
              </button>
              <button type="button" onClick={() => setIsDiscontinueOpen(false)} className="w-full bg-[#f5f5f5] text-[#333] p-4 rounded-lg font-semibold cursor-pointer hover:bg-[#eee] transition mt-2.5">
                取消
              </button>
            </div>
          </div>
        </>
      )}

      {/* 吐司通知 */}
      <div className={`fixed bottom-[30px] left-1/2 -translate-x-1/2 bg-[#333] text-white px-[25px] py-3 rounded-[30px] text-[13px] font-medium z-[3000] transition-transform duration-500 ${isToastShow ? 'translate-y-0' : 'translate-y-[200%]'}`}>
        {toastMsg}
      </div>
    </>
  );
}