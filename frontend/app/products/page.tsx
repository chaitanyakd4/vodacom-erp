'use client';
import { useState } from 'react';
import { useProducts } from '../../hooks/useProducts';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { 
  Video, 
  Network, 
  Plug, 
  Zap, 
  Building, 
  Phone, 
  Cpu, 
  Server,
  Radio,
  Package,
  Search,
  Eye
} from 'lucide-react';
import { Table } from '../../components/ui/Table';

const categoryConfig: Record<string, { icon: any, color: string, description: string }> = {
  "CCTV & Recording": { icon: Video, color: "text-red-400", description: "Cameras, DVRs, NVRs" },
  "Networking Equipment": { icon: Network, color: "text-emerald-400", description: "Switches, Routers, APs" },
  "Cables & Connectors": { icon: Plug, color: "text-cyan-400", description: "Patch Cords, Cables, Connectors" },
  "Power Supplies, Adapters & UPS": { icon: Zap, color: "text-yellow-400", description: "Power adapters, UPS systems" },
  "Building Systems": { icon: Building, color: "text-orange-400", description: "Biometrics, Fire Alarms, Speakers" },
  "Telephone Handsets": { icon: Phone, color: "text-blue-400", description: "Desk phones, DECT, Handsets" },
  "EPABX Cards & Modules": { icon: Cpu, color: "text-purple-400", description: "Expansion cards, Modules" },
  "EPABX Cabinets & Switches": { icon: Server, color: "text-pink-400", description: "Base stations, Cabinets, Switches" },
  "VoIP / SIP & Gateway Equipment": { icon: Radio, color: "text-indigo-400", description: "Gateways, FCT, SIP Phones" }
};

