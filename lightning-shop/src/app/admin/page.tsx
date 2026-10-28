'use client';

import { useState, useEffect } from 'react';
import { db } from '@/lib/firebase';
import firebase from 'firebase/compat/app';
import imageCompression from 'browser-image-compression';

export default function AdminAddProductPage() {
  const [productName, setProductName] = useState('');
  const [skuRegion, setSkuRegion] = useState('');
  const [skuGender, setSkuGender] = useState('');
  const [productCategory, setProductCategory] = useState('');
  const [productTag, setProductTag] = useState('');
  const [salePrice, setSalePrice] = useState('');
  const [productDesc, setProductDesc] = useState('');
  
  const [productSKU, setProductSKU] = useState('');
  const [nextIndex, setNextIndex] = useState(1);
  const [currentYear, setCurrentYear] = useState(2026);

  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);
  const [uploadedPreviews, setUploadedPreviews] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isToastShow, setIsToastShow] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);

  useEffect(() => {
    initAutoSku();
    setCurrentYear(new Date().getFullYear());
  }, []);

  useEffect(() => {
    if (!skuRegion || !skuGender) {
      setProductSKU('');
      return;
    }
    const paddedIndex = String(nextIndex).padStart(3, '0');
    setProductSKU(`${skuRegion}${currentYear}${paddedIndex}${skuGender}`);
  }, [skuRegion, skuGender, nextIndex, currentYear]);

  const initAutoSku = async () => {
    const year = new Date().getFullYear();
    setCurrentYear(year);
    try {
      const querySnapshot = await db.collection("products").get();
      let maxIndex = 0;
      const yearStr = String(year);

      querySnapshot.forEach((doc) => {
        const data = doc.data();
        const sku = data.sku || doc.id;
        if (sku && sku.includes(yearStr)) {
          const regex = new RegExp(yearStr + '(\\d{3})');
          const match = sku.match(regex);
          if (match && match[1]) {
            const idx = parseInt(match[1], 10);
            if (idx > maxIndex) maxIndex = idx;
          }
        }
      });
      setNextIndex(maxIndex + 1);
    } catch (error) {
      console.log("讀取資料庫失敗:", error);
      setNextIndex(1);
    }
  };

  const processFiles = async (files: FileList | File[]) => {
    const fileArray = Array.from(files).filter(f => f.type.startsWith('image/'));
    if (uploadedFiles.length + fileArray.length > 15) {
      alert('商品圖片總數不能超過 15 張！');
      return;
    }

    const options = {
      maxSizeMB: 0.5,
      maxWidthOrHeight: 1200,
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
      alert('請完整選擇貨源地區與建議性別！');
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
      setProductDesc('');
      setUploadedFiles([]);
      setUploadedPreviews([]);
      initAutoSku();
    } catch (error: any) {
      alert('上架失敗： ' + error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <div className="mb-8">
        <h1 className="text-2xl font-semibold mb-1 text-[#333333]">上架新商品</h1>
        <p className="text-[#888888] text-sm">填寫下方欄位，系統將自動以 SKU 作為 Firestore 文件名稱儲存。</p>
      </div>

      <div className="bg-white rounded-2xl p-5 md:p-10 shadow-[0_4px_20px_rgba(0,0,0,0.03)] border border-[#e5e5e5]">
        <form onSubmit={handleSubmit}>
          <h2 className="text-base font-semibold mb-5 pb-2.5 border-b border-[#e5e5e5] text-[#333333]">基本資訊</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            <div className="flex flex-col gap-2">
              <label className="text-xs font-semibold text-[#333333]">商品名稱 <span className="text-[#ff6b6b] ml-1">*</span></label>
              <input type="text" value={productName} onChange={(e) => setProductName(e.target.value)} className="py-3 px-4 border border-[#e5e5e5] rounded-lg text-sm outline-none bg-white focus:border-[#d4a373] focus:shadow-[0_0_0_3px_rgba(254,249,195,0.5)] transition" placeholder="例如：極簡純銀細緻鎖骨鍊" required />
            </div>
            <div className="flex flex-col gap-2">
              <label className="text-xs font-semibold text-[#333333]">自動組成商品編號 (SKU)</label>
              <input type="text" value={productSKU} readOnly className="py-3 px-4 border border-[#e5e5e5] rounded-lg text-sm outline-none bg-[#f4f4f2] font-bold tracking-[1px] text-[#111111] cursor-not-allowed" placeholder="請填寫下方選項自動生成" />
            </div>
          </div>

          <h2 className="text-base font-semibold mb-5 pb-2.5 border-b border-[#e5e5e5] text-[#333333]">商品資訊</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            <div className="flex flex-col gap-2">
              <label className="text-xs font-semibold text-[#333333]">貨源地區 <span className="text-[#ff6b6b] ml-1">*</span></label>
              <select value={skuRegion} onChange={(e) => setSkuRegion(e.target.value)} className="py-3 px-4 border border-[#e5e5e5] rounded-lg text-sm outline-none bg-white focus:border-[#d4a373] focus:shadow-[0_0_0_3px_rgba(254,249,195,0.5)] transition" required>
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
              <label className="text-xs font-semibold text-[#333333]">建議性別 <span className="text-[#ff6b6b] ml-1">*</span></label>
              <select value={skuGender} onChange={(e) => setSkuGender(e.target.value)} className="py-3 px-4 border border-[#e5e5e5] rounded-lg text-sm outline-none bg-white focus:border-[#d4a373] focus:shadow-[0_0_0_3px_rgba(254,249,195,0.5)] transition" required>
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
              <label className="text-xs font-semibold text-[#333333]">商品分類 <span className="text-[#ff6b6b] ml-1">*</span></label>
              <select value={productCategory} onChange={(e) => setProductCategory(e.target.value)} className="py-3 px-4 border border-[#e5e5e5] rounded-lg text-sm outline-none bg-white focus:border-[#d4a373] focus:shadow-[0_0_0_3px_rgba(254,249,195,0.5)] transition" required>
                <option value="" disabled>請選擇商品分類</option>
                <option value="ACCESSORY">精緻飾品 (ACCESSORY)</option>
                <option value="DAILY WEAR">日常衣著 (DAILY WEAR)</option>
                <option value="BAGS">包款配件 (BAGS)</option>
              </select>
            </div>
            <div className="flex flex-col gap-2">
              <label className="text-xs font-semibold text-[#333333]">行銷標籤 (選填)</label>
              <select value={productTag} onChange={(e) => setProductTag(e.target.value)} className="py-3 px-4 border border-[#e5e5e5] rounded-lg text-sm outline-none bg-white focus:border-[#d4a373] focus:shadow-[0_0_0_3px_rgba(254,249,195,0.5)] transition">
                <option value="">無標籤</option>
                <option value="NEW">全新商品 (NEW)</option>
                <option value="HOT">熱賣單品 (HOT)</option>
              </select>
            </div>
          </div>

          <h2 className="text-base font-semibold mb-5 pb-2.5 border-b border-[#e5e5e5] text-[#333333]">價格設定</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            <div className="flex flex-col gap-2">
              <label className="text-xs font-semibold text-[#333333]">商品售價 <span className="text-[#ff6b6b] ml-1">*</span></label>
              <div className="relative block items-center">
                <span className="absolute left-3.75 top-1/2 -translate-y-1/2 text-[#888888] text-sm pointer-events-none z-10">HKD</span>
                <input type="number" value={salePrice} onChange={(e) => setSalePrice(e.target.value)} 
                style={{ paddingLeft: '55px' }} 
                className="w-full py-3 pl-16 pr-4 border border-[#e5e5e5] rounded-lg text-sm outline-none bg-white focus:border-[#d4a373] focus:shadow-[0_0_0_3px_rgba(254,249,195,0.5)] transition" placeholder="0" min="0" step="0.1" required />
              </div>
            </div>
          </div>

          <h2 className="text-base font-semibold mb-5 pb-2.5 border-b border-[#e5e5e5] text-[#333333]">商品圖片 (最多 15 張)</h2>
          <div className="mb-8">
            <div className="flex flex-col gap-3">
              <label className="text-xs font-semibold text-[#333333]">上傳圖片</label>
              <div 
                className={`border-2 border-dashed rounded-lg py-9 px-5 text-center bg-[#fafaf9] cursor-pointer transition relative ${isDragOver ? 'border-[#111111] bg-[#f4f4f2]' : 'border-[#e5e5e5] hover:border-[#111111] hover:bg-[#f4f4f2]'}`}
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
                <div className="text-sm text-[#888888] pointer-events-none">
                  📁 <strong className="text-[#333333]">點擊此處</strong> 或將圖片檔案拖曳至此上傳<br/>
                  <span className="text-xs text-[#888888]">支援多張選取，最多可上傳 15 張圖片（自動高清壓縮與平行上傳）</span>
                </div>
              </div>
              <div className="grid grid-cols-[repeat(auto-fill,minmax(90px,1fr))] gap-3 mt-2.5">
                {uploadedPreviews.map((src, index) => (
                  <div key={index} className="relative w-90px h-90px rounded-lg border border-[#e5e5e5] overflow-hidden bg-[#f4f4f2] flex items-center justify-center">
                    <img src={src} alt="預覽圖" className="w-full h-full object-cover" />
                    <button type="button" onClick={() => removeImage(index)} className="absolute top-1 right-1 bg-[rgba(0,0,0,0.6)] text-white border-none rounded-full w-5 h-5 text-[11px] flex items-center justify-center cursor-pointer hover:bg-[#ff6b6b] transition">&times;</button>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <h2 className="text-base font-semibold mb-5 pb-2.5 border-b border-[#e5e5e5] text-[#333333]">商品詳情</h2>
          <div className="mb-8">
            <div className="flex flex-col gap-2">
              <label className="text-xs font-semibold text-[#333333]">商品詳細描述 (支援多行)</label>
              <textarea value={productDesc} onChange={(e) => setProductDesc(e.target.value)} className="w-full py-3 px-4 border border-[#e5e5e5] rounded-lg text-sm outline-none bg-white focus:border-[#d4a373] focus:shadow-[0_0_0_3px_rgba(254,249,195,0.5)] resize-none h-30 transition" placeholder="請輸入材質、尺寸或品牌故事..." required />
            </div>
          </div>

          <div className="flex flex-col-reverse md:flex-row justify-end gap-2.5 md:gap-4 mt-10 pt-5 border-t border-[#e5e5e5]">
            <button type="button" onClick={initAutoSku} className="w-full md:w-auto py-3 px-7 rounded-full text-sm font-medium bg-transparent text-[#888888] border border-[#e5e5e5] hover:bg-[#f5f5f5] hover:text-[#333333] transition cursor-pointer">重新載入序號</button>
            <button type="submit" disabled={isSubmitting} className="w-full md:w-auto py-3 px-7 rounded-full text-sm font-medium bg-[#111111] text-white hover:bg-[#333333] hover:-translate-y-0.5 hover:shadow-[0_5px_15px_rgba(0,0,0,0.1)] transition cursor-pointer">
              {isSubmitting ? '正在同時上傳圖片與建立商品...' : '確認上架商品'}
            </button>
          </div>
        </form>
      </div>

      <div className={`fixed bottom-8 left-1/2 -translate-x-1/2 bg-[#333333] text-white px-6 py-3 rounded-full text-xs font-medium z-3000 transition-transform duration-500 ${isToastShow ? 'translate-y-0' : 'translate-y-[200%]'}`}>
        ✅ 商品上架成功！雲端資料庫已同步。
      </div>
    </>
  );
}