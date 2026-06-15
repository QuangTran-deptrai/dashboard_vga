"use client";

import React, { useState, useEffect } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { Activity, Filter, Calendar, Cpu, HardDrive, Tag } from 'lucide-react';

// Dữ liệu biểu đồ sẽ được tải qua API / file JSON tĩnh

export default function Dashboard() {
  const [combos, setCombos] = useState<any[]>([]);
  const [brands, setBrands] = useState<string[]>([]);
  const [chipsets, setChipsets] = useState<string[]>([]);
  const [vrams, setVrams] = useState<string[]>([]);
  const [chartDataMap, setChartDataMap] = useState<any>({});
  const [currentChartData, setCurrentChartData] = useState<any[]>([]);

  const [kpiPredPrice, setKpiPredPrice] = useState<number | null>(null);
  const [kpiPredChange, setKpiPredChange] = useState<number | null>(null);
  const [kpiMarketPrice, setKpiMarketPrice] = useState<number | null>(null);
  const [kpiRetailPrice, setKpiRetailPrice] = useState<number | null>(null);
  const [marketData, setMarketData] = useState<any>({ nvda_price: 0, nvda_change: 0, gold_price: 0, gold_change: 0 });
  const [retailPricesMap, setRetailPricesMap] = useState<any>({});

  const [selectedBrand, setSelectedBrand] = useState('ZOTAC');
  const [selectedChipset, setSelectedChipset] = useState('RTX 5070');
  const [selectedVram, setSelectedVram] = useState('12GB');

  // Load ban đầu
  useEffect(() => {
    fetch('/dashboard_options.json')
      .then(res => res.json())
      .then(data => {
        const allCombos = data.combinations || [];
        setCombos(allCombos);
        const uniqueBrands = Array.from(new Set(allCombos.map((c:any) => c.Brand))).sort() as string[];
        setBrands(uniqueBrands);
        if (uniqueBrands.length > 0) {
          setSelectedBrand(uniqueBrands.includes('ZOTAC') ? 'ZOTAC' : uniqueBrands[0]);
        }
      })
      .catch(e => console.error("Could not load options", e));

    fetch('/chart_data.json')
      .then(res => res.json())
      .then(data => setChartDataMap(data))
      .catch(e => console.error("Could not load chart data", e));

    fetch('/market_data.json')
      .then(res => res.json())
      .then(data => setMarketData(data))
      .catch(e => console.error("Could not load market data", e));

    fetch('/retail_prices.json')
      .then(res => res.json())
      .then(data => setRetailPricesMap(data))
      .catch(e => console.error("Could not load retail prices", e));
  }, []);

  // Filter Chipset theo Brand
  useEffect(() => {
    if (!selectedBrand || combos.length === 0) return;
    const validChipsets = Array.from(new Set(combos.filter(c => c.Brand === selectedBrand).map(c => c.Chipset))).sort() as string[];
    setChipsets(validChipsets);
    if (validChipsets.length > 0 && !validChipsets.includes(selectedChipset)) {
      setSelectedChipset(validChipsets[0]);
    }
  }, [selectedBrand, combos]);

  // Filter VRAM theo Brand + Chipset
  useEffect(() => {
    if (!selectedBrand || !selectedChipset || combos.length === 0) return;
    const validVrams = Array.from(new Set(combos.filter(c => c.Brand === selectedBrand && c.Chipset === selectedChipset).map(c => c.VRAM))).sort() as string[];
    setVrams(validVrams);
    if (validVrams.length > 0 && !validVrams.includes(selectedVram)) {
      setSelectedVram(validVrams[0]);
    }
  }, [selectedBrand, selectedChipset, combos]);

  // Update Chart Data khi Slicer thay doi
  useEffect(() => {
    if (selectedBrand && selectedChipset && selectedVram) {
      const key = `${selectedBrand}|${selectedChipset}|${selectedVram}`;
      const data = chartDataMap[key] || [];
      setCurrentChartData(data);
    }
  }, [selectedBrand, selectedChipset, selectedVram, chartDataMap]);

  // Update KPIs
  useEffect(() => {
    // 1. Gia Du Bao Tuan Toi
    if (currentChartData.length > 0) {
      const futureRow = currentChartData[currentChartData.length - 1];
      const lastActualRow = currentChartData.length > 1 ? currentChartData[currentChartData.length - 2] : null;
      
      if (futureRow && futureRow.actual === null) {
        setKpiPredPrice(futureRow.predicted);
        if (lastActualRow && lastActualRow.actual) {
          setKpiPredChange(((futureRow.predicted - lastActualRow.actual) / lastActualRow.actual) * 100);
        } else {
          setKpiPredChange(null);
        }
      } else {
        setKpiPredPrice(futureRow.predicted);
        setKpiPredChange(null);
      }
    } else {
      setKpiPredPrice(null);
      setKpiPredChange(null);
    }

    // 2. Gia Thi Truong (Multi-brand)
    if (selectedChipset && selectedVram && Object.keys(chartDataMap).length > 0) {
      let total = 0;
      let count = 0;
      Object.keys(chartDataMap).forEach(key => {
        const [b, c, v] = key.split('|');
        if (c === selectedChipset && v === selectedVram) {
          const history = chartDataMap[key];
          const lastActual = history.slice().reverse().find((r:any) => r.actual !== null);
          if (lastActual) {
            total += lastActual.actual;
            count += 1;
          }
        }
      });
      setKpiMarketPrice(count > 0 ? Math.round(total / count) : null);
    } else {
      setKpiMarketPrice(null);
    }

    // 3. Gia Ban Le Thuc Te
    if (selectedBrand && selectedChipset && selectedVram) {
      const key = `${selectedBrand}|${selectedChipset}|${selectedVram}`;
      if (retailPricesMap[key]) {
        setKpiRetailPrice(retailPricesMap[key]);
      } else {
        setKpiRetailPrice(null);
      }
    } else {
      setKpiRetailPrice(null);
    }
  }, [currentChartData, selectedBrand, selectedChipset, selectedVram, chartDataMap, retailPricesMap]);

  return (
    <div className="flex h-screen bg-[#060e20] text-[#dae2fd] font-sans selection:bg-[#00f2ff]/30 overflow-hidden">
      
      {/* SIDEBAR (Slicers & Filters) */}
      <aside className="w-72 bg-[#0b1326] border-r border-[#2d3449] flex flex-col">
        <div className="p-6 border-b border-[#2d3449]">
          <h1 className="text-2xl font-bold bg-gradient-to-r from-[#00f2ff] to-[#4edea3] bg-clip-text text-transparent flex items-center gap-2">
            <Activity className="text-[#00f2ff]" />
            VGA Predict
          </h1>
          <p className="text-[#b9cacb] text-xs mt-2">Intelligence Analytics Platform</p>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          <div className="flex items-center gap-2 text-[#00dbe7] font-semibold mb-4 uppercase tracking-wider text-sm">
            <Filter className="w-4 h-4" />
            Bộ lọc (Slicers)
          </div>

          {/* Slicer: Brand */}
          <div className="space-y-2">
            <label className="text-xs font-medium text-[#b9cacb] flex items-center gap-2"><Tag className="w-3 h-3"/> Hãng sản xuất (Brand)</label>
            <select 
              value={selectedBrand}
              onChange={(e) => setSelectedBrand(e.target.value)}
              className="w-full bg-[#131b2e] border border-[#3a494b] text-[#dae2fd] rounded-lg p-2.5 text-sm outline-none focus:border-[#00f2ff] focus:ring-1 focus:ring-[#00f2ff] transition-all"
            >
              {brands.map(b => (
                <option key={`brand-${b}`} value={b}>{b}</option>
              ))}
            </select>
          </div>

          {/* Slicer: Chipset */}
          <div className="space-y-2">
            <label className="text-xs font-medium text-[#b9cacb] flex items-center gap-2"><Cpu className="w-3 h-3"/> Dòng GPU (Chipset)</label>
            <select 
              value={selectedChipset}
              onChange={(e) => setSelectedChipset(e.target.value)}
              className="w-full bg-[#131b2e] border border-[#3a494b] text-[#dae2fd] rounded-lg p-2.5 text-sm outline-none focus:border-[#00f2ff] focus:ring-1 focus:ring-[#00f2ff] transition-all"
            >
              {chipsets.map(c => (
                <option key={`chipset-${c}`} value={c}>{c}</option>
              ))}
            </select>
          </div>

          {/* Slicer: VRAM */}
          <div className="space-y-2">
            <label className="text-xs font-medium text-[#b9cacb] flex items-center gap-2"><HardDrive className="w-3 h-3"/> VRAM</label>
            <select 
              value={selectedVram}
              onChange={(e) => setSelectedVram(e.target.value)}
              className="w-full bg-[#131b2e] border border-[#3a494b] text-[#dae2fd] rounded-lg p-2.5 text-sm outline-none focus:border-[#00f2ff] focus:ring-1 focus:ring-[#00f2ff] transition-all"
            >
              {vrams.map(v => (
                <option key={`vram-${v}`} value={v}>{v}</option>
              ))}
            </select>
          </div>

        </div>
        
        {/* Timeframe Info */}
        <div className="p-4 m-4 bg-[#131b2e] rounded-xl border border-[#3a494b]">
          <div className="flex items-start gap-3">
            <Calendar className="w-5 h-5 text-[#00f2ff] shrink-0 mt-0.5" />
            <div className="text-xs space-y-1">
              <p><span className="text-[#b9cacb]">Dữ liệu Train:</span> <br/><b className="text-white">01/01/2024 - Hiện tại</b></p>
              <p className="mt-2"><span className="text-[#b9cacb]">Mốc Dự Báo:</span> <br/><b className="text-[#4edea3]">Tới 30/06/2026</b></p>
            </div>
          </div>
        </div>
      </aside>

      {/* MAIN CONTENT */}
      <main className="flex-1 overflow-y-auto p-8 bg-[#060e20]">
        
        <header className="flex justify-between items-end mb-8">
          <div>
            <h2 className="text-3xl font-bold text-white mb-2">
              Dự báo giá: <span className="text-[#00f2ff]">{selectedBrand} {selectedChipset} {selectedVram}</span>
            </h2>
            <p className="text-[#b9cacb]">Phân tích chi tiết giá bán thực tế và mức giá dự báo theo tuần.</p>
          </div>
          <div className="flex items-center gap-2 bg-[#00a572]/10 text-[#4edea3] px-4 py-2 rounded-full border border-[#00a572]/30">
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#4edea3] opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-[#4edea3]"></span>
            </span>
            <span className="text-sm font-semibold">Model Status: Active</span>
          </div>
        </header>

        {/* KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-8">
          <div className="bg-[#0b1326] border border-[#2d3449] rounded-2xl p-4 shadow-lg flex flex-col justify-between">
            <p className="text-[#b9cacb] text-sm mb-1">Giá Dự Báo (Tuần tới)</p>
            <h3 className="text-xl font-bold text-[#00f2ff]">
              {kpiPredPrice ? `${kpiPredPrice.toLocaleString()} ₫` : 'N/A'}
            </h3>
            <div className="mt-2">
              {kpiPredChange !== null && (
                <span className={`text-xs font-medium px-2 py-0.5 rounded inline-block ${kpiPredChange > 0 ? 'text-[#ffb4ab] bg-[#93000a]/30' : 'text-[#4edea3] bg-[#00a572]/20'}`}>
                  Chênh lệch {kpiPredChange > 0 ? '+' : ''}{kpiPredChange.toFixed(1)}%
                </span>
              )}
            </div>
          </div>
          <div className="bg-[#0b1326] border border-[#2d3449] rounded-2xl p-4 shadow-lg flex flex-col justify-between">
            <p className="text-[#b9cacb] text-sm mb-1">Giá Nhập TT (Multi-Brand)</p>
            <h3 className="text-xl font-bold text-white">
              {kpiMarketPrice ? `${kpiMarketPrice.toLocaleString()} ₫` : 'N/A'}
            </h3>
            <span className="text-[#b9cacb] text-xs mt-2 block">Trung bình các hãng cùng phân khúc</span>
          </div>
          <div className="bg-[#0b1326] border border-[#2d3449] rounded-2xl p-4 shadow-lg flex flex-col justify-between">
            <p className="text-[#b9cacb] text-sm mb-1">Giá Bán Lẻ (Crawl Sàn)</p>
            <h3 className="text-xl font-bold text-white">
              {kpiRetailPrice ? `${kpiRetailPrice.toLocaleString()} ₫` : 'N/A'}
            </h3>
            <span className="text-[#b9cacb] text-xs mt-2 block">Crawl từ GearVN, THNS...</span>
          </div>
          <div className="bg-[#0b1326] border border-[#2d3449] rounded-2xl p-4 shadow-lg flex flex-col justify-between">
            <p className="text-[#b9cacb] text-sm mb-1">NVDA Stock</p>
            <h3 className="text-xl font-bold text-white">${marketData.nvda_price ? marketData.nvda_price.toFixed(2) : 'N/A'}</h3>
            <div className="mt-2">
              <span className={`text-xs font-medium px-2 py-0.5 rounded inline-block ${marketData.nvda_change > 0 ? 'text-[#4edea3] bg-[#00a572]/20' : 'text-[#ffb4ab] bg-[#93000a]/30'}`}>
                {marketData.nvda_change > 0 ? '+' : ''}{marketData.nvda_change.toFixed(2)}% vs tuần trước
              </span>
            </div>
          </div>
          <div className="bg-[#0b1326] border border-[#2d3449] rounded-2xl p-4 shadow-lg flex flex-col justify-between">
            <p className="text-[#b9cacb] text-sm mb-1">Giá Vàng (GC=F)</p>
            <h3 className="text-xl font-bold text-white">{marketData.gold_price ? marketData.gold_price.toLocaleString() : 'N/A'} <span className="text-sm">USD/oz</span></h3>
            <div className="mt-2">
              <span className={`text-xs font-medium px-2 py-0.5 rounded inline-block ${marketData.gold_change > 0 ? 'text-[#4edea3] bg-[#00a572]/20' : 'text-[#ffb4ab] bg-[#93000a]/30'}`}>
                {marketData.gold_change > 0 ? '+' : ''}{marketData.gold_change.toFixed(2)}%
              </span>
            </div>
          </div>
        </div>

        {/* Charts */}
        <div className="bg-[#0b1326] border border-[#2d3449] rounded-2xl p-6 shadow-lg mb-8">
          <h3 className="text-lg font-bold mb-6 text-white">Biểu đồ Thực tế vs Dự báo (VNĐ)</h3>
          <div className="h-[350px] w-full">
            {currentChartData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={currentChartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#2d3449" vertical={false} />
                  <XAxis dataKey="date" stroke="#b9cacb" tickLine={false} axisLine={false} />
                  <YAxis stroke="#b9cacb" tickLine={false} axisLine={false} domain={['auto', 'auto']} tickFormatter={(v) => `${(v/1000000).toFixed(1)}M`} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#0b1326', border: '1px solid #3a494b', borderRadius: '8px' }}
                    itemStyle={{ color: '#dae2fd' }}
                  />
                  <Legend />
                  <Line type="monotone" dataKey="actual" name="Giá Thực Tế" stroke="#dae2fd" strokeWidth={3} dot={{r: 4}} activeDot={{r: 6}} connectNulls />
                  <Line type="monotone" dataKey="predicted" name="Giá Dự Báo" stroke="#00f2ff" strokeWidth={3} strokeDasharray="5 5" dot={{r: 4}} />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex h-full items-center justify-center text-[#b9cacb]">
                Không có dữ liệu lịch sử cho tổ hợp này.
              </div>
            )}
          </div>
        </div>

        {/* Data Table */}
        <div className="bg-[#0b1326] border border-[#2d3449] rounded-2xl shadow-lg overflow-hidden mb-8">
          <div className="p-6 border-b border-[#2d3449]">
            <h3 className="text-lg font-bold text-white">Bảng Chi Tiết Dự Báo</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-[#131b2e] text-[#b9cacb]">
                <tr>
                  <th className="p-4 font-medium">Thời gian (Tuần)</th>
                  <th className="p-4 font-medium">Giá Thực Tế (VNĐ)</th>
                  <th className="p-4 font-medium">Giá Dự Báo (VNĐ)</th>
                  <th className="p-4 font-medium">Sai Số (Lệch)</th>
                  <th className="p-4 font-medium">Lượng Nhập (Vol)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#2d3449]">
                {currentChartData.map((row, idx) => {
                  const isFuture = row.actual === null;
                  const error = !isFuture ? ((row.predicted - row.actual) / row.actual * 100).toFixed(2) : '-';
                  return (
                    <tr key={idx} className={`hover:bg-[#131b2e]/50 transition-colors ${isFuture ? 'bg-[#00f2ff]/5' : ''}`}>
                      <td className="p-4 text-[#dae2fd]">{row.date} {isFuture && <span className="ml-2 text-xs text-[#00f2ff] bg-[#00f2ff]/10 px-2 py-0.5 rounded">Future</span>}</td>
                      <td className="p-4 text-white font-medium">{row.actual ? row.actual.toLocaleString() : '-'}</td>
                      <td className="p-4 text-[#00f2ff] font-medium">{row.predicted.toLocaleString()}</td>
                      <td className={`p-4 ${Number(error) > 0 ? 'text-[#ffb4ab]' : 'text-[#4edea3]'}`}>
                        {isFuture ? '-' : `${Number(error) > 0 ? '+' : ''}${error}%`}
                      </td>
                      <td className="p-4 text-[#b9cacb]">{row.volume || '-'}</td>
                    </tr>
                  );
                })}
                {currentChartData.length === 0 && (
                  <tr>
                    <td colSpan={5} className="p-4 text-center text-[#b9cacb]">Trống</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

      </main>
    </div>
  );
}
