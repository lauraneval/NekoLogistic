"use client";

import { useMemo } from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

// Menyiapkan tipe prop untuk menerima data dari luar
interface DashboardChartProps {
    packages?: any[];
}

export default function DashboardChart({ packages = [] }: DashboardChartProps) {
    
    // Logika untuk mengubah raw data menjadi format grafik 7 hari terakhir
    const chartData = useMemo(() => {
        if (!packages || packages.length === 0) return [];

        const days = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
        
        // Buat kerangka untuk 7 hari terakhir (mundur dari hari ini)
        const last7Days = Array.from({length: 7}).map((_, i) => {
            const d = new Date();
            d.setDate(d.getDate() - (6 - i)); // Mengurutkan dari 6 hari yang lalu sampai hari ini
            return {
                date: d,
                name: days[d.getDay()], 
                paket: 0
            };
        });

        // Hitung paket berdasarkan tanggal created_at-nya
        packages.forEach(pkg => {
            if (pkg.created_at) {
                const pkgDate = new Date(pkg.created_at);
                // Cari index hari yang cocok
                const dayIndex = last7Days.findIndex(d => 
                    d.date.getDate() === pkgDate.getDate() &&
                    d.date.getMonth() === pkgDate.getMonth() &&
                    d.date.getFullYear() === pkgDate.getFullYear()
                );

                if (dayIndex !== -1) {
                    last7Days[dayIndex].paket += 1;
                }
            }
        });

        // Buang properti 'date' karena Recharts cuma butuh 'name' dan 'paket'
        return last7Days.map(d => ({ name: d.name, paket: d.paket }));
    }, [packages]);

    return (
        <div className="h-[300px] w-full mt-4">
            <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData} margin={{ top: 10, right: 0, left: -20, bottom: 0 }}>
                    <defs>
                        <linearGradient id="colorPaket" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#1d4ed8" stopOpacity={0.2} />
                            <stop offset="95%" stopColor="#1d4ed8" stopOpacity={0} />
                        </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis dataKey="name" stroke="#64748b" tickLine={false} axisLine={false} tick={{ fontSize: 12 }} dy={10} />
                    {/* allowDecimals={false} memastikan angkanya bulat (tidak ada paket 1.5) */}
                    <YAxis stroke="#64748b" tickLine={false} axisLine={false} tick={{ fontSize: 12 }} allowDecimals={false} />
                    <Tooltip
                        contentStyle={{ backgroundColor: '#ffffff', borderColor: '#e2e8f0', borderRadius: '8px', color: '#0f172a', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                        itemStyle={{ color: '#1d4ed8', fontWeight: 'bold' }}
                    />
                    <Area
                        type="monotone"
                        dataKey="paket"
                        stroke="#1d4ed8"
                        strokeWidth={3}
                        fillOpacity={1}
                        fill="url(#colorPaket)"
                    />
                </AreaChart>
            </ResponsiveContainer>
        </div>
    );
}