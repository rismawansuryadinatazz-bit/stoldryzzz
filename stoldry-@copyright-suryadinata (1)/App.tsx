
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  LayoutDashboard, Search, Trash2, X,
  Building2, Store, Layers,
  History, Lock, LogOut, PlusSquare, 
  CheckCircle2, ChevronDown, Settings as SettingsIcon, 
  Server, RefreshCw, AlertTriangle, Hammer, Flame, 
  CheckCircle, TrendingUp, Combine, Save, FileDown, 
  ShoppingCart, Clock, ArrowRightLeft, ArrowDownCircle, 
  ArrowUpCircle, Eye, AlertOctagon, Truck, Printer, Info, TrendingDown, Zap,
  Database, CloudSync, Plus, Minus, Download, FileSpreadsheet, Sparkles, Edit2,
  ThumbsUp, ThumbsDown, Package, ClipboardList, Copy, ExternalLink, Globe, RotateCcw,
  CheckSquare
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { StockItem, TransactionRecord } from './types';
import * as CloudService from './services/googleSheetService';

const generateId = () => Math.random().toString(36).substr(2, 9);
const generateProductId = () => `SKU-${Math.random().toString(36).substr(2, 6).toUpperCase()}`;

const App: React.FC = () => {
  const [isLoggedIn, setIsLoggedIn] = useState<boolean>(() => localStorage.getItem('sm_auth_active') === 'true');
  const [accessKey] = useState<string>(() => localStorage.getItem('sm_access_key') || 'admin123');
  const [storeName, setStoreName] = useState<string>(() => localStorage.getItem('sm_store_name') || 'STOLDRY');
  
  const [inventory, setInventory] = useState<StockItem[]>([]);
  const [transactions, setTransactions] = useState<TransactionRecord[]>([]);
  const [activeTab, setActiveTab] = useState<'dashboard' | 'master-produk' | 'gudang-utama' | 'gedung-singles' | 'gedung-nugget' | 'pemusnahan' | 'repair' | 'transaksi' | 'settings' | 'kebutuhan-gedung'>('dashboard');
  
  const [kebutuhanSubTab, setKebutuhanSubTab] = useState<'gabungan' | 'singles' | 'nugget'>('gabungan');
  const [forecastPeriod, setForecastPeriod] = useState<'1day' | '1week' | '2weeks' | '3weeks' | '1month'>('1week');
  
  const [cloudUrl, setCloudUrl] = useState(CloudService.getSheetUrl());
  const [syncStatus, setSyncStatus] = useState<'saved' | 'syncing' | 'offline' | 'error'>('saved');
  const [isInitialLoading, setIsInitialLoading] = useState(true);

  const [isDarkMode, setIsDarkMode] = useState<boolean>(() => localStorage.getItem('sm_dark_mode') === 'true');
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('sm_dark_mode', 'true');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('sm_dark_mode', 'false');
    }
  }, [isDarkMode]);

  const [searchQuery, setSearchQuery] = useState('');
  const [isAddProductModalOpen, setIsAddProductModalOpen] = useState(false);
  const [isEditProductModalOpen, setIsEditProductModalOpen] = useState(false);
  const [isTransactionModalOpen, setIsTransactionModalOpen] = useState(false);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<any>(null);
  const [successNotification, setSuccessNotification] = useState<string | null>(null);
  const [errorNotification, setErrorNotification] = useState<string | null>(null);
  const [importPreview, setImportPreview] = useState<any[] | null>(null);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);

  const [authPassword, setAuthPassword] = useState('');
  const [authError, setAuthError] = useState(false);
  const [newProductData, setNewProductData] = useState<Partial<StockItem>>({ name: '', size: '', unit: 'pcs', status: 'reusable', usagePerShift: 0 });
  const [editingProduct, setEditingProduct] = useState<StockItem | null>(null);
  const [transactionData, setTransactionData] = useState({ 
    productId: '', amount: 0, type: 'MASUK_UTAMA', note: '', shift: '1'
  });

  const allTransactionTypes = [
    { id: 'MASUK_UTAMA', label: 'MASUK DARI SUPPLIER', source: 'supplier', target: 'utama', icon: <ArrowDownCircle className="text-emerald-500" size={16}/> },
    { id: 'KELUAR_SINGLES', label: 'TRANSFER KE SINGLES', source: 'utama', target: 'singles', icon: <ArrowRightLeft className="text-blue-500" size={16}/> },
    { id: 'KELUAR_NUGGET', label: 'TRANSFER KE NUGGET', source: 'utama', target: 'nugget', icon: <ArrowRightLeft className="text-indigo-500" size={16}/> },
    { id: 'SINGLES_KE_UTAMA', label: 'SINGLES KE UTAMA (KEMBALI)', source: 'singles', target: 'utama', icon: <ArrowRightLeft className="text-blue-600" size={16}/> },
    { id: 'NUGGET_KE_UTAMA', label: 'NUGGET KE UTAMA (KEMBALI)', source: 'nugget', target: 'utama', icon: <ArrowRightLeft className="text-indigo-600" size={16}/> },
    { id: 'KE_REPAIR', label: 'TRANSFER KE PERBAIKAN', source: 'utama', target: 'repair', icon: <Hammer className="text-amber-500" size={16}/> },
    { id: 'REPAIR_KE_UTAMA', label: 'PERBAIKAN SELESAI (KE UTAMA)', source: 'repair', target: 'utama', icon: <CheckCircle className="text-emerald-500" size={16}/> },
    { id: 'KE_PEMUSNAHAN', label: 'PENGAJUAN PEMUSNAHAN', source: 'utama', target: 'lain', icon: <Flame className="text-red-500" size={16}/> },
    { id: 'KELUAR_LAIN', label: 'PENGELUARAN LAIN-LAIN', source: 'utama', target: 'lain', icon: <ArrowUpCircle className="text-slate-500" size={16}/> }
  ];

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (successNotification || errorNotification) {
      const timer = setTimeout(() => {
        setSuccessNotification(null);
        setErrorNotification(null);
      }, 3000); 
      return () => clearTimeout(timer);
    }
  }, [successNotification, errorNotification]);

  // Auto logout after 10 minutes of inactivity
  useEffect(() => {
    if (!isLoggedIn) return;

    let timeoutId: any;

    const resetTimer = () => {
      if (timeoutId) clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        handleLogout();
        setSuccessNotification("SESI BERAKHIR: LOGOUT OTOMATIS KARENA TIDAK ADA AKTIVITAS");
      }, 10 * 60 * 1000); // 10 minutes
    };

    const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart'];
    
    events.forEach(event => {
      window.addEventListener(event, resetTimer);
    });

    resetTimer(); // Initialize timer

    return () => {
      if (timeoutId) clearTimeout(timeoutId);
      events.forEach(event => {
        window.removeEventListener(event, resetTimer);
      });
    };
  }, [isLoggedIn]);

  useEffect(() => {
    if (!isLoggedIn) return;
    const loadData = async () => {
      setIsInitialLoading(true);
      const localInv = localStorage.getItem('stock_inventory_v13');
      const localTrans = localStorage.getItem('stock_transactions_v13');
      if (localInv) setInventory(JSON.parse(localInv));
      if (localTrans) setTransactions(JSON.parse(localTrans));

      if (cloudUrl) {
        setSyncStatus('syncing');
        try {
          const cloudData = await CloudService.fetchFromCloud();
          if (cloudData) {
            if (cloudData.inventory) setInventory(cloudData.inventory);
            if (cloudData.transactions) setTransactions(cloudData.transactions);
            setSyncStatus('saved');
          } else { setSyncStatus('offline'); }
        } catch (e) { setSyncStatus('error'); }
      }
      setIsInitialLoading(false);
    };
    loadData();
  }, [isLoggedIn, cloudUrl]);

  const syncTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (!isLoggedIn || isInitialLoading) return;
    localStorage.setItem('stock_inventory_v13', JSON.stringify(inventory));
    localStorage.setItem('stock_transactions_v13', JSON.stringify(transactions));
    if (cloudUrl) {
      setSyncStatus('syncing');
      if (syncTimeoutRef.current) clearTimeout(syncTimeoutRef.current);
      syncTimeoutRef.current = setTimeout(async () => {
        const result = await CloudService.syncToCloud(inventory, transactions);
        setSyncStatus(result.success ? 'saved' : 'error');
      }, 3000);
    }
    return () => { if (syncTimeoutRef.current) clearTimeout(syncTimeoutRef.current); };
  }, [inventory, transactions, isLoggedIn, cloudUrl]);

  const masterProducts = useMemo(() => {
    const products: Record<string, StockItem> = {};
    inventory.forEach(item => { if (!products[item.productId]) products[item.productId] = { ...item }; });
    return Object.values(products).sort((a, b) => {
      const nameCompare = (a.name || '').localeCompare(b.name || '');
      if (nameCompare !== 0) return nameCompare;
      const sizeCompare = (a.size || '').localeCompare(b.size || '');
      if (sizeCompare !== 0) return sizeCompare;
      const unitCompare = (a.unit || '').localeCompare(b.unit || '');
      if (unitCompare !== 0) return unitCompare;
      return (a.status || '').localeCompare(b.status || '');
    });
  }, [inventory]);

  const kebutuhanGedungData = useMemo(() => {
    const periodMultiplier = 
      forecastPeriod === '1day' ? 1 : 
      forecastPeriod === '1week' ? 7 : 
      forecastPeriod === '2weeks' ? 14 : 
      forecastPeriod === '3weeks' ? 21 : 30;

    return masterProducts.map(p => {
      const singlesItem = inventory.find(i => i.productId === p.productId && i.location === 'singles');
      const nuggetItem = inventory.find(i => i.productId === p.productId && i.location === 'nugget');
      
      const singlesQty = singlesItem?.quantity || 0;
      const nuggetQty = nuggetItem?.quantity || 0;
      const singlesUsage = singlesItem?.usagePerShift || 0;
      const nuggetUsage = nuggetItem?.usagePerShift || 0;
      
      const pusatQty = inventory.find(i => i.productId === p.productId && i.location === 'utama')?.quantity || 0;
      
      let stockAtLocation = (kebutuhanSubTab === 'gabungan') ? (singlesQty + nuggetQty) : (kebutuhanSubTab === 'singles' ? singlesQty : nuggetQty);
      let usagePerShift = (kebutuhanSubTab === 'gabungan') ? (singlesUsage + nuggetUsage) : (kebutuhanSubTab === 'singles' ? singlesUsage : nuggetUsage);
      
      // New Formula: (Stock Lokasi + 30%) * 3
      const baseValue = stockAtLocation * 1.3;
      const dailyUsage = baseValue * 3;
      const totalStockNeeded = Math.round(dailyUsage * periodMultiplier);
      const minStock = Math.round(dailyUsage); // Stok minim = 1 hari pakai
      const targetUsage = totalStockNeeded; 
      
      const daysLeftValue = dailyUsage > 0 ? (pusatQty / dailyUsage) : 999;
      let supplyStatus: 'aman' | 'kurang' | 'kosong' | 'order' = 'aman';
      if (totalStockNeeded > 0) {
        if (pusatQty === 0) supplyStatus = 'kosong';
        else if (pusatQty <= minStock) supplyStatus = 'order';
        else if (pusatQty < totalStockNeeded) supplyStatus = 'kurang';
      }
      return { ...p, singlesQty, nuggetQty, pusatQty, stockAtLocation, usagePerShift, targetUsage, totalStockNeeded, minStock, supplyStatus, daysLeftValue };
    }).filter(i => (i.name || '').toLowerCase().includes(searchQuery.toLowerCase()));
  }, [masterProducts, inventory, forecastPeriod, kebutuhanSubTab, searchQuery]);

  const filteredData = useMemo(() => {
    if (activeTab === 'kebutuhan-gedung') return kebutuhanGedungData;
    let base: any[] = [];
    if (activeTab === 'master-produk') base = masterProducts;
    else if (activeTab === 'transaksi') base = transactions;
    else if (activeTab === 'pemusnahan') base = inventory.filter(i => i.location === 'lain' && i.quantity > 0);
    else if (activeTab === 'repair') base = inventory.filter(i => i.location === 'repair' && i.quantity > 0);
    else if (activeTab === 'settings') base = [];
    else {
      const locMap: any = { 'gudang-utama': 'utama', 'gedung-singles': 'singles', 'gedung-nugget': 'nugget' };
      const loc = locMap[activeTab] || 'utama';
      base = inventory.filter(i => i.location === loc);
    }
    const searchField = (activeTab === 'transaksi') ? 'productName' : 'name';
    return base.filter(i => ((i as any)[searchField] || '').toLowerCase().includes(searchQuery.toLowerCase()));
  }, [activeTab, masterProducts, transactions, inventory, searchQuery, kebutuhanGedungData]);

  const filteredTransactionTypes = useMemo(() => {
    const locMap: any = { 'gudang-utama': 'utama', 'gedung-singles': 'singles', 'gedung-nugget': 'nugget' };
    const currentLoc = locMap[activeTab] || 'utama';
    
    if (currentLoc === 'utama') {
      return allTransactionTypes.filter(t => 
        ['MASUK_UTAMA', 'KELUAR_SINGLES', 'KELUAR_NUGGET', 'KE_REPAIR', 'KE_PEMUSNAHAN', 'KELUAR_LAIN'].includes(t.id)
      );
    } else if (currentLoc === 'singles') {
      return allTransactionTypes.filter(t => t.id === 'SINGLES_KE_UTAMA');
    } else if (currentLoc === 'nugget') {
      return allTransactionTypes.filter(t => t.id === 'NUGGET_KE_UTAMA');
    }
    return allTransactionTypes;
  }, [activeTab, allTransactionTypes]);

  const handleUpdateStock = (productId: string, location: 'singles' | 'nugget', value: number) => {
    setInventory(prev => {
      const idx = prev.findIndex(i => i.productId === productId && i.location === location);
      if (idx !== -1) {
        const newInv = [...prev];
        newInv[idx] = { ...newInv[idx], quantity: Math.max(0, value), lastUpdated: new Date().toISOString() };
        return newInv;
      }
      return prev;
    });
  };

  const handleUpdateUsage = (productId: string, value: number) => {
    setInventory(prev => prev.map(item => item.productId === productId ? { ...item, usagePerShift: Math.max(0, value), lastUpdated: new Date().toISOString() } : item));
  };

  const handleMarkUnfit = (item: StockItem) => {
    const amountStr = window.prompt(`Masukkan jumlah barang "${item.name}" yang TIDAK LAYAK:`, item.quantity.toString());
    if (amountStr === null) return;
    const amount = parseInt(amountStr);
    if (isNaN(amount) || amount <= 0 || amount > item.quantity) {
      setErrorNotification("Jumlah tidak valid atau melebihi stok tersedia.");
      return;
    }

    const note = window.prompt("Tambahkan keterangan (opsional):", "Tandai Tidak Layak via Opsi Barang") || "Tandai Tidak Layak via Opsi Barang";

    setInventory(prev => {
      let newInv = [...prev];
      const srcIdx = newInv.findIndex(i => i.id === item.id);
      if (srcIdx !== -1) {
        newInv[srcIdx] = { ...newInv[srcIdx], quantity: newInv[srcIdx].quantity - amount, lastUpdated: new Date().toISOString() };
      }
      const targetIdx = newInv.findIndex(i => i.productId === item.productId && i.location === 'lain');
      if (targetIdx !== -1) {
        newInv[targetIdx] = { ...newInv[targetIdx], quantity: newInv[targetIdx].quantity + amount, lastUpdated: new Date().toISOString() };
      }
      return newInv;
    });

    setTransactions(prev => [{
      id: generateId(), productId: item.productId, productName: item.name, size: item.size, type: 'DISPOSE', amount,
      sourceLocation: item.location, targetLocation: 'pemusnahan', timestamp: new Date().toISOString(),
      note, shift: '1'
    } as TransactionRecord, ...prev]);
    setSuccessNotification("Barang telah dipindahkan ke daftar Pemusnahan.");
  };

  const handleExecutePemusnahan = (item: StockItem) => {
    const amountStr = window.prompt(`Berapa banyak "${item.name}" yang benar-benar DIMUSNAHKAN SECARA FISIK?`, item.quantity.toString());
    if (amountStr === null) return;
    const amount = parseInt(amountStr);
    if (isNaN(amount) || amount <= 0 || amount > item.quantity) {
      setErrorNotification("Jumlah tidak valid.");
      return;
    }

    setInventory(prev => prev.map(i => i.id === item.id ? { ...i, quantity: i.quantity - amount, lastUpdated: new Date().toISOString() } : i));
    setTransactions(prev => [{
      id: generateId(), productId: item.productId, productName: item.name, size: item.size, type: 'DISPOSE', amount,
      sourceLocation: 'pemusnahan', targetLocation: 'exterminated', timestamp: new Date().toISOString(),
      note: 'Pemusnahan Fisik Selesai', shift: '1'
    } as TransactionRecord, ...prev]);
    setSuccessNotification("Stok telah dimusnahkan secara permanen.");
  };

  const handleRestorePemusnahan = (item: StockItem) => {
    const amountStr = window.prompt(`Masukkan jumlah "${item.name}" yang akan DIKEMBALIKAN KE GUDANG UTAMA (Layak Kembali):`, item.quantity.toString());
    if (amountStr === null) return;
    const amount = parseInt(amountStr);
    if (isNaN(amount) || amount <= 0 || amount > item.quantity) {
      setErrorNotification("Jumlah tidak valid.");
      return;
    }

    setInventory(prev => {
      let newInv = [...prev];
      const srcIdx = newInv.findIndex(i => i.id === item.id);
      if (srcIdx !== -1) newInv[srcIdx] = { ...newInv[srcIdx], quantity: newInv[srcIdx].quantity - amount, lastUpdated: new Date().toISOString() };
      const targetIdx = newInv.findIndex(i => i.productId === item.productId && i.location === 'utama');
      if (targetIdx !== -1) newInv[targetIdx] = { ...newInv[targetIdx], quantity: newInv[targetIdx].quantity + amount, lastUpdated: new Date().toISOString() };
      return newInv;
    });

    setTransactions(prev => [{
      id: generateId(), productId: item.productId, productName: item.name, size: item.size, type: 'TRANSFER', amount,
      sourceLocation: 'pemusnahan', targetLocation: 'utama', timestamp: new Date().toISOString(),
      note: 'Stok dipulihkan (Restore)', shift: '1'
    } as TransactionRecord, ...prev]);
    setSuccessNotification("Stok berhasil dipulihkan ke Gudang Utama.");
  };

  // FUNGSI BARU: SELESAI REPAIR
  const handleFinishRepair = (item: StockItem) => {
    const amountStr = window.prompt(`Masukkan jumlah "${item.name}" yang sudah SELESAI DIPERBAIKI:`, item.quantity.toString());
    if (amountStr === null) return;
    const amount = parseInt(amountStr);
    if (isNaN(amount) || amount <= 0 || amount > item.quantity) {
      setErrorNotification("Jumlah tidak valid.");
      return;
    }

    setInventory(prev => {
      let newInv = [...prev];
      const srcIdx = newInv.findIndex(i => i.id === item.id);
      if (srcIdx !== -1) newInv[srcIdx] = { ...newInv[srcIdx], quantity: newInv[srcIdx].quantity - amount, lastUpdated: new Date().toISOString() };
      const targetIdx = newInv.findIndex(i => i.productId === item.productId && i.location === 'utama');
      if (targetIdx !== -1) newInv[targetIdx] = { ...newInv[targetIdx], quantity: newInv[targetIdx].quantity + amount, lastUpdated: new Date().toISOString() };
      return newInv;
    });

    setTransactions(prev => [{
      id: generateId(), productId: item.productId, productName: item.name, size: item.size, type: 'REPAIR_OUT', amount,
      sourceLocation: 'repair', targetLocation: 'utama', timestamp: new Date().toISOString(),
      note: 'Repair Selesai (Kembali ke Utama)', shift: '1'
    } as TransactionRecord, ...prev]);
    setSuccessNotification("Stok perbaikan berhasil dikembalikan ke Gudang Utama.");
  };

  const handleProcessTransaction = (e: React.FormEvent) => {
    e.preventDefault();
    const { productId, amount, type, note, shift } = transactionData;
    if (!productId || amount <= 0) return;
    const tType = allTransactionTypes.find(t => t.id === type);
    if (!tType) return;
    const master = masterProducts.find(p => p.productId === productId);
    if (!master) return;

    if (tType.source !== 'supplier') {
      const sourceItem = inventory.find(i => i.productId === productId && i.location === tType.source);
      if (!sourceItem || sourceItem.quantity < amount) {
        setErrorNotification(`Stok di ${tType.source.toUpperCase().replace('-', ' ')} tidak mencukupi (Tersedia: ${sourceItem?.quantity || 0}).`);
        return;
      }
    }

    setInventory(prev => {
      let newInv = [...prev];
      if (tType.source !== 'supplier') {
        const srcIdx = newInv.findIndex(i => i.productId === productId && i.location === tType.source);
        if (srcIdx !== -1) newInv[srcIdx] = { ...newInv[srcIdx], quantity: Math.max(0, newInv[srcIdx].quantity - amount), lastUpdated: new Date().toISOString() };
      }
      if (tType.target) {
        const targetIdx = newInv.findIndex(i => i.productId === productId && i.location === tType.target);
        if (targetIdx !== -1) newInv[targetIdx] = { ...newInv[targetIdx], quantity: newInv[targetIdx].quantity + amount, lastUpdated: new Date().toISOString() };
      }
      return newInv;
    });

    let recordType: TransactionRecord['type'] = 'TRANSFER';
    if (type === 'MASUK_UTAMA') recordType = 'IN';
    if (type === 'KE_PEMUSNAHAN' || type === 'KELUAR_LAIN') recordType = 'DISPOSE';
    if (type === 'KE_REPAIR') recordType = 'REPAIR_IN';
    if (type === 'REPAIR_KE_UTAMA') recordType = 'REPAIR_OUT';

    setTransactions(prev => [{ id: generateId(), productId, productName: master.name, size: master.size, type: recordType, amount, sourceLocation: tType.source, targetLocation: tType.target as any, timestamp: new Date().toISOString(), note, shift } as TransactionRecord, ...prev]);
    setIsTransactionModalOpen(false);
    setTransactionData({ productId: '', amount: 0, type: 'MASUK_UTAMA', note: '', shift: '1' });
    setSuccessNotification("Transaksi berhasil dicatat.");
  };

  const handleAddProduct = (e: React.FormEvent) => {
    e.preventDefault();
    const pId = generateProductId();
    const locations: StockItem['location'][] = ['utama', 'singles', 'nugget', 'lain', 'repair'];
    const newEntries = locations.map(loc => ({ ...newProductData, id: generateId(), productId: pId, location: loc, quantity: 0, minStock: 10, price: 0, lastUpdated: new Date().toISOString(), sortOrder: inventory.length } as StockItem));
    setInventory(prev => [...prev, ...newEntries]);
    setIsAddProductModalOpen(false);
    setSuccessNotification("Produk baru terdaftar.");
    setNewProductData({ name: '', size: '', unit: 'pcs', status: 'reusable', usagePerShift: 0 });
  };

  const handleUpdateProduct = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProduct) return;
    setInventory(prev => prev.map(item => item.productId === editingProduct.productId ? { ...item, name: editingProduct.name, size: editingProduct.size, unit: editingProduct.unit, status: editingProduct.status, usagePerShift: editingProduct.usagePerShift, lastUpdated: new Date().toISOString() } : item));
    setIsEditProductModalOpen(false);
    setEditingProduct(null);
    setSuccessNotification("Data master diperbarui.");
  };

  const handleDeleteProduct = (productId: string) => {
    if (window.confirm('Hapus produk ini secara permanen dari master dan semua unit lokasi?')) {
      setInventory(prev => prev.filter(item => item.productId !== productId));
      setSuccessNotification("Produk berhasil dihapus dari master.");
    }
  };

  const handleExportPDF = () => {
    const doc = new jsPDF('l', 'mm', 'a4'); 
    autoTable(doc, {
      startY: 20,
      head: [activeTab === 'transaksi' ? ['Waktu', 'Barang', 'Tipe', 'Jumlah', 'Asal', 'Tujuan', 'Keterangan'] : ['Nama Barang', 'Size', 'Satuan', 'Status', 'Jumlah', 'Kelayakan']],
      body: filteredData.map(i => {
        if (activeTab === 'transaksi') {
          return [new Date(i.timestamp).toLocaleString(), i.productName, i.type, i.amount, i.sourceLocation, i.targetLocation, i.note || '-'];
        } else {
          const qty = activeTab === 'master-produk' ? inventory.filter(node => node.productId === i.productId && node.location !== 'lain').reduce((a,c) => a + c.quantity, 0) : i.quantity;
          return [i.name, i.size, i.unit, i.status === 'reusable' ? 'Berulang' : 'Sekali Pakai', qty, i.location === 'lain' ? 'TIDAK LAYAK' : 'LAYAK'];
        }
      }),
    });
    doc.save(`${storeName.toLowerCase()}-${activeTab}.pdf`);
  };

  const handleXLSXUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const data = XLSX.utils.sheet_to_json(XLSX.read(evt.target?.result, { type: 'binary' }).Sheets[XLSX.read(evt.target?.result, { type: 'binary' }).SheetNames[0]]);
        
        setImportPreview(data.map((row: any) => {
          const name = row['NAMA BARANG'] || row['Nama Barang'] || row['NAMA'] || row['Nama'] || row['ITEM'] || row['Item'] || 'Item Baru';
          const size = row['SIZE'] || row['Size'] || row['UKURAN'] || row['Ukuran'] || row['DIMENSI'] || '-';
          const unit = row['SATUAN'] || row['Satuan'] || row['UNIT'] || row['Unit'] || row['UOM'] || 'pcs';
          const statusRaw = (row['STATUS'] || row['Status'] || row['PROTOKOL'] || row['Protokol'] || 'reusable').toString().toLowerCase();
          const status = statusRaw.includes('berulang') || statusRaw.includes('reusable') ? 'reusable' : 'disposable';
          const sku = row['SKU'] || row['Sku'] || row['KODE'] || row['Kode'] || row['ID'] || generateProductId();
          const usage = Math.max(0, Number(row['PAKAI_SH']) || Number(row['Usage']) || 0);
          const qty = Math.max(0, Number(row['QTY']) || Number(row['Qty']) || Number(row['JUMLAH']) || Number(row['Jumlah']) || Number(row['STOK']) || 0);

          return { productId: sku, name, size, unit, status, usagePerShift: usage, quantity: qty };
        }));
        setIsImportModalOpen(true);
      } catch (err) { setErrorNotification("Gagal membaca Excel."); }
    };
    reader.readAsBinaryString(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const confirmImport = () => {
    if (!importPreview) return;
    
    const locMap: any = { 'gudang-utama': 'utama', 'gedung-singles': 'singles', 'gedung-nugget': 'nugget' };
    const targetLoc = locMap[activeTab] || 'utama';

    setInventory(prev => {
      let newInv = [...prev];
      importPreview.forEach(item => {
        const exists = newInv.some(i => i.productId === item.productId);
        if (exists) {
          newInv = newInv.map(node => node.productId === item.productId ? { 
            ...node, 
            name: item.name, 
            size: item.size, 
            unit: item.unit, 
            status: item.status as any, 
            usagePerShift: item.usagePerShift, 
            quantity: node.location === targetLoc ? (item.quantity >= 0 ? item.quantity : node.quantity) : node.quantity, 
            lastUpdated: new Date().toISOString() 
          } : node);
        } else {
          ['utama', 'singles', 'nugget', 'lain', 'repair'].forEach(loc => newInv.push({ 
            id: generateId(), 
            productId: item.productId, 
            name: item.name, 
            size: item.size, 
            unit: item.unit, 
            status: item.status as any, 
            location: loc as any, 
            quantity: loc === targetLoc ? Math.max(0, item.quantity) : 0, 
            minStock: 10, 
            price: 0, 
            usagePerShift: item.usagePerShift, 
            lastUpdated: new Date().toISOString(), 
            sortOrder: newInv.length 
          }));
        }
      });
      return newInv;
    });
    setSuccessNotification(`Data diimpor ke lokasi ${targetLoc.toUpperCase()}.`);
    setImportPreview(null);
    setIsImportModalOpen(false);
  };

  const handleLogout = () => { localStorage.removeItem('sm_auth_active'); setIsLoggedIn(false); setAuthPassword(''); };

  const handleOpenDetail = (item: any) => {
    const locationsStock = inventory.filter(i => i.productId === item.productId);
    const detail = { ...item, locations: locationsStock };
    setSelectedItem(detail);
    setIsDetailModalOpen(true);
  };

  const openQuickInput = (productId: string = '') => {
    const locMap: any = { 'gudang-utama': 'utama', 'gedung-singles': 'singles', 'gedung-nugget': 'nugget' };
    const currentLoc = locMap[activeTab] || 'utama';
    
    let type = 'MASUK_UTAMA';
    if (currentLoc === 'singles') type = 'SINGLES_KE_UTAMA'; 
    if (currentLoc === 'nugget') type = 'NUGGET_KE_UTAMA';

    setTransactionData({ 
      productId, 
      amount: 0, 
      type, 
      note: `Input Cepat via tab ${activeTab.replace('-', ' ').toUpperCase()}`, 
      shift: '1' 
    });
    setIsTransactionModalOpen(true);
  };

  const saveSettings = () => {
    CloudService.setSheetUrl(cloudUrl);
    localStorage.setItem('sm_store_name', storeName);
    setSuccessNotification("Konfigurasi sistem disimpan.");
  };

  const copyScriptCode = () => {
    navigator.clipboard.writeText(CloudService.getGoogleScriptCode());
    setSuccessNotification("Kode Apps Script disalin ke clipboard.");
  };

  if (!isLoggedIn) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex items-center justify-center p-6 text-slate-900 dark:text-white transition-colors duration-300">
        <div className="w-full max-md:p-6 max-w-md bg-white dark:bg-slate-800/50 backdrop-blur-xl border border-slate-200 dark:border-white/20 p-10 rounded-[2.5rem] shadow-2xl text-center transition-colors duration-300">
          <div className="w-20 h-20 bg-indigo-600 rounded-3xl mx-auto flex items-center justify-center mb-6 shadow-2xl shadow-indigo-600/30"><Lock size={40} className="text-white"/></div>
          <h1 className="text-3xl font-black mb-1 uppercase tracking-tighter dark:text-white">{storeName}</h1>
          <form onSubmit={(e) => { e.preventDefault(); if (authPassword === accessKey) { setIsLoggedIn(true); localStorage.setItem('sm_auth_active', 'true'); } else setAuthError(true); }} className="space-y-6 mt-6">
            <input type="password" required placeholder="PIN" value={authPassword} onChange={(e) => setAuthPassword(e.target.value)} className={`w-full bg-slate-100 dark:bg-slate-800/50 border ${authError ? 'border-red-500' : 'border-slate-200 dark:border-white/10'} rounded-2xl p-5 text-center text-xl focus:border-indigo-500 outline-none dark:text-white`} />
            <button type="submit" className="w-full py-5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-2xl font-black uppercase text-sm transition-all">Otorisasi</button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen flex flex-col md:flex-row bg-[#f8fafc] dark:bg-slate-900 text-[#1e293b] dark:text-slate-200 font-inter transition-colors duration-300 relative`}>
      {successNotification && <div className="fixed top-6 left-1/2 -translate-x-1/2 z-[300] bg-slate-900 dark:bg-slate-800 text-white px-6 py-4 rounded-2xl shadow-2xl flex items-center gap-3"><CheckCircle2 className="text-emerald-400" size={20} /> <span className="text-sm font-bold uppercase">{successNotification}</span></div>}
      {errorNotification && <div className="fixed top-6 left-1/2 -translate-x-1/2 z-[300] bg-red-600 text-white px-6 py-4 rounded-2xl shadow-2xl flex items-center gap-3"><AlertTriangle size={20} /> <span className="text-sm font-bold uppercase">{errorNotification}</span></div>}
      
      {/* Mobile Header */}
      <div className="md:hidden flex items-center justify-between p-4 bg-white dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800 sticky top-0 z-[150]">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-[#1e293b] dark:bg-indigo-600 rounded-lg flex items-center justify-center text-white"><Zap size={16} className="text-indigo-400 dark:text-white" /></div>
          <span className="text-sm font-black tracking-tighter uppercase dark:text-white">{storeName}</span>
        </div>
        <button onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} className="p-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-all">
          {isMobileMenuOpen ? <X size={24} /> : <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="4" x2="20" y1="12" y2="12"/><line x1="4" x2="20" y1="6" y2="6"/><line x1="4" x2="20" y1="18" y2="18"/></svg>}
        </button>
      </div>

      {/* Sidebar Overlay for Mobile */}
      {isMobileMenuOpen && (
        <div 
          className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-[180] md:hidden" 
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      <nav className={`
        fixed md:sticky top-0 left-0 h-screen z-[200] md:z-[100]
        bg-white dark:bg-slate-950 border-r border-slate-200 dark:border-slate-800 
        flex flex-col gap-1 shadow-sm overflow-y-auto transition-all duration-300 ease-in-out
        ${isSidebarOpen ? 'w-64' : 'w-20'}
        ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
      `}>
        <div className={`flex items-center gap-3 px-4 py-6 mb-4 border-b border-slate-50 dark:border-slate-800/50 ${!isSidebarOpen && 'justify-center'}`}>
          <div className="w-10 h-10 bg-[#1e293b] dark:bg-indigo-600 rounded-xl flex items-center justify-center text-white shrink-0"><Zap size={20} className="text-indigo-400 dark:text-white" /></div>
          {isSidebarOpen && <span className="text-lg font-black tracking-tighter uppercase dark:text-white truncate">{storeName}</span>}
        </div>

        <div className="flex-1 flex flex-col gap-1 px-3">
          <NavItem active={activeTab === 'dashboard'} onClick={() => { setActiveTab('dashboard'); setIsMobileMenuOpen(false); }} icon={<LayoutDashboard size={18}/>} label="Overview" collapsed={!isSidebarOpen} />
          <NavItem active={activeTab === 'master-produk'} onClick={() => { setActiveTab('master-produk'); setIsMobileMenuOpen(false); }} icon={<Layers size={18}/>} label="Master Barang" collapsed={!isSidebarOpen} />
          
          <div className={`px-4 mt-8 mb-2 text-[10px] font-black text-slate-400 uppercase tracking-widest ${!isSidebarOpen && 'text-center px-0'}`}>
            {isSidebarOpen ? 'Gudang' : '---'}
          </div>
          
          <NavItem active={activeTab === 'gudang-utama'} onClick={() => { setActiveTab('gudang-utama'); setIsMobileMenuOpen(false); }} icon={<Server size={18}/>} label="Utama (Central)" collapsed={!isSidebarOpen} />
          <NavItem active={activeTab === 'gedung-singles'} onClick={() => { setActiveTab('gedung-singles'); setIsMobileMenuOpen(false); }} icon={<Building2 size={18}/>} label="Singles" collapsed={!isSidebarOpen} />
          <NavItem active={activeTab === 'gedung-nugget'} onClick={() => { setActiveTab('gedung-nugget'); setIsMobileMenuOpen(false); }} icon={<Store size={18}/>} label="Nugget" collapsed={!isSidebarOpen} />
          
          <div className={`px-4 mt-8 mb-2 text-[10px] font-black text-slate-400 uppercase tracking-widest ${!isSidebarOpen && 'text-center px-0'}`}>
            {isSidebarOpen ? 'Analytics' : '---'}
          </div>
          
          <NavItem active={activeTab === 'kebutuhan-gedung'} onClick={() => { setActiveTab('kebutuhan-gedung'); setIsMobileMenuOpen(false); }} icon={<TrendingUp size={18}/>} label="Kebutuhan Gedung" collapsed={!isSidebarOpen} />
          <NavItem active={activeTab === 'pemusnahan'} onClick={() => { setActiveTab('pemusnahan'); setIsMobileMenuOpen(false); }} icon={<Flame size={18}/>} label="Pemusnahan" collapsed={!isSidebarOpen} />
          <NavItem active={activeTab === 'repair'} onClick={() => { setActiveTab('repair'); setIsMobileMenuOpen(false); }} icon={<Hammer size={18}/>} label="Repair Log" collapsed={!isSidebarOpen} />
          <NavItem active={activeTab === 'transaksi'} onClick={() => { setActiveTab('transaksi'); setIsMobileMenuOpen(false); }} icon={<History size={18}/>} label="History Log" collapsed={!isSidebarOpen} />
        </div>

        <div className="mt-auto p-3 border-t border-slate-100 dark:border-slate-800 space-y-1">
          <button 
            onClick={() => setIsDarkMode(!isDarkMode)} 
            className={`w-full flex items-center gap-4 px-5 py-3.5 rounded-2xl font-bold text-[11px] uppercase tracking-widest text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white transition-all duration-300 ${!isSidebarOpen && 'justify-center px-0'}`}
            title={isDarkMode ? 'Light Mode' : 'Dark Mode'}
          >
            {isDarkMode ? <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="4"/><path d="M12 2v2"/><path d="M12 20v2"/><path d="m4.93 4.93 1.41 1.41"/><path d="m17.66 17.66 1.41 1.41"/><path d="M2 12h2"/><path d="M20 12h2"/><path d="m6.34 17.66-1.41 1.41"/><path d="m19.07 4.93-1.41 1.41"/></svg> : <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"/></svg>}
            {isSidebarOpen && <span>{isDarkMode ? 'Light Mode' : 'Dark Mode'}</span>}
          </button>
          <NavItem active={activeTab === 'settings'} onClick={() => { setActiveTab('settings'); setIsMobileMenuOpen(false); }} icon={<SettingsIcon size={18}/>} label="Cloud Settings" collapsed={!isSidebarOpen} />
          <button onClick={handleLogout} className={`w-full flex items-center gap-3 px-4 py-3 text-red-500 font-bold text-sm hover:bg-red-50 dark:hover:bg-red-500/10 rounded-xl transition-all ${!isSidebarOpen && 'justify-center px-0'}`} title="Sign Out">
            <LogOut size={18}/> {isSidebarOpen && 'Sign Out'}
          </button>
          
          {/* Collapse Toggle Button (Desktop Only) */}
          <button 
            onClick={() => setIsSidebarOpen(!isSidebarOpen)} 
            className="hidden md:flex w-full items-center justify-center py-2 text-slate-300 hover:text-slate-500 transition-all mt-2"
          >
            {isSidebarOpen ? <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6"/></svg> : <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m9 18 6-6-6-6"/></svg>}
          </button>
        </div>
      </nav>

      <main className="flex-1 overflow-y-auto p-4 md:p-8 lg:p-10 w-full">
        <header className="flex flex-col lg:flex-row justify-between gap-6 mb-8 md:mb-10 items-start lg:items-center">
          <div>
            <h1 className="text-3xl md:text-4xl font-black text-[#1e293b] dark:text-white leading-tight">
              {activeTab === 'kebutuhan-gedung' ? 'Kebutuhan & Proyeksi Suplai' : 
               activeTab === 'settings' ? 'Konfigurasi Sistem' : 
               activeTab.replace('-', ' ').toUpperCase()}
            </h1>
            <p className="text-[10px] md:text-xs text-slate-400 dark:text-slate-500 font-bold uppercase mt-1 tracking-widest">Management System @ {storeName}</p>
          </div>
          <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto">
             <div className="relative flex-1 lg:min-w-[320px]">
               <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
               <input type="text" placeholder="Cari data..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-full pl-12 pr-4 py-3.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl outline-none focus:ring-4 focus:ring-indigo-500/5 shadow-sm transition-all text-sm dark:text-white" />
             </div>
             
             {(activeTab === 'master-produk' || activeTab === 'gudang-utama' || activeTab === 'gedung-singles' || activeTab === 'gedung-nugget') && (
               <>
                 <input type="file" ref={fileInputRef} onChange={handleXLSXUpload} accept=".xlsx, .xls" className="hidden" />
                 <button onClick={() => fileInputRef.current?.click()} className="px-6 py-3.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 rounded-2xl font-black text-xs uppercase flex items-center gap-2 shadow-sm hover:bg-slate-50 dark:hover:bg-slate-700 transition-all"><FileSpreadsheet size={16}/> Impor XLSX</button>
               </>
             )}

             {activeTab === 'master-produk' && (
               <button onClick={() => setIsAddProductModalOpen(true)} className="px-6 py-3.5 bg-indigo-600 text-white rounded-2xl font-black text-xs uppercase flex items-center gap-2 shadow-lg hover:bg-indigo-700 transition-all"><Plus size={18}/> Barang Baru</button>
             )}

             {(activeTab === 'gudang-utama' || activeTab === 'gedung-singles' || activeTab === 'gedung-nugget') && (
               <button onClick={() => openQuickInput()} className="px-6 py-3.5 bg-indigo-600 text-white rounded-2xl font-black text-xs uppercase flex items-center gap-2 shadow-lg hover:bg-indigo-700 transition-all"><History size={18}/> Tambah Transaksi</button>
             )}

             {activeTab !== 'settings' && (
               <button onClick={handleExportPDF} className="px-6 py-3.5 bg-[#eef2ff] dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 rounded-2xl hover:bg-indigo-100 dark:hover:bg-indigo-500/20 transition-all font-black text-xs uppercase flex items-center gap-2 border border-indigo-100 dark:border-indigo-500/20 shadow-sm"><Printer size={18}/> Cetak PDF</button>
             )}
          </div>
        </header>

        {activeTab === 'dashboard' ? (
          <div className="space-y-8 animate-in fade-in duration-500">
             <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                <SummaryCard title="Total SKU" value={masterProducts.length.toString()} color="bg-indigo-50 text-indigo-600" icon={<Layers size={24}/>} />
                <SummaryCard title="Transaksi Log" value={transactions.length.toString()} color="bg-blue-50 text-blue-600" icon={<History size={24}/>} />
                <SummaryCard title="Stok Kritis" value={inventory.filter(i => i.location === 'utama' && i.quantity <= i.minStock).length.toString()} color="bg-rose-50 text-rose-600" icon={<AlertTriangle size={24}/>} />
                <SummaryCard title="Cloud Sync" value={syncStatus === 'saved' ? 'OK' : 'Syncing'} color="bg-emerald-50 text-emerald-600" icon={<CloudSync size={24}/>} />
             </div>
             <div className="bg-white dark:bg-slate-950 p-6 md:p-10 rounded-[2rem] md:rounded-[3rem] border border-slate-200 dark:border-slate-800 shadow-sm relative overflow-hidden">
                <h2 className="text-xl md:text-2xl font-black uppercase tracking-tight mb-8 dark:text-white">Status Integritas Node</h2>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4 md:gap-6">
                  {['utama', 'singles', 'nugget', 'repair', 'lain'].map(loc => (
                    <div key={loc} className="p-8 border border-slate-100 dark:border-slate-800 rounded-[2rem] bg-slate-50/50 dark:bg-slate-900/50 hover:bg-white dark:hover:bg-indigo-600/10 hover:shadow-xl transition-all group">
                       <p className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-2">{loc === 'lain' ? 'PEMUSNAHAN' : loc.toUpperCase()}</p>
                       <p className="text-4xl font-black group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors leading-none mb-1 dark:text-white">{inventory.filter(i => i.location === loc).reduce((a, c) => a + c.quantity, 0).toLocaleString()}</p>
                       <p className="text-[10px] text-slate-400 dark:text-slate-500 font-bold uppercase">Unit Aktif</p>
                    </div>
                  ))}
                </div>
             </div>
          </div>
        ) : activeTab === 'kebutuhan-gedung' ? (
          <div className="space-y-8 animate-in fade-in duration-500">
             <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                <div className="bg-white dark:bg-slate-950 p-6 md:p-8 rounded-[2rem] md:rounded-[2.5rem] border border-slate-200 dark:border-slate-800 shadow-sm flex items-center gap-6">
                   <div className="w-12 h-12 md:w-16 md:h-16 bg-indigo-50 dark:bg-indigo-500/10 rounded-2xl flex items-center justify-center text-indigo-600 dark:text-indigo-400">
                      <Combine size={28} />
                   </div>
                   <div>
                      <p className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-1">Total Unit Dibutuhkan</p>
                      <p className="text-2xl md:text-3xl font-black dark:text-white">{filteredData.reduce((a: any, c: any) => a + c.totalStockNeeded, 0).toLocaleString()}</p>
                   </div>
                </div>
                <div className="bg-white dark:bg-slate-950 p-6 md:p-8 rounded-[2rem] md:rounded-[2.5rem] border border-slate-200 dark:border-slate-800 shadow-sm flex items-center gap-6">
                   <div className="w-12 h-12 md:w-16 md:h-16 bg-emerald-50 dark:bg-emerald-500/10 rounded-2xl flex items-center justify-center text-emerald-600 dark:text-emerald-400">
                      <Zap size={28} />
                   </div>
                   <div>
                      <p className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-1">Total Proyeksi Pakai</p>
                      <p className="text-2xl md:text-3xl font-black dark:text-white">{filteredData.reduce((a: any, c: any) => a + c.targetUsage, 0).toLocaleString()}</p>
                   </div>
                </div>
                <div className="bg-white dark:bg-slate-950 p-6 md:p-8 rounded-[2rem] md:rounded-[2.5rem] border border-slate-200 dark:border-slate-800 shadow-sm flex items-center gap-6">
                   <div className="w-12 h-12 md:w-16 md:h-16 bg-rose-50 dark:bg-rose-500/10 rounded-2xl flex items-center justify-center text-rose-600 dark:text-rose-400">
                      <AlertTriangle size={28} />
                   </div>
                   <div>
                      <p className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-1">Barang Kurang Stok</p>
                      <p className="text-2xl md:text-3xl font-black dark:text-white">{filteredData.filter((i: any) => i.totalStockNeeded > 0).length}</p>
                   </div>
                </div>
             </div>

             <div className="bg-white dark:bg-slate-950 p-4 md:p-6 rounded-[2rem] md:rounded-[2.5rem] border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col lg:flex-row items-center justify-between gap-6">
                <div className="flex items-center bg-slate-100 dark:bg-slate-900 p-1.5 rounded-3xl w-full lg:w-auto overflow-x-auto no-scrollbar">
                  <button onClick={() => setKebutuhanSubTab('gabungan')} className={`flex-shrink-0 flex items-center justify-center gap-2 px-8 py-3.5 rounded-2xl text-[10px] font-black uppercase transition-all ${kebutuhanSubTab === 'gabungan' ? 'bg-[#6366f1] text-white shadow-xl shadow-indigo-600/20' : 'text-slate-400 dark:text-slate-500 hover:text-slate-900 dark:hover:text-white'}`}><Combine size={16}/> Gabungan</button>
                  <button onClick={() => setKebutuhanSubTab('singles')} className={`flex-shrink-0 flex items-center justify-center gap-2 px-8 py-3.5 rounded-2xl text-[10px] font-black uppercase transition-all ${kebutuhanSubTab === 'singles' ? 'bg-[#6366f1] text-white shadow-xl shadow-indigo-600/20' : 'text-slate-400 dark:text-slate-500 hover:text-slate-900 dark:hover:text-white'}`}>Gedung Singles</button>
                  <button onClick={() => setKebutuhanSubTab('nugget')} className={`flex-shrink-0 flex items-center justify-center gap-2 px-8 py-3.5 rounded-2xl text-[10px] font-black uppercase transition-all ${kebutuhanSubTab === 'nugget' ? 'bg-[#6366f1] text-white shadow-xl shadow-indigo-600/20' : 'text-slate-400 dark:text-slate-500 hover:text-slate-900 dark:hover:text-white'}`}>Gedung Nugget</button>
                </div>
                <div className="flex items-center gap-4">
                  <span className="text-[10px] font-black uppercase text-slate-400 dark:text-slate-500 tracking-widest">PROYEKSI:</span>
                  <div className="flex items-center bg-slate-100 dark:bg-slate-900 p-1 rounded-2xl">
                    <button onClick={() => setForecastPeriod('1day')} className={`px-5 py-2 rounded-xl text-[9px] font-black uppercase transition-all ${forecastPeriod === '1day' ? 'bg-[#0f172a] dark:bg-indigo-600 text-white shadow-lg' : 'text-slate-400 dark:text-slate-500'}`}>1 Hari</button>
                    <button onClick={() => setForecastPeriod('1week')} className={`px-5 py-2 rounded-xl text-[9px] font-black uppercase transition-all ${forecastPeriod === '1week' ? 'bg-[#0f172a] dark:bg-indigo-600 text-white shadow-lg' : 'text-slate-400 dark:text-slate-500'}`}>1 Minggu</button>
                    <button onClick={() => setForecastPeriod('2weeks')} className={`px-5 py-2 rounded-xl text-[9px] font-black uppercase transition-all ${forecastPeriod === '2weeks' ? 'bg-[#0f172a] dark:bg-indigo-600 text-white shadow-lg' : 'text-slate-400 dark:text-slate-500'}`}>2 Minggu</button>
                    <button onClick={() => setForecastPeriod('3weeks')} className={`px-5 py-2 rounded-xl text-[9px] font-black uppercase transition-all ${forecastPeriod === '3weeks' ? 'bg-[#0f172a] dark:bg-indigo-600 text-white shadow-lg' : 'text-slate-400 dark:text-slate-500'}`}>3 Minggu</button>
                    <button onClick={() => setForecastPeriod('1month')} className={`px-5 py-2 rounded-xl text-[9px] font-black uppercase transition-all ${forecastPeriod === '1month' ? 'bg-[#0f172a] dark:bg-indigo-600 text-white shadow-lg' : 'text-slate-400 dark:text-slate-500'}`}>1 Bulan</button>
                  </div>
                </div>
             </div>
             <div className="bg-white dark:bg-slate-950 rounded-[2.5rem] border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden overflow-x-auto">
                <table className="w-full text-left min-w-[800px]">
                  <thead className="bg-[#f8fafc] dark:bg-slate-900 border-b dark:border-slate-800">
                    <tr>
                      <th className="px-10 py-6 text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500">Barang</th>
                      <th className="px-6 py-6 text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500 text-center">Stok Lokasi</th>
                      <th className="px-6 py-6 text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500 text-center">Stok Utama</th>
                      <th className="px-6 py-6 text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500 text-center">Stok Minim</th>
                      <th className="px-6 py-6 text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500 text-center">Butuh</th>
                      <th className="px-6 py-6 text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500 text-center">Sisa Hari</th>
                      <th className="px-6 py-6 text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500 text-center">Status</th>
                      <th className="px-10 py-6 text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500 text-right">Opsi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y dark:divide-slate-800">
                    {filteredData.map((p: any) => (
                      <tr key={p.productId} className="hover:bg-slate-50/50 dark:hover:bg-slate-900/50 transition-colors group">
                        <td className="px-10 py-7">
                          <div className="flex flex-col"><span className="font-black text-[#1e293b] dark:text-white uppercase tracking-tighter text-base mb-1">{p.name}</span><span className="text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">SKU: {p.productId} | {p.size} | {p.unit}</span></div>
                        </td>
                         <td className="px-6 py-7 text-center">
                           <div className="flex flex-col items-center gap-2">
                              {kebutuhanSubTab === 'gabungan' ? (
                                <span className="text-xl font-black dark:text-white">{p.stockAtLocation.toLocaleString()}</span>
                              ) : (
                                <input type="number" min="0" value={p.stockAtLocation} onChange={(e) => handleUpdateStock(p.productId, kebutuhanSubTab as any, Math.max(0, parseInt(e.target.value) || 0))} className="w-16 p-2 bg-[#f1f5f9] dark:bg-slate-800 border dark:border-slate-700 rounded-xl text-center font-black outline-none dark:text-white" />
                              )}
                           </div>
                         </td>
                        <td className="px-6 py-7 text-center"><span className={`text-xl font-black ${p.pusatQty < p.totalStockNeeded ? 'text-[#f59e0b]' : 'text-slate-900 dark:text-white'}`}>{p.pusatQty.toLocaleString()}</span></td>
                        <td className="px-6 py-7 text-center"><span className="text-xl font-black text-rose-500 dark:text-rose-400">{p.minStock.toLocaleString()}</span></td>
                        <td className="px-6 py-7 text-center"><span className="text-xl font-black text-indigo-600 dark:text-indigo-400">{p.totalStockNeeded.toLocaleString()}</span></td>
                        <td className="px-6 py-7 text-center">
                           <div className="flex flex-col items-center">
                              <span className={`text-xl font-black ${p.daysLeftValue < 3 ? 'text-rose-600' : p.daysLeftValue < 7 ? 'text-amber-500' : 'text-slate-900 dark:text-white'}`}>
                                {p.daysLeftValue >= 999 ? '∞' : Math.floor(p.daysLeftValue)}
                              </span>
                              <span className="text-[8px] font-bold text-slate-400 uppercase tracking-widest">Hari</span>
                           </div>
                        </td>
                        <td className="px-6 py-7 text-center">
                          <span className={`px-4 py-1.5 rounded-xl text-[9px] font-black uppercase border ${
                            p.supplyStatus === 'aman' ? 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-100 dark:border-emerald-500/20' : 
                            p.supplyStatus === 'order' ? 'bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-100 dark:border-amber-500/20' :
                            'bg-rose-50 dark:bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-100 dark:border-rose-500/20'
                          }`}>
                            {p.supplyStatus === 'order' ? 'HARUS ORDER' : p.supplyStatus.toUpperCase()}
                          </span>
                        </td>
                        <td className="px-10 py-7 text-right"><button onClick={() => handleOpenDetail(p)} className="p-2 text-slate-300 dark:text-slate-600 hover:text-indigo-600 dark:hover:text-indigo-400 border dark:border-slate-700 rounded-full transition-all shadow-sm"><Info size={18}/></button></td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="bg-slate-50 dark:bg-slate-900/50 border-t dark:border-slate-800">
                    <tr>
                      <td className="px-10 py-6 font-black text-[10px] uppercase tracking-widest text-slate-400 dark:text-slate-500">TOTAL PENJUMLAHAN</td>
                      <td className="px-6 py-6 text-center font-black text-slate-900 dark:text-white">{filteredData.reduce((a: any, c: any) => a + c.stockAtLocation, 0).toLocaleString()}</td>
                      <td className="px-6 py-6 text-center font-black text-slate-900 dark:text-white">{filteredData.reduce((a: any, c: any) => a + c.pusatQty, 0).toLocaleString()}</td>
                      <td className="px-6 py-6 text-center font-black text-rose-500 dark:text-rose-400">{filteredData.reduce((a: any, c: any) => a + c.minStock, 0).toLocaleString()}</td>
                      <td className="px-6 py-6 text-center font-black text-indigo-600 dark:text-indigo-400 text-xl">{filteredData.reduce((a: any, c: any) => a + c.totalStockNeeded, 0).toLocaleString()}</td>
                      <td className="px-6 py-6 text-center font-black text-slate-900 dark:text-white">-</td>
                      <td colSpan={2}></td>
                    </tr>
                  </tfoot>
                </table>
             </div>
          </div>
        ) : activeTab === 'settings' ? (
          <div className="max-w-4xl space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
             <div className="bg-white dark:bg-slate-950 p-10 rounded-[3rem] border border-slate-200 dark:border-slate-800 shadow-sm space-y-10">
                <section className="space-y-6">
                  <div className="flex items-center gap-4">
                    <div className="p-4 bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 rounded-2xl"><Zap size={24}/></div>
                    <div><h3 className="text-xl font-black uppercase tracking-tight dark:text-white">Personalization</h3><p className="text-xs text-slate-400 dark:text-slate-500 font-bold uppercase tracking-widest">Identitas Aplikasi & Node Utama</p></div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase mb-2 tracking-widest">Nama Store / Toko</label>
                      <input type="text" value={storeName} onChange={(e) => setStoreName(e.target.value)} className="w-full p-4 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl font-black uppercase outline-none focus:ring-4 focus:ring-indigo-500/10 transition-all dark:text-white" />
                    </div>
                  </div>
                </section>

                <div className="h-px bg-slate-100 dark:bg-slate-800"></div>

                <section className="space-y-6">
                  <div className="flex items-center gap-4">
                    <div className="p-4 bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded-2xl"><Globe size={24}/></div>
                    <div><h3 className="text-xl font-black uppercase tracking-tight dark:text-white">Cloud Infrastructure</h3><p className="text-xs text-slate-400 dark:text-slate-500 font-bold uppercase tracking-widest">Sinkronisasi Database Google Sheets</p></div>
                  </div>
                  <div className="space-y-4">
                    <label className="block text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Google Apps Script Web App URL</label>
                    <div className="flex gap-2">
                      <input type="text" value={cloudUrl} onChange={(e) => setCloudUrl(e.target.value)} placeholder="https://script.google.com/macros/s/..." className="flex-1 p-4 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl font-bold text-sm outline-none focus:ring-4 focus:ring-indigo-500/10 transition-all dark:text-white" />
                      <button onClick={saveSettings} className="px-8 py-4 bg-indigo-600 text-white rounded-2xl font-black uppercase text-xs shadow-xl shadow-indigo-600/20 hover:scale-[1.02] active:scale-95 transition-all flex items-center gap-2"><Save size={18}/> Simpan</button>
                    </div>
                  </div>
                  <div className="p-6 bg-slate-900 dark:bg-black rounded-[2rem] space-y-4">
                    <div className="flex items-center justify-between text-white">
                      <span className="text-[10px] font-black uppercase tracking-widest opacity-60">Source Code: Apps Script (Backend)</span>
                      <button onClick={copyScriptCode} className="flex items-center gap-2 text-[10px] font-black uppercase bg-white/10 px-4 py-2 rounded-xl hover:bg-white/20 transition-all"><Copy size={14}/> Salin Kode</button>
                    </div>
                    <textarea readOnly value={CloudService.getGoogleScriptCode()} className="w-full h-48 bg-transparent text-indigo-400 font-mono text-xs border border-white/5 p-4 rounded-xl outline-none resize-none scrollbar-hide opacity-80" />
                    <div className="flex items-center gap-2 text-[9px] font-bold text-slate-500 uppercase tracking-widest"><Info size={12}/> Tempelkan kode ini di Google Apps Script dan deploy sebagai Web App (Akses: Anyone)</div>
                  </div>
                </section>
             </div>
          </div>
        ) : (
          <div className="bg-white dark:bg-slate-950 rounded-[2.5rem] border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden animate-in fade-in duration-500 overflow-x-auto">
             <table className="w-full text-left min-w-[900px]">
                <thead className="bg-[#f8fafc] dark:bg-slate-900 border-b dark:border-slate-800">
                 <tr>
                   <th className="px-8 py-6 text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">{activeTab === 'transaksi' ? 'Audit Waktu' : 'Nama Barang'}</th>
                   {activeTab !== 'transaksi' && (
                     <>
                       <th className="px-6 py-6 text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest text-center">Size</th>
                       <th className="px-6 py-6 text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest text-center">Satuan</th>
                       <th className="px-6 py-6 text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest text-center">Status</th>
                     </>
                   )}
                   <th className="px-8 py-6 text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest text-center">{activeTab === 'transaksi' ? 'Tipe' : 'Jumlah'}</th>
                   {activeTab === 'transaksi' && (
                     <th className="px-8 py-6 text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Keterangan</th>
                   )}
                   {activeTab !== 'transaksi' && (
                    <th className="px-8 py-6 text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest text-center">Kelayakan</th>
                   )}
                   <th className="px-8 py-6 text-[10px] font-black uppercase text-slate-400 dark:text-slate-500 tracking-widest text-right">Aksi</th>
                 </tr>
               </thead>
               <tbody className="divide-y divide-slate-50 dark:divide-slate-800">
                 {filteredData.map((item: any) => (
                   <tr key={item.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-900/50 transition-all group">
                     <td className="px-8 py-6">
                       <div className="flex flex-col">
                         <span className="font-bold text-[#1e293b] dark:text-white uppercase tracking-tighter text-base leading-none mb-1">{item.name || item.productName}</span>
                         <span className="text-[10px] font-black text-indigo-500 dark:text-indigo-400 uppercase tracking-widest">{activeTab === 'transaksi' ? new Date(item.timestamp).toLocaleString() : item.productId}</span>
                       </div>
                     </td>
                     {activeTab !== 'transaksi' && (
                       <>
                         <td className="px-6 py-6 text-center text-sm font-black uppercase text-slate-600 dark:text-slate-400">{item.size}</td>
                         <td className="px-6 py-6 text-center text-sm font-black uppercase text-slate-600 dark:text-slate-400">{item.unit}</td>
                         <td className="px-6 py-6 text-center">
                            <span className={`px-3 py-1 rounded-lg text-[9px] font-black uppercase border tracking-tighter ${item.status === 'reusable' ? 'bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-100 dark:border-indigo-500/20' : 'bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-100 dark:border-slate-700'}`}>{item.status === 'reusable' ? 'Berulang' : 'Sekali Pakai'}</span>
                         </td>
                       </>
                     )}
                     <td className="px-8 py-6 text-center">
                        {activeTab === 'transaksi' ? (
                          <span className="px-4 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 text-[9px] font-black uppercase tracking-widest">{item.type}</span>
                        ) : (
                          <div className="flex flex-col items-center">
                            <span className="text-2xl font-black text-[#1e293b] dark:text-white tracking-tighter">
                              {(activeTab === 'master-produk' 
                                ? inventory.filter(node => node.productId === item.productId && node.location !== 'lain').reduce((a,c) => a + c.quantity, 0)
                                : item.quantity).toLocaleString()}
                            </span>
                          </div>
                        )}
                     </td>
                     {activeTab === 'transaksi' && (
                       <td className="px-8 py-6">
                         <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-tight">{item.note || '-'}</span>
                       </td>
                     )}
                     {activeTab !== 'transaksi' && (
                       <td className="px-8 py-6 text-center">
                          {activeTab === 'pemusnahan' || item.location === 'lain' ? (
                             <span className="px-4 py-1.5 rounded-xl bg-rose-50 dark:bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-100 dark:border-rose-500/20 text-[10px] font-black uppercase tracking-widest">TIDAK LAYAK</span>
                          ) : activeTab === 'repair' || item.location === 'repair' ? (
                             <span className="px-4 py-1.5 rounded-xl bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-100 dark:border-amber-500/20 text-[10px] font-black uppercase tracking-widest">REPAIR</span>
                          ) : (
                             <span className="px-4 py-1.5 rounded-xl bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-500/20 text-[10px] font-black uppercase tracking-widest">LAYAK</span>
                          )}
                       </td>
                     )}
                     <td className="px-8 py-6 text-right">
                        <div className="flex justify-end gap-2">
                           {activeTab === 'master-produk' ? (
                             <>
                               <button onClick={() => handleOpenDetail(item)} className="p-2 text-slate-300 dark:text-slate-600 hover:text-emerald-600 dark:hover:text-emerald-400 border dark:border-slate-700 rounded-full shadow-sm hover:bg-white dark:hover:bg-slate-800 transition-all" title="Detail Lengkap"><Eye size={16}/></button>
                               <button onClick={() => { setEditingProduct({...item}); setIsEditProductModalOpen(true); }} className="p-2 text-slate-300 dark:text-slate-600 hover:text-indigo-600 dark:hover:text-indigo-400 border dark:border-slate-700 rounded-full shadow-sm hover:bg-white dark:hover:bg-slate-800 transition-all"><Edit2 size={16}/></button>
                               <button onClick={() => handleDeleteProduct(item.productId)} className="p-2 text-slate-300 dark:text-slate-600 hover:text-rose-600 dark:hover:text-rose-400 border dark:border-slate-700 rounded-full shadow-sm hover:bg-white dark:hover:bg-slate-800 transition-all"><Trash2 size={16}/></button>
                             </>
                           ) : activeTab === 'pemusnahan' ? (
                             <>
                               <button onClick={() => handleRestorePemusnahan(item)} className="p-2 text-blue-500 hover:text-blue-600 border border-blue-100 dark:border-blue-900 bg-blue-50/30 dark:bg-blue-500/10 rounded-full shadow-sm hover:bg-blue-50 dark:hover:bg-blue-500/20 transition-all" title="Pulihkan ke Utama"><RotateCcw size={16}/></button>
                               <button onClick={() => handleExecutePemusnahan(item)} className="p-2 text-red-600 hover:text-red-700 border border-red-100 dark:border-red-900 bg-red-50/30 dark:bg-red-500/10 rounded-full shadow-sm hover:bg-red-50 dark:hover:bg-red-500/20 transition-all" title="Musnahkan Fisik"><Flame size={16}/></button>
                               <button onClick={() => handleOpenDetail(item)} className="p-2 text-slate-300 dark:text-slate-600 hover:text-indigo-600 dark:hover:text-indigo-400 border dark:border-slate-700 rounded-full shadow-sm hover:bg-white dark:hover:bg-slate-800 transition-all"><Eye size={16}/></button>
                             </>
                           ) : activeTab === 'repair' ? (
                             <>
                               <button onClick={() => handleFinishRepair(item)} className="p-2 text-emerald-500 hover:text-emerald-600 border border-emerald-100 dark:border-emerald-900 bg-emerald-50/30 dark:bg-emerald-500/10 rounded-full shadow-sm hover:bg-emerald-50 dark:hover:bg-emerald-500/20 transition-all" title="Perbaikan Selesai"><CheckSquare size={16}/></button>
                               <button onClick={() => handleOpenDetail(item)} className="p-2 text-slate-300 dark:text-slate-600 hover:text-indigo-600 dark:hover:text-indigo-400 border dark:border-slate-700 rounded-full shadow-sm hover:bg-white dark:hover:bg-slate-800 transition-all"><Eye size={16}/></button>
                             </>
                           ) : activeTab.includes('gudang') || activeTab.includes('gedung') ? (
                             <>
                               <button onClick={() => openQuickInput(item.productId)} className="p-2 text-indigo-500 hover:text-indigo-600 border border-indigo-100 dark:border-indigo-900 bg-indigo-50/30 dark:bg-indigo-500/10 rounded-full shadow-sm hover:bg-indigo-50 dark:hover:bg-indigo-500/20 transition-all" title="Input Transaksi"><History size={16}/></button>
                               {item.location !== 'lain' && (
                                 <button onClick={() => handleMarkUnfit(item)} className="p-2 text-amber-500 hover:text-amber-600 border border-amber-100 dark:border-amber-900 bg-amber-50/30 dark:bg-amber-500/10 rounded-full shadow-sm hover:bg-amber-50 dark:hover:bg-amber-500/20 transition-all" title="Tandai Tidak Layak"><ThumbsDown size={16}/></button>
                               )}
                               <button onClick={() => handleOpenDetail(item)} className="p-2 text-slate-300 dark:text-slate-600 hover:text-indigo-600 dark:hover:text-indigo-400 border dark:border-slate-700 rounded-full shadow-sm hover:bg-white dark:hover:bg-slate-800 transition-all"><Eye size={18}/></button>
                             </>
                           ) : <button onClick={() => handleOpenDetail(item)} className="p-2 text-slate-300 dark:text-slate-600 hover:text-indigo-600 dark:hover:text-indigo-400 border dark:border-slate-700 rounded-full shadow-sm hover:bg-white dark:hover:bg-slate-800 transition-all"><Eye size={18}/></button>}
                        </div>
                     </td>
                   </tr>
                 ))}
               </tbody>
             </table>
          </div>
        )}
      </main>

      {/* Floating Action Buttons */}
      <div className="fixed bottom-8 right-8 flex flex-col gap-4 z-[100]">
        <button 
          onClick={() => setIsTransactionModalOpen(true)} 
          className="w-16 h-16 bg-[#1e293b] text-white rounded-2xl shadow-2xl flex items-center justify-center hover:scale-105 active:scale-95 transition-all group"
          title="Tambah Transaksi"
        >
          <PlusSquare size={28} className="group-hover:rotate-90 transition-all duration-300"/>
        </button>
      </div>

      {/* MODAL LAINNYA TETAP SAMA */}
      {isImportModalOpen && importPreview && (
        <div className="fixed inset-0 z-[250] bg-slate-900/80 backdrop-blur-md flex items-center justify-center p-6">
          <div className="bg-white dark:bg-slate-950 w-full max-w-5xl rounded-[3rem] shadow-2xl overflow-hidden flex flex-col max-h-[90vh] border dark:border-slate-800">
             <div className="p-8 border-b dark:border-slate-800 flex justify-between items-center bg-slate-50 dark:bg-slate-900">
                <h2 className="text-2xl font-black uppercase tracking-tighter dark:text-white">Smart Confirmation: Impor Data ({importPreview.length} item)</h2>
                <button onClick={() => setIsImportModalOpen(false)} className="p-2.5 hover:bg-white dark:hover:bg-slate-800 rounded-xl shadow-sm dark:text-white"><X size={24}/></button>
             </div>
             <div className="flex-1 overflow-y-auto p-4">
                <table className="w-full text-left min-w-[800px]">
                  <thead className="sticky top-0 bg-white dark:bg-slate-950 border-b dark:border-slate-800 shadow-sm z-10">
                    <tr>
                      <th className="p-4 text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500">Nama Barang</th>
                      <th className="p-4 text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500 text-center">Size</th>
                      <th className="p-4 text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500 text-center">Satuan</th>
                      <th className="p-4 text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500 text-center">Status</th>
                      <th className="p-4 text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500 text-center">Jumlah</th>
                      <th className="p-4 text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500 text-center">Kelayakan</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {importPreview.map((item, idx) => (
                      <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-slate-900 transition-colors">
                        <td className="p-4">
                          <div className="flex flex-col">
                            <span className="text-sm font-bold uppercase dark:text-white">{item.name}</span>
                            <span className="text-[10px] text-slate-400 dark:text-slate-500 font-mono">{item.productId}</span>
                          </div>
                        </td>
                        <td className="p-4 text-sm font-black text-center uppercase text-slate-600 dark:text-slate-400">{item.size}</td>
                        <td className="p-4 text-sm font-black text-center uppercase text-slate-600 dark:text-slate-400">{item.unit}</td>
                        <td className="p-4 text-center">
                          <span className={`px-3 py-1 rounded-lg text-[9px] font-black uppercase border ${item.status === 'reusable' ? 'bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-100 dark:border-indigo-500/20' : 'bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-100 dark:border-slate-700'}`}>
                            {item.status === 'reusable' ? 'Berulang' : 'Sekali Pakai'}
                          </span>
                        </td>
                        <td className="p-4 text-sm font-black text-center text-slate-900 dark:text-white">{item.quantity.toLocaleString()}</td>
                        <td className="p-4 text-center">
                          <span className="px-3 py-1 rounded-lg bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-500/20 text-[9px] font-black uppercase">LAYAK</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
             </div>
             <div className="p-10 border-t dark:border-slate-800 bg-slate-50 dark:bg-slate-900 flex flex-col md:flex-row gap-4 items-center">
               <div className="flex-1 w-full">
                 <p className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase mb-2">Target Lokasi Impor:</p>
                 <div className="p-3 bg-indigo-600 text-white rounded-2xl inline-flex items-center gap-3">
                   <Server size={18}/>
                   <span className="font-black uppercase tracking-tighter">
                     {activeTab.replace('-', ' ').toUpperCase()}
                   </span>
                 </div>
               </div>
               <div className="flex gap-4 items-end w-full md:w-auto">
                 <button onClick={() => setIsImportModalOpen(false)} className="flex-1 md:flex-none px-10 py-4 border-2 dark:border-slate-700 rounded-2xl font-black uppercase text-xs hover:bg-white dark:hover:bg-slate-800 dark:text-white transition-all">Batalkan</button>
                 <button onClick={confirmImport} className="flex-1 md:flex-none px-10 py-4 bg-indigo-600 text-white rounded-2xl font-black uppercase text-xs shadow-xl shadow-indigo-600/20 hover:bg-indigo-500 transition-all">Konfirmasi Smart Impor</button>
               </div>
             </div>
          </div>
        </div>
      )}

      {isDetailModalOpen && selectedItem && (
        <div className="fixed inset-0 z-[300] bg-slate-900/60 backdrop-blur-md flex items-center justify-center p-6">
          <div className="bg-white dark:bg-slate-950 w-full max-w-2xl rounded-[3rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 border border-slate-100 dark:border-slate-800">
             <div className="p-10 border-b dark:border-slate-800 flex justify-between items-center bg-slate-50/50 dark:bg-slate-900/50">
                <div className="flex items-center gap-4">
                  <div className="p-4 bg-indigo-600 text-white rounded-3xl shadow-xl shadow-indigo-600/20"><Package size={32}/></div>
                  <div>
                    <h2 className="text-3xl font-black uppercase tracking-tighter leading-none dark:text-white">{selectedItem.name}</h2>
                    <p className="text-xs text-slate-400 dark:text-slate-500 font-bold uppercase mt-1 tracking-widest">SKU: {selectedItem.productId}</p>
                  </div>
                </div>
                <button onClick={() => setIsDetailModalOpen(false)} className="p-3 hover:bg-white dark:hover:bg-slate-800 border dark:border-slate-700 rounded-2xl shadow-sm transition-all dark:text-white"><X size={24}/></button>
             </div>
             
             <div className="p-10 grid grid-cols-2 gap-8 bg-white dark:bg-slate-950">
                <div className="space-y-6">
                  <div>
                    <p className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-1">Ukuran Barang</p>
                    <p className="text-xl font-black uppercase dark:text-white">{selectedItem.size || '-'}</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-1">Satuan Dasar</p>
                    <p className="text-xl font-black uppercase dark:text-white">{selectedItem.unit || '-'}</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-1">Status Pemakaian</p>
                    <span className={`px-4 py-2 rounded-xl text-xs font-black uppercase border inline-block mt-1 ${selectedItem.status === 'reusable' ? 'bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-100 dark:border-indigo-500/20' : 'bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-100 dark:border-slate-700'}`}>
                      {selectedItem.status === 'reusable' ? 'Berulang Kali' : 'Sekali Pakai'}
                    </span>
                  </div>
                </div>
                <div className="space-y-6">
                  <div>
                    <p className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-1">Status Kelayakan Global</p>
                    <div className="flex flex-col gap-2 mt-2">
                       <div className="flex items-center justify-between p-3 bg-emerald-50 dark:bg-emerald-500/10 rounded-2xl border border-emerald-100 dark:border-emerald-500/20">
                          <span className="text-[10px] font-black text-emerald-600 dark:text-emerald-400 uppercase">UNIT LAYAK</span>
                          <span className="font-black text-emerald-700 dark:text-emerald-300">{inventory.filter(i => i.productId === selectedItem.productId && i.location !== 'lain').reduce((a,c) => a+c.quantity, 0).toLocaleString()}</span>
                       </div>
                       <div className="flex items-center justify-between p-3 bg-rose-50 dark:bg-rose-500/10 rounded-2xl border border-rose-100 dark:border-rose-500/20">
                          <span className="text-[10px] font-black text-rose-600 dark:text-rose-400 uppercase">UNIT TIDAK LAYAK</span>
                          <span className="font-black text-rose-700 dark:text-rose-300">{inventory.filter(i => i.productId === selectedItem.productId && i.location === 'lain').reduce((a,c) => a+c.quantity, 0).toLocaleString()}</span>
                       </div>
                    </div>
                  </div>
                </div>
             </div>

             <div className="p-6 md:p-10 border-t dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
                <p className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-4 flex items-center gap-2 dark:text-slate-300"><ClipboardList size={14}/> Distribusi Stok Terkini</p>
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                   {['utama', 'singles', 'nugget', 'repair', 'lain'].map(loc => {
                     const qty = inventory.find(i => i.productId === selectedItem.productId && i.location === loc)?.quantity || 0;
                     return (
                       <div key={loc} className="bg-white dark:bg-slate-900 p-3 md:p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm text-center">
                          <p className="text-[8px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-tighter mb-1">{loc === 'lain' ? 'MUSAH' : loc.toUpperCase()}</p>
                          <p className="text-base md:text-lg font-black dark:text-white">{qty.toLocaleString()}</p>
                       </div>
                     );
                   })}
                </div>
             </div>

             <div className="p-6 md:p-10 bg-white dark:bg-slate-950 border-t dark:border-slate-800 flex flex-col sm:flex-row gap-4">
                <button onClick={() => { setIsDetailModalOpen(false); setEditingProduct(selectedItem); setIsEditProductModalOpen(true); }} className="flex-1 py-4 bg-indigo-600 text-white rounded-2xl font-black uppercase text-xs shadow-xl shadow-indigo-600/20">Edit Produk</button>
                <button onClick={() => setIsDetailModalOpen(false)} className="flex-1 py-4 bg-slate-900 dark:bg-slate-800 text-white rounded-2xl font-black uppercase text-xs">Tutup Detail</button>
             </div>
          </div>
        </div>
      )}

      {isTransactionModalOpen && (
        <div className="fixed inset-0 z-[200] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-6">
          <div className="bg-white dark:bg-slate-950 w-full max-w-lg rounded-[2rem] md:rounded-[2.5rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 border dark:border-slate-800 mx-4">
             <div className="p-6 md:p-8 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50 dark:bg-slate-900">
                <h2 className="text-xl md:text-2xl font-black uppercase tracking-tighter dark:text-white">Transaction Entry</h2>
                <button onClick={() => setIsTransactionModalOpen(false)} className="p-2.5 hover:bg-white dark:hover:bg-slate-800 rounded-xl shadow-sm dark:text-white"><X size={24}/></button>
             </div>
             <form onSubmit={handleProcessTransaction} className="p-6 md:p-8 space-y-6">
                <div>
                  <label className="block text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase mb-3">Tipe Log</label>
                  <select required value={transactionData.type} onChange={(e) => setTransactionData({...transactionData, type: e.target.value})} className="w-full p-4 bg-slate-50 dark:bg-slate-900 border dark:border-slate-800 rounded-2xl font-bold uppercase outline-none text-sm dark:text-white">
                    {filteredTransactionTypes.map(t => <option key={t.id} value={t.id}>{t.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase mb-3">Entitas Barang</label>
                  <select required value={transactionData.productId} onChange={(e) => setTransactionData({...transactionData, productId: e.target.value})} className="w-full p-4 bg-slate-50 dark:bg-slate-900 border dark:border-slate-800 rounded-2xl font-bold uppercase outline-none text-sm dark:text-white">
                    <option value="">Pilih Barang...</option>
                    {masterProducts.map(p => <option key={p.productId} value={p.productId}>{p.name} ({p.productId})</option>)}
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-6">
                  <div><label className="block text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase mb-3">Volume</label><input type="number" required min="1" value={transactionData.amount} onChange={(e) => setTransactionData({...transactionData, amount: Math.max(0, parseInt(e.target.value) || 0)})} className="w-full p-4 bg-slate-50 dark:bg-slate-900 border dark:border-slate-800 rounded-2xl font-black text-xl outline-none dark:text-white" /></div>
                  <div><label className="block text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase mb-3">Shift</label><select value={transactionData.shift} onChange={(e) => setTransactionData({...transactionData, shift: e.target.value})} className="w-full p-4 bg-slate-50 dark:bg-slate-900 border dark:border-slate-800 rounded-2xl font-bold uppercase outline-none text-sm dark:text-white"><option value="1">Shift 1</option><option value="2">Shift 2</option><option value="3">Shift 3</option></select></div>
                </div>
                <div>
                  <label className="block text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase mb-3">Keterangan (Opsional)</label>
                  <textarea value={transactionData.note} onChange={(e) => setTransactionData({...transactionData, note: e.target.value})} className="w-full p-4 bg-slate-50 dark:bg-slate-900 border dark:border-slate-800 rounded-2xl font-bold uppercase outline-none text-sm dark:text-white h-24 resize-none" placeholder="Contoh: Barang dari Supplier A, Rusak saat bongkar, dll..." />
                </div>
                <button type="submit" className="w-full py-5 bg-[#1e293b] dark:bg-indigo-600 text-white font-black uppercase tracking-widest text-sm rounded-2xl shadow-xl hover:bg-slate-800 dark:hover:bg-indigo-500 transition-all flex items-center justify-center gap-3">Confirm Entry</button>
             </form>
          </div>
        </div>
      )}

      {isAddProductModalOpen && (
        <div className="fixed inset-0 z-[200] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-6">
          <div className="bg-white dark:bg-slate-950 w-full max-w-lg rounded-[2rem] md:rounded-[2.5rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 border dark:border-slate-800 mx-4">
             <div className="p-6 md:p-8 border-b dark:border-slate-800 flex justify-between items-center bg-slate-50 dark:bg-slate-900">
                <h2 className="text-xl md:text-2xl font-black uppercase tracking-tighter dark:text-white">Registrasi Barang</h2>
                <button onClick={() => setIsAddProductModalOpen(false)} className="p-2.5 hover:bg-white dark:hover:bg-slate-800 rounded-xl shadow-sm dark:text-white"><X size={24}/></button>
             </div>
             <form onSubmit={handleAddProduct} className="p-6 md:p-8 space-y-6">
                <div>
                  <label className="block text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase mb-3">Nama Lengkap Barang</label>
                  <input type="text" required value={newProductData.name} onChange={(e) => setNewProductData({...newProductData, name: e.target.value})} className="w-full p-4 bg-slate-50 dark:bg-slate-900 border dark:border-slate-800 rounded-2xl font-bold uppercase outline-none focus:ring-4 focus:ring-indigo-500/10 dark:text-white" />
                </div>
                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase mb-3">Satuan</label>
                    <input type="text" required value={newProductData.unit} onChange={(e) => setNewProductData({...newProductData, unit: e.target.value})} className="w-full p-4 bg-slate-50 dark:bg-slate-900 border dark:border-slate-800 rounded-2xl font-bold uppercase outline-none dark:text-white" placeholder="pcs/ctn" />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase mb-3">Ukuran</label>
                    <input type="text" required value={newProductData.size} onChange={(e) => setNewProductData({...newProductData, size: e.target.value})} className="w-full p-4 bg-slate-50 dark:bg-slate-900 border dark:border-slate-800 rounded-2xl font-bold uppercase outline-none dark:text-white" />
                  </div>
                </div>
                <div>
                  <label className="block text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase mb-3">Status Pemakaian</label>
                  <select value={newProductData.status} onChange={(e) => setNewProductData({...newProductData, status: e.target.value as any})} className="w-full p-4 bg-slate-50 dark:bg-slate-900 border dark:border-slate-800 rounded-2xl font-bold uppercase outline-none dark:text-white">
                    <option value="reusable">Berulang (Reusable)</option>
                    <option value="disposable">Sekali Pakai (Disposable)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase mb-3">Estimasi Pakai / Shift</label>
                  <input type="number" min="0" value={newProductData.usagePerShift} onChange={(e) => setNewProductData({...newProductData, usagePerShift: Math.max(0, parseInt(e.target.value) || 0)})} className="w-full p-4 bg-slate-50 dark:bg-slate-900 border dark:border-slate-800 rounded-2xl font-black text-xl outline-none dark:text-white" />
                </div>
                <button type="submit" className="w-full py-5 bg-indigo-600 text-white font-black uppercase tracking-widest text-sm rounded-2xl shadow-xl hover:bg-indigo-500 transition-all">Daftarkan Master</button>
             </form>
          </div>
        </div>
      )}

      {isEditProductModalOpen && editingProduct && (
        <div className="fixed inset-0 z-[200] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-6">
          <div className="bg-white dark:bg-slate-950 w-full max-w-lg rounded-[2.5rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 border dark:border-slate-800">
             <div className="p-8 border-b dark:border-slate-800 flex justify-between items-center bg-slate-50 dark:bg-slate-900">
                <h2 className="text-2xl font-black uppercase tracking-tighter dark:text-white">Edit Master Produk</h2>
                <button onClick={() => setIsEditProductModalOpen(false)} className="p-2.5 hover:bg-white dark:hover:bg-slate-800 rounded-xl shadow-sm dark:text-white"><X size={24}/></button>
             </div>
             <form onSubmit={handleUpdateProduct} className="p-8 space-y-6">
                <div>
                  <label className="block text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase mb-3">Nama Barang</label>
                  <input type="text" required value={editingProduct.name} onChange={(e) => setEditingProduct({...editingProduct, name: e.target.value})} className="w-full p-4 bg-slate-50 dark:bg-slate-900 border dark:border-slate-800 rounded-2xl font-bold uppercase outline-none focus:ring-4 focus:ring-indigo-500/10 dark:text-white" />
                </div>
                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase mb-3">Satuan</label>
                    <input type="text" required value={editingProduct.unit} onChange={(e) => setEditingProduct({...editingProduct, unit: e.target.value})} className="w-full p-4 bg-slate-50 dark:bg-slate-900 border dark:border-slate-800 rounded-2xl font-bold uppercase outline-none dark:text-white" />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase mb-3">Ukuran</label>
                    <input type="text" required value={editingProduct.size} onChange={(e) => setEditingProduct({...editingProduct, size: e.target.value})} className="w-full p-4 bg-slate-50 dark:bg-slate-900 border dark:border-slate-800 rounded-2xl font-bold uppercase outline-none dark:text-white" />
                  </div>
                </div>
                <div>
                  <label className="block text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase mb-3">Protokol Pemakaian</label>
                  <select value={editingProduct.status} onChange={(e) => setEditingProduct({...editingProduct, status: e.target.value as any})} className="w-full p-4 bg-slate-50 dark:bg-slate-900 border dark:border-slate-800 rounded-2xl font-bold uppercase outline-none dark:text-white">
                    <option value="reusable">Berulang (Reusable)</option>
                    <option value="disposable">Sekali Pakai (Disposable)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase mb-3">Estimasi Pakai / Shift</label>
                  <input type="number" min="0" value={editingProduct.usagePerShift} onChange={(e) => setEditingProduct({...editingProduct, usagePerShift: Math.max(0, parseInt(e.target.value) || 0)})} className="w-full p-4 bg-slate-50 dark:bg-slate-900 border dark:border-slate-800 rounded-2xl font-black text-xl outline-none dark:text-white" />
                </div>
                <button type="submit" className="w-full py-5 bg-indigo-600 text-white font-black uppercase tracking-widest text-sm rounded-2xl shadow-xl hover:bg-indigo-500 transition-all">Update Data</button>
             </form>
          </div>
        </div>
      )}

    </div>
  );
};

const NavItem: React.FC<{ active: boolean; icon: React.ReactNode; label: string; onClick: () => void; collapsed?: boolean }> = ({ active, icon, label, onClick, collapsed }) => (
  <button 
    onClick={onClick} 
    className={`w-full flex items-center gap-4 px-5 py-3.5 rounded-2xl font-bold text-[11px] uppercase tracking-widest transition-all duration-300 ${active ? 'bg-[#1e293b] dark:bg-indigo-600 text-white shadow-xl scale-[1.02]' : 'text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white'} ${collapsed ? 'justify-center px-0' : ''}`}
    title={collapsed ? label : undefined}
  >
    <div className="shrink-0">{icon}</div>
    {!collapsed && <span>{label}</span>}
  </button>
);

const SummaryCard: React.FC<{ title: string; value: string; color: string; icon: React.ReactNode }> = ({ title, value, color, icon }) => {
  const isIndigo = color.includes('indigo');
  const isBlue = color.includes('blue');
  const isRose = color.includes('rose');
  const isEmerald = color.includes('emerald');

  return (
    <div className={`p-6 md:p-8 rounded-[2rem] md:rounded-[2.5rem] border border-white dark:border-slate-800 shadow-sm flex items-center gap-4 md:gap-6 ${color} dark:bg-slate-950 dark:text-white transition-all hover:shadow-lg group`}>
      <div className={`p-3 md:p-4 rounded-2xl ${color.split(' ')[0]} dark:bg-opacity-20 ${
        isIndigo ? 'dark:text-indigo-400' : 
        isBlue ? 'dark:text-blue-400' : 
        isRose ? 'dark:text-rose-400' : 
        isEmerald ? 'dark:text-emerald-400' : ''
      }`}>
        <div className="scale-90 md:scale-100">{icon}</div>
      </div>
      <div>
        <p className="text-[9px] md:text-[10px] font-black uppercase tracking-widest mb-1 opacity-70 dark:text-slate-400">{title}</p>
        <p className="text-2xl md:text-3xl font-black tracking-tighter leading-none">{value}</p>
      </div>
    </div>
  );
};

export default App;