export default function ProductsPage() {
  const { products, loading } = useProducts();
  const router = useRouter();
  
  // Tabs: 'categories' or 'all'
  const [activeTab, setActiveTab] = useState<'categories' | 'all'>('categories');
  const [searchQuery, setSearchQuery] = useState('');

  if (loading) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <div className="w-8 h-8 border-2 border-vodacom-blue border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // Group products by category
  const categoryCounts = products.reduce((acc: Record<string, number>, product: any) => {
    const cat = product.category || "Uncategorized";
    acc[cat] = (acc[cat] || 0) + 1;
    return acc;
  }, {});

  // Get all categories that exist in config, plus any unknown ones
  const allCategories = new Set([...Object.keys(categoryConfig), ...Object.keys(categoryCounts)]);

  // Filter products by search query
  const filteredProducts = products.filter((p: any) => {
    const query = searchQuery.toLowerCase().trim();
    if (!query) return true;
    return (
      p.name.toLowerCase().includes(query) ||
      (p.sku && p.sku.toLowerCase().includes(query)) ||
      (p.category && p.category.toLowerCase().includes(query)) ||
      (p.description && p.description.toLowerCase().includes(query))
    );
  });

  return (
    <div>
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-xl font-bold text-white tracking-wide">Products &amp; Inventory</h1>
          <p className="text-[11px] text-vodacom-muted mt-0.5">Manage services, hardware models, and categories</p>
        </div>
        <div className="flex gap-2.5">
          <Link
            href="/products/import"
            className="border border-white/10 hover:bg-white/5 text-vodacom-text text-xs font-bold uppercase tracking-wider px-4 py-2.5 rounded-xl transition-all duration-200"
          >
            Import Excel
          </Link>
          <Link
            href="/products/new"
            className="bg-vodacom-green hover:bg-emerald-500 text-white text-xs font-bold uppercase tracking-wider px-4 py-2.5 rounded-xl transition-all duration-200 shadow-lg shadow-vodacom-green/15"
          >
            Add Product
          </Link>
        </div>
      </div>

      {/* Tabs Switcher */}
      <div className="flex justify-between items-center gap-4 mb-6 border-b border-white/5 pb-4">
        <div className="flex gap-2">
          <button
            onClick={() => setActiveTab('categories')}
            className={`px-4 py-2 rounded-xl text-xs font-semibold capitalize transition-all duration-200 border ${
              activeTab === 'categories'
                ? 'bg-vodacom-blue/15 border-vodacom-blue text-white shadow-lg shadow-vodacom-blue/5'
                : 'bg-vodacom-surface/40 border-white/5 text-vodacom-muted hover:text-white hover:bg-vodacom-surface/75'
            }`}
          >
            Browse Categories
          </button>
          <button
            onClick={() => setActiveTab('all')}
            className={`px-4 py-2 rounded-xl text-xs font-semibold capitalize transition-all duration-200 border ${
              activeTab === 'all'
                ? 'bg-vodacom-blue/15 border-vodacom-blue text-white shadow-lg shadow-vodacom-blue/5'
                : 'bg-vodacom-surface/40 border-white/5 text-vodacom-muted hover:text-white hover:bg-vodacom-surface/75'
            }`}
          >
            All Products ({products.length})
          </button>
        </div>

        {/* Inline Search (Visible on All Products tab) */}
        {activeTab === 'all' && (
          <div className="relative w-64">
            <input
              type="text"
              placeholder="Search product, SKU..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full bg-vodacom-darker border border-white/10 rounded-xl pl-9 pr-4 py-2 text-[12px] text-white placeholder-vodacom-muted focus:outline-none focus:ring-1 focus:ring-vodacom-blue focus:border-vodacom-blue transition-all duration-200"
            />
            <Search className="absolute left-3 top-2.5 text-vodacom-muted" size={13} />
          </div>
        )}
      </div>

      {/* Categories View */}
      {activeTab === 'categories' && (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {Array.from(allCategories).map(cat => {
            const config = categoryConfig[cat] || { icon: Package, color: "text-slate-400", description: "Other items" };
            const count = categoryCounts[cat] || 0;
            const Icon = config.icon;

            return (
              <div 
                key={cat}
                onClick={() => router.push(`/products/category/${encodeURIComponent(cat)}`)}
                className="bg-vodacom-surface border border-white/5 rounded-2xl p-6 cursor-pointer hover:bg-white/[0.02] hover:border-vodacom-blue/30 transition-all duration-300 group"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className={`p-3 rounded-xl bg-black/20 ${config.color} group-hover:scale-110 transition-transform duration-300`}>
                    <Icon size={24} />
                  </div>
                  <div className="text-right">
                    <span className="text-2xl font-bold text-white">{count}</span>
                    <p className="text-[10px] uppercase font-bold tracking-wider text-vodacom-muted">Items</p>
                  </div>
                </div>
                
                <h3 className="text-sm font-bold text-white mb-1 group-hover:text-vodacom-blue transition-colors">
                  {cat}
                </h3>
                <p className="text-xs text-vodacom-muted line-clamp-1">
                  {config.description}
                </p>
              </div>
            );
          })}
        </div>
      )}

      {/* All Products List View */}
      {activeTab === 'all' && (
        <div className="glass-panel border border-white/5 rounded-2xl overflow-hidden shadow-xl">
          {filteredProducts.length === 0 ? (
            <div className="py-20 text-center text-sm text-vodacom-muted">
              No products found matching your search.
            </div>
          ) : (
            <Table headers={['SKU', 'Product Name', 'Category', 'Stock Level', 'Price', 'Tax Rate', 'Actions']}>
              {filteredProducts.map((p: any) => (
                <tr 
                  key={p.id} 
                  onClick={() => router.push(`/products/${p.id}`)}
                  className="hover:bg-white/5 transition-colors duration-150 cursor-pointer"
                >
                  <td className="px-6 py-4 font-mono text-[12px] font-bold text-vodacom-blue tracking-wide">
                    {p.sku || `PROD-${p.id}`}
                  </td>
                  <td className="px-6 py-4 font-medium text-white max-w-xs truncate" title={p.name}>
                    {p.name}
                  </td>
                  <td className="px-6 py-4 text-slate-300">
                    {p.category || 'Uncategorized'}
                  </td>
                  <td className="px-6 py-4">
                    <span className={`text-[12px] font-bold ${p.stock_quantity > 5 ? 'text-slate-300' : p.stock_quantity > 0 ? 'text-amber-400' : 'text-red-400'}`}>
                      {p.stock_quantity} {p.unit || 'pcs'}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-white font-semibold">
                    ₹{p.price.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </td>
                  <td className="px-6 py-4 text-vodacom-muted">
                    {p.tax_rate}% GST
                  </td>
                  <td className="px-6 py-4">
                    <button 
                      onClick={(e) => { e.stopPropagation(); router.push(`/products/${p.id}`); }}
                      className="text-vodacom-blue hover:text-white transition-colors text-xs font-semibold inline-flex items-center gap-1"
                    >
                      <Eye size={12} />
                      View
                    </button>
                  </td>
                </tr>
              ))}
            </Table>
          )}
        </div>
      )}
    </div>
  );
}
