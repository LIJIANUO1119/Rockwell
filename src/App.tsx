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
  GitBranch,
  Network,
  Maximize2,
  Activity,
  ShieldAlert,
  Zap
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

type Tab = 'dashboard' | 'config' | 'cycletime' | 'allocation' | 'new_allocation';

interface Line {
  id: number;
  facility: string;
  line_number: string;
  name: string;
  status: string;
  machine_count: number;
}

interface Machine {
  id: number;
  line_id: number;
  line_name: string;
  machine_id: string;
  equipment_type: string;
  brand: string;
  model: string;
  name: string;
  serial_number: string;
  software_level: string;
  ip_address: string;
  dns: string;
  gateway: string;
  os: string;
  windows_key: string;
  year: string;
  nozzle_config: string;
}

interface Constraint {
  id: number;
  line_id: number;
  line_number: string;
  type: string;
  description: string;
  is_active: number;
}

interface CycleTime {
  id: number;
  macyid: string;
  plant: string;
  line_id: number;
  setupnum: string;
  workorderno: string;
  assembly_no: string;
  revision: string;
  side: string;
  machine_name: string;
  line_position: string;
  boardsp: number;
  modules: number;
  total_panel: number;
  panel_start_time: string;
  panel_end_time: string;
  medium_cycle_time: number;
  current_cycle_time: number;
}

interface FamilyGrouping {
  id: number;
  assembly_number: string;
  pcb_number: string;
  family: string;
  family_num: string;
  top_line_name: string;
  bottom_line_name: string;
  cycle_time: number;
  circuit_count: number;
  board_length: number;
  board_width: number;
  placement_count: number;
}

interface Bottleneck {
  line_id: number;
  machine_name: string;
  max_time: number;
}

