/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { 
  LayoutDashboard, 
  Factory, 
  Settings, 
  Database, 
  TrendingUp, 
  Cpu, 
  FileUp, 
  Search,
  ChevronRight,
  AlertCircle,
  CheckCircle2,
  BarChart3,
  Plus,
  Trash2,
  Download,
  History,
  GitBranch
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

type Tab = 'dashboard' | 'config' | 'constraints' | 'cycletime' | 'allocation' | 'data';

interface Line {
  id: number;
  line_number: string;
  name: string;
  status: string;
  machine_count: number;
}

interface Machine {
  id: number;
  line_id: number;
  line_name: string;
  brand: string;
  model: string;
  name: string;
  software_version: string;
  nozzle_config: string;
}

interface CycleTime {
  id: number;
  line_id: number;
  assembly_no: string;
  side: string;
  machine_name: string;
  min_cycle_time: number;
  medium_cycle_time: number;
  current_cycle_time: number;
  updated_at: string;
}

export default function App() {
  const [activeTab, setActiveTab] = useState<Tab>('dashboard');
  const [lines, setLines] = useState<Line[]>([]);
  const [machines, setMachines] = useState<Machine[]>([]);
  const [cycleTimes, setCycleTimes] = useState<CycleTime[]>([]);
  const [loading, setLoading] = useState(true);

  // Form states
  const [newLine, setNewLine] = useState({ line_number: '', name: '' });
  const [newMachine, setNewMachine] = useState({ line_id: '', brand: '', model: '', name: '', software_version: '', nozzle_config: '' });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [linesRes, machinesRes, cycleRes] = await Promise.all([
        fetch('/api/lines'),
        fetch('/api/machines'),
        fetch('/api/cycle-times')
      ]);
      setLines(await linesRes.json());
      setMachines(await machinesRes.json());
      setCycleTimes(await cycleRes.json());
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddLine = async () => {
    if (!newLine.line_number || !newLine.name) return;
    await fetch('/api/lines', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newLine)
    });
    setNewLine({ line_number: '', name: '' });
    fetchData();
  };

  const handleDeleteLine = async (id: number) => {
    await fetch(`/api/lines/${id}`, { method: 'DELETE' });
    fetchData();
  };

  const SidebarItem = ({ id, icon: Icon, label }: { id: Tab, icon: any, label: string }) => (
    <button
      onClick={() => setActiveTab(id)}
      className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all text-left ${
        activeTab === id 
          ? 'bg-emerald-500/10 text-emerald-400 border-l-4 border-emerald-500' 
          : 'text-zinc-400 hover:bg-zinc-800/50 hover:text-zinc-200'
      }`}
    >
      <Icon size={18} />
      <span className="text-sm font-semibold uppercase tracking-wider">{label}</span>
    </button>
  );

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-zinc-100 flex font-sans">
      {/* Sidebar */}
      <aside className="w-72 border-r border-zinc-800 p-6 flex flex-col gap-8 bg-zinc-900/20">
        <div className="flex items-center gap-3 px-2">
          <div className="w-10 h-10 bg-emerald-500 rounded-xl flex items-center justify-center shadow-lg shadow-emerald-500/20">
            <Factory className="text-black" size={24} />
          </div>
          <div>
            <h1 className="text-lg font-black tracking-tighter leading-none">SMP LIGHT</h1>
            <span className="text-[10px] text-emerald-500 font-bold tracking-widest uppercase">Manager v1.0</span>
          </div>
        </div>

        <nav className="flex flex-col gap-1">
          <SidebarItem id="dashboard" icon={LayoutDashboard} label="Dashboard" />
          <SidebarItem id="config" icon={Factory} label="SMT Line Config" />
          <SidebarItem id="constraints" icon={Settings} label="Line Constraints" />
          <SidebarItem id="cycletime" icon={History} label="Product Cycletime" />
          <SidebarItem id="allocation" icon={GitBranch} label="Line Allocation" />
          <SidebarItem id="data" icon={Database} label="Data & Reports" />
        </nav>

        <div className="mt-auto p-4 bg-zinc-900/50 rounded-2xl border border-zinc-800">
          <div className="flex items-center gap-2 text-[10px] text-zinc-500 uppercase font-bold tracking-widest mb-3">
            <TrendingUp size={12} />
            System Health
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
              <span className="text-xs font-bold">SQL Connected</span>
            </div>
            <span className="text-[10px] text-zinc-600 font-mono">34ms</span>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 p-10 overflow-y-auto">
        <header className="mb-12 flex justify-between items-end">
          <div>
            <div className="text-emerald-500 text-xs font-bold tracking-[0.2em] uppercase mb-2">Rockwell Automation / SMP</div>
            <h2 className="text-4xl font-black tracking-tight">
              {activeTab === 'config' ? 'SMT LINE CONFIGURATION' : 
               activeTab === 'cycletime' ? 'PRODUCT CYCLETIME' :
               activeTab === 'allocation' ? 'PRODUCT LINE ALLOCATION' :
               activeTab.toUpperCase()}
            </h2>
          </div>
          <div className="flex gap-3">
            <button 
              onClick={() => window.open('/api/export/config')}
              className="px-5 py-2.5 bg-zinc-800 hover:bg-zinc-700 rounded-xl text-xs font-bold uppercase tracking-widest transition-all flex items-center gap-2 border border-zinc-700"
            >
              <Download size={14} />
              Export CSV
            </button>
          </div>
        </header>

        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, x: 10 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -10 }}
            transition={{ duration: 0.2 }}
          >
            {activeTab === 'config' && (
              <div className="space-y-8">
                {/* Add Line Form */}
                <div className="bg-zinc-900/50 border border-zinc-800 p-6 rounded-2xl">
                  <h3 className="text-sm font-bold text-zinc-500 uppercase tracking-widest mb-6 flex items-center gap-2">
                    <Plus size={14} /> Add New SMT Line
                  </h3>
                  <div className="grid grid-cols-3 gap-4">
                    <input 
                      value={newLine.line_number}
                      onChange={e => setNewLine({...newLine, line_number: e.target.value})}
                      placeholder="Line # (e.g. L03)" 
                      className="bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-emerald-500 outline-none"
                    />
                    <input 
                      value={newLine.name}
                      onChange={e => setNewLine({...newLine, name: e.target.value})}
                      placeholder="Line Name" 
                      className="bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-emerald-500 outline-none"
                    />
                    <button onClick={handleAddLine} className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl transition-all">
                      Create Line
                    </button>
                  </div>
                </div>

                {/* Lines Table */}
                <div className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden">
                  <table className="w-full text-left">
                    <thead className="bg-zinc-800/50 border-b border-zinc-800">
                      <tr>
                        <th className="px-6 py-4 text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Line #</th>
                        <th className="px-6 py-4 text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Description</th>
                        <th className="px-6 py-4 text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Machines</th>
                        <th className="px-6 py-4 text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Status</th>
                        <th className="px-6 py-4 text-[10px] font-bold text-zinc-500 uppercase tracking-widest text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-800">
                      {lines.map(line => (
                        <tr key={line.id} className="hover:bg-zinc-800/20 transition-colors">
                          <td className="px-6 py-4 font-mono font-bold text-emerald-500">{line.line_number}</td>
                          <td className="px-6 py-4 font-medium">{line.name}</td>
                          <td className="px-6 py-4 text-zinc-400 text-sm">{line.machine_count} Units</td>
                          <td className="px-6 py-4">
                            <span className="px-2 py-1 bg-emerald-500/10 text-emerald-500 text-[9px] font-black uppercase rounded border border-emerald-500/20">
                              {line.status}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-right">
                            <button onClick={() => handleDeleteLine(line.id)} className="text-zinc-600 hover:text-red-500 transition-colors">
                              <Trash2 size={16} />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {activeTab === 'cycletime' && (
              <div className="space-y-8">
                <div className="flex gap-4">
                  <button className="flex-1 p-6 bg-zinc-900 border border-zinc-800 rounded-2xl hover:border-emerald-500/50 transition-all text-left group">
                    <FileUp className="text-emerald-500 mb-4 group-hover:scale-110 transition-transform" />
                    <h4 className="font-bold mb-1">Upload Optel Cycletime</h4>
                    <p className="text-xs text-zinc-500">SGP_GEM_MACHINE_CYCLETIME</p>
                  </button>
                  <button className="flex-1 p-6 bg-zinc-900 border border-zinc-800 rounded-2xl hover:border-blue-500/50 transition-all text-left group">
                    <FileUp className="text-blue-500 mb-4 group-hover:scale-110 transition-transform" />
                    <h4 className="font-bold mb-1">Upload Optel Build Info</h4>
                    <p className="text-xs text-zinc-500">SGP_ASSEMBLY_BUILD_TO_MODULE</p>
                  </button>
                </div>

                <div className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden">
                  <div className="p-6 border-b border-zinc-800 flex justify-between items-center">
                    <h3 className="text-sm font-bold uppercase tracking-widest">Historic Cycle Time Records</h3>
                    <div className="flex gap-2">
                      <button className="px-3 py-1.5 bg-red-500/10 text-red-500 text-[10px] font-bold uppercase rounded border border-red-500/20">
                        Exceed Target
                      </button>
                      <button className="px-3 py-1.5 bg-emerald-500/10 text-emerald-500 text-[10px] font-bold uppercase rounded border border-emerald-500/20">
                        Meeting Target
                      </button>
                    </div>
                  </div>
                  <table className="w-full text-left">
                    <thead className="bg-zinc-800/50">
                      <tr>
                        <th className="px-6 py-4 text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Assembly #</th>
                        <th className="px-6 py-4 text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Side</th>
                        <th className="px-6 py-4 text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Machine</th>
                        <th className="px-6 py-4 text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Medium (s)</th>
                        <th className="px-6 py-4 text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Current (s)</th>
                        <th className="px-6 py-4 text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-800">
                      {cycleTimes.length > 0 ? cycleTimes.map(ct => (
                        <tr key={ct.id} className="hover:bg-zinc-800/20">
                          <td className="px-6 py-4 font-bold">{ct.assembly_no}</td>
                          <td className="px-6 py-4 text-zinc-400">{ct.side}</td>
                          <td className="px-6 py-4 text-zinc-400">{ct.machine_name}</td>
                          <td className="px-6 py-4 font-mono">{ct.medium_cycle_time}</td>
                          <td className="px-6 py-4 font-mono">{ct.current_cycle_time}</td>
                          <td className="px-6 py-4">
                            {ct.current_cycle_time > ct.medium_cycle_time ? (
                              <AlertCircle size={16} className="text-red-500" />
                            ) : (
                              <CheckCircle2 size={16} className="text-emerald-500" />
                            )}
                          </td>
                        </tr>
                      )) : (
                        <tr>
                          <td colSpan={6} className="px-6 py-12 text-center text-zinc-600 italic">No historic data found. Upload Optel reports to begin.</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {activeTab === 'allocation' && (
              <div className="space-y-8">
                <div className="bg-zinc-900 border border-zinc-800 p-8 rounded-3xl">
                  <div className="flex justify-between items-center mb-8">
                    <h3 className="text-xl font-black flex items-center gap-3">
                      <GitBranch className="text-emerald-500" />
                      Product Line Allocation Matrix
                    </h3>
                    <button className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 rounded-xl text-xs font-bold uppercase tracking-widest transition-all">
                      Update Family Setup
                    </button>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                    <div className="space-y-4">
                      <div>
                        <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-2 block">Module # / Assembly</label>
                        <input className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-3 focus:ring-2 focus:ring-emerald-500 outline-none" placeholder="Search Module..." />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-2 block">Side</label>
                          <select className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-3 focus:ring-2 focus:ring-emerald-500 outline-none">
                            <option>Top</option>
                            <option>Bottom</option>
                          </select>
                        </div>
                        <div>
                          <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-2 block">Family</label>
                          <input className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-3 focus:ring-2 focus:ring-emerald-500 outline-none" placeholder="Auto-filled" disabled />
                        </div>
                      </div>
                    </div>
                    <div className="space-y-4">
                      <div className="p-6 bg-zinc-800/30 border border-zinc-700 rounded-2xl">
                        <h4 className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-4">Line Priority Ranking</h4>
                        <div className="space-y-3">
                          <div className="flex items-center gap-3">
                            <span className="w-5 h-5 bg-emerald-500 text-black text-[10px] font-black rounded flex items-center justify-center">1</span>
                            <select className="flex-1 bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-xs">
                              <option>Select Primary Line...</option>
                              {lines.map(l => <option key={l.id} value={l.id}>{l.line_number} - {l.name}</option>)}
                            </select>
                          </div>
                          <div className="flex items-center gap-3">
                            <span className="w-5 h-5 bg-zinc-700 text-zinc-400 text-[10px] font-black rounded flex items-center justify-center">2</span>
                            <select className="flex-1 bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-xs">
                              <option>Select Secondary Line...</option>
                              {lines.map(l => <option key={l.id} value={l.id}>{l.line_number} - {l.name}</option>)}
                            </select>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="pt-8 border-t border-zinc-800">
                    <h4 className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-6">Active Constraints for Allocation</h4>
                    <div className="grid grid-cols-3 gap-4">
                      {['Glue Dispenser', 'Large Board (>10")', 'Reflow Center Support'].map(c => (
                        <label key={c} className="flex items-center gap-3 p-4 bg-zinc-800/50 border border-zinc-700 rounded-xl cursor-pointer hover:bg-zinc-800 transition-colors">
                          <input type="checkbox" className="w-4 h-4 accent-emerald-500" />
                          <span className="text-xs font-bold">{c}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'constraints' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="bg-zinc-900 border border-zinc-800 p-8 rounded-3xl">
                  <h3 className="text-xl font-black mb-6">Line Constraint Setup</h3>
                  <div className="space-y-4">
                    {lines.map(line => (
                      <div key={line.id} className="p-6 bg-zinc-800/30 border border-zinc-800 rounded-2xl">
                        <div className="flex justify-between items-center mb-4">
                          <span className="font-bold text-emerald-500">{line.line_number}</span>
                          <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">{line.name}</span>
                        </div>
                        <div className="space-y-2">
                          <div className="flex items-center justify-between p-3 bg-zinc-900 rounded-xl border border-zinc-800">
                            <span className="text-xs font-medium">Glue Dispenser</span>
                            <div className="w-10 h-5 bg-emerald-500/20 rounded-full relative">
                              <div className="absolute right-1 top-1 w-3 h-3 bg-emerald-500 rounded-full" />
                            </div>
                          </div>
                          <div className="flex items-center justify-between p-3 bg-zinc-900 rounded-xl border border-zinc-800">
                            <span className="text-xs font-medium">Large Board (&gt;10")</span>
                            <div className="w-10 h-5 bg-zinc-800 rounded-full relative">
                              <div className="absolute left-1 top-1 w-3 h-3 bg-zinc-600 rounded-full" />
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="bg-emerald-500/5 border border-emerald-500/10 p-8 rounded-3xl flex flex-col justify-center">
                  <div className="w-12 h-12 bg-emerald-500 rounded-2xl flex items-center justify-center mb-6">
                    <Settings className="text-black" />
                  </div>
                  <h3 className="text-2xl font-black mb-4">Constraint Logic</h3>
                  <p className="text-zinc-400 text-sm leading-relaxed mb-6">
                    Constraints defined here are automatically applied during the Product Line Allocation process. 
                    If a product requires a <strong>Glue Dispenser</strong>, the system will only allow allocation to lines where this constraint is enabled.
                  </p>
                  <ul className="space-y-3">
                    <li className="flex items-center gap-3 text-xs font-bold text-zinc-300">
                      <CheckCircle2 size={14} className="text-emerald-500" />
                      Automatic Line Filtering
                    </li>
                    <li className="flex items-center gap-3 text-xs font-bold text-zinc-300">
                      <CheckCircle2 size={14} className="text-emerald-500" />
                      Reflow Support Validation
                    </li>
                  </ul>
                </div>
              </div>
            )}

            {activeTab === 'dashboard' && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="col-span-2 grid grid-cols-2 gap-6">
                  <div className="bg-zinc-900 border border-zinc-800 p-8 rounded-3xl">
                    <h4 className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-4">Active SMT Lines</h4>
                    <div className="text-5xl font-black mb-2">{lines.length}</div>
                    <div className="text-xs text-emerald-500 font-bold">All Systems Operational</div>
                  </div>
                  <div className="bg-zinc-900 border border-zinc-800 p-8 rounded-3xl">
                    <h4 className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-4">Total Machines</h4>
                    <div className="text-5xl font-black mb-2">{machines.length}</div>
                    <div className="text-xs text-blue-500 font-bold">Across {lines.length} Lines</div>
                  </div>
                  <div className="col-span-2 bg-zinc-900 border border-zinc-800 p-8 rounded-3xl">
                    <div className="flex justify-between items-center mb-6">
                      <h4 className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">OEE Performance Ranking</h4>
                      <BarChart3 size={16} className="text-zinc-600" />
                    </div>
                    <div className="space-y-6">
                      {lines.map((l, i) => (
                        <div key={l.id} className="space-y-2">
                          <div className="flex justify-between text-xs font-bold">
                            <span>{l.line_number} - {l.name}</span>
                            <span className="text-emerald-500">{(85 - i * 5)}%</span>
                          </div>
                          <div className="w-full bg-zinc-800 h-2 rounded-full overflow-hidden">
                            <motion.div 
                              initial={{ width: 0 }}
                              animate={{ width: `${85 - i * 5}%` }}
                              className="bg-emerald-500 h-full rounded-full" 
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
                <div className="bg-zinc-900 border border-zinc-800 p-8 rounded-3xl flex flex-col">
                  <h4 className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-6">Recent Activity</h4>
                  <div className="space-y-6 flex-1">
                    {[1, 2, 3, 4].map(i => (
                      <div key={i} className="flex gap-4">
                        <div className="w-1 h-10 bg-zinc-800 rounded-full" />
                        <div>
                          <div className="text-xs font-bold">Optel Report Uploaded</div>
                          <div className="text-[10px] text-zinc-500">Line L01 • 2 hours ago</div>
                        </div>
                      </div>
                    ))}
                  </div>
                  <button className="w-full py-3 bg-zinc-800 hover:bg-zinc-700 rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all">
                    View Full Audit Log
                  </button>
                </div>
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </main>
    </div>
  );
}
