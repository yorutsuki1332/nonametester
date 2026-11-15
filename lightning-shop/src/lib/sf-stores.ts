export interface SfStore {
  id: string;
  name: string;
}

export interface SfRegion {
  id: string;
  label: string;
  stores: SfStore[];
}

export const SF_REGIONS: SfRegion[] = [
  {
    id: 'central-western',
    label: '中西區',
    stores: [
      { id: 'CW-IFC', name: '中環國際金融中心順豐站' },
      { id: 'CW-SHUN', name: '上環信德中心順豐站' },
      { id: 'CW-WEST', name: '西營盤均益大廈順豐站' },
    ],
  },
  {
    id: 'wan-chai',
    label: '灣仔區',
    stores: [
      { id: 'WC-TIMES', name: '銅鑼灣時代廣場順豐站' },
      { id: 'WC-HEN', name: '灣仔軒尼詩道順豐站' },
      { id: 'WC-HV', name: '跑馬地成和道順豐站' },
    ],
  },
  {
    id: 'eastern',
    label: '東區',
    stores: [
      { id: 'EST-CITY', name: '太古城中心順豐站' },
      { id: 'EST-HENG', name: '杏花邨順豐站' },
      { id: 'EST-NP', name: '北角匯順豐站' },
    ],
  },
  {
    id: 'southern',
    label: '南區',
    stores: [
      { id: 'SOU-AB', name: '香港仔中心順豐站' },
      { id: 'SOU-WCH', name: '黃竹坑順豐站' },
      { id: 'SOU-SOUTH', name: '海怡半島順豐站' },
    ],
  },
  {
    id: 'yau-tsim-mong',
    label: '油尖旺區',
    stores: [
      { id: 'YTM-HGC', name: '尖沙咀海港城順豐站' },
      { id: 'YTM-LM', name: '旺角朗豪坊順豐站' },
      { id: 'YTM-JD', name: '佐敦彌敦道順豐站' },
    ],
  },
  {
    id: 'sham-shui-po',
    label: '深水埗區',
    stores: [
      { id: 'SSP-D2', name: '深水埗西九龍中心順豐站' },
      { id: 'SSP-CSW', name: '長沙灣順豐站' },
      { id: 'SSP-LCK', name: '荔枝角順豐站' },
    ],
  },
  {
    id: 'kowloon-city',
    label: '九龍城區',
    stores: [
      { id: 'KC-WP', name: '紅磡黃埔花園順豐站' },
      { id: 'KC-TKW', name: '土瓜灣順豐站' },
      { id: 'KC-KLT', name: '九龍塘順豐站' },
    ],
  },
  {
    id: 'wong-tai-sin',
    label: '黃大仙區',
    stores: [
      { id: 'WTS-CTR', name: '黃大仙中心順豐站' },
      { id: 'WTS-LF', name: '樂富順豐站' },
      { id: 'WTS-PLZ', name: '鑽石山荷里活廣場順豐站' },
    ],
  },
  {
    id: 'kwun-tong',
    label: '觀塘區',
    stores: [
      { id: 'KT-APM', name: '觀塘 apm 順豐站' },
      { id: 'KT-LT', name: '藍田匯景順豐站' },
      { id: 'KT-TF', name: '九龍灣德福廣場順豐站' },
    ],
  },
  {
    id: 'tsuen-wan',
    label: '荃灣區',
    stores: [
      { id: 'TW-PLZ', name: '荃灣廣場順豐站' },
      { id: 'TW-DPARK', name: '荃灣愉景新城順豐站' },
    ],
  },
  {
    id: 'tuen-mun',
    label: '屯門區',
    stores: [
      { id: 'TM-TOWN', name: '屯門市廣場順豐站' },
      { id: 'TM-TREND', name: '屯門時代廣場順豐站' },
    ],
  },
  {
    id: 'yuen-long',
    label: '元朗區',
    stores: [
      { id: 'YL-PLZ', name: '元朗廣場順豐站' },
      { id: 'YL-YOHO', name: '元朗 YOHO MALL 順豐站' },
    ],
  },
  {
    id: 'north',
    label: '北區',
    stores: [
      { id: 'N-SS', name: '上水廣場順豐站' },
      { id: 'N-FL', name: '粉嶺名都順豐站' },
    ],
  },
  {
    id: 'tai-po',
    label: '大埔區',
    stores: [
      { id: 'TP-MEGA', name: '大埔超級城順豐站' },
      { id: 'TP-CTR', name: '大埔中心順豐站' },
    ],
  },
  {
    id: 'sha-tin',
    label: '沙田區',
    stores: [
      { id: 'ST-NCP', name: '沙田新城市廣場順豐站' },
      { id: 'ST-MOS', name: '馬鞍山新港城順豐站' },
    ],
  },
  {
    id: 'sai-kung',
    label: '西貢區',
    stores: [
      { id: 'SK-EAST', name: '將軍澳東港城順豐站' },
      { id: 'SK-HK', name: '坑口順豐站' },
    ],
  },
  {
    id: 'kwai-tsing',
    label: '葵青區',
    stores: [
      { id: 'KTS-MM', name: '葵芳新都會廣場順豐站' },
      { id: 'KTS-MS', name: '青衣城順豐站' },
    ],
  },
  {
    id: 'islands',
    label: '離島區',
    stores: [
      { id: 'ISL-CT', name: '東涌東薈城順豐站' },
      { id: 'ISL-DB', name: '愉景灣順豐站' },
    ],
  },
];

export function sfPickupLabel(regionId: string, storeId: string, custom: string) {
  const typed = custom.trim();
  if (typed) return typed;
  const region = SF_REGIONS.find((item) => item.id === regionId);
  const store = region?.stores.find((item) => item.id === storeId);
  if (!region || !store) return '';
  return `${region.label} · ${store.name}（${store.id}）`;
}
