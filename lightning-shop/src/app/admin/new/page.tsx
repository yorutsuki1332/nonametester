'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import { db } from '@/lib/firebase';
import firebase from 'firebase/compat/app';
import imageCompression from 'browser-image-compression';
import { errorMessage } from '@/lib/errors';

function parseStock(value: string) {
  if (value.trim() === '') return null;
  const parsed = Math.floor(Number(value));
  return Number.isFinite(parsed) ? Math.max(0, parsed) : null;
}

async function loadNextSkuIndex(year: number) {
  try {
    const [productSnapshot, discontinuedSnapshot] = await Promise.all([
      db.collection("products").get(),
      db.collection("discontinued_products").get()
    ]);

    let maxIndex = 0;
    const yearStr = String(year);

    const evaluateSnapshot = (querySnapshot: firebase.firestore.QuerySnapshot) => {
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        const sku = typeof data.sku === 'string' ? data.sku : doc.id;
        if (sku.includes(yearStr)) {
          const regex = new RegExp(yearStr + '(\\d{3})');
          const match = sku.match(regex);
          if (match && match[1]) {
            const idx = parseInt(match[1], 10);
            if (idx > maxIndex) {
              maxIndex = idx;
            }
          }
        }
      });
    };

    evaluateSnapshot(productSnapshot);
    evaluateSnapshot(discontinuedSnapshot);
    return maxIndex + 1;
  } catch (error) {
    console.log("讀取資料庫失敗:", error);
    return 1;
  }
}

