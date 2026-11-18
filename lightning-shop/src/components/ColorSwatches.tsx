import Link from 'next/link';
import { productSwatches, type CatalogItem } from '@/lib/catalog';

export default function ColorSwatches({
  product,
  products,
  linkable = true,
  className = '',
}: {
  product: CatalogItem;
  products: CatalogItem[];
  linkable?: boolean;
  className?: string;
}) {
  const dots = productSwatches(product, products);
  if (dots.length === 0) return null;

  return (
    <div className={`flex flex-wrap items-center gap-2 ${className}`} aria-label="可選顏色">
      {dots.map((dot) => {
        const current = dot.productId === product.id || (!dot.productId && dot.name === product.colorName?.trim());
        const className = `inline-block h-4 w-4 rounded-full border border-black/15 transition duration-200 hover:scale-110 ${
          current ? 'ring-2 ring-[#B35B48] ring-offset-2' : ''
        }`;
        const style = { backgroundColor: dot.hex };
        if (linkable && dot.productId && dot.productId !== product.id) {
          return (
            <Link
              key={`${dot.name}-${dot.productId}`}
              href={`/product/${dot.productId}`}
              aria-label={dot.name}
              title={dot.name}
              className={className}
              style={style}
            />
          );
        }
        return <span key={`${dot.name}-${dot.hex}`} aria-label={dot.name} title={dot.name} className={className} style={style} />;
      })}
    </div>
  );
}
