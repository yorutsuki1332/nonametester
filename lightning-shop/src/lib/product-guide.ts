export type GuideRow = {
  id: string;
  label: string;
  cells: string[];
};

export type GuideTable = {
  title: string;
  caption: string;
  columns: string[];
  rows: GuideRow[];
};

export type ProductGuideContent = {
  matchedId: string | null;
  matchNote: string;
  tables: GuideTable[];
  modelStats: { label: string; value: string }[];
  comparison: string[];
  material: { label: string; value: string }[];
  wash: string[];
};

const BAG_ROWS: { id: string; label: string; height: number; width: number; depth: number; strap: number; holds: string }[] = [
  { id: 'Mini', label: 'Mini 迷你', height: 14, width: 18, depth: 7, strap: 48, holds: '手機、卡片、鑰匙' },
  { id: 'Small', label: 'Small 小', height: 16, width: 22, depth: 8, strap: 52, holds: '手機、短夾、口紅' },
  { id: 'Medium', label: 'Medium 中', height: 21, width: 28, depth: 11, strap: 55, holds: 'A5 記事本、長夾、小水壺' },
  { id: 'Large', label: 'Large 大', height: 28, width: 36, depth: 14, strap: 58, holds: '13 吋筆電、摺傘、長夾' },
];

const WEAR_ROWS: { id: string; label: string; bust: number; waist: number; hip: number; length: number; shoulder: number; bodyBust: number; bodyWaist: number; bodyHip: number }[] = [
  { id: 'XS', label: 'XS', bust: 76, waist: 60, hip: 84, length: 56, shoulder: 35, bodyBust: 74, bodyWaist: 60, bodyHip: 82 },
  { id: 'S', label: 'S', bust: 82, waist: 66, hip: 90, length: 58, shoulder: 37, bodyBust: 80, bodyWaist: 64, bodyHip: 88 },
  { id: 'M', label: 'M', bust: 88, waist: 72, hip: 96, length: 60, shoulder: 38, bodyBust: 86, bodyWaist: 70, bodyHip: 94 },
  { id: 'L', label: 'L', bust: 94, waist: 78, hip: 102, length: 62, shoulder: 40, bodyBust: 92, bodyWaist: 76, bodyHip: 100 },
  { id: 'XL', label: 'XL', bust: 100, waist: 84, hip: 108, length: 64, shoulder: 41, bodyBust: 98, bodyWaist: 82, bodyHip: 106 },
];

const ACCESSORY_ROWS: { id: string; label: string; cells: string[] }[] = [
  { id: 'earring', label: '垂墜耳環', cells: ['4.5', '1.2', '耳針長 1.0', '從耳垂向下 4.5 公分'] },
  { id: 'necklace', label: '鎖骨鍊', cells: ['40', '1.5', '延長鏈 5', '鏈長 40 公分，墜飾寬 1.5 公分'] },
  { id: 'bracelet', label: '手鍊', cells: ['16', '0.4', '延長鏈 3', '鏈長 16 公分'] },
  { id: 'ring', label: '戒指', cells: ['1.66', '0.3', '內圓周 5.2', '內徑 1.66 公分，內圓周 5.2 公分'] },
  { id: 'tie', label: '領帶', cells: ['145', '8', '尖端寬 2.5', '全長 145 公分，最寬 8 公分'] },
  { id: 'belt', label: '皮帶', cells: ['90', '3.2', '孔距 2.5', '全長 90 公分，帶寬 3.2 公分'] },
  { id: 'scarf', label: '絲巾', cells: ['90', '90', '滾邊 0.3', '90 × 90 公分方巾'] },
  { id: 'sunglass', label: '墨鏡', cells: ['12.2', '5.2', '鏡腳 14.5', '鏡框總寬 12.2 公分，單鏡片寬 5.2 公分'] },
];