export default function AdminAddProductPage() {
  const [productName, setProductName] = useState('');
  const [skuRegion, setSkuRegion] = useState('');
  const [skuGender, setSkuGender] = useState('');
  const [productCategory, setProductCategory] = useState('');
  const [productTag, setProductTag] = useState('');
  const [salePrice, setSalePrice] = useState('');
  const [stock, setStock] = useState('');
  const [productDesc, setProductDesc] = useState('');
  
  const [nextIndex, setNextIndex] = useState(1);
  const [currentYear] = useState(() => new Date().getFullYear());

  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);
  const [uploadedPreviews, setUploadedPreviews] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isToastShow, setIsToastShow] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);

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

  const productSKU = skuRegion && skuGender
    ? `${skuRegion}${currentYear}${String(nextIndex).padStart(3, '0')}${skuGender}`
    : '';

  useEffect(() => {
    let cancelled = false;
    loadNextSkuIndex(currentYear).then((index) => {
      if (!cancelled) setNextIndex(index);
    });
    return () => {
      cancelled = true;
    };
  }, [currentYear]);

  const processFiles = async (files: FileList | File[]) => {
    const fileArray = Array.from(files).filter(f => f.type.startsWith('image/'));
    if (uploadedFiles.length + fileArray.length > 15) {
      showAlert('商品圖片總數不能超過 15 張！', '數量限制');
      return;
    }

    const options = {
      maxSizeMB: 1.5,
      maxWidthOrHeight: 2400,
      initialQuality: 0.92,
      useWebWorker: true,
    };

    const newFiles = [...uploadedFiles];
    const newPreviews = [...uploadedPreviews];

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

    setUploadedFiles(newFiles);
    setUploadedPreviews(newPreviews);
  };

  const handleImageSelection = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      processFiles(e.target.files);
    }
    e.target.value = '';
  };

  const removeImage = (index: number) => {
    setUploadedFiles(prev => prev.filter((_, i) => i !== index));
    setUploadedPreviews(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!productSKU) {
      showAlert('請完整選擇貨源地區與建議性別！', '欄位未填寫');
      return;
    }

    setIsSubmitting(true);

    try {
      const uploadPromises = uploadedFiles.map(async (file, i) => {
        const filename = `products/${productSKU}/${Date.now()}_${i}_${file.name}`;
        
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

      const imageUrls = await Promise.all(uploadPromises);

      const newProduct = {
        createdAt: firebase.firestore.FieldValue.serverTimestamp(),
        name: productName,
        sku: productSKU,
        price: parseFloat(salePrice),
        category: productCategory,
        tag: productTag,
        description: productDesc,
        images: imageUrls,
        stock: parseStock(stock),
      };

      await db.collection("products").doc(productSKU).set(newProduct);

      setIsToastShow(true);
      setTimeout(() => setIsToastShow(false), 3000);

      setProductName('');
      setSkuRegion('');
      setSkuGender('');
      setProductCategory('');
      setProductTag('');
      setSalePrice('');
      setStock('');
      setProductDesc('');
      setUploadedFiles([]);
      setUploadedPreviews([]);
      setNextIndex(await loadNextSkuIndex(currentYear));
    } catch (error: unknown) {
      showAlert('上架失敗： ' + errorMessage(error), '系統錯誤');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <div className="mb-8">
        <h1 className="text-2xl font-serif font-semibold mb-1 text-[#382E2B]">上架新商品</h1>
        <p className="text-[#7A6E65] text-sm">填寫下方欄位，系統將自動以 SKU 作為 Firestore 文件名稱儲存。</p>
      </div>

      <div className="bg-white rounded-2xl p-5 md:p-10 shadow-[0_4px_20px_rgba(56,46,43,0.03)] border border-[#EBE5DF]">
        <form onSubmit={handleSubmit}>
          <h2 className="text-base font-semibold mb-5 pb-2.5 border-b border-[#EBE5DF] text-[#382E2B]">基本資訊</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            <div className="flex flex-col gap-2">
              <label className="text-xs font-semibold text-[#6E6058]">商品名稱 <span className="text-[#B35B48] ml-1">*</span></label>
              <input type="text" value={productName} onChange={(e) => setProductName(e.target.value)} className="py-3 px-4 border border-[#EBE5DF] rounded-lg text-sm outline-none bg-[#FAF7F2] focus:border-[#B35B48] focus:shadow-[0_0_0_3px_rgba(179,91,72,0.15)] transition" placeholder="例如：極簡純銀細緻鎖骨鍊" required />
            </div>
            <div className="flex flex-col gap-2">
              <label className="text-xs font-semibold text-[#6E6058]">自動組成商品編號 (SKU)</label>
              <input type="text" value={productSKU} readOnly className="py-3 px-4 border border-[#EBE5DF] rounded-lg text-sm outline-none bg-[#F4F0EA] font-bold tracking-[1px] text-[#382E2B] cursor-not-allowed" placeholder="請填寫下方選項自動生成" />
            </div>
          </div>

          <h2 className="text-base font-semibold mb-5 pb-2.5 border-b border-[#EBE5DF] text-[#382E2B]">商品資訊</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            <div className="flex flex-col gap-2">
              <label className="text-xs font-semibold text-[#6E6058]">貨源地區 <span className="text-[#B35B48] ml-1">*</span></label>
              <select value={skuRegion} onChange={(e) => setSkuRegion(e.target.value)} className="py-3 px-4 border border-[#EBE5DF] rounded-lg text-sm outline-none bg-[#FAF7F2] focus:border-[#B35B48] focus:shadow-[0_0_0_3px_rgba(179,91,72,0.15)] transition" required>
                <option value="" disabled>請選擇貨源地區</option>
                <option value="HK">香港 (HK)</option>
                <option value="TW">台灣 (TW)</option>
                <option value="CN">中國 (CN)</option>
                <option value="KR">韓國 (KR)</option>
                <option value="JP">日本 (JP)</option>
                <option value="US">美國 (US)</option>
              </select>
            </div>
            <div className="flex flex-col gap-2">
              <label className="text-xs font-semibold text-[#6E6058]">建議性別 <span className="text-[#B35B48] ml-1">*</span></label>
              <select value={skuGender} onChange={(e) => setSkuGender(e.target.value)} className="py-3 px-4 border border-[#EBE5DF] rounded-lg text-sm outline-none bg-[#FAF7F2] focus:border-[#B35B48] focus:shadow-[0_0_0_3px_rgba(179,91,72,0.15)] transition" required>
                <option value="" disabled>請選擇建議性別</option>
                <option value="M">男裝 (M)</option>
                <option value="F">女裝 (F)</option>
                <option value="K">童裝 (K)</option>
                <option value="N">中性 (N)</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            <div className="flex flex-col gap-2">
              <label className="text-xs font-semibold text-[#6E6058]">商品分類 <span className="text-[#B35B48] ml-1">*</span></label>
              <select value={productCategory} onChange={(e) => setProductCategory(e.target.value)} className="py-3 px-4 border border-[#EBE5DF] rounded-lg text-sm outline-none bg-[#FAF7F2] focus:border-[#B35B48] focus:shadow-[0_0_0_3px_rgba(179,91,72,0.15)] transition" required>
                <option value="" disabled>請選擇商品分類</option>
                <option value="ACCESSORY">精緻飾品 (ACCESSORY)</option>
                <option value="DAILY WEAR">日常衣著 (DAILY WEAR)</option>
                <option value="BAGS">包款配件 (BAGS)</option>
              </select>
            </div>
            <div className="flex flex-col gap-2">
              <label className="text-xs font-semibold text-[#6E6058]">行銷標籤 (選填)</label>
              <select value={productTag} onChange={(e) => setProductTag(e.target.value)} className="py-3 px-4 border border-[#EBE5DF] rounded-lg text-sm outline-none bg-[#FAF7F2] focus:border-[#B35B48] focus:shadow-[0_0_0_3px_rgba(179,91,72,0.15)] transition">
                <option value="">無標籤</option>
                <option value="NEW">全新商品 (NEW)</option>
                <option value="HOT">熱賣單品 (HOT)</option>
              </select>
            </div>
          </div>

          <h2 className="text-base font-semibold mb-5 pb-2.5 border-b border-[#EBE5DF] text-[#382E2B]">價格設定</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            <div className="flex flex-col gap-2">
              <label className="text-xs font-semibold text-[#6E6058]">商品售價 <span className="text-[#B35B48] ml-1">*</span></label>
              <div className="relative block items-center">
                <span className="absolute left-3.75 top-1/2 -translate-y-1/2 text-[#7A6E65] text-sm pointer-events-none z-10">HKD</span>
                <input type="number" value={salePrice} onChange={(e) => setSalePrice(e.target.value)} 
                style={{ paddingLeft: '55px' }} 
                className="w-full py-3 pl-16 pr-4 border border-[#EBE5DF] rounded-lg text-sm outline-none bg-[#FAF7F2] focus:border-[#B35B48] focus:shadow-[0_0_0_3px_rgba(179,91,72,0.15)] transition" placeholder="0" min="0" step="0.1" required />
              </div>
            </div>
            <div className="flex flex-col gap-2">
              <label className="text-xs font-semibold text-[#6E6058]">庫存數量 <span className="font-normal text-[#A3958B]">選填，5 件以下會出現在儀表板</span></label>
              <input type="number" value={stock} onChange={(e) => setStock(e.target.value)} className="py-3 px-4 border border-[#EBE5DF] rounded-lg text-sm outline-none bg-[#FAF7F2] focus:border-[#B35B48] focus:shadow-[0_0_0_3px_rgba(179,91,72,0.15)] transition" placeholder="例如：12" min="0" step="1" />
            </div>
          </div>

          <h2 className="text-base font-semibold mb-5 pb-2.5 border-b border-[#EBE5DF] text-[#382E2B]">商品圖片 (最多 15 張)</h2>
          <div className="mb-8">
            <div className="flex flex-col gap-3">
              <label className="text-xs font-semibold text-[#6E6058]">上傳圖片</label>
              <div 
                className={`border-2 border-dashed rounded-lg py-9 px-5 text-center bg-[#FAF7F2] cursor-pointer transition relative ${isDragOver ? 'border-[#B35B48] bg-[#F4F0EA]' : 'border-[#EBE5DF] hover:border-[#B35B48] hover:bg-[#F4F0EA]'}`}
                onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
                onDragLeave={() => setIsDragOver(false)}
                onDrop={(e) => {
                  e.preventDefault();
                  setIsDragOver(false);
                  if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
                    processFiles(e.dataTransfer.files);
                  }
                }}
              >
                <input type="file" accept="image/*" multiple onChange={handleImageSelection} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" />
                <div className="text-sm text-[#7A6E65] pointer-events-none">
                  📁 <strong className="text-[#382E2B]">點擊此處</strong> 或將圖片檔案拖曳至此上傳<br/>
                  <span className="text-xs text-[#8C7B70]">可一次選多張，最多 15 張。建議放入不同角度與細節實拍，前台可以放大檢視。</span>
                </div>
              </div>
              <div className="grid grid-cols-[repeat(auto-fill,minmax(90px,1fr))] gap-3 mt-2.5">
                {uploadedPreviews.map((src, index) => (
                  <div key={index} className="relative w-90px h-90px rounded-lg border border-[#EBE5DF] overflow-hidden bg-[#F4F0EA] flex items-center justify-center">
                    <Image src={src} alt="預覽圖" fill unoptimized sizes="90px" className="object-cover" />
                    <button type="button" onClick={() => removeImage(index)} className="absolute top-1 right-1 bg-[rgba(56,46,43,0.7)] text-white border-none rounded-full w-5 h-5 text-[11px] flex items-center justify-center cursor-pointer hover:bg-[#B35B48] transition">&times;</button>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <h2 className="text-base font-semibold mb-5 pb-2.5 border-b border-[#EBE5DF] text-[#382E2B]">商品詳情</h2>
          <div className="mb-8">
            <div className="flex flex-col gap-2">
              <label className="text-xs font-semibold text-[#6E6058]">商品詳細描述 (支援多行)</label>
              <textarea value={productDesc} onChange={(e) => setProductDesc(e.target.value)} className="w-full py-3 px-4 border border-[#EBE5DF] rounded-lg text-sm outline-none bg-[#FAF7F2] focus:border-[#B35B48] focus:shadow-[0_0_0_3px_rgba(179,91,72,0.15)] resize-none h-30 transition" placeholder="請輸入材質、尺寸或品牌故事..." required />
            </div>
          </div>

          <div className="flex flex-col-reverse md:flex-row justify-end gap-2.5 md:gap-4 mt-10 pt-5 border-t border-[#EBE5DF]">
            <button type="button" onClick={() => { void loadNextSkuIndex(currentYear).then(setNextIndex); }} className="w-full md:w-auto py-3 px-7 rounded-full text-sm font-medium bg-transparent text-[#7A6E65] border border-[#EBE5DF] hover:bg-[#F4F0EA] hover:text-[#382E2B] transition cursor-pointer">重新載入序號</button>
            <button type="submit" disabled={isSubmitting} className="w-full md:w-auto py-3 px-7 rounded-full text-sm font-medium bg-[#B35B48] text-white hover:bg-[#9B4C3A] hover:-translate-y-0.5 hover:shadow-[0_5px_15px_rgba(179,91,72,0.2)] transition cursor-pointer">
              {isSubmitting ? '正在同時上傳圖片與建立商品...' : '確認上架商品'}
            </button>
          </div>
        </form>
      </div>

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
              <button
                type="button"
                onClick={() => setCustomModal(prev => ({ ...prev, isOpen: false }))}
                className="px-5 py-2 bg-[#B35B48] text-white rounded-lg text-xs font-semibold hover:bg-[#9B4C3A] transition shadow-xs cursor-pointer"
              >
                確定
              </button>
            </div>
          </div>
        </div>
      )}

      <div className={`fixed bottom-8 left-1/2 -translate-x-1/2 bg-[#382E2B] text-[#FAF7F2] px-6 py-3 rounded-full text-xs font-medium z-3000 transition-transform duration-1000 shadow-md ${isToastShow ? 'translate-y-0' : 'translate-y-[300%]'}`}>
        ✅ 商品上架成功！雲端資料庫已同步。
      </div>
    </>
  );
}