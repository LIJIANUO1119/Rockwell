import express from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createServer as createViteServer } from 'vite';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DB_PATH = process.env.VERCEL 
  ? path.join('/tmp', 'db.json')
  : path.join(process.cwd(), 'src', 'data', 'db.json');

export async function createServer() {
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

  const app = express();
  const PORT = process.env.PORT || 3000;

  app.use(cors());
  app.use(bodyParser.json());

  // Health check
  app.get('/api/health', (req, res) => res.json({ status: 'ok', environment: process.env.NODE_ENV, vercel: !!process.env.VERCEL }));

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
    const lineData = [
      { id: 'l1', facility: 'SMT-A', line_number: 'SM1', name: 'SM1 Production Line', status: 'Active' },
      { id: 'l2', facility: 'SMT-A', line_number: 'SM2', name: 'SM2 Production Line', status: 'Active' },
      { id: 'l3', facility: 'SMT-A', line_number: 'SM3', name: 'SM3 Production Line', status: 'Active' },
      { id: 'l4', facility: 'SMT-A', line_number: 'SM4', name: 'SM4 Production Line', status: 'Active' },
      { id: 'l5', facility: 'SMT-B', line_number: 'SM5', name: 'SM5 Production Line', status: 'Active' },
      { id: 'l6', facility: 'SMT-B', line_number: 'SM6', name: 'SM6 Production Line', status: 'Active' },
      { id: 'l65', facility: 'SMT-B', line_number: 'SM6.5', name: 'SM6.5 Production Line', status: 'Active' },
      { id: 'l7', facility: 'SMT-B', line_number: 'SM7', name: 'SM7 Production Line', status: 'Active' },
      { id: 'l8', facility: 'SMT-B', line_number: 'SM8', name: 'SM8 Production Line', status: 'Active' },
      { id: 'loff', facility: 'Offline', line_number: 'Offline', name: 'Offline Machines', status: 'Active' },
      { id: 'loffmvp', facility: 'Offline', line_number: 'Offline-MVP', name: 'Offline MVP', status: 'Active' },
      { id: 'lcc', facility: 'Offline', line_number: 'CC', name: 'Conformal Coating', status: 'Active' },
      { id: 'lr1', facility: 'Offline', line_number: 'Router 1', name: 'Router 1', status: 'Active' },
      { id: 'lr2', facility: 'Offline', line_number: 'Router 2', name: 'Router 2', status: 'Active' },
      { id: 'lr3', facility: 'Offline', line_number: 'Router 3', name: 'Router 3', status: 'Active' },
      { id: 'laisi', facility: 'Offline', line_number: 'AISI-01', name: 'AISI-01', status: 'Active' },
    ];
    db.lines = lineData;
    db.machines = [
      // SM1
      { id: 'm1', line_id: 'l1', machine_id: 'SM1-DEK', equipment_type: 'Printer', brand: 'DEK', model: 'NeoHorizon', name: 'Printer', serial_number: 'SN1001', software_level: 'v2.4', ip_address: '10.1.1.10', os: 'Win 10', year: '2021', dns: '10.1.1.1', gateway: '10.1.1.1', windows_key: 'N/A', nozzle_config: 'N/A' },
      { id: 'm2', line_id: 'l1', machine_id: 'SM1-SPI', equipment_type: 'SPI', brand: 'Koh Young', model: 'KY8030', name: 'SPI', serial_number: 'SN1002', software_level: 'v5.1', ip_address: '10.1.1.11', os: 'Win 10', year: '2021', dns: '10.1.1.1', gateway: '10.1.1.1', windows_key: 'N/A', nozzle_config: 'N/A' },
      { id: 'm3', line_id: 'l1', machine_id: 'SM1-M1', equipment_type: 'Mounter', brand: 'Fuji', model: 'NXT III', name: 'Mounter 1', serial_number: 'SN1003', software_level: 'v6.2', ip_address: '10.1.1.12', os: 'Win 10', year: '2021', dns: '10.1.1.1', gateway: '10.1.1.1', windows_key: 'N/A', nozzle_config: 'N/A' },
      // SM2
      { id: 'm4', line_id: 'l2', machine_id: 'SM2-DEK', equipment_type: 'Printer', brand: 'DEK', model: 'NeoHorizon', name: 'Printer', serial_number: 'SN2001', software_level: 'v2.4', ip_address: '10.1.2.10', os: 'Win 10', year: '2022', dns: '10.1.2.1', gateway: '10.1.2.1', windows_key: 'N/A', nozzle_config: 'N/A' },
      { id: 'm5', line_id: 'l2', machine_id: 'SM2-M1', equipment_type: 'Mounter', brand: 'Fuji', model: 'NXT III', name: 'Mounter 1', serial_number: 'SN2002', software_level: 'v6.2', ip_address: '10.1.2.12', os: 'Win 10', year: '2022', dns: '10.1.2.1', gateway: '10.1.2.1', windows_key: 'N/A', nozzle_config: 'N/A' },
      // SM3
      { id: 'm6', line_id: 'l3', machine_id: 'SM3-DEK', equipment_type: 'Printer', brand: 'DEK', model: 'NeoHorizon', name: 'Printer', serial_number: 'SN3001', software_level: 'v2.4', ip_address: '10.1.3.10', os: 'Win 10', year: '2020', dns: '10.1.3.1', gateway: '10.1.3.1', windows_key: 'N/A', nozzle_config: 'N/A' },
      { id: 'm7', line_id: 'l3', machine_id: 'SM3-M1', equipment_type: 'Mounter', brand: 'Fuji', model: 'NXT III', name: 'Mounter 1', serial_number: 'SN3002', software_level: 'v6.2', ip_address: '10.1.3.12', os: 'Win 10', year: '2020', dns: '10.1.3.1', gateway: '10.1.3.1', windows_key: 'N/A', nozzle_config: 'N/A' },
      // SM4
      { id: 'm8', line_id: 'l4', machine_id: 'SM4-M1', equipment_type: 'Mounter', brand: 'Fuji', model: 'NXT III', name: 'Mounter 1', serial_number: 'SN4001', software_level: 'v6.2', ip_address: '10.1.4.12', os: 'Win 10', year: '2021', dns: '10.1.4.1', gateway: '10.1.4.1', windows_key: 'N/A', nozzle_config: 'N/A' },
      // SM5
      { id: 'm9', line_id: 'l5', machine_id: 'SM5-M1', equipment_type: 'Mounter', brand: 'Fuji', model: 'NXT III', name: 'Mounter 1', serial_number: 'SN5001', software_level: 'v6.2', ip_address: '10.1.5.12', os: 'Win 10', year: '2021', dns: '10.1.5.1', gateway: '10.1.5.1', windows_key: 'N/A', nozzle_config: 'N/A' },
      // SM6
      { id: 'm10', line_id: 'l6', machine_id: 'SM6-M1', equipment_type: 'Mounter', brand: 'Fuji', model: 'NXT III', name: 'Mounter 1', serial_number: 'SN6001', software_level: 'v6.2', ip_address: '10.1.6.12', os: 'Win 10', year: '2021', dns: '10.1.6.1', gateway: '10.1.6.1', windows_key: 'N/A', nozzle_config: 'N/A' },
      // SM7
      { id: 'm11', line_id: 'l7', machine_id: 'SM7-M1', equipment_type: 'Mounter', brand: 'Fuji', model: 'NXT III', name: 'Mounter 1', serial_number: 'SN7001', software_level: 'v6.2', ip_address: '10.1.7.12', os: 'Win 10', year: '2021', dns: '10.1.7.1', gateway: '10.1.7.1', windows_key: 'N/A', nozzle_config: 'N/A' },
      // SM8
      { id: 'm12', line_id: 'l8', machine_id: 'SM8-M1', equipment_type: 'Mounter', brand: 'Fuji', model: 'NXT III', name: 'Mounter 1', serial_number: 'SN8001', software_level: 'v6.2', ip_address: '10.1.8.12', os: 'Win 10', year: '2021', dns: '10.1.8.1', gateway: '10.1.8.1', windows_key: 'N/A', nozzle_config: 'N/A' },
      // Offline
      { id: 'm13', line_id: 'loff', machine_id: 'OFF-AOI', equipment_type: 'AOI', brand: 'Koh Young', model: 'Zenith', name: 'AOI', serial_number: 'SN9001', software_level: 'v4.0', ip_address: '10.1.9.10', os: 'Win 10', year: '2019', dns: '10.1.9.1', gateway: '10.1.9.1', windows_key: 'N/A', nozzle_config: 'N/A' },
    ];
    db.cycle_times = [
      { id: 'ct1', macyid: 'SGP-2024-001', setupnum: 'S101', workorderno: 'WO-88291', assembly_no: 'PCB-A-992', revision: 'A1', side: 'TOP', machine_name: 'SM1-M1', boardsp: 'SP-01', current_cycle_time: 45.2, medium_cycle_time: 42.0, panel_start_time: '2024-03-22 08:00:00', panel_end_time: '2024-03-22 08:00:45' },
      { id: 'ct2', macyid: 'SGP-2024-002', setupnum: 'S101', workorderno: 'WO-88291', assembly_no: 'PCB-A-992', revision: 'A1', side: 'TOP', machine_name: 'SM1-M2', boardsp: 'SP-01', current_cycle_time: 38.5, medium_cycle_time: 42.0, panel_start_time: '2024-03-22 08:00:45', panel_end_time: '2024-03-22 08:01:23' },
      { id: 'ct3', macyid: 'SGP-2024-003', setupnum: 'S102', workorderno: 'WO-88292', assembly_no: 'PCB-B-112', revision: 'B2', side: 'BOT', machine_name: 'SM2-M1', boardsp: 'SP-02', current_cycle_time: 52.1, medium_cycle_time: 48.0, panel_start_time: '2024-03-22 08:10:00', panel_end_time: '2024-03-22 08:10:52' },
      { id: 'ct4', macyid: 'SGP-2024-004', setupnum: 'S103', workorderno: 'WO-88293', assembly_no: 'PCB-C-445', revision: 'C1', side: 'TOP', machine_name: 'SM3-M1', boardsp: 'SP-03', current_cycle_time: 41.0, medium_cycle_time: 41.0, panel_start_time: '2024-03-22 08:15:00', panel_end_time: '2024-03-22 08:15:41' },
      { id: 'ct5', macyid: 'SGP-2024-005', setupnum: 'S104', workorderno: 'WO-88294', assembly_no: 'PCB-D-778', revision: 'D4', side: 'TOP', machine_name: 'SM4-M1', boardsp: 'SP-04', current_cycle_time: 65.4, medium_cycle_time: 55.0, panel_start_time: '2024-03-22 08:20:00', panel_end_time: '2024-03-22 08:21:05' },
      { id: 'ct6', macyid: 'SGP-2025-501', setupnum: '1397', workorderno: '4018340011', assembly_no: '4018340011-PH-473017', revision: 'A', side: 'BOTTOM', machine_name: 'SM5-GA1', boardsp: 'SP-05', current_cycle_time: 50.0, medium_cycle_time: 45.0, panel_start_time: '2025-03-17 14:02:00', panel_end_time: '2025-03-17 14:14:00' },
      { id: 'ct7', macyid: 'SGP-2025-502', setupnum: '1397', workorderno: '4018340011', assembly_no: '4018340011-PH-473017', revision: 'A', side: 'BOTTOM', machine_name: 'SM5-GA2', boardsp: 'SP-05', current_cycle_time: 47.0, medium_cycle_time: 45.0, panel_start_time: '2025-03-17 14:02:00', panel_end_time: '2025-03-17 14:14:00' },
      { id: 'ct8', macyid: 'SGP-2025-503', setupnum: '1397', workorderno: '4018340011', assembly_no: '4018340011-PH-473017', revision: 'A', side: 'BOTTOM', machine_name: 'SM5-GCSA', boardsp: 'SP-05', current_cycle_time: 45.0, medium_cycle_time: 45.0, panel_start_time: '2025-03-17 14:02:00', panel_end_time: '2025-03-17 14:14:00' },
      { id: 'ct9', macyid: 'SGP-2025-504', setupnum: '1397', workorderno: '4018340011', assembly_no: '4018340011-PH-473017', revision: 'A', side: 'BOTTOM', machine_name: 'SM5-GCSB', boardsp: 'SP-05', current_cycle_time: 42.0, medium_cycle_time: 45.0, panel_start_time: '2025-03-17 14:02:00', panel_end_time: '2025-03-17 14:14:00' },
      { id: 'ct10', macyid: 'SGP-2025-505', setupnum: '1398', workorderno: '4018340012', assembly_no: '4018340012-PH-473018', revision: 'B', side: 'TOP', machine_name: 'SM5-GA1', boardsp: 'SP-06', current_cycle_time: 55.0, medium_cycle_time: 50.0, panel_start_time: '2025-03-17 15:10:00', panel_end_time: '2025-03-17 15:22:00' },
    ];
    db.family_groupings = [];
    db.constraints = [];
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

  return app;
}

if (process.env.NODE_ENV !== 'production' || !process.env.VERCEL) {
  createServer().then(app => {
    const PORT = process.env.PORT || 3000;
    app.listen(PORT, '0.0.0.0', () => {
      console.log(`Server running on http://localhost:${PORT}`);
    });
  });
}