const WEAR_MODEL = { height: 168, weight: 52, bust: 82, waist: 64, hip: 90, shoulder: 37 };
const BAG_MODEL = { height: 168, weight: 52, shoulder: 38 };
const ACCESSORY_MODEL = { height: 168, neck: 33, wrist: 15, finger: 5.2, face: 13.5, waist: 64 };

function bagSize(name: string) {
  const lower = name.toLowerCase();
  if (/mini|迷你/.test(lower)) return 'Mini';
  if (/\bsmall\b|小款/.test(lower)) return 'Small';
  if (/\bmedium\b|中款/.test(lower)) return 'Medium';
  if (/\blarge\b|大款/.test(lower)) return 'Large';
  return null;
}

function wearSize(name: string) {
  const rules: [string, RegExp][] = [
    ['XL', /\bXXL\b|\bXL\b|加大/i],
    ['XS', /\bXS\b|細碼/i],
    ['S', /\bS\b|小碼/i],
    ['M', /\bM\b|中碼/i],
    ['L', /\bL\b|大碼/i],
  ];
  for (const [id, pattern] of rules) {
    if (pattern.test(name)) return id;
  }
  return null;
}

function accessoryKind(name: string) {
  const lower = name.toLowerCase();
  if (/earring|hoop|耳/.test(lower)) return 'earring';
  if (/necklace|項鍊|項鏈|鎖骨/.test(lower)) return 'necklace';
  if (/bracelet|手鍊|手鏈|手環/.test(lower)) return 'bracelet';
  if (/\btie\b|領帶/.test(lower)) return 'tie';
  if (/belt|皮帶/.test(lower)) return 'belt';
  if (/scarf|絲巾|髮飾|髮帶/.test(lower)) return 'scarf';
  if (/sunglass|墨鏡|眼鏡/.test(lower)) return 'sunglass';
  if (/戒指|\bring\b/.test(lower)) return 'ring';
  return null;
}

function ease(garment: number, body: number) {
  const diff = garment - body;
  if (diff === 0) return '與身型相同';
  if (diff > 0) return `比身型多 ${diff} 公分`;
  return `比身型少 ${Math.abs(diff)} 公分`;
}

function bagGuide(name: string): ProductGuideContent {
  const matchedId = bagSize(name);
  const matched = BAG_ROWS.find((row) => row.id === matchedId);
  const ratio = matched ? Math.round((matched.width / BAG_MODEL.shoulder) * 100) : null;
  const comparison = matched && ratio !== null
    ? [
        `模特試背 ${matched.label}。包寬 ${matched.width} 公分，肩寬 ${BAG_MODEL.shoulder} 公分，包寬約為肩寬的 ${ratio}%。`,
        `包高 ${matched.height} 公分、底厚 ${matched.depth} 公分。肩帶落差 ${matched.strap} 公分，包身落在腰線與髖骨之間，手臂自然下垂時手肘高於包底。`,
        `這個尺寸放得下：${matched.holds}。`,
      ]
    : [
        `模特肩寬 ${BAG_MODEL.shoulder} 公分。Mini 包寬 18 公分，約為肩寬的 ${Math.round((18 / BAG_MODEL.shoulder) * 100)}%；Large 包寬 36 公分，約為肩寬的 ${Math.round((36 / BAG_MODEL.shoulder) * 100)}%。`,
        '這件品名沒有 Mini、Small、Medium 或 Large，請用上表的公分直接對你要放的物品。',
      ];

  return {
    matchedId,
    matchNote: matched
      ? `品名裡的尺寸用字對上 ${matched.label}，表中標成此款。`
      : '品名沒有尺寸用字，表中沒有標成此款。',
    tables: [
      {
        title: '包身公分對照',
        caption: '包身以平放外緣量測，單位公分。肩帶落差是從肩線到包身頂端。',
        columns: ['高度', '寬度', '底厚', '肩帶落差', '可放入'],
        rows: BAG_ROWS.map((row) => ({
          id: row.id,
          label: row.label,
          cells: [String(row.height), String(row.width), String(row.depth), String(row.strap), row.holds],
        })),
      },
    ],
    modelStats: [
      { label: '身高', value: `${BAG_MODEL.height} 公分` },
      { label: '體重', value: `${BAG_MODEL.weight} 公斤` },
      { label: '肩寬', value: `${BAG_MODEL.shoulder} 公分` },
    ],
    comparison,
    material: bagMaterial(name),
    wash: bagWash(name),
  };
}

