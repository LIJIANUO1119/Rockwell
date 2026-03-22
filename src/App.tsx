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
  Zap,
  LogIn,
  LogOut,
  Globe,
  User as UserIcon
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  collection, 
  onSnapshot, 
  addDoc, 
  deleteDoc, 
  doc, 
  updateDoc, 
  query, 
  orderBy,
  getDoc,
  getDocs,
  where,
  writeBatch,
  getDocFromServer
} from 'firebase/firestore';
import { 
  signInWithPopup, 
  GoogleAuthProvider, 
  onAuthStateChanged,
  signOut,
  User,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword
} from 'firebase/auth';
import { db, auth } from './firebase';

const translations = {
  en: {
    dashboard: 'Dashboard',
    lineConfig: 'Line Config',
    cycleTime: 'Cycle Time',
    allocation: 'Allocation',
    newProduct: 'New Product',
    loginTitle: 'SMT Line Manager',
    loginDesc: 'Enterprise Production Management Platform',
    googleLogin: 'Sign in with Google',
    emailLogin: 'Sign in with Email',
    guestMode: 'Guest Preview Mode',
    guestDesc: 'View demo data without signing in',
    logout: 'Logout',
    systemStatus: 'System Status',
    healthy: 'System Healthy',
    totalLines: 'Total SMT Lines',
    activeMachines: 'Active Machines',
    bottlenecks: 'Active Bottlenecks',
    performance: 'Performance Overview',
    avgEfficiency: 'Avg Line Efficiency',
    targetAchievement: 'Target Achievement',
    integration: 'System Integration Status',
    lastSync: 'Last',
    active: 'Active',
    confirm: 'Confirm',
    cancel: 'Cancel',
    authNotice: 'Authorized personnel only. All actions are logged.',
    demoNotice: 'Guest Preview Mode Active',
    deploymentHelp: 'Deployment Help',
    copyUrl: 'Copy App URL to Share',
    domainHelpTitle: 'Allow Others to Sign In',
    domainHelpDesc: 'To allow others to sign in with Google, you must add your App URL to the Firebase Authorized Domains list.',
    domainHelpStep1: '1. Go to Firebase Console > Authentication > Settings > Authorized Domains',
    domainHelpStep2: '2. Add your App URL: ',
    switchLang: '中文'
  },
  zh: {
    dashboard: '仪表盘',
    lineConfig: '产线配置',
    cycleTime: '节拍分析',
    allocation: '产线分配',
    newProduct: '新产品分配',
    loginTitle: 'SMT 产线管理系统',
    loginDesc: '企业级生产管理平台',
    googleLogin: '使用 Google 登录',
    emailLogin: '使用邮箱登录',
    guestMode: '访客预览模式',
    guestDesc: '无需登录即可查看演示数据',
    logout: '退出登录',
    systemStatus: '系统状态',
    healthy: '系统运行正常',
    totalLines: '总 SMT 产线',
    activeMachines: '活跃设备',
    bottlenecks: '关键瓶颈',
    performance: '生产绩效概览',
    avgEfficiency: '平均产线效率',
    targetAchievement: '目标达成率',
    integration: '系统集成状态',
    lastSync: '上次同步',
    active: '活跃',
    confirm: '确认',
    cancel: '取消',
    authNotice: '仅限授权人员访问。所有操作均有记录。',
    demoNotice: '访客预览模式已激活',
    deploymentHelp: '部署帮助',
    copyUrl: '复制应用链接分享',
    domainHelpTitle: '允许他人登录',
    domainHelpDesc: '要允许他人使用 Google 登录，您必须将应用 URL 添加到 Firebase 授权网域列表中。',
    domainHelpStep1: '1. 前往 Firebase 控制台 > Authentication > 设置 > 授权网域',
    domainHelpStep2: '2. 添加您的应用 URL：',
    switchLang: 'English'
  }
};

type Language = 'en' | 'zh';

type Tab = 'dashboard' | 'config' | 'cycletime' | 'allocation' | 'new_allocation';

interface Line {
  id: string;
  facility: string;
  line_number: string;
  name: string;
  status: string;
  machine_count: number;
}

interface Machine {
  id: string;
  line_id: string;
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
  id: string;
  line_id: string;
  line_number: string;
  type: string;
  description: string;
  is_active: boolean;
}

interface CycleTime {
  id: string;
  macyid: string;
  plant: string;
  line_id: string;
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
  id: string;
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
  line_id: string;
  machine_name: string;
  max_time: number;
}

enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId: string | undefined;
    email: string | null | undefined;
    emailVerified: boolean | undefined;
    isAnonymous: boolean | undefined;
    tenantId: string | null | undefined;
    providerInfo: {
      providerId: string;
      displayName: string | null;
      email: string | null;
      photoUrl: string | null;
    }[];
  }
}

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData.map(provider => ({
        providerId: provider.providerId,
        displayName: provider.displayName,
        email: provider.email,
        photoUrl: provider.photoURL
      })) || []
    },
    operationType,
    path
  }
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

