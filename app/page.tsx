"use client";

import React, { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { 
  Search, Bell, Plane, Building2, Truck, 
  FileText, Share2, Printer, CheckCircle2, 
  Package, MapPin, AlertCircle 
} from 'lucide-react';

// Helper untuk menentukan icon berdasarkan status
const getStatusIcon = (status: string, active: boolean) => {
  const color = active ? "text-white" : "text-slate-400";
  switch (status) {
    case 'PACKAGE_CREATED': return <FileText className={`w-5 h-5 ${color}`} />;
    case 'PICKED_UP': return <Truck className={`w-5 h-5 ${color}`} />;
    case 'IN_TRANSIT': return <Plane className={`w-5 h-5 ${color}`} />;
    case 'DELIVERED': return <CheckCircle2 className={`w-5 h-5 ${color}`} />;
    default: return <Package className={`w-5 h-5 ${color}`} />;
  }
};

export default function TrackingPortal() {
  const [searchQuery, setSearchQuery] = useState('');
  const [packageData, setPackageData] = useState<any>(null);
  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

  const handleTrack = async () => {
    if (!searchQuery) return;
    setLoading(true);
    setHasSearched(true);
    
    try {
const { data: pkg} = await supabase
  .from('packages')
  .select('*')
  // Gunakan .eq jika Anda yakin case-sensitive sudah benar, 
  // atau .ilike jika ingin fleksibel.
  .ilike('resi', searchQuery.trim())
  .maybeSingle();

      if (pkg) {
        setPackageData(pkg);
        const { data: hist } = await supabase
          .from('tracking_history')
          .select('*')
          .eq('package_id', pkg.id)
          .order('created_at', { ascending: false });
        
        setHistory(hist || []);
      } else {
        setPackageData(null);
        setHistory([]);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900">
      <nav className="flex items-center justify-between px-8 py-4 bg-white border-b border-slate-100">
        <div className="text-blue-900 font-bold text-xl tracking-tight">NEKO Logistic</div>
        <div className="hidden md:flex space-x-8 text-sm font-medium text-slate-600">
          <a href="#" className="hover:text-blue-600">Services</a>
          <a href="#" className="text-blue-600 border-b-2 border-blue-600 pb-1">Tracking Portal</a>
          <a href="#" className="hover:text-blue-600">Support</a>
        </div>
        <div className="flex items-center space-x-4">
          <Bell className="w-5 h-5 text-slate-400 cursor-pointer" />
          <div className="w-8 h-8 rounded-full bg-slate-200 overflow-hidden border border-slate-300">
            <img src="https://api.dicebear.com/7.x/avataaars/svg?seed=Felix" alt="User" />
          </div>
        </div>
      </nav>

      <main className="max-w-5xl mx-auto py-12 px-4">
        <section className="text-center mb-12">
          <h1 className="text-4xl font-bold text-slate-800 mb-4">The Kinetic Curator</h1>
          <p className="text-slate-500 max-w-lg mx-auto">
            Real-time precision for your global shipments. Enter your tracking number to visualize the journey.
          </p>
          
          <div className="mt-8 flex max-w-2xl mx-auto bg-white rounded-lg shadow-sm border border-slate-200 p-2">
            <div className="flex items-center flex-1 px-4">
              <Search className="w-5 h-5 text-slate-400 mr-3" />
              <input 
                type="text" 
                placeholder="Ex: NEKO-1234-ABCD"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleTrack()}
                className="w-full outline-none text-slate-700 font-medium"
              />
            </div>
            <button 
              onClick={handleTrack}
              disabled={loading}
              className="bg-blue-900 text-white px-8 py-2.5 rounded-md font-semibold hover:bg-blue-800 transition disabled:opacity-50"
            >
              {loading ? 'Searching...' : 'Track'}
            </button>
          </div>
        </section>

        {!hasSearched ? (
          <div className="text-center py-20 opacity-40">
            <Package className="w-16 h-16 mx-auto mb-4" />
            <p>Ready to track your package</p>
          </div>
        ) : packageData ? (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
            {/* Sidebar Status */}
            <div className="lg:col-span-4 space-y-4">
              <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100">
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Current Status</p>
                <div className="flex items-center text-blue-600 font-bold text-2xl break-words">
                  <span className="w-3 h-3 bg-blue-600 rounded-full mr-3 shrink-0"></span>
                  {packageData.status.replace('_', ' ')}
                </div>

                <div className="mt-8 space-y-4">
                  <div className="bg-slate-50 p-4 rounded-lg">
                    <p className="text-[10px] font-bold text-slate-400 uppercase italic">Package Name</p>
                    <p className="font-bold text-slate-800">{packageData.package_name}</p>
                  </div>
                  <div className="bg-slate-50 p-4 rounded-lg">
                    <p className="text-[10px] font-bold text-slate-400 uppercase">Weight</p>
                    <p className="font-bold text-slate-800">{packageData.weight_kg} kg</p>
                  </div>
                  <div className="bg-slate-50 p-4 rounded-lg">
                    <p className="text-[10px] font-bold text-slate-400 uppercase">Destination City</p>
                    <p className="font-bold text-slate-800">{packageData.destination_city}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Journey Timeline */}
            <div className="lg:col-span-8 bg-white p-8 rounded-xl shadow-sm border border-slate-100">
              <div className="flex justify-between items-end mb-10">
                <h2 className="text-xl font-bold text-slate-800">Package Journey</h2>
                <p className="text-xs text-slate-400 font-medium tracking-tight">
                  Tracking ID: <span className="text-slate-600 font-mono">{packageData.resi}</span>
                </p>
              </div>

              <div className="relative space-y-12">
                <div className="absolute left-5.5 top-2 bottom-2 w-0.5 bg-slate-100"></div>
                
                {history.length > 0 ? history.map((event, index) => (
                  <TimelineItem 
                    key={event.id}
                    icon={getStatusIcon(event.event_code, index === 0)}
                    status={event.event_label}
                    description={event.description}
                    location={event.location}
                    date={new Date(event.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
                    time={new Date(event.created_at).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
                    active={index === 0}
                  />
                )) : (
                  <p className="text-slate-400 italic">No history records found.</p>
                )}
              </div>

              <div className="mt-12 pt-8 border-t border-slate-50 flex flex-wrap gap-3">
                <button onClick={() => window.print()} className="flex items-center px-4 py-2 bg-slate-100 text-slate-700 rounded-md text-sm font-semibold hover:bg-slate-200">
                  <Printer className="w-4 h-4 mr-2" /> Print Details
                </button>
                <button className="flex items-center px-4 py-2 bg-slate-100 text-slate-700 rounded-md text-sm font-semibold hover:bg-slate-200">
                  <Share2 className="w-4 h-4 mr-2" /> Share Tracking
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div className="bg-red-50 border border-red-100 p-8 rounded-xl text-center">
            <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-4" />
            <h3 className="text-red-900 font-bold text-lg">Tracking Number Not Found</h3>
            <p className="text-red-600/70">Please check your receipt and try again.</p>
          </div>
        )}
      </main>

      <footer className="text-center py-12 mt-12 border-t border-slate-200">
        <h3 className="text-blue-900 font-bold mb-2">NEKO Logistic</h3>
        <p className="text-xs text-slate-400 mb-6">© 2026 NEKO Logistic Group. All rights reserved.</p>
      </footer>
    </div>
  );
}

function TimelineItem({ icon, status, description, location, date, time, active = false }: Readonly<{ icon: React.ReactNode; status: string; description: string; location?: string; date: string; time: string; active?: boolean }>) {
  return (
    <div className="relative flex items-start">
      <div className={`relative z-10 flex items-center justify-center w-11 h-11 rounded-lg shrink-0 ${active ? 'bg-blue-900 shadow-lg shadow-blue-200' : 'bg-slate-100 border border-slate-200'}`}>
        {icon}
      </div>
      <div className="ml-6 flex-1">
        <div className="flex flex-col md:flex-row md:justify-between items-start">
          <div>
            <h4 className={`font-bold ${active ? 'text-slate-800' : 'text-slate-500'}`}>{status}</h4>
            {location && (
              <p className="text-xs text-blue-600 font-semibold flex items-center mt-0.5">
                <MapPin className="w-3 h-3 mr-1" /> {location}
              </p>
            )}
          </div>
          <div className="text-left md:text-right mt-1 md:mt-0">
            <p className="text-xs font-bold text-blue-900">{date}</p>
            <p className="text-[10px] text-slate-400 uppercase font-medium">{time}</p>
          </div>
        </div>
        <p className="text-sm text-slate-500 mt-2 leading-relaxed max-w-md italic md:not-italic">
          {description}
        </p>
      </div>
    </div>
  );
}