function bagMaterial(name: string) {
  const lower = name.toLowerCase();
  if (/帆布|canvas/.test(lower)) {
    return [
      { label: '表面', value: '12 oz 棉帆布' },
      { label: '裡布', value: '聚酯斜紋' },
      { label: '五金', value: '黃銅' },
    ];
  }
  if (/編織|weave|woven/.test(lower)) {
    return [
      { label: '表面', value: '棉質編織帶，帶寬 1.5 公分' },
      { label: '裡布', value: '棉斜紋' },
      { label: '五金', value: '黃銅' },
    ];
  }
  return [
    { label: '表面', value: '頭層牛皮，厚度 1.2–1.4 mm' },
    { label: '裡布', value: '棉質斜紋' },
    { label: '五金', value: '黃銅電鍍' },
  ];
}

function bagWash(name: string) {
  const lower = name.toLowerCase();
  const shared = [
    '不可機洗、不可烘乾、不可漂白。',
    '空置時塞入防塵紙，讓包身保持原本的高度與底厚。',
    '五金只用乾布擦，不要用銀器清潔劑或酒精。',
  ];
  if (/帆布|canvas/.test(lower)) {
    return ['乾布或軟毛刷順向除塵。局部污漬用微濕布輕壓，不要揉搓，再平放陰乾。', ...shared];
  }
  if (/編織|weave|woven/.test(lower)) {
    return ['軟毛刷順編織方向除塵。沾濕後容易變形，不要浸泡。', ...shared];
  }
  return [
    '乾布拭去浮塵。油污用微濕軟布輕壓後陰乾，不要用清潔劑浸泡皮面。',
    '避免長時間淋雨。皮面遇水後用乾布吸乾，放在通風處，不要烘烤。',
    ...shared,
  ];
}

function wearGuide(name: string): ProductGuideContent {
  if (/帽/.test(name)) return hatGuide(name);
  if (/嬰幼兒|童裝|幼兒/.test(name)) return kidsGuide(name);
  if (/褲|裙/.test(name)) return bottomsGuide(name);
  return topsGuide(name);
}

const KIDS_ROWS = [
  { id: '90', height: 90, bust: 56, length: 37, waist: 46 },
  { id: '100', height: 100, bust: 60, length: 40, waist: 48 },
  { id: '110', height: 110, bust: 64, length: 44, waist: 52 },
  { id: '120', height: 120, bust: 68, length: 48, waist: 54 },
  { id: '130', height: 130, bust: 72, length: 52, waist: 56 },
  { id: '140', height: 140, bust: 76, length: 56, waist: 58 },
];

const KIDS_MODEL = { height: 110, weight: 18, bust: 54, waist: 50 };

