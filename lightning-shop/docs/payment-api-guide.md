# 付款 API 自行申請指南

這份文件給你自己向支付機構申請，再接到 VILLA ATELIER 結帳。店裡目前的結帳在 `src/app/page.tsx`，只會把訂單寫進 Firestore，沒有向任何銀行或支付公司扣款。

結帳第二步的 `paymentMethod` 有五個值：

| 值 | 畫面上的名稱 | 現在實際做的事 |
| --- | --- | --- |
| `fps` | FPS 轉數快 | 建立 `pending` 訂單，請客人自行轉帳並在備註填訂單編號 |
| `payme` | PayMe | 同上 |
| `card` | 信用卡 | 在瀏覽器檢查卡號，訂單只存卡別與末四碼 |
| `apple` | Apple Pay | 建立 `pending` 訂單，沒有叫起 Apple Pay 付款表單 |
| `skip` | 略過付款 | 模擬下單。不收集付款資料，直接建立 `pending` 訂單 |

`skip` 要留著。API 尚未開通、或這台裝置不支援 Apple Pay 時，仍然用它完成模擬下單。

訂單欄位已經預留：`paymentMethod`、`paymentLabel`、信用卡的 `paymentDetail`（只有「Visa •••• 1234」這種摘要）。完整卡號和安全碼不要寫進 Firestore，也不要送到你自己的 API。

## 申請前先備好

香港商戶審核通常會要這些。缺一件就先補，再送件。

- 商業登記證（獨資或合夥），或公司註冊證明（有限公司）
- 業務擁有人的身份證明
- 以業務名稱開立的銀行戶口，用來收款
- 上線網址。本機 `localhost` 不能當正式商店網址
- 商店說明：賣什麼、客單價、預計每月交易額
- 退款與送貨方式。本店已有配送說明頁，申請表可以指向它

同一家收單機構可以同時開通信用卡和 Apple Pay。FPS 與 PayMe 要另外向銀行申請，不能靠信用卡那組金鑰順便開通。

## 建議順序

1. 信用卡收單（同時勾 Apple Pay）
2. PayMe for Business
3. 轉數快商戶收款

信用卡與 Apple Pay 共用同一筆成功通知。PayMe 與轉數快是另一條到帳通知。三條都接到「只有機構確認收到錢，才把訂單從 `pending` 改成 `paid`」。

## 信用卡

向收單機構申請，不要自己收卡號。

常用入口：

- Stripe（香港）：<https://stripe.com/en-hk>
- 你的公司銀行商戶收單部門（匯豐、恒生、中銀香港等的商戶服務）
- AsiaPay / PayDollar 這類香港支付網關，若你希望信用卡、轉數快、部分電子錢包走同一份合約

申請表會問網站、業務類別、結算銀行戶口、董事或東主資料。通過後會拿到兩組金鑰：

- 可公開的 publishable key，只放在瀏覽器，用來顯示機構提供的卡號輸入元件
- secret key，只放在伺服器環境變數。不要寫進 `src/`，不要提交到 git

接到這間店時：

- 刪掉結帳畫面上手寫的卡號、有效期限、安全碼輸入框。改用收單機構的嵌入元件。這樣卡號不會經過你的程式。
- 在伺服器建立這筆金額的付款，金額用訂單的 `total`，貨幣用 HKD。
- 用機構的 webhook 確認付款成功後，才把該訂單 `status` 改成 `paid`。
- `paymentMethod` 維持 `card`。`paymentDetail` 繼續只存卡別與末四碼，由機構回傳的摘要填入。

在機構後台把 webhook 網址指到你之後新增的伺服器路由，並核對機構給的簽名。沒有通過簽名的請求不要改訂單。

## Apple Pay

優先跟信用卡同一家收單機構一起開。他們會處理 Apple 的商戶驗證，你不用另外向 Apple 申請證書。

在收單機構後台打開 Apple Pay，並完成他們要求的網域驗證檔。驗證檔要放在正式網域上，路徑依該機構文件，通常是 `/.well-known/` 底下。

直接向 Apple 申請只在你不經收單機構、要自己接 Apple Pay on the Web 時才需要：

- Apple Developer Program：<https://developer.apple.com/apple-pay/>
- 網頁整合說明：<https://developer.apple.com/documentation/applepayontheweb>

這條路要有 Merchant ID、付款處理證書，以及能解密付款憑證的收單銀行。工作量比「在 Stripe 或銀行後台打開 Apple Pay」高。

