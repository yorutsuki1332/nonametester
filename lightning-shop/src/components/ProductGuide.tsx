import { productGuide } from '@/lib/product-guide';

export default function ProductGuide({ category, name }: { category: string; name: string }) {
  const guide = productGuide(category, name);

  return (
    <section id="size-guide" className="mx-auto max-w-275 scroll-mt-36 px-[5%] pb-16">
      <h2 className="font-serif text-[22px] font-semibold text-[#382E2B]">尺寸與材質指南</h2>
      <p className="mt-2 text-[13px] leading-relaxed text-[#6E6058]">{guide.matchNote}</p>

      <div className="mt-8 flex flex-col gap-8">
        {guide.tables.map((table) => (
          <div key={table.title}>
            <h3 className="text-[15px] font-semibold text-[#382E2B]">{table.title}</h3>
            <p className="mt-1 text-[12px] leading-relaxed text-[#6E6058]">{table.caption}</p>
            <div className="mt-3 overflow-x-auto rounded-xl border border-[#EBE5DF]">
              <table className="w-full min-w-[640px] border-collapse text-left text-[13px]">
                <caption className="sr-only">{table.title}，{table.caption}</caption>
                <thead className="bg-[#F4F0EA] text-[#6E6058]">
                  <tr>
                    <th scope="col" className="px-3 py-2.5 font-semibold">規格</th>
                    {table.columns.map((column) => (
                      <th key={column} scope="col" className="px-3 py-2.5 font-semibold">{column}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {table.rows.map((row) => {
                    const current = row.id === guide.matchedId;
                    return (
                      <tr key={row.id} className={current ? 'bg-white' : 'bg-[#FAF7F2]'}>
                        <th scope="row" className="px-3 py-2.5 font-semibold text-[#382E2B]">
                          {row.label}
                          {current && (
                            <span className="ml-2 rounded-full bg-[#B35B48] px-2 py-0.5 text-[10px] font-medium text-white">此款</span>
                          )}
                        </th>
                        {row.cells.map((cell, index) => (
                          <td key={`${row.id}-${table.columns[index]}`} className="px-3 py-2.5 text-[#382E2B]">{cell}</td>
                        ))}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-8">
        <h3 className="text-[15px] font-semibold text-[#382E2B]">模特試穿</h3>
        <dl className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
          {guide.modelStats.map((stat) => (
            <div key={stat.label} className="rounded-lg border border-[#EBE5DF] bg-[#F4F0EA] px-3 py-2">
              <dt className="text-[11px] text-[#8C7B70]">{stat.label}</dt>
              <dd className="text-[13px] font-semibold text-[#382E2B]">{stat.value}</dd>
            </div>
          ))}
        </dl>
        <div className="mt-3 flex flex-col gap-2 text-[13px] leading-relaxed text-[#6E6058]">
          {guide.comparison.map((line) => (
            <p key={line}>{line}</p>
          ))}
        </div>
      </div>

      <div className="mt-8">
        <h3 className="text-[15px] font-semibold text-[#382E2B]">洗滌與材質</h3>
        <dl className="mt-3 flex flex-col gap-2">
          {guide.material.map((item) => (
            <div key={item.label} className="grid grid-cols-[5.5rem_1fr] gap-3 text-[13px]">
              <dt className="font-semibold text-[#382E2B]">{item.label}</dt>
              <dd className="text-[#6E6058]">{item.value}</dd>
            </div>
          ))}
        </dl>
        <ul className="mt-3 list-disc space-y-1.5 pl-5 text-[13px] leading-relaxed text-[#6E6058]">
          {guide.wash.map((step) => (
            <li key={step}>{step}</li>
          ))}
        </ul>
      </div>
    </section>
  );
}