function kidsGuide(name: string): ProductGuideContent {
  const matchedId = (name.match(/(?:^|[^\d])(90|100|110|120|130|140)(?:[^\d]|$)/) || [])[1] ?? null;
  const matched = KIDS_ROWS.find((row) => row.id === matchedId);
  const sample = matched ?? KIDS_ROWS.find((row) => row.id === '110')!;
  return {
    matchedId,
    matchNote: matched
      ? `品名裡的身高對上 ${matched.height} 公分，表中標成此款。`
      : '品名沒有寫身高公分，表中沒有標成此款。請以孩子的身高對表。',
    tables: [
      {
        title: '童裝身高對照',
        caption: '依身高公分選。胸圍與腰圍是成衣平量全圍，衣長從肩線量到下襬，單位公分。',
        columns: ['身高', '胸圍平量', '腰圍平量', '衣長'],
        rows: KIDS_ROWS.map((row) => ({
          id: row.id,
          label: `${row.height}`,
          cells: [String(row.height), String(row.bust), String(row.waist), String(row.length)],
        })),
      },
    ],
    modelStats: [
      { label: '身高', value: `${KIDS_MODEL.height} 公分` },
      { label: '體重', value: `${KIDS_MODEL.weight} 公斤` },
      { label: '胸圍', value: `${KIDS_MODEL.bust} 公分` },
      { label: '腰圍', value: `${KIDS_MODEL.waist} 公分` },
    ],
    comparison: [
      `模特是身高 ${KIDS_MODEL.height} 公分的兒童，試穿身高 ${sample.height} 公分那一列。`,
      `胸圍平量 ${sample.bust} 公分，身型胸圍 ${KIDS_MODEL.bust} 公分，${ease(sample.bust, KIDS_MODEL.bust)}。腰圍平量 ${sample.waist} 公分，身型腰圍 ${KIDS_MODEL.waist} 公分，${ease(sample.waist, KIDS_MODEL.waist)}。衣長 ${sample.length} 公分。`,
    ],
    material: wearMaterial(name),
    wash: wearWash(name),
  };
}

function hatGuide(name: string): ProductGuideContent {
  const child = /嬰幼兒|童裝|幼兒/.test(name);
  const rows = child
    ? [
        { id: '50', head: 50, inner: 51, depth: 13 },
        { id: '52', head: 52, inner: 53, depth: 14 },
        { id: '54', head: 54, inner: 55, depth: 14 },
      ]
    : [
        { id: '54', head: 54, inner: 55, depth: 15 },
        { id: '56', head: 56, inner: 57, depth: 16 },
        { id: '58', head: 58, inner: 59, depth: 16 },
      ];
  const matchedId = (name.match(/(?:^|[^\d])(50|52|54|56|58)(?:[^\d]|$)/) || [])[1] ?? null;
  const matched = rows.find((row) => row.id === matchedId);
  const sample = matched ?? rows[1];
  const modelHead = child ? 52 : 56;
  return {
    matchedId: matched ? matched.id : null,
    matchNote: matched
      ? `品名裡的頭圍對上 ${matched.head} 公分，表中標成此款。`
      : '品名沒有寫頭圍，表中沒有標成此款。請量頭圍最寬處再對表。',
    tables: [
      {
        title: '帽圍公分對照',
        caption: '頭圍沿眉毛上方與後腦最寬處量一圈。帽圍是帽子內側周長，通常比頭圍多 1 公分。單位公分。',
        columns: ['頭圍', '帽圍', '帽深'],
        rows: rows.map((row) => ({
          id: row.id,
          label: `${row.head}`,
          cells: [String(row.head), String(row.inner), String(row.depth)],
        })),
      },
    ],
    modelStats: [{ label: '頭圍', value: `${modelHead} 公分` }],
    comparison: [
      `模特頭圍 ${modelHead} 公分，試戴頭圍 ${sample.head} 公分的帽子。帽圍 ${sample.inner} 公分，${ease(sample.inner, modelHead)}。帽深 ${sample.depth} 公分。`,
    ],
    material: /抗\s*uv|uv/i.test(name)
      ? [
          { label: '帽身', value: '聚酯纖維 100%，抗 UV' },
          { label: '內裡', value: '棉質汗帶' },
        ]
      : [
          { label: '帽身', value: '棉 100%' },
          { label: '內裡', value: '棉質汗帶' },
        ],
    wash: [
      '冷水手洗，不要扭乾帽冠，以免帽圍變形。',
      '用帽模或填紙後陰乾，讓帽圍保持表上的公分。',
      '不可烘乾、不可漂白。',
    ],
  };
}