接到這間店時：

- `paymentMethod === 'apple'` 時叫起機構的 Apple Pay 按鈕，不要只用現在這個黑色按鈕直接寫訂單。
- 付款成功仍以 webhook 為準，再把 `status` 改成 `paid`，`paymentMethod` 維持 `apple`。
- Windows 或非 Safari 上常常沒有 Apple Pay。按鈕不可用時，讓客人改選其他方式，或使用 `skip` 做模擬下單。

## PayMe

PayMe 商業版由匯豐提供，申請入口在 PayMe 官網的商業版，網域是 `payme.hsbc.com.hk`。個人 PayMe 不能拿來做商店 API。

申請時用商業登記上的名稱，並綁定收款銀行戶口。審核由匯豐決定，通過後才會在商戶後台看到線上付款或 API 文件。文件、商戶編號和密鑰以通過後後台顯示的為準，申請前沒有公開的通用密鑰。

接到這間店時：

- 用 PayMe 回傳的付款連結或他們的付款元件取代現在畫面上的靜態說明。
- 金額與訂單編號傳給 PayMe，讓客人在 PayMe 裡看到同一筆訂單。
- 以 PayMe 的付款成功通知把訂單改成 `paid`。在通知到達前維持 `pending`。
- `paymentMethod` 維持 `payme`。

## FPS 轉數快

轉數快沒有一個讓商店自行註冊就拿到 API 金鑰的公開入口。收款要經參加轉數快的銀行，或經已接通轉數快的支付網關。

自己申請的做法：

1. 用商業銀行戶口向該銀行申請商戶轉數快識別碼（FPS ID 或已登記的手機、電郵代理）。銀行名單以金管局轉數快頁為準：<https://www.hkma.gov.hk/eng/smart-consumers/faster-payment-system/>
2. 向同一間銀行問「入帳通知」或企業 API。你要的是：有一筆金額與備註（訂單編號）相符的入帳時，銀行主動通知你的伺服器。
3. 若銀行不提供可程式化的入帳通知，改向支付網關申請轉數快收單。網關會給付款頁與 webhook，比自己對銀行流水穩定。

接到這間店時：

- 畫面上的收款名稱改成銀行批核的商戶名稱，並顯示銀行給的轉數快識別碼。
- 備註固定帶 Firestore 的訂單編號（`customOrderId`）。
- 收到與訂單編號、金額都相符的入帳通知後，才把 `status` 改成 `paid`。
- 對不到單的轉帳留在 `pending`，給後台人工確認。`paymentMethod` 維持 `fps`。

## 秘密金鑰放哪裡

通過審核後，只把金鑰放在部署環境，例如 Vercel 的環境變數。建議名稱：

```text
PAYMENT_PROVIDER_SECRET_KEY
PAYMENT_WEBHOOK_SECRET
NEXT_PUBLIC_PAYMENT_PUBLISHABLE_KEY
```

`NEXT_PUBLIC_` 開頭的值會進到瀏覽器，只能放公開金鑰。secret 與 webhook 密鑰不能加這個前綴。

`.env` 不要提交。若要在本機試，用 `.env.local`，並確認它在 `.gitignore`。

## 接到程式時的邊界

維持現在的訂單狀態語意：

- 客人送出、機構尚未確認收款：`pending`
- webhook 確認收款：`paid`
- `skip`：繼續寫 `pending`，`paymentMethod` 為 `skip`，不呼叫任何支付 API

`skip` 可以留在正式環境，給內部演示。若只想在開發時出現，用環境變數控制這個選項的顯示，不要刪掉這條建立訂單的路徑。

付款金額以伺服器重算的訂單總額為準。不要信任瀏覽器傳來的 `total`。

## 申請清單

- [ ] 商業登記與身份證明已備妥
- [ ] 業務銀行戶口已開立
- [ ] 商店已有正式網址
- [ ] 已向一家收單機構提交信用卡申請，並勾選 Apple Pay
- [ ] 已取得 publishable key 與 secret key，secret 只在伺服器
- [ ] 已向匯豐提交 PayMe 商業版申請
- [ ] 已向往來銀行或支付網關申請轉數快商戶識別碼與入帳通知
- [ ] webhook 網址已在機構後台登記，並會核對簽名
- [ ] 只有收款成功的通知才把訂單改成 `paid`
- [ ] `skip` 模擬下單仍然可用，且不會送出付款請求
