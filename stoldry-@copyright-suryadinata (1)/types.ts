
export interface StockItem {
  id: string; // ID unik untuk entri stok spesifik (per lokasi)
  productId: string; // ID unik untuk master produk (berbagi data)
  name: string;
  size: string;
  status: 'reusable' | 'disposable';
  location: 'utama' | 'singles' | 'nugget' | 'lain' | 'repair';
  quantity: number;
  unit: string;
  price: number;
  minStock: number;
  lastUpdated: string;
  description?: string;
  sortOrder: number; // Menentukan urutan tampilan barang
  usagePerShift?: number; // Konsumsi rata-rata per 1 shift (3 shift = 1 hari)
}

export interface UsageConfig {
  productId: string;
  location: 'singles' | 'nugget';
  usagePerShift: number; // Jumlah pemakaian rata-rata per 1 shift
}

export interface TransactionRecord {
  id: string;
  productId: string;
  productName: string;
  size: string;
  type: 'IN' | 'OUT' | 'TRANSFER' | 'DISPOSE' | 'REPAIR_IN' | 'REPAIR_OUT';
  amount: number;
  sourceLocation: string;
  targetLocation?: string;
  timestamp: string;
  note?: string; // Keterangan tambahan untuk transaksi
  shift?: string; // Shift 1, 2, atau 3
  status?: 'PENDING' | 'COMPLETED'; // Status khusus untuk workflow pemusnahan
}

export interface StockInsight {
  status: 'critical' | 'warning' | 'optimal';
  message: string;
  recommendation: string;
}

export interface InventoryStats {
  totalItems: number;
  totalValue: number;
  lowStockCount: number;
  sizeDistribution: { name: string; value: number }[];
}

export interface ChatMessage {
  role: 'user' | 'model';
  text: string;
  timestamp: number;
}