function bottomsGuide(name: string): ProductGuideContent {
  const matchedId = wearSize(name);
  const lengths = /短/.test(name) ? [16, 17, 18, 19] : /平腳/.test(name) ? [24, 25, 26, 27] : [92, 94, 96, 98];
  const rows = [
    { id: 'S', label: 'S', waist: 66, hip: 90, length: lengths[0] },
    { id: 'M', label: 'M', waist: 72, hip: 96, length: lengths[1] },
    { id: 'L', label: 'L', waist: 78, hip: 102, length: lengths[2] },
    { id: 'XL', label: 'XL', waist: 84, hip: 108, length: lengths[3] },
  ];
  const matched = rows.find((row) => row.id === matchedId);
  const sample = matched ?? rows[0];
  return {
    matchedId,
    matchNote: matched
      ? `品名裡的尺碼用字對上 ${matched.label}，表中標成此款。`
      : '品名沒有尺碼用字，表中沒有標成此款。下表用模特的腰圍說明最接近的一列。',
    tables: [
      {
        title: '下身公分對照',
        caption: '腰圍與臀圍是成衣平量全圍，褲長從腰頭量到褲口，單位公分。',
        columns: ['腰圍', '臀圍', '褲長'],
        rows: rows.map((row) => ({
          id: row.id,
          label: row.label,
          cells: [String(row.waist), String(row.hip), String(row.length)],
        })),
      },
    ],
    modelStats: [
      { label: '身高', value: `${WEAR_MODEL.height} 公分` },
      { label: '腰圍', value: `${WEAR_MODEL.waist} 公分` },
      { label: '臀圍', value: `${WEAR_MODEL.hip} 公分` },
    ],
    comparison: [
      `模特腰圍 ${WEAR_MODEL.waist} 公分、臀圍 ${WEAR_MODEL.hip} 公分，試穿 ${sample.label}。`,
      `腰圍平量 ${sample.waist} 公分，${ease(sample.waist, WEAR_MODEL.waist)}。臀圍平量 ${sample.hip} 公分，${ease(sample.hip, WEAR_MODEL.hip)}。褲長 ${sample.length} 公分。`,
    ],
    material: wearMaterial(name),
    wash: wearWash(name),
  };
}

function topsGuide(name: string): ProductGuideContent {
  const matchedId = wearSize(name);
  const matched = WEAR_ROWS.find((row) => row.id === matchedId);
  const comparison = matched
    ? [
        `模特試穿 ${matched.label}。身高 ${WEAR_MODEL.height} 公分、體重 ${WEAR_MODEL.weight} 公斤。`,
        `胸圍平量 ${matched.bust} 公分，身型胸圍 ${WEAR_MODEL.bust} 公分，${ease(matched.bust, WEAR_MODEL.bust)}。腰圍平量 ${matched.waist} 公分，身型腰圍 ${WEAR_MODEL.waist} 公分，${ease(matched.waist, WEAR_MODEL.waist)}。臀圍平量 ${matched.hip} 公分，身型臀圍 ${WEAR_MODEL.hip} 公分，${ease(matched.hip, WEAR_MODEL.hip)}。`,
        `肩寬平量 ${matched.shoulder} 公分，身型肩寬 ${WEAR_MODEL.shoulder} 公分，${ease(matched.shoulder, WEAR_MODEL.shoulder)}。衣長 ${matched.length} 公分，在 ${WEAR_MODEL.height} 公分身高上落在髖骨上緣。`,
      ]
    : [
        `模特身高 ${WEAR_MODEL.height} 公分，胸圍 ${WEAR_MODEL.bust}、腰圍 ${WEAR_MODEL.waist}、臀圍 ${WEAR_MODEL.hip}、肩寬 ${WEAR_MODEL.shoulder} 公分。依建議身型，這組數據落在 S。`,
        '這件品名沒有 XS 到 XL 的尺碼用字，表中沒有標成此款。請用平量公分對自己的身型。',
      ];

  return {
    matchedId,
    matchNote: matched
      ? `品名裡的尺碼用字對上 ${matched.label}，兩張表都標成此款。`
      : '品名沒有尺碼用字，表中沒有標成此款。',
    tables: [
      {
        title: '成衣平量',
        caption: '衣服攤平後量測，單位公分。胸圍、腰圍、臀圍是平量半圍的兩倍。',
        columns: ['胸圍', '腰圍', '臀圍', '衣長', '肩寬'],
        rows: WEAR_ROWS.map((row) => ({
          id: row.id,
          label: row.label,
          cells: [String(row.bust), String(row.waist), String(row.hip), String(row.length), String(row.shoulder)],
        })),
      },
      {
        title: '建議身型',
        caption: '穿上後胸圍約留 2 公分活動量時，對應的身型公分。',
        columns: ['胸圍', '腰圍', '臀圍'],
        rows: WEAR_ROWS.map((row) => ({
          id: row.id,
          label: row.label,
          cells: [String(row.bodyBust), String(row.bodyWaist), String(row.bodyHip)],
        })),
      },
    ],
    modelStats: [
      { label: '身高', value: `${WEAR_MODEL.height} 公分` },
      { label: '體重', value: `${WEAR_MODEL.weight} 公斤` },
      { label: '胸圍', value: `${WEAR_MODEL.bust} 公分` },
      { label: '腰圍', value: `${WEAR_MODEL.waist} 公分` },
      { label: '臀圍', value: `${WEAR_MODEL.hip} 公分` },
      { label: '肩寬', value: `${WEAR_MODEL.shoulder} 公分` },
    ],
    comparison,
    material: wearMaterial(name),
    wash: wearWash(name),
  };
}