export default function App() {
  const [activeTab, setActiveTab] = useState<Tab>('dashboard');
  const [lines, setLines] = useState<Line[]>([]);
  const [machines, setMachines] = useState<Machine[]>([]);
  const [constraints, setConstraints] = useState<Constraint[]>([]);
  const [cycleTimes, setCycleTimes] = useState<CycleTime[]>([]);
  const [familyGroupings, setFamilyGroupings] = useState<FamilyGrouping[]>([]);
  const [bottlenecks, setBottlenecks] = useState<Bottleneck[]>([]);
  const [simulationResults, setSimulationResults] = useState<any[]>([]);
  const [stats, setStats] = useState({ totalLines: 0, totalMachines: 0, activeBottlenecks: 0, lastSync: '' });
  const [loading, setLoading] = useState(true);
  const [showAddLine, setShowAddLine] = useState(false);
  const [showAddMachine, setShowAddMachine] = useState(false);
  const [newLine, setNewLine] = useState({ facility: 'Rockwell-SGP', line_number: '', name: '' });
  const [newMachine, setNewMachine] = useState({ 
    line_id: 0, machine_id: '', equipment_type: 'Mounter', brand: '', model: '', name: '', 
    serial_number: '', software_level: '', ip_address: '', dns: '', gateway: '', 
    os: '', windows_key: '', year: '', nozzle_config: '' 
  });
  const [etfComponents, setEtfComponents] = useState([
    { part_number: 'PN-8829-X', nozzle: 'CN030', placement_count: 120 },
    { part_number: 'PN-1122-Y', nozzle: 'CN040', placement_count: 45 }
  ]);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [linesRes, machinesRes, constraintsRes, cycleRes, familyRes, bottleRes, statsRes] = await Promise.all([
        fetch('/api/lines'),
        fetch('/api/machines'),
        fetch('/api/constraints'),
        fetch('/api/cycle-times'),
        fetch('/api/family-groupings'),
        fetch('/api/bottlenecks'),
        fetch('/api/stats')
      ]);
      setLines(await linesRes.json());
      setMachines(await machinesRes.json());
      setConstraints(await constraintsRes.json());
      setCycleTimes(await cycleRes.json());
      setFamilyGroupings(await familyRes.json());
      setBottlenecks(await bottleRes.json());
      setStats(await statsRes.json());
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleConstraint = async (id: number, currentStatus: number) => {
    await fetch('/api/constraints/toggle', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, is_active: !currentStatus })
    });
    fetchData();
  };

  const addLine = async () => {
    if (!newLine.line_number || !newLine.name) return;
    await fetch('/api/lines', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newLine)
    });
    setNewLine({ facility: 'Rockwell-SGP', line_number: '', name: '' });
    setShowAddLine(false);
    fetchData();
  };

  const addMachine = async () => {
    if (!newMachine.line_id || !newMachine.name) return;
    await fetch('/api/machines', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newMachine)
    });
    setShowAddMachine(false);
    fetchData();
  };

  const deleteLine = async (id: number) => {
    if (!confirm('Delete this line and all its machines?')) return;
    await fetch(`/api/lines/${id}`, { method: 'DELETE' });
    fetchData();
  };

  const deleteMachine = async (id: number) => {
    if (!confirm('Delete this machine?')) return;
    await fetch(`/api/machines/${id}`, { method: 'DELETE' });
    fetchData();
  };

  const runSimulation = async () => {
    const res = await fetch('/api/simulate-allocation', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ components: etfComponents })
    });
    setSimulationResults(await res.json());
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
      <span className="text-sm font-bold uppercase tracking-wider">{label}</span>
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
            <span className="text-[10px] text-emerald-500 font-bold tracking-widest uppercase">Manager v1.2</span>
          </div>
        </div>

        <nav className="flex flex-col gap-1">
          <SidebarItem id="dashboard" icon={LayoutDashboard} label="Dashboard" />
          <SidebarItem id="config" icon={Factory} label="SMT LINE CONFIGURATION" />
          <SidebarItem id="cycletime" icon={History} label="Product Cycletime" />
          <SidebarItem id="allocation" icon={GitBranch} label="Product Allocation" />
          <SidebarItem id="new_allocation" icon={Search} label="New Allocation" />
        </nav>

        <div className="mt-auto p-4 bg-zinc-900/50 rounded-2xl border border-zinc-800">
          <div className="flex items-center gap-2 text-[10px] text-zinc-500 uppercase font-bold tracking-widest mb-3">
            <Activity size={12} />
            System Health
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
              <span className="text-xs font-bold">SQL Connected</span>
            </div>
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
               activeTab === 'cycletime' ? 'PRODUCT CYCLETIME ANALYSIS' :
               activeTab === 'allocation' ? 'PRODUCT LINE ALLOCATION' :
               activeTab === 'new_allocation' ? 'NEW PRODUCT ALLOCATION' :
               activeTab.toUpperCase()}
            </h2>
          </div>
          <div className="flex gap-3">
            <button className="px-5 py-2.5 bg-zinc-800 hover:bg-zinc-700 rounded-xl text-xs font-bold uppercase tracking-widest transition-all flex items-center gap-2 border border-zinc-700">
              <Download size={14} />
              Export Config
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
              <div className="space-y-6">
                <div className="flex justify-between items-end mb-4">
                  <div>
                    <h3 className="text-2xl font-black flex items-center gap-3 uppercase tracking-tighter">
                      <Factory className="text-emerald-500" />
                      SMT LINE CONFIGURATION
                    </h3>
                    <p className="text-zinc-500 text-xs font-bold uppercase tracking-widest mt-1">Integrated Machine & Software Matrix</p>
                  </div>
                  <div className="flex gap-3">
                    <a 
                      href="/api/reports/config" 
                      className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all flex items-center gap-2"
                    >
                      <Download size={14} /> Export All Line, Machine, Software and Nozzle Configuration
                    </a>
                    <button 
                      onClick={() => setShowAddMachine(!showAddMachine)}
                      className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all flex items-center gap-2"
                    >
                      <Plus size={14} /> {showAddMachine ? 'Cancel' : 'Add Machine'}
                    </button>
                  </div>
                </div>

                {showAddMachine && (
                  <div className="p-6 bg-zinc-900 border border-emerald-500/30 rounded-2xl space-y-4 shadow-2xl">
                    <div className="grid grid-cols-4 gap-4">
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-zinc-500 uppercase">Process Line</label>
                        <select 
                          className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-2 text-sm outline-none"
                          onChange={e => setNewMachine({...newMachine, line_id: parseInt(e.target.value)})}
                        >
                          <option value="">Select Line</option>
                          {lines.map(l => <option key={l.id} value={l.id}>{l.line_number}</option>)}
                        </select>
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-zinc-500 uppercase">Machine ID</label>
                        <input 
                          placeholder="e.g. M-101"
                          className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-2 text-sm outline-none"
                          onChange={e => setNewMachine({...newMachine, machine_id: e.target.value})}
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-zinc-500 uppercase">Machine Model</label>
                        <input 
                          placeholder="e.g. NXT-III"
                          className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-2 text-sm outline-none"
                          onChange={e => setNewMachine({...newMachine, model: e.target.value})}
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-zinc-500 uppercase">Equip Type</label>
                        <input 
                          placeholder="e.g. Mounter"
                          className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-2 text-sm outline-none"
                          onChange={e => setNewMachine({...newMachine, equipment_type: e.target.value})}
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-4 gap-4">
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-zinc-500 uppercase">Serial / Computer Name</label>
                        <input 
                          className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-2 text-sm outline-none"
                          onChange={e => setNewMachine({...newMachine, serial_number: e.target.value})}
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-zinc-500 uppercase">Software Version</label>
                        <input 
                          placeholder="GUI xxxx; MCS yyyy"
                          className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-2 text-sm outline-none"
                          onChange={e => setNewMachine({...newMachine, software_level: e.target.value})}
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-zinc-500 uppercase">IP Address</label>
                        <input 
                          className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-2 text-sm outline-none"
                          onChange={e => setNewMachine({...newMachine, ip_address: e.target.value})}
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-zinc-500 uppercase">DNS</label>
                        <input 
                          className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-2 text-sm outline-none"
                          onChange={e => setNewMachine({...newMachine, dns: e.target.value})}
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-4 gap-4">
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-zinc-500 uppercase">Gateway</label>
                        <input 
                          className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-2 text-sm outline-none"
                          onChange={e => setNewMachine({...newMachine, gateway: e.target.value})}
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-zinc-500 uppercase">OS</label>
                        <input 
                          className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-2 text-sm outline-none"
                          onChange={e => setNewMachine({...newMachine, os: e.target.value})}
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-zinc-500 uppercase">Windows Key</label>
                        <input 
                          className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-2 text-sm outline-none"
                          onChange={e => setNewMachine({...newMachine, windows_key: e.target.value})}
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-zinc-500 uppercase">Year</label>
                        <input 
                          className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-2 text-sm outline-none"
                          onChange={e => setNewMachine({...newMachine, year: e.target.value})}
                        />
                      </div>
                    </div>
                    <div className="flex justify-end pt-2">
                      <button 
                        onClick={addMachine}
                        className="px-8 py-2 bg-emerald-600 hover:bg-emerald-500 rounded-xl font-bold uppercase tracking-widest text-[10px] transition-all"
                      >
                        Save Configuration
                      </button>
                    </div>
                  </div>
                )}

                <div className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden shadow-2xl">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead className="bg-zinc-800/80 sticky top-0 z-10">
                        <tr>
                          <th className="px-4 py-4 text-[10px] font-bold text-zinc-400 uppercase tracking-widest border-b border-zinc-800">Process Line</th>
                          <th className="px-4 py-4 text-[10px] font-bold text-zinc-400 uppercase tracking-widest border-b border-zinc-800">Machine ID</th>
                          <th className="px-4 py-4 text-[10px] font-bold text-zinc-400 uppercase tracking-widest border-b border-zinc-800">Machine model</th>
                          <th className="px-4 py-4 text-[10px] font-bold text-zinc-400 uppercase tracking-widest border-b border-zinc-800">Equip Type</th>
                          <th className="px-4 py-4 text-[10px] font-bold text-zinc-400 uppercase tracking-widest border-b border-zinc-800">Serial Number / Computer Name</th>
                          <th className="px-4 py-4 text-[10px] font-bold text-zinc-400 uppercase tracking-widest border-b border-zinc-800">Software Version</th>
                          <th className="px-4 py-4 text-[10px] font-bold text-zinc-400 uppercase tracking-widest border-b border-zinc-800">IP Address</th>
                          <th className="px-4 py-4 text-[10px] font-bold text-zinc-400 uppercase tracking-widest border-b border-zinc-800">DNS</th>
                          <th className="px-4 py-4 text-[10px] font-bold text-zinc-400 uppercase tracking-widest border-b border-zinc-800">Gateway</th>
                          <th className="px-4 py-4 text-[10px] font-bold text-zinc-400 uppercase tracking-widest border-b border-zinc-800">OS</th>
                          <th className="px-4 py-4 text-[10px] font-bold text-zinc-400 uppercase tracking-widest border-b border-zinc-800">Windows Key</th>
                          <th className="px-4 py-4 text-[10px] font-bold text-zinc-400 uppercase tracking-widest border-b border-zinc-800">Year</th>
                          <th className="px-4 py-4 text-[10px] font-bold text-zinc-400 uppercase tracking-widest border-b border-zinc-800 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-zinc-800">
                        {machines.map(m => (
                          <tr key={m.id} className="hover:bg-emerald-500/5 transition-colors group">
                            <td className="px-4 py-3 font-bold text-emerald-500 whitespace-nowrap">{m.line_name}</td>
                            <td className="px-4 py-3 font-mono text-xs text-zinc-300 whitespace-nowrap">{m.machine_id}</td>
                            <td className="px-4 py-3 text-sm text-zinc-400 whitespace-nowrap">{m.model}</td>
                            <td className="px-4 py-3 text-[10px] font-bold text-zinc-500 uppercase whitespace-nowrap">{m.equipment_type}</td>
                            <td className="px-4 py-3 text-sm text-zinc-300 whitespace-nowrap">{m.serial_number}</td>
                            <td className="px-4 py-3">
                              <div className="text-[11px] font-mono bg-zinc-800/50 px-2 py-1 rounded border border-zinc-700/50 text-emerald-400 inline-block whitespace-nowrap">
                                {m.software_level}
                              </div>
                            </td>
                            <td className="px-4 py-3 font-mono text-xs text-blue-400 whitespace-nowrap">{m.ip_address}</td>
                            <td className="px-4 py-3 font-mono text-[10px] text-zinc-500 whitespace-nowrap">{m.dns}</td>
                            <td className="px-4 py-3 font-mono text-[10px] text-zinc-500 whitespace-nowrap">{m.gateway}</td>
                            <td className="px-4 py-3 text-xs text-zinc-400 whitespace-nowrap">{m.os}</td>
                            <td className="px-4 py-3 font-mono text-[10px] text-zinc-500 whitespace-nowrap">{m.windows_key}</td>
                            <td className="px-4 py-3 text-sm text-zinc-400 whitespace-nowrap">{m.year}</td>
                            <td className="px-4 py-3 text-right">
                              <button 
                                onClick={() => deleteMachine(m.id)}
                                className="text-zinc-700 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100"
                              >
                                <Trash2 size={14} />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  {machines.length === 0 && (
                    <div className="p-20 text-center">
                      <Database className="mx-auto text-zinc-800 mb-4" size={48} />
                      <p className="text-zinc-500 font-bold uppercase tracking-widest text-xs">No machine configuration data found</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {activeTab === 'cycletime' && (
              <div className="space-y-8">
                <div className="grid grid-cols-4 gap-4">
                  <button className="p-6 bg-zinc-900 border border-zinc-800 rounded-2xl hover:border-emerald-500/50 transition-all text-left group">
                    <FileUp className="text-emerald-500 mb-4 group-hover:scale-110 transition-transform" />
                    <h4 className="text-xs font-bold mb-1 uppercase tracking-widest">SGP_GEM_MACHINE_CYCLETIME</h4>
                    <p className="text-[10px] text-zinc-500">Upload Machine Report</p>
                  </button>
                  <button className="p-6 bg-zinc-900 border border-zinc-800 rounded-2xl hover:border-blue-500/50 transition-all text-left group">
                    <FileUp className="text-blue-500 mb-4 group-hover:scale-110 transition-transform" />
                    <h4 className="text-xs font-bold mb-1 uppercase tracking-widest">SGP_ASSEMBLY_BUILD_TO_MODULE</h4>
                    <p className="text-[10px] text-zinc-500">Upload Build Info</p>
                  </button>
                  <button 
                    onClick={() => window.open('/api/reports/performance?type=not_meeting')}
                    className="p-6 bg-zinc-900 border border-zinc-800 rounded-2xl hover:border-red-500/50 transition-all text-left group"
                  >
                    <ShieldAlert className="text-red-500 mb-4 group-hover:scale-110 transition-transform" />
                    <h4 className="text-xs font-bold mb-1 uppercase tracking-widest">Not Meeting Target</h4>
                    <p className="text-[10px] text-zinc-500">Generate Performance Report</p>
                  </button>
                  <button 
                    onClick={() => window.open('/api/reports/performance?type=exceeding')}
                    className="p-6 bg-zinc-900 border border-zinc-800 rounded-2xl hover:border-orange-500/50 transition-all text-left group"
                  >
                    <AlertCircle className="text-orange-500 mb-4 group-hover:scale-110 transition-transform" />
                    <h4 className="text-xs font-bold mb-1 uppercase tracking-widest">Exceeding Target</h4>
                    <p className="text-[10px] text-zinc-500">Generate Performance Report</p>
                  </button>
                </div>

                <div className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden">
                  <div className="p-6 border-b border-zinc-800 bg-zinc-800/30 flex justify-between items-center">
                    <h3 className="text-sm font-bold uppercase tracking-widest">SGP_GEM_MACHINE_CYCLETIME Data</h3>
                    <div className="flex gap-3">
                      <a href="/api/reports/performance?type=not_meeting" className="px-3 py-1.5 bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 rounded-lg text-[10px] font-bold uppercase tracking-widest text-red-500 transition-all flex items-center gap-2">
                        <Download size={12} /> Not Meeting Target
                      </a>
                      <a href="/api/reports/performance?type=exceeding" className="px-3 py-1.5 bg-orange-500/10 hover:bg-orange-500/20 border border-orange-500/20 rounded-lg text-[10px] font-bold uppercase tracking-widest text-orange-500 transition-all flex items-center gap-2">
                        <Download size={12} /> Exceed Target
                      </a>
                      <a href="/api/reports/performance?type=all" className="px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 rounded-lg text-[10px] font-bold uppercase tracking-widest transition-all flex items-center gap-2">
                        <Download size={12} /> All Data
                      </a>
                    </div>
                  </div>
                  <div className="p-6 border-b border-zinc-800 bg-zinc-900/50 flex flex-wrap gap-4">
                    {bottlenecks.map(b => (
                      <div key={b.line_id} className="flex items-center gap-2 px-3 py-1 bg-red-500/10 border border-red-500/20 rounded-lg">
                        <span className="text-[10px] font-black text-red-500 uppercase">Bottleneck:</span>
                        <span className="text-[10px] font-bold text-zinc-300">{b.machine_name} ({b.max_time}s)</span>
                      </div>
                    ))}
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left">
                      <thead className="bg-zinc-800/50 border-b border-zinc-800">
                        <tr>
                          <th className="px-4 py-4 text-[10px] font-bold text-zinc-500 uppercase tracking-widest">MACYID</th>
                          <th className="px-4 py-4 text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Plant</th>
                          <th className="px-4 py-4 text-[10px] font-bold text-zinc-500 uppercase tracking-widest">SetupNum</th>
                          <th className="px-4 py-4 text-[10px] font-bold text-zinc-500 uppercase tracking-widest">WorkOrder</th>
                          <th className="px-4 py-4 text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Assembly / Rev</th>
                          <th className="px-4 py-4 text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Side</th>
                          <th className="px-4 py-4 text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Machine Name</th>
                          <th className="px-4 py-4 text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Board SP</th>
                          <th className="px-4 py-4 text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Modules</th>
                          <th className="px-4 py-4 text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Total Panel</th>
                          <th className="px-4 py-4 text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Start / End Time</th>
                          <th className="px-4 py-4 text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Current CT</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-zinc-800">
                        {cycleTimes.map(ct => (
                          <tr key={ct.id} className="hover:bg-zinc-800/20">
                            <td className="px-4 py-4 font-mono text-[10px] text-emerald-500">{ct.macyid}</td>
                            <td className="px-4 py-4 text-xs font-bold text-zinc-400">SGP</td>
                            <td className="px-4 py-4 text-xs">{ct.setupnum}</td>
                            <td className="px-4 py-4 text-xs font-mono">{ct.workorderno}</td>
                            <td className="px-4 py-4">
                              <div className="font-bold text-xs">{ct.assembly_no}</div>
                              <div className="text-[10px] text-zinc-500 font-mono">Rev: {ct.revision}</div>
                            </td>
                            <td className="px-4 py-4">
                              <span className="px-2 py-0.5 bg-zinc-800 rounded text-[10px] font-bold border border-zinc-700 uppercase">{ct.side}</span>
                            </td>
                            <td className="px-4 py-4 text-xs">{ct.machine_name}</td>
                            <td className="px-4 py-4 font-mono text-xs">{ct.boardsp}</td>
                            <td className="px-4 py-4 text-xs">1</td>
                            <td className="px-4 py-4 text-xs">100</td>
                            <td className="px-4 py-4 text-[10px] text-zinc-500 font-mono">
                              <div>{ct.panel_start_time}</div>
                              <div>{ct.panel_end_time}</div>
                            </td>
                            <td className={`px-4 py-4 font-mono text-xs font-bold ${ct.current_cycle_time > ct.medium_cycle_time ? 'text-red-500' : 'text-emerald-500'}`}>
                              {ct.current_cycle_time}s
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'allocation' && (
              <div className="space-y-8">
                <div className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden">
                  <div className="p-6 border-b border-zinc-800 bg-zinc-800/30 flex justify-between items-center">
                    <h3 className="text-sm font-bold uppercase tracking-widest">SGP_FAMILY_GROUPINGS_DETAIL (Current Allocation)</h3>
                    <div className="flex gap-3">
                      <a href="/api/reports/allocation" className="px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 rounded-lg text-[10px] font-bold uppercase tracking-widest transition-all flex items-center gap-2">
                        <Download size={12} /> Export Allocation
                      </a>
                      <button className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all">
                        Upload Family Data
                      </button>
                    </div>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left">
                      <thead className="bg-zinc-800/50 border-b border-zinc-800">
                        <tr>
                          <th className="px-4 py-4 text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Assembly #</th>
                          <th className="px-4 py-4 text-[10px] font-bold text-zinc-500 uppercase tracking-widest">PCB #</th>
                          <th className="px-4 py-4 text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Family / #</th>
                          <th className="px-4 py-4 text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Family Set Up</th>
                          <th className="px-4 py-4 text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Primary Line</th>
                          <th className="px-4 py-4 text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Secondary Line</th>
                          <th className="px-4 py-4 text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Tertiary Line</th>
                          <th className="px-4 py-4 text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Dimensions (L/W)</th>
                          <th className="px-4 py-4 text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Placements</th>
                          <th className="px-4 py-4 text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Bottleneck</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-zinc-800">
                        {familyGroupings.map(f => {
                          return (
                            <tr key={f.id} className="hover:bg-zinc-800/20">
                              <td className="px-4 py-4 font-bold">{f.assembly_number}</td>
                              <td className="px-4 py-4 text-xs text-zinc-500">{f.pcb_number}</td>
                              <td className="px-4 py-4">
                                <div className="text-xs font-bold text-blue-400">{f.family}</div>
                                <div className="text-[10px] text-zinc-500">{f.family_num}</div>
                              </td>
                              <td className="px-4 py-4 text-xs font-bold text-zinc-400">{f.family_setup || 'N/A'}</td>
                              <td className="px-4 py-4">
                                <span className="px-2 py-1 bg-emerald-500/10 text-emerald-500 text-[10px] font-bold rounded border border-emerald-500/20">
                                  {f.top_line_name}
                                </span>
                              </td>
                              <td className="px-4 py-4">
                                <span className="px-2 py-1 bg-zinc-800 text-zinc-400 text-[10px] font-bold rounded border border-zinc-700">
                                  {f.bottom_line_name}
                                </span>
                              </td>
                              <td className="px-4 py-4">
                                <span className="px-2 py-1 bg-zinc-800 text-zinc-500 text-[10px] font-bold rounded border border-zinc-700">
                                  {f.tertiary_line_name || '-'}
                                </span>
                              </td>
                              <td className="px-4 py-4 text-xs font-mono">
                                {f.board_length} x {f.board_width}
                              </td>
                              <td className="px-4 py-4 text-xs font-bold">{f.placement_count}</td>
                              <td className="px-4 py-4 text-xs font-bold text-red-500">{f.cycle_time}s</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'new_allocation' && (
              <div className="max-w-4xl mx-auto space-y-8">
                <div className="bg-zinc-900 border border-zinc-800 p-8 rounded-3xl shadow-2xl">
                  <div className="flex items-center gap-4 mb-8">
                    <div className="w-12 h-12 bg-emerald-500 rounded-2xl flex items-center justify-center">
                      <Search className="text-black" />
                    </div>
                    <div>
                      <h3 className="text-xl font-black">New Product Line Allocation</h3>
                      <p className="text-xs text-zinc-500 uppercase tracking-widest font-bold">ETF Sample / Component Data Analysis</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="space-y-6">
                      <div className="p-6 bg-zinc-800/30 border border-zinc-800 rounded-2xl">
                        <h4 className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-4">ETF Component Data</h4>
                        <div className="space-y-3">
                          {etfComponents.map((comp, idx) => (
                            <div key={idx} className="flex items-center justify-between p-3 bg-zinc-900 rounded-xl border border-zinc-800">
                              <div>
                                <div className="text-xs font-bold">{comp.part_number}</div>
                                <div className="text-[10px] text-zinc-500">Placement Count: {comp.placement_count}</div>
                              </div>
                              <div className="text-[10px] px-2 py-1 bg-blue-500/10 text-blue-400 rounded">{comp.nozzle}</div>
                            </div>
                          ))}
                          <button className="w-full py-3 border border-dashed border-zinc-700 rounded-xl text-xs text-zinc-500 hover:text-zinc-300 transition-colors">
                            + Upload ETF File
                          </button>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-6">
                      <div className="p-6 bg-emerald-500/5 border border-emerald-500/10 rounded-2xl">
                        <h4 className="text-[10px] font-bold text-emerald-500 uppercase tracking-widest mb-4">Allocation Recommendation</h4>
                        <p className="text-xs text-zinc-400 leading-relaxed">
                          The system analyzes machine capability, component requirements (Part Number, Nozzle), and line constraints to recommend the best SMT line.
                        </p>
                        <div className="mt-6 space-y-4">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 bg-emerald-500/20 rounded-lg flex items-center justify-center text-emerald-500 font-bold text-xs">A</div>
                            <div className="text-[10px] font-bold uppercase tracking-widest">Analyze Machine Capability</div>
                          </div>
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 bg-emerald-500/20 rounded-lg flex items-center justify-center text-emerald-500 font-bold text-xs">B</div>
                            <div className="text-[10px] font-bold uppercase tracking-widest">Match Nozzle Requirements</div>
                          </div>
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 bg-emerald-500/20 rounded-lg flex items-center justify-center text-emerald-500 font-bold text-xs">C</div>
                            <div className="text-[10px] font-bold uppercase tracking-widest">Verify Line Constraints</div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  <button 
                    onClick={runSimulation}
                    className="w-full mt-8 py-4 bg-emerald-600 hover:bg-emerald-500 rounded-2xl font-black text-lg transition-all shadow-xl shadow-emerald-900/20"
                  >
                    SIMULATE ALLOCATION
                  </button>

                  {simulationResults.length > 0 && (
                    <div className="mt-12 space-y-4">
                      <h4 className="text-sm font-bold uppercase tracking-widest text-emerald-500">Simulation Results</h4>
                      <div className="grid grid-cols-1 gap-4">
                        {simulationResults.map((res, i) => (
                          <div key={i} className={`p-6 rounded-2xl border ${res.is_capable ? 'bg-emerald-500/5 border-emerald-500/20' : 'bg-red-500/5 border-red-500/20 opacity-60'}`}>
                            <div className="flex justify-between items-center mb-4">
                              <div>
                                <div className="text-xl font-black">{res.line_number}</div>
                                <div className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Line Compatibility Score: {res.score}</div>
                              </div>
                              <div className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest ${res.is_capable ? 'bg-emerald-500 text-black' : 'bg-red-500 text-white'}`}>
                                {res.is_capable ? 'Capable' : 'Incapable'}
                              </div>
                            </div>
                            {res.missingNozzles.length > 0 && (
                              <div className="text-[10px] text-red-400 font-bold uppercase tracking-widest mb-2">
                                Missing Nozzles: {res.missingNozzles.join(', ')}
                              </div>
                            )}
                            {res.constraints.length > 0 && (
                              <div className="text-[10px] text-orange-400 font-bold uppercase tracking-widest">
                                Active Constraints: {res.constraints.join(', ')}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {activeTab === 'dashboard' && (
              <div className="space-y-8">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                  <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-3xl shadow-xl">
                    <div className="text-zinc-500 text-[10px] font-bold uppercase tracking-widest mb-2">Total SMT Lines</div>
                    <div className="text-4xl font-black text-emerald-500">{stats.totalLines}</div>
                  </div>
                  <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-3xl shadow-xl">
                    <div className="text-zinc-500 text-[10px] font-bold uppercase tracking-widest mb-2">Active Machines</div>
                    <div className="text-4xl font-black text-blue-500">{stats.totalMachines}</div>
                  </div>
                  <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-3xl shadow-xl">
                    <div className="text-zinc-500 text-[10px] font-bold uppercase tracking-widest mb-2">Critical Bottlenecks</div>
                    <div className="text-4xl font-black text-red-500">{stats.activeBottlenecks}</div>
                  </div>
                  <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-3xl shadow-xl">
                    <div className="text-zinc-500 text-[10px] font-bold uppercase tracking-widest mb-2">System Health</div>
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 bg-emerald-500 rounded-full animate-pulse"></div>
                      <div className="text-lg font-bold text-emerald-500 uppercase tracking-tighter">Operational</div>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="bg-zinc-900 border border-zinc-800 p-8 rounded-3xl">
                    <h3 className="text-lg font-black mb-6 flex items-center gap-3">
                      <Activity className="text-emerald-500" />
                      Production Performance Overview
                    </h3>
                    <div className="space-y-4">
                      <div className="flex justify-between items-center p-4 bg-zinc-800/30 rounded-2xl border border-zinc-800">
                        <div className="text-xs font-bold text-zinc-400 uppercase tracking-widest">Avg Line Efficiency</div>
                        <div className="text-xl font-black text-emerald-500">92.4%</div>
                      </div>
                      <div className="flex justify-between items-center p-4 bg-zinc-800/30 rounded-2xl border border-zinc-800">
                        <div className="text-xs font-bold text-zinc-400 uppercase tracking-widest">Target Compliance</div>
                        <div className="text-xl font-black text-blue-500">88.1%</div>
                      </div>
                    </div>
                  </div>

                  <div className="bg-zinc-900 border border-zinc-800 p-8 rounded-3xl">
                    <h3 className="text-lg font-black mb-6 flex items-center gap-3">
                      <Database className="text-emerald-500" />
                      System Integration Status
                    </h3>
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-2 h-2 bg-emerald-500 rounded-full"></div>
                          <span className="text-xs font-bold text-zinc-400">Optel Report Sync</span>
                        </div>
                        <span className="text-[10px] font-mono text-zinc-600">Last: {stats.lastSync ? stats.lastSync.split('T')[0] : 'N/A'}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-2 h-2 bg-emerald-500 rounded-full"></div>
                          <span className="text-xs font-bold text-zinc-400">Family Grouping Sync</span>
                        </div>
                        <span className="text-[10px] font-mono text-zinc-600">Last: {stats.lastSync ? stats.lastSync.split('T')[0] : 'N/A'}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-2 h-2 bg-emerald-500 rounded-full"></div>
                          <span className="text-xs font-bold text-zinc-400">ETF Analysis Engine</span>
                        </div>
                        <span className="text-[10px] font-mono text-zinc-600">Active</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </main>
    </div>
  );
}