interface ErrorBoundaryProps {
  children: React.ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  props: ErrorBoundaryProps;
  state: ErrorBoundaryState;

  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.props = props;
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("ErrorBoundary caught an error", error, errorInfo);
  }

  render() {
    const { hasError, error } = this.state;
    if (hasError) {
      let errorMessage = "An unexpected error occurred.";
      try {
        const parsed = JSON.parse(error?.message || "");
        if (parsed.error) errorMessage = parsed.error;
      } catch (e) {
        errorMessage = error?.message || errorMessage;
      }

      return (
        <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center p-6">
          <div className="max-w-md w-full bg-zinc-900 border border-red-500/30 p-10 rounded-3xl shadow-2xl text-center space-y-6">
            <div className="w-20 h-20 bg-red-500 rounded-3xl flex items-center justify-center mx-auto shadow-lg shadow-red-500/20">
              <ShieldAlert className="text-white" size={40} />
            </div>
            <div>
              <h1 className="text-2xl font-black tracking-tighter mb-2 text-red-500 uppercase">System Error</h1>
              <p className="text-zinc-400 text-sm leading-relaxed">{errorMessage}</p>
            </div>
            <button 
              onClick={() => window.location.reload()}
              className="w-full py-4 bg-zinc-800 hover:bg-zinc-700 text-white rounded-2xl font-bold transition-all border border-zinc-700"
            >
              RELOAD APPLICATION
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

function App() {
  const [activeTab, setActiveTab] = useState<Tab>('dashboard');
  const [lines, setLines] = useState<Line[]>([]);
  const [machines, setMachines] = useState<Machine[]>([]);
  const [constraints, setConstraints] = useState<Constraint[]>([]);
  const [cycleTimes, setCycleTimes] = useState<CycleTime[]>([]);
  const [familyGroupings, setFamilyGroupings] = useState<FamilyGrouping[]>([]);
  const [bottlenecks, setBottlenecks] = useState<Bottleneck[]>([]);
  const [simulationResults, setSimulationResults] = useState<any[]>([]);
  const [user, setUser] = useState<User | null>(null);
  const [isGuest, setIsGuest] = useState(false);
  const [lang, setLang] = useState<Language>('en');

  const t = (key: keyof typeof translations['en']) => translations[lang][key];
  const [stats, setStats] = useState({ totalLines: 0, totalMachines: 0, activeBottlenecks: 0, lastSync: '' });
  const [loading, setLoading] = useState(true);
  const [loginLoading, setLoginLoading] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);
  const [isSeeding, setIsSeeding] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<{ type: 'line' | 'machine', id: string } | null>(null);
  const [authMode, setAuthMode] = useState<'login' | 'register' | 'select'>('select');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showAddLine, setShowAddLine] = useState(false);
  const [showAddMachine, setShowAddMachine] = useState(false);
  const [showDeploymentHelp, setShowDeploymentHelp] = useState(false);
  const [newLine, setNewLine] = useState({ facility: 'Rockwell-SGP', line_number: '', name: '' });
  const [newMachine, setNewMachine] = useState({ 
    line_id: '', machine_id: '', equipment_type: 'Mounter', brand: '', model: '', name: '', 
    serial_number: '', software_level: '', ip_address: '', dns: '', gateway: '', 
    os: '', windows_key: '', year: '', nozzle_config: '' 
  });
  const [etfComponents, setEtfComponents] = useState([
    { part_number: 'PN-8829-X', nozzle: 'CN030', placement_count: 120 },
    { part_number: 'PN-1122-Y', nozzle: 'CN040', placement_count: 45 }
  ]);

  useEffect(() => {
    let unsubscribes: (() => void)[] = [];

    const unsubscribeAuth = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      if (currentUser || isGuest) {
        unsubscribes = setupListeners();
      } else {
        setLoading(false);
      }
    });

    if (isGuest) {
      unsubscribes = setupListeners();
    }

    return () => {
      unsubscribeAuth();
      unsubscribes.forEach(unsub => unsub?.());
    };
  }, [isGuest]);

  const setupListeners = () => {
    const unsubscribes: (() => void)[] = [];

    if (isGuest) {
      // Load Mock Data for Guest Mode
      const mockLines: Line[] = [
        { id: 'm1', facility: 'Rockwell-SGP', line_number: 'SM1', name: 'SM1 Production Line', status: 'Active', machine_count: 5 },
        { id: 'm2', facility: 'Rockwell-SGP', line_number: 'SM2', name: 'SM2 Production Line', status: 'Active', machine_count: 4 },
        { id: 'm3', facility: 'Rockwell-SGP', line_number: 'SM3', name: 'SM3 Production Line', status: 'Active', machine_count: 4 },
        { id: 'm7', facility: 'Rockwell-SGP', line_number: 'SM7', name: 'SM7 Production Line', status: 'Active', machine_count: 4 },
      ];
      const mockMachines: Machine[] = [
        { id: 'mac1', line_id: 'm1', line_name: 'SM1', machine_id: 'SPR11', equipment_type: 'Printer', brand: 'ITW', model: 'MPM Momentum', name: 'SPR11', serial_number: 'S12345', software_level: '5.2.05', ip_address: '10.116.42.247', dns: '10.126.0.147', gateway: '10.116.40.1', os: 'Win 10', windows_key: 'N/A', year: '2020', nozzle_config: 'Standard' },
        { id: 'mac2', line_id: 'm1', line_name: 'SM1', machine_id: 'GC6A', equipment_type: 'Mounter', brand: 'Universal', model: '120B015', name: 'GC6A', serial_number: 'S67890', software_level: 'Fuzion 3.13.5', ip_address: '10.116.41.128', dns: '10.126.0.147', gateway: '10.116.40.1', os: 'Win 7', windows_key: 'N/A', year: '2015', nozzle_config: 'CN030, CN040' },
      ];
      const mockCycleTimes: CycleTime[] = [
        { id: 'ct1', macyid: 'M101', plant: 'SGP', line_id: 'm1', setupnum: 'S1', workorderno: 'WO-9901', assembly_no: 'ASSY-001', revision: 'A', side: 'TOP', machine_name: 'GC6A', line_position: '3', boardsp: 12, modules: 1, total_panel: 100, panel_start_time: '08:00', panel_end_time: '08:01', medium_cycle_time: 15, current_cycle_time: 18 },
      ];
      
      setLines(mockLines);
      setMachines(mockMachines);
      setCycleTimes(mockCycleTimes);
      setStats({
        totalLines: mockLines.length,
        totalMachines: mockMachines.length,
        activeBottlenecks: 1,
        lastSync: new Date().toISOString()
      });
      setLoading(false);
      return [];
    }

    const unsubLines = onSnapshot(collection(db, 'lines'), (snapshot) => {
      const linesData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Line));
      setLines(linesData);
      setStats(prev => ({ ...prev, totalLines: linesData.length }));
    }, (error) => handleFirestoreError(error, OperationType.LIST, 'lines'));
    unsubscribes.push(unsubLines);

    const unsubMachines = onSnapshot(collection(db, 'machines'), (snapshot) => {
      const machinesData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Machine));
      setMachines(machinesData);
      setStats(prev => ({ ...prev, totalMachines: machinesData.length }));
    }, (error) => handleFirestoreError(error, OperationType.LIST, 'machines'));
    unsubscribes.push(unsubMachines);

    const unsubConstraints = onSnapshot(collection(db, 'constraints'), (snapshot) => {
      setConstraints(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Constraint)));
    }, (error) => handleFirestoreError(error, OperationType.LIST, 'constraints'));
    unsubscribes.push(unsubConstraints);

    const unsubCycleTimes = onSnapshot(collection(db, 'cycle_times'), (snapshot) => {
      const ctData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as CycleTime));
      setCycleTimes(ctData);
      
      // Calculate bottlenecks
      const lineBottlenecks: Record<string, Bottleneck> = {};
      ctData.forEach(ct => {
        if (!lineBottlenecks[ct.line_id] || ct.current_cycle_time > lineBottlenecks[ct.line_id].max_time) {
          lineBottlenecks[ct.line_id] = {
            line_id: ct.line_id,
            machine_name: ct.machine_name,
            max_time: ct.current_cycle_time
          };
        }
      });
      setBottlenecks(Object.values(lineBottlenecks));
      
      const activeB = Object.values(lineBottlenecks).filter(b => {
        const ct = ctData.find(c => c.line_id === b.line_id && c.machine_name === b.machine_name);
        return ct && ct.current_cycle_time > ct.medium_cycle_time;
      }).length;
      setStats(prev => ({ ...prev, activeBottlenecks: activeB, lastSync: new Date().toISOString() }));
    }, (error) => handleFirestoreError(error, OperationType.LIST, 'cycle_times'));
    unsubscribes.push(unsubCycleTimes);

    const unsubFamily = onSnapshot(collection(db, 'family_groupings'), (snapshot) => {
      setFamilyGroupings(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as FamilyGrouping)));
    }, (error) => handleFirestoreError(error, OperationType.LIST, 'family_groupings'));
    unsubscribes.push(unsubFamily);

    setLoading(false);
    
    // Test connection
    const testConnection = async () => {
      try {
        await getDocFromServer(doc(db, 'test', 'connection'));
      } catch (error) {
        if(error instanceof Error && error.message.includes('the client is offline')) {
          console.error("Please check your Firebase configuration. ");
        }
      }
    }
    testConnection();

    return unsubscribes;
  };

  const login = async () => {
    setLoginLoading(true);
    setLoginError(null);
    const provider = new GoogleAuthProvider();
    try {
      await signInWithPopup(auth, provider);
    } catch (error: any) {
      console.error('Login error:', error);
      if (error.code === 'auth/popup-blocked') {
        setLoginError('Login popup blocked by browser. Please allow popups for this site.');
      } else {
        setLoginError(error.message || 'Login failed. Please try again.');
      }
    } finally {
      setLoginLoading(false);
    }
  };

  const loginWithEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginLoading(true);
    setLoginError(null);
    try {
      if (authMode === 'register') {
        await createUserWithEmailAndPassword(auth, email, password);
      } else {
        await signInWithEmailAndPassword(auth, email, password);
      }
    } catch (error: any) {
      if (error.code === 'auth/email-already-in-use') {
        setLoginError('Email already in use.');
      } else if (error.code === 'auth/invalid-credential') {
        setLoginError('Invalid email or password.');
      } else if (error.code === 'auth/weak-password') {
        setLoginError('Password too weak. Use at least 6 characters.');
      } else {
        setLoginError(error.message);
      }
    } finally {
      setLoginLoading(false);
    }
  };

  const logout = () => signOut(auth);

  const toggleConstraint = async (id: string, currentStatus: boolean) => {
    await updateDoc(doc(db, 'constraints', id), { is_active: !currentStatus });
  };

  const addLine = async () => {
    if (!newLine.line_number || !newLine.name) return;
    try {
      await addDoc(collection(db, 'lines'), { ...newLine, status: 'Active' });
      setNewLine({ facility: 'Rockwell-SGP', line_number: '', name: '' });
      setShowAddLine(false);
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'lines');
    }
  };

  const addMachine = async () => {
    if (!newMachine.line_id || !newMachine.name) return;
    try {
      await addDoc(collection(db, 'machines'), newMachine);
      setShowAddMachine(false);
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'machines');
    }
  };

  const deleteLine = async (id: string) => {
    try {
      // Delete machines first
      const q = query(collection(db, 'machines'), where('line_id', '==', id));
      const snapshot = await getDocs(q);
      await Promise.all(snapshot.docs.map(d => deleteDoc(d.ref)));
      await deleteDoc(doc(db, 'lines', id));
      setConfirmDelete(null);
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `lines/${id}`);
    }
  };

  const deleteMachine = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'machines', id));
      setConfirmDelete(null);
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `machines/${id}`);
    }
  };

  const runSimulation = async () => {
    // Client-side simulation logic
    const results = lines.map(line => {
      const lineMachines = machines.filter(m => m.line_id === line.id);
      const lineConstraints = constraints.filter(c => c.line_id === line.id && c.is_active);
      
      let score = 0;
      let missingNozzles: string[] = [];

      etfComponents.forEach(comp => {
        const hasNozzle = lineMachines.some(m => 
          m.nozzle_config && m.nozzle_config.includes(comp.nozzle)
        );
        if (hasNozzle) {
          score += comp.placement_count;
        } else {
          missingNozzles.push(comp.nozzle);
        }
      });

      return {
        line_id: line.id,
        line_number: line.line_number,
        score,
        missingNozzles: [...new Set(missingNozzles)],
        constraints: lineConstraints.map(c => c.type),
        is_capable: missingNozzles.length === 0
      };
    });

    setSimulationResults(results.sort((a, b) => b.score - a.score));
  };

  const seedDatabase = async () => {
    if (!user || user.email !== 'jianuolee1@gmail.com') return;
    
    setIsSeeding(true);
    try {
      const batch = writeBatch(db);

      // Lines SM1-SM8
      const lineData = [
        { facility: 'Rockwell-SGP', line_number: 'SM1', name: 'SM1 Production Line', status: 'Active' },
        { facility: 'Rockwell-SGP', line_number: 'SM2', name: 'SM2 Production Line', status: 'Active' },
        { facility: 'Rockwell-SGP', line_number: 'SM3', name: 'SM3 Production Line', status: 'Active' },
        { facility: 'Rockwell-SGP', line_number: 'SM4', name: 'SM4 Production Line', status: 'Active' },
        { facility: 'Rockwell-SGP', line_number: 'SM5', name: 'SM5 Production Line', status: 'Active' },
        { facility: 'Rockwell-SGP', line_number: 'SM6', name: 'SM6 Production Line', status: 'Active' },
        { facility: 'Rockwell-SGP', line_number: 'SM7', name: 'SM7 Production Line', status: 'Active' },
        { facility: 'Rockwell-SGP', line_number: 'SM8', name: 'SM8 Production Line', status: 'Active' },
      ];

      const lineRefs: Record<string, string> = {};

      for (const l of lineData) {
        const lineRef = doc(collection(db, 'lines'));
        batch.set(lineRef, l);
        lineRefs[l.line_number] = lineRef.id;
      }

      // Real Machine Data from Image
      const machinesData = [
        // SM1
        { line_id: lineRefs['SM1'], machine_id: 'SPR11', equipment_type: 'Printer', model: 'MPM Momentum', software_level: '5.2.05', ip_address: '10.116.42.247', os: 'Win 10', year: '2020/10/20' },
        { line_id: lineRefs['SM1'], machine_id: 'PI1', equipment_type: 'SPI', model: 'KY8030-2', software_level: 'Win 10 4.10.0.2', os: 'Window 7 64bit' },
        { line_id: lineRefs['SM1'], machine_id: 'GC6A', equipment_type: 'Mounter', model: '120B015', software_level: 'Fuzion 3.13.5', ip_address: '10.116.41.128', os: 'Window 7', year: '2015/11/15' },
        { line_id: lineRefs['SM1'], machine_id: 'GC6B', equipment_type: 'Mounter', model: '120B015', software_level: 'Fuzion 3.13.5', ip_address: '10.116.41.129', os: 'Window 7', year: '2015/11/15' },
        { line_id: lineRefs['SM1'], machine_id: 'GX3', equipment_type: 'Mounter', model: 'Fuzion 2-14', software_level: 'Fuzion 3.13.1', ip_address: '10.116.41.115', os: 'Window 7', year: '2015/8/13' },
        
        // SM2
        { line_id: lineRefs['SM2'], machine_id: 'SPR4', equipment_type: 'Printer', model: 'DEK 03iX', software_level: '09 SP13' },
        { line_id: lineRefs['SM2'], machine_id: 'GC11', equipment_type: 'Mounter', model: 'Fuzion2-60', software_level: 'Win 7 Fuzion 3.13.1', ip_address: '10.116.41.236', os: 'Window 7' },
        { line_id: lineRefs['SM2'], machine_id: 'GC4', equipment_type: 'Mounter', model: 'GC60', software_level: 'Win XP UPS+8.5.6.3', ip_address: '10.116.40.203', os: 'XP SP3', year: '2010/10/10' },
        { line_id: lineRefs['SM2'], machine_id: 'GX6', equipment_type: 'Mounter', model: 'Fuzion2_14', software_level: 'Win 7 Fuzion 3.13.1', ip_address: '10.116.41.237', os: 'Window 7', year: '2020/11/23' },

        // SM3
        { line_id: lineRefs['SM3'], machine_id: 'SPR10', equipment_type: 'Printer', model: 'MPM Momentum II', software_level: '5.2.05', ip_address: '10.116.43.187', os: 'Win 10', year: '2020/10/20' },
        { line_id: lineRefs['SM3'], machine_id: 'GC9', equipment_type: 'Mounter', model: 'Fuzion2-60', software_level: 'Fuzion 3.13.5', ip_address: '10.116.41.134', os: 'Window 7' },
        { line_id: lineRefs['SM3'], machine_id: 'GC10', equipment_type: 'Mounter', model: 'Fuzion2-60', software_level: 'Fuzion 3.13.5', ip_address: '10.116.41.136', os: 'Window 7' },
        { line_id: lineRefs['SM3'], machine_id: 'GX1', equipment_type: 'Mounter', model: 'Fuzion2-14', software_level: 'Fuzion 3.13.1', ip_address: '10.116.41.137', os: 'Window 7', year: '2020/11/23' },

        // SM7
        { line_id: lineRefs['SM7'], machine_id: 'SPR12', equipment_type: 'Printer', model: 'MPM Momentum II', software_level: '6.0.2.3', ip_address: '10.116.43.184', os: 'Win 10', year: '2021/2/22' },
        { line_id: lineRefs['SM7'], machine_id: 'GC12', equipment_type: 'Mounter', model: 'Fuzion2-60', software_level: 'Win10 Fuzion 4.1.3', ip_address: '10.116.43.132', os: 'Window 10', year: '2022/2/22' },
        { line_id: lineRefs['SM7'], machine_id: 'GX7', equipment_type: 'Mounter', model: 'Fuzion2-14', software_level: 'Win10 Fuzion 4.1.3', ip_address: '10.116.43.130', os: 'Window 10', year: '2022/2/22' },
        { line_id: lineRefs['SM7'], machine_id: 'GX8', equipment_type: 'Mounter', model: 'Fuzion1-11', software_level: 'Win10 Fuzion 4.1.3', ip_address: '10.116.43.129', os: 'Window 10', year: '2022/2/22' },

        // SM8
        { line_id: lineRefs['SM8'], machine_id: 'SPR13', equipment_type: 'Printer', model: 'MPM Momentum II', software_level: '6.0.2.3', ip_address: '10.116.43.230', os: 'Win 10', year: '2021/2/22' },
        { line_id: lineRefs['SM8'], machine_id: 'GC13', equipment_type: 'Mounter', model: 'Fuzion2-60', software_level: 'Win 10 Fuzion 4.1.5', ip_address: '10.116.43.134', os: 'Window 10', year: '2022/2/22' },
        { line_id: lineRefs['SM8'], machine_id: 'GC14', equipment_type: 'Mounter', model: 'Fuzion2-60', software_level: 'Win 10 Fuzion 4.1.5', ip_address: '10.116.43.162', os: 'Window 10', year: '2022/2/22' },
        { line_id: lineRefs['SM8'], machine_id: 'GX9', equipment_type: 'Mounter', model: 'Fuzion1-11', software_level: 'Win 10 Fuzion 4.1.5', ip_address: '10.116.43.163', os: 'Window 10', year: '2022/2/22' },

        // SM4 (Placeholder based on typical patterns)
        { line_id: lineRefs['SM4'], machine_id: 'SPR5', equipment_type: 'Printer', model: 'DEK Horizon', software_level: '09 SP13', ip_address: '10.116.41.50', os: 'Win 7' },
        { line_id: lineRefs['SM4'], machine_id: 'GC5', equipment_type: 'Mounter', model: 'Fuzion2-60', software_level: 'Fuzion 3.13.1', ip_address: '10.116.41.51', os: 'Window 7' },
        
        // SM5 (Placeholder)
        { line_id: lineRefs['SM5'], machine_id: 'SPR6', equipment_type: 'Printer', model: 'MPM Momentum', software_level: '5.2.05', ip_address: '10.116.41.60', os: 'Win 10' },
        { line_id: lineRefs['SM5'], machine_id: 'GC6', equipment_type: 'Mounter', model: '120B015', software_level: 'Fuzion 3.13.5', ip_address: '10.116.41.61', os: 'Window 7' },

        // SM6 (Placeholder)
        { line_id: lineRefs['SM6'], machine_id: 'SPR7', equipment_type: 'Printer', model: 'DEK NeoHorizon', software_level: '10.0.1', ip_address: '10.116.41.70', os: 'Win 10' },
        { line_id: lineRefs['SM6'], machine_id: 'GC7', equipment_type: 'Mounter', model: 'Fuzion2-60', software_level: 'Fuzion 4.1.3', ip_address: '10.116.41.71', os: 'Window 10' },
      ];

      for (const m of machinesData) {
        const machineRef = doc(collection(db, 'machines'));
        batch.set(machineRef, {
          ...m,
          brand: m.model.includes('Fuzion') || m.model.includes('120B') ? 'Universal' : 
                 m.model.includes('MPM') ? 'ITW' : 'Other',
          name: m.machine_id,
          serial_number: 'SEE_IMAGE',
          dns: '10.126.0.147/148',
          gateway: '10.116.40.1',
          windows_key: 'N/A',
          nozzle_config: 'Standard'
        });
      }

      await batch.commit();
      setIsSeeding(false);
    } catch (error) {
      console.error('Seeding error:', error);
      setIsSeeding(false);
    }
  };

  const exportCSV = (data: any[], filename: string, headers: string[]) => {
    const csvContent = [
      headers.join(','),
      ...data.map(row => headers.map(h => {
        const val = row[h] || '';
        return `"${String(val).replace(/"/g, '""')}"`;
      }).join(','))
    ].join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
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

  if (!user && !isGuest) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center p-6">
        <div className="max-w-md w-full bg-zinc-900 border border-zinc-800 p-10 rounded-3xl shadow-2xl text-center space-y-8">
          <div className="w-20 h-20 bg-emerald-500 rounded-3xl flex items-center justify-center mx-auto shadow-lg shadow-emerald-500/20">
            <Factory className="text-black" size={40} />
          </div>
          <div>
            <h1 className="text-3xl font-black tracking-tighter mb-2">{t('loginTitle')}</h1>
            <p className="text-zinc-500 text-sm font-bold uppercase tracking-widest">{t('loginDesc')}</p>
          </div>

          {authMode === 'select' ? (
            <div className="space-y-4">
              <button 
                onClick={login}
                disabled={loginLoading}
                className="w-full py-4 bg-emerald-600 hover:bg-emerald-500 text-white rounded-2xl font-black text-lg transition-all flex items-center justify-center gap-3 shadow-xl shadow-emerald-900/20"
              >
                <LogIn size={24} />
                {t('googleLogin').toUpperCase()}
              </button>
              <div className="flex items-center gap-4 py-2">
                <div className="h-px flex-1 bg-zinc-800"></div>
                <span className="text-[10px] font-bold text-zinc-600 uppercase tracking-widest">OR</span>
                <div className="h-px flex-1 bg-zinc-800"></div>
              </div>
              <button 
                onClick={() => setAuthMode('login')}
                className="w-full py-4 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-2xl font-bold text-sm transition-all border border-zinc-700"
              >
                {t('emailLogin')}
              </button>
              
              <div className="pt-4">
                <button 
                  onClick={() => setIsGuest(true)}
                  className="w-full py-4 bg-zinc-900/80 hover:bg-zinc-800 text-emerald-500 rounded-2xl font-bold text-sm transition-all border border-emerald-500/20 flex flex-col items-center gap-1 group"
                >
                  <span className="group-hover:scale-105 transition-transform">{t('guestMode')}</span>
                  <span className="text-[10px] text-zinc-500 font-medium lowercase tracking-normal">{t('guestDesc')}</span>
                </button>
              </div>
            </div>
          ) : (
            <form onSubmit={loginWithEmail} className="space-y-4 text-left">
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Email Address</label>
                <input 
                  type="email"
                  required
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-3 text-sm outline-none focus:border-emerald-500/50 transition-colors"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Password</label>
                <input 
                  type="password"
                  required
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-3 text-sm outline-none focus:border-emerald-500/50 transition-colors"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                />
              </div>
              <button 
                type="submit"
                disabled={loginLoading}
                className="w-full py-4 bg-emerald-600 hover:bg-emerald-500 text-white rounded-2xl font-black text-lg transition-all shadow-xl shadow-emerald-900/20"
              >
                {loginLoading ? 'Processing...' : authMode === 'login' ? t('confirm') : 'Create Account'}
              </button>
              <div className="flex justify-between items-center px-1">
                <button 
                  type="button"
                  onClick={() => setAuthMode(authMode === 'login' ? 'register' : 'login')}
                  className="text-[10px] font-bold text-emerald-500 uppercase tracking-widest hover:underline"
                >
                  {authMode === 'login' ? "Don't have an account?" : 'Already have an account? Sign In'}
                </button>
                <button 
                  type="button"
                  onClick={() => setAuthMode('select')}
                  className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest hover:underline"
                >
                  {t('cancel')}
                </button>
              </div>
            </form>
          )}
          
          {loginError && (
            <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl flex items-start gap-3 text-left">
              <AlertCircle className="text-red-500 shrink-0" size={16} />
              <p className="text-[10px] font-bold text-red-400 uppercase tracking-wider leading-relaxed">
                {loginError}
              </p>
            </div>
          )}

          <div className="flex justify-center gap-4 pt-2">
            <button onClick={() => setLang('en')} className={`text-[10px] font-bold tracking-widest ${lang === 'en' ? 'text-emerald-500' : 'text-zinc-600'}`}>EN</button>
            <button onClick={() => setLang('zh')} className={`text-[10px] font-bold tracking-widest ${lang === 'zh' ? 'text-emerald-500' : 'text-zinc-600'}`}>中文</button>
          </div>

          <p className="text-xs text-zinc-600">{t('authNotice')}</p>
          
          <div className="pt-4 border-t border-zinc-800/50 flex flex-col gap-3">
            <button 
              onClick={() => {
                navigator.clipboard.writeText(window.location.href);
                alert('App URL copied to clipboard! Share this link with others.');
              }}
              className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest hover:text-emerald-500 transition-colors flex items-center gap-2 mx-auto"
            >
              <Globe size={12} />
              {t('copyUrl')}
            </button>
            <button 
              onClick={() => setShowDeploymentHelp(true)}
              className="text-[10px] font-bold text-zinc-600 uppercase tracking-widest hover:text-zinc-400 transition-colors flex items-center gap-2 mx-auto"
            >
              <Settings size={12} />
              {t('deploymentHelp')}
            </button>
          </div>
        </div>

        {/* Deployment Help Modal */}
        {showDeploymentHelp && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[100] flex items-center justify-center p-6">
            <div className="max-w-md w-full bg-zinc-900 border border-zinc-800 p-8 rounded-3xl shadow-2xl space-y-6 text-left">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-blue-500/10 rounded-2xl flex items-center justify-center">
                  <Globe className="text-blue-500" size={24} />
                </div>
                <div>
                  <h3 className="text-xl font-black tracking-tight">{t('domainHelpTitle')}</h3>
                  <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest">Configuration Guide</p>
                </div>
              </div>
              
              <div className="space-y-4">
                <p className="text-sm text-zinc-400 leading-relaxed">
                  {t('domainHelpDesc')}
                </p>
                <div className="p-4 bg-zinc-800/50 rounded-2xl border border-zinc-800 space-y-3">
                  <p className="text-xs text-zinc-300 font-medium">{t('domainHelpStep1')}</p>
                  <p className="text-xs text-zinc-300 font-medium">{t('domainHelpStep2')}</p>
                  <code className="block p-2 bg-black rounded text-[10px] text-emerald-400 font-mono break-all">
                    {window.location.host}
                  </code>
                </div>
              </div>

              <button 
                onClick={() => setShowDeploymentHelp(false)}
                className="w-full py-4 bg-zinc-800 hover:bg-zinc-700 text-white rounded-2xl font-bold text-xs uppercase tracking-widest transition-all"
              >
                {t('confirm')}
              </button>
            </div>
          </div>
        )}
      </div>
    );
  }

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
            <span className="text-[10px] text-emerald-500 font-bold tracking-widest uppercase">Management System v1.2</span>
          </div>
        </div>

        <nav className="flex flex-col gap-1">
          <SidebarItem id="dashboard" icon={LayoutDashboard} label={t('dashboard')} />
          <SidebarItem id="config" icon={Factory} label={t('lineConfig')} />
          <SidebarItem id="cycletime" icon={History} label={t('cycleTime')} />
          <SidebarItem id="allocation" icon={GitBranch} label={t('allocation')} />
          <SidebarItem id="new_allocation" icon={Search} label={t('newProduct')} />
        </nav>

        <div className="mt-auto space-y-4">
          <button 
            onClick={() => setLang(lang === 'en' ? 'zh' : 'en')}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-zinc-400 hover:bg-zinc-800 hover:text-white transition-all text-left text-xs font-bold uppercase tracking-widest border border-zinc-800/50"
          >
            <Globe size={16} />
            {t('switchLang')}
          </button>
          
          <div className="p-4 bg-zinc-900/50 rounded-2xl border border-zinc-800">
            <div className="flex items-center gap-2 text-[10px] text-zinc-500 uppercase font-bold tracking-widest mb-3">
              <Activity size={12} />
              {t('systemStatus')}
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
                <span className="text-xs font-bold">{t('healthy')}</span>
              </div>
            </div>
          </div>
          
          <button 
            onClick={() => {
              if (isGuest) setIsGuest(false);
              else logout();
            }}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-zinc-500 hover:bg-red-500/10 hover:text-red-400 transition-all text-left text-xs font-bold uppercase tracking-widest"
          >
            <LogOut size={16} />
            {t('logout')}
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 p-10 overflow-y-auto">
        <AnimatePresence mode="wait">
          {isGuest && (
            <motion.div 
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-8 p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl flex items-center justify-between shadow-lg shadow-emerald-500/5"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-emerald-500 rounded-xl flex items-center justify-center shadow-lg shadow-emerald-500/20">
                  <Activity className="text-black" size={20} />
                </div>
                <div>
                  <p className="text-xs font-black text-emerald-500 uppercase tracking-tighter">{t('demoNotice')}</p>
                  <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest">Running with simulated production data for demonstration</p>
                </div>
              </div>
              <button 
                onClick={() => setIsGuest(false)}
                className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all border border-zinc-700"
              >
                Exit Preview
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        <header className="mb-12 flex justify-between items-end">
          <div>
            <div className="text-emerald-500 text-xs font-bold tracking-[0.2em] uppercase mb-2">Rockwell Automation / SMP</div>
            <h2 className="text-4xl font-black tracking-tight">
              {activeTab === 'config' ? t('lineConfig') : 
               activeTab === 'cycletime' ? t('cycleTime') :
               activeTab === 'allocation' ? t('allocation') :
               activeTab === 'new_allocation' ? t('newProduct') :
               activeTab === 'dashboard' ? t('dashboard') : activeTab.toUpperCase()}
            </h2>
          </div>
          <div className="flex gap-3">
            <div className="flex items-center gap-3 px-4 py-2 bg-zinc-900 border border-zinc-800 rounded-xl">
              {isGuest ? (
                <div className="w-6 h-6 rounded-full bg-zinc-800 flex items-center justify-center">
                  <UserIcon size={14} className="text-zinc-500" />
                </div>
              ) : (
                <img src={user?.photoURL || ''} className="w-6 h-6 rounded-full" />
              )}
              <span className="text-xs font-bold text-zinc-400">
                {isGuest ? 'Guest Viewer' : user?.displayName}
              </span>
            </div>
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
                    <p className="text-zinc-500 text-xs font-bold uppercase tracking-widest mt-1">Integrated Machine & Software Matrix</p>
                  </div>
                  <div className="flex gap-3">
                    <button 
                      onClick={() => {
                        const exportData = machines.map(m => ({
                          ...m,
                          line_name: lines.find(l => l.id === m.line_id)?.line_number || 'Unknown'
                        }));
                        exportCSV(exportData, 'smt_line_configuration.csv', ['line_name', 'machine_id', 'model', 'equipment_type', 'serial_number', 'software_level', 'ip_address', 'dns', 'gateway', 'os', 'windows_key', 'year', 'nozzle_config']);
                      }}
                      className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all flex items-center gap-2"
                    >
                      <Download size={14} /> Export all Line, Machine, Software & Nozzle configs
                    </button>
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
                        <label className="text-[10px] font-bold text-zinc-500 uppercase">Assigned Line</label>
                        <select 
                          className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-2 text-sm outline-none"
                          onChange={e => setNewMachine({...newMachine, line_id: e.target.value})}
                        >
                          <option value="">Select Line</option>
                          {lines.map(l => <option key={l.id} value={l.id}>{l.line_number}</option>)}
                        </select>
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-zinc-500 uppercase">Machine ID</label>
                        <input 
                          placeholder="e.g., M-101"
                          className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-2 text-sm outline-none"
                          onChange={e => setNewMachine({...newMachine, machine_id: e.target.value})}
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-zinc-500 uppercase">Model</label>
                        <input 
                          placeholder="e.g., NXT-III"
                          className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-2 text-sm outline-none"
                          onChange={e => setNewMachine({...newMachine, model: e.target.value})}
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-zinc-500 uppercase">Equipment Type</label>
                        <input 
                          placeholder="e.g., Mounter"
                          className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-2 text-sm outline-none"
                          onChange={e => setNewMachine({...newMachine, equipment_type: e.target.value})}
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-4 gap-4">
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-zinc-500 uppercase">Serial Number / Hostname</label>
                        <input 
                          className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-2 text-sm outline-none"
                          onChange={e => setNewMachine({...newMachine, serial_number: e.target.value})}
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-zinc-500 uppercase">Software Level (Multi-line)</label>
                        <textarea 
                          placeholder="GUI xxxx;&#10;MCS yyyy"
                          rows={2}
                          className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-2 text-sm outline-none resize-none"
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
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-zinc-500 uppercase">Nozzle Config</label>
                        <input 
                          placeholder="e.g., CN030, CN040"
                          className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-2 text-sm outline-none"
                          onChange={e => setNewMachine({...newMachine, nozzle_config: e.target.value})}
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
                          <th className="px-4 py-4 text-[10px] font-bold text-zinc-400 uppercase tracking-widest border-b border-zinc-800">Assigned Line</th>
                          <th className="px-4 py-4 text-[10px] font-bold text-zinc-400 uppercase tracking-widest border-b border-zinc-800">Machine ID</th>
                          <th className="px-4 py-4 text-[10px] font-bold text-zinc-400 uppercase tracking-widest border-b border-zinc-800">Model</th>
                          <th className="px-4 py-4 text-[10px] font-bold text-zinc-400 uppercase tracking-widest border-b border-zinc-800">Equipment Type</th>
                          <th className="px-4 py-4 text-[10px] font-bold text-zinc-400 uppercase tracking-widest border-b border-zinc-800">Serial Number / Hostname</th>
                          <th className="px-4 py-4 text-[10px] font-bold text-zinc-400 uppercase tracking-widest border-b border-zinc-800">Software Level</th>
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
                        {machines.map(m => {
                          const line = lines.find(l => l.id === m.line_id);
                          return (
                            <tr key={m.id} className="hover:bg-emerald-500/5 transition-colors group">
                              <td className="px-4 py-3 font-bold text-emerald-500 whitespace-nowrap">{line?.line_number || 'Unknown'}</td>
                              <td className="px-4 py-3 font-mono text-xs text-zinc-300 whitespace-nowrap">{m.machine_id}</td>
                              <td className="px-4 py-3 text-sm text-zinc-400 whitespace-nowrap">{m.model}</td>
                              <td className="px-4 py-3 text-[10px] font-bold text-zinc-500 uppercase whitespace-nowrap">{m.equipment_type}</td>
                              <td className="px-4 py-3 text-sm text-zinc-300 whitespace-nowrap">{m.serial_number}</td>
                              <td className="px-4 py-3">
                                <div className="text-[11px] font-mono bg-zinc-800/50 px-2 py-1 rounded border border-zinc-700/50 text-emerald-400 inline-block whitespace-pre-line">
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
                                  onClick={() => setConfirmDelete({ type: 'machine', id: m.id })}
                                  className="text-zinc-700 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100"
                                >
                                  <Trash2 size={14} />
                                </button>
                              </td>
                            </tr>
                          );
                        })}
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
                    <p className="text-[10px] text-zinc-500">Upload Production Info</p>
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
                        <Download size={12} /> Not Meeting Target                      </a>
                      <a href="/api/reports/performance?type=exceeding" className="px-3 py-1.5 bg-orange-500/10 hover:bg-orange-500/20 border border-orange-500/20 rounded-lg text-[10px] font-bold uppercase tracking-widest text-orange-500 transition-all flex items-center gap-2">
                        <Download size={12} /> Exceeding Target                      </a>
                      <a href="/api/reports/performance?type=all" className="px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 rounded-lg text-[10px] font-bold uppercase tracking-widest transition-all flex items-center gap-2">
                        <Download size={12} /> All Data                      </a>
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
                          <th className="px-4 py-4 text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Facility</th>
                          <th className="px-4 py-4 text-[10px] font-bold text-zinc-500 uppercase tracking-widest">SetupNum</th>
                          <th className="px-4 py-4 text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Work Order</th>
                          <th className="px-4 py-4 text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Assembly / Rev</th>
                          <th className="px-4 py-4 text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Side</th>
                          <th className="px-4 py-4 text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Machine Name</th>
                          <th className="px-4 py-4 text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Board SP</th>
                          <th className="px-4 py-4 text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Module</th>
                          <th className="px-4 py-4 text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Total Panels</th>
                          <th className="px-4 py-4 text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Start / End Time</th>
                          <th className="px-4 py-4 text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Current Cycle Time</th>
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
                        <Download size={12} /> Export Allocation Table
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
                          <th className="px-4 py-4 text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Family Setup</th>
                          <th className="px-4 py-4 text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Primary Line</th>
                          <th className="px-4 py-4 text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Secondary Line</th>
                          <th className="px-4 py-4 text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Tertiary Line</th>
                          <th className="px-4 py-4 text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Dimensions (L/W)</th>
                          <th className="px-4 py-4 text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Placement Count</th>
                          <th className="px-4 py-4 text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Bottleneck Cycle Time</th>
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
                                  {f.tertiary_line_name || 'N/A'}
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
                      <h3 className="text-xl font-black">{t('newProduct')}</h3>
                      <p className="text-xs text-zinc-500 uppercase tracking-widest font-bold">ETF Sample / Material Analysis</p>
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
                                <div className="text-[10px] text-zinc-500">{t('performance')}: {comp.placement_count}</div>
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
                        <h4 className="text-[10px] font-bold text-emerald-500 uppercase tracking-widest mb-4">{t('allocation')}</h4>
                        <p className="text-xs text-zinc-400 leading-relaxed">
                          System analyzes machine capability, material requirements (part numbers, nozzles), and line constraints to recommend the optimal SMT line.
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
                    Run Allocation Simulation
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
                                {res.is_capable ? 'Capable' : 'Not Capable'}
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
                    <div className="text-zinc-500 text-[10px] font-bold uppercase tracking-widest mb-2">{t('totalLines')}</div>
                    <div className="text-4xl font-black text-emerald-500">{stats.totalLines}</div>
                  </div>
                  <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-3xl shadow-xl">
                    <div className="text-zinc-500 text-[10px] font-bold uppercase tracking-widest mb-2">{t('activeMachines')}</div>
                    <div className="text-4xl font-black text-blue-500">{stats.totalMachines}</div>
                  </div>
                  <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-3xl shadow-xl">
                    <div className="text-zinc-500 text-[10px] font-bold uppercase tracking-widest mb-2">{t('bottlenecks')}</div>
                    <div className="text-4xl font-black text-red-500">{stats.activeBottlenecks}</div>
                  </div>
                  <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-3xl shadow-xl">
                    <div className="text-zinc-500 text-[10px] font-bold uppercase tracking-widest mb-2">{t('systemStatus')}</div>
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 bg-emerald-500 rounded-full animate-pulse"></div>
                      <div className="text-lg font-bold text-emerald-500 uppercase tracking-tighter">{t('healthy')}</div>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="bg-zinc-900 border border-zinc-800 p-8 rounded-3xl">
                    <h3 className="text-lg font-black mb-6 flex items-center gap-3">
                      <Activity className="text-emerald-500" />
                      {t('performance')}
                    </h3>
                    <div className="space-y-4">
                      <div className="flex justify-between items-center p-4 bg-zinc-800/30 rounded-2xl border border-zinc-800">
                        <div className="text-xs font-bold text-zinc-400 uppercase tracking-widest">{t('avgEfficiency')}</div>
                        <div className="text-xl font-black text-emerald-500">92.4%</div>
                      </div>
                      <div className="flex justify-between items-center p-4 bg-zinc-800/30 rounded-2xl border border-zinc-800">
                        <div className="text-xs font-bold text-zinc-400 uppercase tracking-widest">{t('targetAchievement')}</div>
                        <div className="text-xl font-black text-blue-500">88.1%</div>
                      </div>
                    </div>
                  </div>

                  <div className="bg-zinc-900 border border-zinc-800 p-8 rounded-3xl">
                    <h3 className="text-lg font-black mb-6 flex items-center gap-3">
                      <Database className="text-emerald-500" />
                      {t('integration')}
                    </h3>
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-2 h-2 bg-emerald-500 rounded-full"></div>
                          <span className="text-xs font-bold text-zinc-400">Optel Report Sync</span>
                        </div>
                        <span className="text-[10px] font-mono text-zinc-600">{t('lastSync')}: {stats.lastSync ? stats.lastSync.split('T')[0] : 'N/A'}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-2 h-2 bg-emerald-500 rounded-full"></div>
                          <span className="text-xs font-bold text-zinc-400">Family Grouping Sync</span>
                        </div>
                        <span className="text-[10px] font-mono text-zinc-600">{t('lastSync')}: {stats.lastSync ? stats.lastSync.split('T')[0] : 'N/A'}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-2 h-2 bg-emerald-500 rounded-full"></div>
                          <span className="text-xs font-bold text-zinc-400">ETF Analysis Engine</span>
                        </div>
                        <span className="text-[10px] font-mono text-zinc-600">{t('active')}</span>
                      </div>
                      {user?.email === 'jianuolee1@gmail.com' && (
                        <button 
                          onClick={seedDatabase}
                          disabled={isSeeding}
                          className={`w-full mt-4 py-3 rounded-2xl text-[10px] font-bold uppercase tracking-widest transition-all flex items-center justify-center gap-2 border ${
                            isSeeding 
                              ? 'bg-zinc-800 text-zinc-500 border-zinc-700 cursor-not-allowed' 
                              : 'bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-500 border-emerald-500/20'
                          }`}
                        >
                          <Database size={14} className={isSeeding ? 'animate-spin' : ''} />
                          {isSeeding ? 'Seeding Data...' : 'Seed SM1-SM8 Base Data'}
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </motion.div>
        </AnimatePresence>

        {confirmDelete && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[100] flex items-center justify-center p-6">
            <div className="max-w-md w-full bg-zinc-900 border border-zinc-800 p-8 rounded-3xl shadow-2xl space-y-6">
              <div className="w-16 h-16 bg-red-500/10 rounded-2xl flex items-center justify-center mx-auto">
                <Trash2 className="text-red-500" size={32} />
              </div>
              <div className="text-center">
                <h3 className="text-xl font-black tracking-tight mb-2">Confirm Deletion</h3>
                <p className="text-zinc-500 text-sm">
                  Are you sure you want to delete this {confirmDelete.type === 'line' ? 'line' : 'machine'}? This action cannot be undone.
                  {confirmDelete.type === 'line' && ' All machines under this line will also be deleted.'}
                </p>
              </div>
              <div className="flex gap-3">
                <button 
                  onClick={() => setConfirmDelete(null)}
                  className="flex-1 py-3 bg-zinc-800 hover:bg-zinc-700 rounded-xl font-bold text-xs uppercase tracking-widest transition-all"
                >
                  Cancel
                </button>
                <button 
                  onClick={() => confirmDelete.type === 'line' ? deleteLine(confirmDelete.id) : deleteMachine(confirmDelete.id)}
                  className="flex-1 py-3 bg-red-600 hover:bg-red-500 rounded-xl font-bold text-xs uppercase tracking-widest transition-all"
                >
                  Confirm Delete
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

const WrappedApp = () => (
  <ErrorBoundary>
    <App />
  </ErrorBoundary>
);

export default WrappedApp;