function wearMaterial(name: string) {
  const lower = name.toLowerCase();
  if (/airism|無縫/.test(lower)) {
    return [
      { label: '成分', value: '聚酯纖維 82%、彈性纖維 18%' },
      { label: '組織', value: '無縫針織' },
    ];
  }
  if (/針織|knit|衛衣/.test(lower)) {
    return [
      { label: '成分', value: '棉 80%、聚酯纖維 20%' },
      { label: '組織', value: '針織，平量後會有約 1 公分的回縮' },
    ];
  }
  if (/棉/.test(name) || /襯衫|shirt|t恤|tee/.test(lower)) {
    return [
      { label: '成分', value: '棉 100%' },
      { label: '組織', value: '平紋梭織' },
    ];
  }
  if (/西裝|褲|skirt|長裙|連身/.test(lower)) {
    return [
      { label: '成分', value: '聚酯纖維 64%、黏纖 32%、彈性纖維 4%' },
      { label: '組織', value: '斜紋，含橫向彈性' },
    ];
  }
  return [
    { label: '成分', value: '棉 68%、聚酯纖維 28%、彈性纖維 4%' },
    { label: '組織', value: '平紋，含輕微橫向彈性' },
  ];
}

function wearWash(name: string) {
  const lower = name.toLowerCase();
  if (/針織|knit|衛衣|airism|無縫/.test(lower)) {
    return [
      '冷水手洗，輕輕擠壓，不要擰乾、不要懸掛。',
      '平鋪陰乾，讓衣長保持表上的公分。',
      '不可烘乾、不可漂白。熨燙時隔布、低溫。',
    ];
  }
  if (/棉|平腳/.test(name)) {
    return [
      '反面放入洗衣袋，30°C 弱速，或冷水手洗。',
      '不可漂白、不可烘乾。拉平後陰乾。',
      '低溫熨燙。深色單件洗。',
    ];
  }
  if (/西裝/.test(lower)) {
    return [
      '建議乾洗。若水洗，請放洗衣袋、30°C 弱速，洗後立即整平。',
      '不可漂白、不可烘乾。中溫熨燙，沿著褲線或門襟。',
      '深色單件洗，避免與淺色衣物互染。',
    ];
  }
  return [
    '反面放入洗衣袋，30°C 弱速，或冷水手洗。',
    '不可漂白、不可烘乾。拉平後陰乾。',
    '棉質中溫熨燙；含彈性纖維的部位用低溫。印花與刺繡反面熨。',
  ];
}

