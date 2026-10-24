'use client';

import { useState, useEffect } from 'react';
import { db, storage } from '@/lib/firebase';
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
  const [currentYear, setCurrentYear] = useState(new Date().getFullYear());

  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);
  const [uploadedPreviews, setUploadedPreviews] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isToastShow, setIsToastShow] = useState(false);

  // 初始化自動 SKU 序號
  useEffect(() => {
    initAutoSku();
  }, []);

  // 當地區或性別改變時更新 SKU 預覽
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

  // 處理圖片上傳與壓縮
  const handleImageSelection = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

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
    e.target.value = '';
  };

  const removeImage = (index: number) => {
    setUploadedFiles(prev => prev.filter((_, i) => i !== index));
    setUploadedPreviews(prev => prev.filter((_, i) => i !== index));
  };

  // 表單送出
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!productSKU) {
      alert('請完整選擇貨源地區與建議性別！');
      return;
    }

    setIsSubmitting(true);

    try {
      // 平行上傳圖片至 Firebase Storage
      const uploadPromises = uploadedFiles.map(async (file, i) => {
        const filePath = `products/${productSKU}/${Date.now()}_${i}`;
        const snapshot = await storage.ref().child(filePath).put(file);
        return await snapshot.ref.getDownloadURL();
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

      // 重置表單
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
      <div className="mb-[30px]">
        <h1 className="text-[24px] font-semibold mb-1">上架新商品</h1>
        <p className="text-[#888888] text-[14px]">填寫下方欄位，系統將自動以 SKU 作為 Firestore 文件名稱儲存。</p>
      </div>

      <div className="bg-white rounded-[16px] p-5 md:p-10 shadow-[0_4px_20px_rgba(0,0,0,0.03)] border border-[#e5e5e5]">
        <form onSubmit={handleSubmit}>
          <h2 className="text-[16px] font-semibold mb-5 pb-2.5 border-b border-[#e5e5e5]">基本資訊</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-7">
            <div className="flex flex-col gap-2">
              <label className="text-[13px] font-semibold text-[#333]">商品名稱 <span className="text-[#ff6b6b] ml-0.5">*</span></label>
              <input type="text" value={productName} onChange={(e) => setProductName(e.target.value)} className="p-[12px_15px] border border-[#e5e5e5] rounded-lg text-[14px] outline-none bg-white focus:border-[#d4a373] focus:ring-2 focus:ring-[#FEF9C3] transition" placeholder="例如：極簡純銀細緻鎖骨鍊" required />
            </div>
            <div className="flex flex-col gap-2">
              <label className="text-[13px] font-semibold text-[#333]">自動組成商品編號 (SKU)</label>
              <input type="text" value={productSKU} readOnly className="p-[12px_15px] border border-[#e5e5e5] rounded-lg text-[14px] outline-none bg-[#f4f4f2] font-bold tracking-wider text-[#111] cursor-not-allowed" placeholder="請填寫下方選項自動生成" />
            </div>
          </div>

          <h2 className="text-[16px] font-semibold mb-5 pb-2.5 border-b border-[#e5e5e5]">商品資訊</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-7">
            <div className="flex flex-col gap-2">
              <label className="text-[13px] font-semibold text-[#333]">貨源地區 <span className="text-[#ff6b6b] ml-0.5">*</span></label>
              <select value={skuRegion} onChange={(e) => setSkuRegion(e.target.value)} className="p-[12px_15px] border border-[#e5e5e5] rounded-lg text-[14px] outline-none bg-white focus:border-[#d4a373]" required>
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
              <label className="text-[13px] font-semibold text-[#333]">建議性別 <span className="text-[#ff6b6b] ml-0.5">*</span></label>
              <select value={skuGender} onChange={(e) => setSkuGender(e.target.value)} className="p-[12px_15px] border border-[#e5e5e5] rounded-lg text-[14px] outline-none bg-white focus:border-[#d4a373]" required>
                <option value="" disabled>請選擇建議性別</option>
                <option value="M">男裝 (M)</option>
                <option value="F">女裝 (F)</option>
                <option value="K">童裝 (K)</option>
                <option value="N">中性 (N)</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-7">
            <div className="flex flex-col gap-2">
              <label className="text-[13px] font-semibold text-[#333]">商品分類 <span className="text-[#ff6b6b] ml-0.5">*</span></label>
              <select value={productCategory} onChange={(e) => setProductCategory(e.target.value)} className="p-[12px_15px] border border-[#e5e5e5] rounded-lg text-[14px] outline-none bg-white focus:border-[#d4a373]" required>
                <option value="" disabled>請選擇商品分類</option>
                <option value="ACCESSORY">精緻飾品 (ACCESSORY)</option>
                <option value="DAILY WEAR">日常衣著 (DAILY WEAR)</option>
                <option value="BAGS">包款配件 (BAGS)</option>
              </select>
            </div>
            <div className="flex flex-col gap-2">
              <label className="text-[13px] font-semibold text-[#333]">行銷標籤 (選填)</label>
              <select value={productTag} onChange={(e) => setProductTag(e.target.value)} className="p-[12px_15px] border border-[#e5e5e5] rounded-lg text-[14px] outline-none bg-white focus:border-[#d4a373]">
                <option value="">無標籤</option>
                <option value="NEW">全新商品 (NEW)</option>
                <option value="HOT">熱賣單品 (HOT)</option>
              </select>
            </div>
          </div>

          <h2 className="text-[16px] font-semibold mb-5 pb-2.5 border-b border-[#e5e5e5]">價格設定</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-7">
            <div className="flex flex-col gap-2">
              <label className="text-[13px] font-semibold text-[#333]">商品售價 <span className="text-[#ff6b6b] ml-0.5">*</span></label>
              <div className="relative flex items-center">
                <span className="absolute left-[15px] text-[#888] text-[14px]">HKD </span>
                <input type="number" value={salePrice} onChange={(e) => setSalePrice(e.target.value)} className="w-full p-[12px_15px_12px_50px] border border-[#e5e5e5] rounded-lg text-[14px] outline-none bg-white focus:border-[#d4a373]" placeholder="0" min="0" step="0.1" required />
              </div>
            </div>
          </div>

          <h2 className="text-[16px] font-semibold mb-5 pb-2.5 border-b border-[#e5e5e5]">商品圖片 (最多 15 張)</h2>
          <div className="mb-7">
            <div className="flex flex-col gap-3">
              <label className="text-[13px] font-semibold text-[#333]">上傳圖片</label>
              <div className="border-2 border-dashed border-[#e5e5e5] rounded-lg p-[35px_20px] text-center bg-[#fafaf9] cursor-pointer hover:border-[#111] hover:bg-[#f4f4f2] transition relative">
                <input type="file" accept="image/*" multiple onChange={handleImageSelection} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" />
                <div className="text-[14px] text-[#888] pointer-events-none">
                  📁 <strong className="text-[#333]">點擊此處</strong> 或將圖片檔案拖曳至此上傳<br/>
                  <span className="text-[12px] text-[#888]">支援多張選取，最多可上傳 15 張圖片（自動高清壓縮與平行上傳）</span>
                </div>
              </div>
              <div className="grid grid-cols-[repeat(auto-fill,minmax(90px,1fr))] gap-3 mt-2.5">
                {uploadedPreviews.map((src, index) => (
                  <div key={index} className="relative w-[90px] h-[90px] rounded-lg border border-[#e5e5e5] overflow-hidden bg-[#f4f4f2] flex items-center justify-center">
                    <img src={src} alt="預覽圖" className="w-full h-full object-cover" />
                    <button type="button" onClick={() => removeImage(index)} className="absolute top-1 right-1 bg-black/60 text-white border-none rounded-full w-5 h-5 text-[11px] flex items-center justify-center cursor-pointer hover:bg-[#ff6b6b] transition">&times;</button>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <h2 className="text-[16px] font-semibold mb-5 pb-2.5 border-b border-[#e5e5e5]">商品詳情</h2>
          <div className="mb-7">
            <div className="flex flex-col gap-2">
              <label className="text-[13px] font-semibold text-[#333]">商品詳細描述 (支援多行)</label>
              <textarea value={productDesc} onChange={(e) => setProductDesc(e.target.value)} className="w-full p-[12px_15px] border border-[#e5e5e5] rounded-lg text-[14px] outline-none bg-white focus:border-[#d4a373] resize-none h-[120px]" placeholder="請輸入材質、尺寸或品牌故事..." required />
            </div>
          </div>

          <div className="flex flex-col-reverse md:flex-row justify-end gap-4 mt-10 pt-5 border-t border-[#e5e5e5]">
            <button type="button" onClick={initAutoSku} className="w-full md:w-auto py-3 px-[30px] rounded-[30px] text-[14px] font-medium bg-transparent text-[#888] border border-[#e5e5e5] hover:bg-[#f5f5f5] hover:text-[#333] transition cursor-pointer">重新載入序號</button>
            <button type="submit" disabled={isSubmitting} className="w-full md:w-auto py-3 px-[30px] rounded-[30px] text-[14px] font-medium bg-[#111111] text-white hover:bg-[#333333] transition cursor-pointer shadow-sm">
              {isSubmitting ? '正在同時上傳圖片與建立商品...' : '確認上架商品'}
            </button>
          </div>
        </form>
      </div>

      <div className={`fixed bottom-[30px] left-1/2 -translate-x-1/2 bg-[#333] text-white px-[25px] py-3 rounded-[30px] text-[13px] font-medium z-[3000] transition-transform duration-500 ${isToastShow ? 'translate-y-0' : 'translate-y-[200%]'}`}>
        ✅ 商品上架成功！雲端資料庫已同步。
      </div>
    </>
  );
}