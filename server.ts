import express from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createServer as createViteServer } from 'vite';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DB_PATH = path.join(__dirname, 'src', 'data', 'db.json');

// Ensure DB directory and file exist
if (!fs.existsSync(path.dirname(DB_PATH))) {
  fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });
}
if (!fs.existsSync(DB_PATH)) {
  const initialData = {
    lines: [],
    machines: [],
    constraints: [],
    cycle_times: [],
    family_groupings: []
  };
  fs.writeFileSync(DB_PATH, JSON.stringify(initialData, null, 2));
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(cors());
  app.use(bodyParser.json());

  // Helper to read DB
  const readDB = () => JSON.parse(fs.readFileSync(DB_PATH, 'utf-8'));
  // Helper to write DB
  const writeDB = (data: any) => fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2));

  // --- API Routes ---

  // Auth: Simple Access Code
  app.post('/api/auth/login', (req, res) => {
    const { code } = req.body;
    // Default access code is SMP2026
    if (code === 'SMP2026') {
      res.json({ success: true, user: { displayName: 'Authorized User', email: 'internal@rockwell.com', photoURL: null } });
    } else {
      res.status(401).json({ success: false, message: 'Invalid Access Code' });
    }
  });

  // Lines
  app.get('/api/lines', (req, res) => res.json(readDB().lines));
  app.post('/api/lines', (req, res) => {
    const db = readDB();
    const newLine = { id: Date.now().toString(), ...req.body };
    db.lines.push(newLine);
    writeDB(db);
    res.json(newLine);
  });
  app.delete('/api/lines/:id', (req, res) => {
    const db = readDB();
    db.lines = db.lines.filter((l: any) => l.id !== req.params.id);
    db.machines = db.machines.filter((m: any) => m.line_id !== req.params.id);
    writeDB(db);
    res.json({ success: true });
  });

  // Machines
  app.get('/api/machines', (req, res) => res.json(readDB().machines));
  app.post('/api/machines', (req, res) => {
    const db = readDB();
    const newMachine = { id: Date.now().toString(), ...req.body };
    db.machines.push(newMachine);
    writeDB(db);
    res.json(newMachine);
  });
  app.delete('/api/machines/:id', (req, res) => {
    const db = readDB();
    db.machines = db.machines.filter((m: any) => m.id !== req.params.id);
    writeDB(db);
    res.json({ success: true });
  });

  // Cycle Times
  app.get('/api/cycle_times', (req, res) => res.json(readDB().cycle_times));

  // Family Groupings
  app.get('/api/family_groupings', (req, res) => res.json(readDB().family_groupings));

  // Constraints
  app.get('/api/constraints', (req, res) => res.json(readDB().constraints));
  app.patch('/api/constraints/:id', (req, res) => {
    const db = readDB();
    const idx = db.constraints.findIndex((c: any) => c.id === req.params.id);
    if (idx !== -1) {
      db.constraints[idx] = { ...db.constraints[idx], ...req.body };
      writeDB(db);
      res.json(db.constraints[idx]);
    } else {
      res.status(404).json({ message: 'Not found' });
    }
  });

  // Seed Data
  app.post('/api/seed', (req, res) => {
    const db = readDB();
    // Simplified seed logic
    const lineData = [
      { id: 'l1', facility: 'Rockwell-SGP', line_number: 'SM1', name: 'SM1 Production Line', status: 'Active' },
      { id: 'l2', facility: 'Rockwell-SGP', line_number: 'SM2', name: 'SM2 Production Line', status: 'Active' },
      { id: 'l3', facility: 'Rockwell-SGP', line_number: 'SM3', name: 'SM3 Production Line', status: 'Active' },
      { id: 'l7', facility: 'Rockwell-SGP', line_number: 'SM7', name: 'SM7 Production Line', status: 'Active' },
      { id: 'l8', facility: 'Rockwell-SGP', line_number: 'SM8', name: 'SM8 Production Line', status: 'Active' },
    ];
    db.lines = lineData;
    db.machines = [
      { id: 'm1', line_id: 'l1', machine_id: 'SPR11', equipment_type: 'Printer', model: 'MPM Momentum', software_level: '5.2.05', ip_address: '10.116.42.247', os: 'Win 10', year: '2020', brand: 'ITW', name: 'SPR11', serial_number: 'S123', dns: '10.126.0.147', gateway: '10.116.40.1', windows_key: 'N/A', nozzle_config: 'Standard' },
      { id: 'm2', line_id: 'l1', machine_id: 'GC6A', equipment_type: 'Mounter', model: '120B015', software_level: 'Fuzion 3.13.5', ip_address: '10.116.41.128', os: 'Win 7', year: '2015', brand: 'Universal', name: 'GC6A', serial_number: 'S456', dns: '10.126.0.147', gateway: '10.116.40.1', windows_key: 'N/A', nozzle_config: 'CN030, CN040' },
    ];
    db.cycle_times = [
      { id: 'ct1', macyid: 'M101', plant: 'SGP', line_id: 'l1', setupnum: 'S1', workorderno: 'WO-9901', assembly_no: 'ASSY-001', revision: 'A', side: 'TOP', machine_name: 'GC6A', line_position: '3', boardsp: 12, modules: 1, total_panel: 100, panel_start_time: '08:00', panel_end_time: '08:01', medium_cycle_time: 15, current_cycle_time: 18 },
    ];
    db.family_groupings = [
      { id: 'f1', assembly_number: 'ASSY-001', pcb_number: 'PCB-101', family: 'Power Supply', family_num: 'FAM-01', top_line_name: 'SM1', bottom_line_name: 'SM2', cycle_time: 18, circuit_count: 2, board_length: 200, board_width: 150, placement_count: 165 },
    ];
    writeDB(db);
    res.json({ success: true });
  });

  // --- Vite / Static Files ---

  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