function accessoryGuide(name: string): ProductGuideContent {
  const matchedId = accessoryKind(name);
  const matched = ACCESSORY_ROWS.find((row) => row.id === matchedId);
  const comparison = accessoryComparison(matchedId, name);

  return {
    matchedId,
    matchNote: matched
      ? `品名對上${matched.label}，表中標成此款。`
      : '品名沒有對上單一配件規格，表中沒有標成此款。',
    tables: [
      {
        title: '配件公分對照',
        caption: '長度與寬度單位公分。戒指內圓周以內徑 × 3.14 計算後取到小數一位。',
        columns: ['主尺寸', '寬度', '配件', '怎麼量'],
        rows: ACCESSORY_ROWS.map((row) => ({ id: row.id, label: row.label, cells: row.cells })),
      },
    ],
    modelStats: [
      { label: '身高', value: `${ACCESSORY_MODEL.height} 公分` },
      { label: '頸圍', value: `${ACCESSORY_MODEL.neck} 公分` },
      { label: '手腕圍', value: `${ACCESSORY_MODEL.wrist} 公分` },
      { label: '食指指圍', value: `${ACCESSORY_MODEL.finger} 公分` },
      { label: '臉寬', value: `${ACCESSORY_MODEL.face} 公分` },
      { label: '腰圍', value: `${ACCESSORY_MODEL.waist} 公分` },
    ],
    comparison,
    material: accessoryMaterial(name, matchedId),
    wash: accessoryWash(name, matchedId),
  };
}

function accessoryComparison(matchedId: string | null, name: string) {
  const notes: Record<string, string[]> = {
    earring: [
      '模特耳垂到下顎約 6 公分。垂墜耳環長 4.5 公分，下緣停在下顎上方約 1.5 公分。',
      '耳針長 1.0 公分，穿過耳洞後尾端留在耳背。',
    ],
    necklace: [
      `模特頸圍 ${ACCESSORY_MODEL.neck} 公分。鎖骨鍊鏈長 40 公分，比頸圍多 7 公分。`,
      '鏈子自然垂下時，墜飾約在鎖骨下 3.5 公分。加上 5 公分延長鏈，最長可到 45 公分。',
    ],
    bracelet: [
      `模特手腕圍 ${ACCESSORY_MODEL.wrist} 公分。手鍊鏈長 16 公分，比手腕圍多 1 公分。`,
      '加上 3 公分延長鏈，最長可到 19 公分。',
    ],
    ring: [
      `模特食指指圍 ${ACCESSORY_MODEL.finger} 公分。戒指內徑 1.66 公分，內圓周 5.2 公分，與食指指圍相同。`,
      /可調/.test(name)
        ? '這件是可調式，戒圍可以離開 5.2 公分，再依食指指圍收緊。戒面寬 0.3 公分。'
        : '戒面寬 0.3 公分。指圍每大 0.3 公分，約需要再大一個港碼。',
    ],
    tie: [
      `領帶全長 145 公分，最寬 8 公分，尖端寬 2.5 公分。模特頸圍 ${ACCESSORY_MODEL.neck} 公分。`,
      '打結約用掉 35 公分，寬端從結下緣再垂約 70 公分，尖端落在腰頭附近。',
    ],
    belt: [
      `模特腰圍 ${ACCESSORY_MODEL.waist} 公分。皮帶全長 90 公分，扣上後還有 ${90 - ACCESSORY_MODEL.waist} 公分可調。`,
      '帶寬 3.2 公分，孔距 2.5 公分。',
    ],
    scarf: [
      `絲巾為 90 × 90 公分。圍在頸圍 ${ACCESSORY_MODEL.neck} 公分的脖子上繞一圈後，兩端各垂約 28 公分。`,
    ],
    sunglass: [
      `鏡框總寬 12.2 公分，模特臉寬 ${ACCESSORY_MODEL.face} 公分，鏡框比臉窄 1.3 公分。`,
      '單鏡片寬 5.2 公分，鼻樑距 1.8 公分，鏡腳長 14.5 公分。',
    ],
  };
  if (matchedId && notes[matchedId]) return notes[matchedId];
  return [
    `模特頸圍 ${ACCESSORY_MODEL.neck} 公分、手腕圍 ${ACCESSORY_MODEL.wrist} 公分、食指指圍 ${ACCESSORY_MODEL.finger} 公分、臉寬 ${ACCESSORY_MODEL.face} 公分、腰圍 ${ACCESSORY_MODEL.waist} 公分。`,
    '請用這些公分對上表。鎖骨鍊 40 公分比頸圍多 7 公分；手鍊 16 公分比手腕圍多 1 公分；戒指內圓周 5.2 公分與食指指圍相同。',
  ];
}

