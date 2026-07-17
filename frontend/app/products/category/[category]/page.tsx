'use client';
import { use, useState } from 'react';
import { useProducts } from '../../../../hooks/useProducts';
import { Table } from '../../../../components/ui/Table';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Search } from 'lucide-react';

export default function CategoryProductsPage({ params }: any) {
  const { category } = use(params) as any;
  const { products, loading } = useProducts();
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');

  if (loading) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <div className="w-8 h-8 border-2 border-vodacom-blue border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // Decode the category name from URL
  const categoryName = decodeURIComponent(category as string);
  
  // Filter products by the specified category
  const filteredProducts = products.filter((p: any) => {
    const matchesCategory = (p.category || "Uncategorized") === categoryName;
    if (!matchesCategory) return false;
    
    if (!searchQuery) return true;
    
    const query = searchQuery.toLowerCase();
    const nameMatch = p.name?.toLowerCase().includes(query);
    const descMatch = p.description?.toLowerCase().includes(query);
    
    return nameMatch || descMatch;
  });

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.push('/products')}
            className="text-vodacom-muted hover:text-white p-1.5 bg-white/5 rounded-lg transition-colors border border-white/5 hover:border-white/20"
          >
            <ArrowLeft size={16} />
          </button>
          <div>
            <h1 className="text-xl font-bold text-white tracking-wide">{categoryName}</h1>
            <p className="text-[11px] text-vodacom-muted mt-0.5">{filteredProducts.length} items in this category</p>
          </div>
        </div>
        <div className="flex gap-2.5">
          <Link
            href="/products/new"
            className="bg-vodacom-green hover:bg-emerald-500 text-white text-xs font-bold uppercase tracking-wider px-4 py-2.5 rounded-xl transition-all duration-200 shadow-lg shadow-vodacom-green/15"
          >
            Add Item Here
          </Link>
        </div>
      </div>

      <div className="mb-6 relative">
        <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
          <Search size={16} className="text-vodacom-muted" />
        </div>
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search items by name or description..."
          className="w-full bg-vodacom-surface border border-white/5 rounded-xl pl-10 pr-4 py-3 text-sm text-white placeholder-vodacom-muted focus:outline-none focus:border-vodacom-blue focus:ring-1 focus:ring-vodacom-blue transition-all"
        />
      </div>

      {filteredProducts.length === 0 ? (
        <div className="text-center py-20 bg-vodacom-surface border border-white/5 rounded-2xl">
          <p className="text-vodacom-muted text-sm">No products found in this category.</p>
        </div>
      ) : (
        <Table headers={['Product Name', 'HSN Code', 'Unit Price', 'Tax Rate', 'Stock Quantity']}>
          {filteredProducts.map((p: any) => (
            <tr key={p.id} onClick={() => router.push(`/products/${p.id}`)} className="hover:bg-white/5 cursor-pointer transition-colors duration-150">
              <td className="px-6 py-4 font-semibold text-white">
                <div>
                  <div>{p.name}</div>
                  {p.description && <div className="text-[11px] text-vodacom-muted font-normal mt-0.5">{p.description}</div>}
                </div>
              </td>
              <td className="px-6 py-4 font-mono text-vodacom-muted">{p.hsn_code || 'N/A'}</td>
              <td className="px-6 py-4 text-white font-medium">₹{p.price.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
              <td className="px-6 py-4 text-slate-300">{p.tax_rate}% GST</td>
              <td className="px-6 py-4">
                <span className={`font-semibold ${p.stock_quantity <= 5 ? 'text-rose-400' : 'text-slate-300'}`}>
                  {p.stock_quantity} {p.unit || 'pcs'}
                </span>
              </td>
            </tr>
          ))}
        </Table>
      )}
    </div>
  );
}