function accessoryMaterial(name: string, kind: string | null) {
  const lower = name.toLowerCase();
  if (kind === 'scarf' || /絲|silk/.test(lower)) {
    return [
      { label: '成分', value: '桑蠶絲 100%' },
      { label: '邊', value: '手工捲邊，寬 0.3 公分' },
    ];
  }
  if (kind === 'belt') {
    return [
      { label: '帶身', value: '頭層牛皮，厚度約 3 mm，寬 3.2 公分' },
      { label: '扣具', value: '黃銅' },
    ];
  }
  if (kind === 'sunglass') {
    return [
      { label: '鏡框', value: '醋酸纖維' },
      { label: '鏡片', value: 'CR-39，抗刮' },
    ];
  }
  if (kind === 'tie') {
    return [
      { label: '面料', value: '桑蠶絲 100%' },
      { label: '裡布', value: '聚酯纖維' },
    ];
  }
  if (/珍珠|pearl/.test(lower)) {
    return [
      { label: '珠體', value: '淡水珍珠' },
      { label: '金屬', value: '925 銀，耳針長 1.0 公分' },
    ];
  }
  return [
    { label: '金屬', value: '925 銀' },
    { label: '表面', value: '拋光，未電鍍厚金' },
  ];
}

function accessoryWash(name: string, kind: string | null) {
  const lower = name.toLowerCase();
  if (kind === 'scarf' || /絲|silk/.test(lower)) {
    return [
      '冷水加中性絲質洗劑，輕壓，不可擰、不可機洗。',
      '平鋪陰乾，反面低溫熨。',
      '不可漂白、不可烘乾。',
    ];
  }
  if (kind === 'belt') {
    return [
      '不可水洗。乾布擦去浮塵，皮面不要泡水。',
      '扣具用乾布擦，不要用酒精。',
    ];
  }
  if (kind === 'sunglass') {
    return [
      '用眼鏡布由鏡片中心向外擦。不可浸泡，不可用衣角或紙巾乾擦。',
      '鏡腳轉軸不要扳超過自然開合。',
    ];
  }
  if (kind === 'tie') {
    return [
      '不可機洗。局部污漬用微濕布輕壓，平放陰乾。',
      '反面低溫熨，讓全長保持 145 公分。',
      '不可漂白、不可烘乾。',
    ];
  }
  if (/珍珠|pearl/.test(lower)) {
    return [
      '不可水洗、不可超音波。戴完用微濕軟布輕拭，再放乾。',
      '最後戴上、最先取下，避免香水、髮膠與汗水留在珠面。',
    ];
  }
  return [
    '不可水洗。戴完用乾絨布擦掉汗水與皮脂。',
    '避免香水、泳池與海水。變暗時用銀布輕擦，不要用牙膏或硬刷。',
  ];
}

export function productGuide(category: string, name: string): ProductGuideContent {
  const key = category.trim().toUpperCase();
  if (key === 'BAGS') return bagGuide(name);
  if (key === 'DAILY WEAR') return wearGuide(name);
  if (key === 'ACCESSORY') return accessoryGuide(name);
  return wearGuide(name);
}
