import express from "express";
import { createServer as createViteServer } from "vite";
import Database from "better-sqlite3";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const db = new Database("smp_manager.db");

// Initialize Database
db.exec(`
  CREATE TABLE IF NOT EXISTS lines (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    facility TEXT,
    line_number TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    status TEXT DEFAULT 'Active'
  );

  CREATE TABLE IF NOT EXISTS machines (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    line_id INTEGER,
    machine_id TEXT, -- Machine ID from documentation
    equipment_type TEXT,
    brand TEXT,
    model TEXT,
    name TEXT NOT NULL,
    serial_number TEXT, -- Serial Number / Computer Name
    software_level TEXT, -- Software Level
    ip_address TEXT,
    dns TEXT,
    gateway TEXT,
    nozzle_config TEXT,
    FOREIGN KEY (line_id) REFERENCES lines(id)
  );

  CREATE TABLE IF NOT EXISTS cycle_time_history (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    macyid TEXT,
    plant TEXT,
    line_id INTEGER,
    setupnum TEXT,
    workorderno TEXT,
    assembly_no TEXT,
    revision TEXT,
    side TEXT, -- Top / Bottom
    machine_name TEXT,
    line_position TEXT,
    boardsp REAL,
    modules INTEGER,
    total_panel INTEGER,
    panel_start_time DATETIME,
    panel_end_time DATETIME,
    medium_cycle_time REAL,
    current_cycle_time REAL,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (line_id) REFERENCES lines(id)
  );

  CREATE TABLE IF NOT EXISTS family_groupings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    assembly_number TEXT NOT NULL,
    pcb_number TEXT,
    family TEXT,
    family_num TEXT,
    family_setup TEXT, 
    top_priority_line_id INTEGER,
    bottom_priority_line_id INTEGER,
    tertiary_priority_line_id INTEGER,
    cycle_time REAL,
    circuit_count INTEGER,
    board_length REAL,
    board_width REAL,
    placement_count INTEGER,
    FOREIGN KEY (top_priority_line_id) REFERENCES lines(id),
    FOREIGN KEY (bottom_priority_line_id) REFERENCES lines(id),
    FOREIGN KEY (tertiary_priority_line_id) REFERENCES lines(id)
  );
`);

// Migration: Ensure family_groupings has new columns
try {
  db.prepare("ALTER TABLE family_groupings ADD COLUMN family_setup TEXT").run();
} catch (e) {}
try {
  db.prepare("ALTER TABLE family_groupings ADD COLUMN tertiary_priority_line_id INTEGER").run();
} catch (e) {}

db.exec(`
  CREATE TABLE IF NOT EXISTS constraints (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    line_id INTEGER,
    type TEXT NOT NULL, -- 'Glue Dispenser', 'Large Board (>10")', 'Reflow Center Support'
    description TEXT,
    is_active INTEGER DEFAULT 1,
    FOREIGN KEY (line_id) REFERENCES lines(id)
  );

  CREATE TABLE IF NOT EXISTS nozzle_inventory (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    machine_id INTEGER,
    nozzle_type TEXT NOT NULL,
    quantity INTEGER DEFAULT 0,
    slot_position TEXT,
    FOREIGN KEY (machine_id) REFERENCES machines(id)
  );

  CREATE TABLE IF NOT EXISTS assembly_build_map (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    build_no TEXT NOT NULL,
    module_no TEXT,
    pcb_no TEXT,
    description TEXT
  );
`);

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // DASHBOARD STATS API
  app.get("/api/stats", (req, res) => {
    const stats = {
      totalLines: db.prepare("SELECT COUNT(*) as count FROM lines").get().count,
      totalMachines: db.prepare("SELECT COUNT(*) as count FROM machines").get().count,
      activeBottlenecks: db.prepare("SELECT COUNT(DISTINCT line_id) as count FROM cycle_time_history WHERE current_cycle_time > medium_cycle_time").get().count,
      lastSync: new Date().toISOString()
    };
    res.json(stats);
  });
  app.get("/api/lines", (req, res) => {
    const lines = db.prepare(`
      SELECT l.*, 
      (SELECT COUNT(*) FROM machines WHERE line_id = l.id) as machine_count,
      (SELECT COUNT(*) FROM constraints WHERE line_id = l.id AND is_active = 1) as active_constraints
      FROM lines l
    `).all();
    res.json(lines);
  });

  app.post("/api/lines", (req, res) => {
    const { facility, line_number, name } = req.body;
    const info = db.prepare("INSERT INTO lines (facility, line_number, name) VALUES (?, ?, ?)").run(facility, line_number, name);
    res.json({ id: info.lastInsertRowid });
  });

  app.get("/api/machines", (req, res) => {
    const machines = db.prepare(`
      SELECT m.*, l.line_number as line_name 
      FROM machines m 
      JOIN lines l ON m.line_id = l.id
    `).all();
    res.json(machines);
  });

  app.post("/api/machines", (req, res) => {
    const { line_id, machine_id, equipment_type, brand, model, name, serial_number, software_level, ip_address, dns, gateway, nozzle_config } = req.body;
    const info = db.prepare(`
      INSERT INTO machines 
      (line_id, machine_id, equipment_type, brand, model, name, serial_number, software_level, ip_address, dns, gateway, nozzle_config) 
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(line_id, machine_id, equipment_type, brand, model, name, serial_number, software_level, ip_address, dns, gateway, nozzle_config);
    res.json({ id: info.lastInsertRowid });
  });

  // CYCLE TIME API
  app.get("/api/cycle-times", (req, res) => {
    const data = db.prepare("SELECT * FROM cycle_time_history").all();
    res.json(data);
  });

  // FAMILY GROUPING API
  app.get("/api/family-groupings", (req, res) => {
    const data = db.prepare(`
      SELECT f.*, 
      l1.line_number as top_line_name, 
      l2.line_number as bottom_line_name,
      l3.line_number as tertiary_line_name
      FROM family_groupings f
      LEFT JOIN lines l1 ON f.top_priority_line_id = l1.id
      LEFT JOIN lines l2 ON f.bottom_priority_line_id = l2.id
      LEFT JOIN lines l3 ON f.tertiary_priority_line_id = l3.id
    `).all();
    res.json(data);
  });

  app.delete("/api/lines/:id", (req, res) => {
    db.prepare("DELETE FROM machines WHERE line_id = ?").run(req.params.id);
    db.prepare("DELETE FROM lines WHERE id = ?").run(req.params.id);
    res.json({ success: true });
  });

  app.delete("/api/machines/:id", (req, res) => {
    db.prepare("DELETE FROM machines WHERE id = ?").run(req.params.id);
    res.json({ success: true });
  });

  // CONSTRAINTS API
  app.get("/api/constraints", (req, res) => {
    const data = db.prepare(`
      SELECT c.*, l.line_number 
      FROM constraints c 
      JOIN lines l ON c.line_id = l.id
    `).all();
    res.json(data);
  });

  app.post("/api/constraints/toggle", (req, res) => {
    const { id, is_active } = req.body;
    db.prepare("UPDATE constraints SET is_active = ? WHERE id = ?").run(is_active ? 1 : 0, id);
    res.json({ success: true });
  });

  // BOTTLENECK IDENTIFICATION API
  app.get("/api/bottlenecks", (req, res) => {
    const bottlenecks = db.prepare(`
      SELECT line_id, machine_name, MAX(current_cycle_time) as max_time
      FROM cycle_time_history
      GROUP BY line_id
    `).all();
    res.json(bottlenecks);
  });

  // REPORT GENERATION (CSV)
  app.get("/api/reports/performance", (req, res) => {
    const type = req.query.type; // 'not_meeting', 'exceeding', or 'all'
    let query = "SELECT * FROM cycle_time_history";
    if (type === 'not_meeting') {
      query += " WHERE current_cycle_time < (medium_cycle_time * 0.9)";
    } else if (type === 'exceeding') {
      query += " WHERE current_cycle_time > medium_cycle_time";
    }
    
    const data = db.prepare(query).all();
    const csv = "MACYID,Plant,SetupNum,WorkOrder,Assembly,Revision,Side,Machine,LinePos,BoardSP,Modules,TotalPanel,StartTime,EndTime,MediumCT,CurrentCT\n" + 
      data.map(d => `${d.macyid},${d.plant},${d.setupnum},${d.workorderno},${d.assembly_no},${d.revision},${d.side},${d.machine_name},${d.line_position},${d.boardsp},${d.modules},${d.total_panel},${d.panel_start_time},${d.panel_end_time},${d.medium_cycle_time},${d.current_cycle_time}`).join("\n");
    
    res.header('Content-Type', 'text/csv');
    res.attachment(`performance_report_${type}.csv`);
    res.send(csv);
  });

  app.get("/api/reports/config", (req, res) => {
    const machines = db.prepare(`
      SELECT m.*, l.line_number as line_name 
      FROM machines m 
      JOIN lines l ON m.line_id = l.id
    `).all();
    
    const csv = "Line,MachineID,Type,Brand,Model,Name,SerialNumber,SoftwareLevel,IP,DNS,Gateway,NozzleConfig\n" + 
      machines.map(m => `${m.line_name},${m.machine_id},${m.equipment_type},${m.brand},${m.model},${m.name},${m.serial_number},${m.software_level},${m.ip_address},${m.dns},${m.gateway},${m.nozzle_config}`).join("\n");
    
    res.header('Content-Type', 'text/csv');
    res.attachment(`smt_line_configuration.csv`);
    res.send(csv);
  });

  app.get("/api/reports/allocation", (req, res) => {
    const data = db.prepare(`
      SELECT f.*, 
      l1.line_number as top_line_name, 
      l2.line_number as bottom_line_name,
      l3.line_number as tertiary_line_name
      FROM family_groupings f
      LEFT JOIN lines l1 ON f.top_priority_line_id = l1.id
      LEFT JOIN lines l2 ON f.bottom_priority_line_id = l2.id
      LEFT JOIN lines l3 ON f.tertiary_priority_line_id = l3.id
    `).all();
    
    const csv = "Assembly,PCB,Family,FamilyNum,FamilySetup,PrimaryLine,SecondaryLine,TertiaryLine,CycleTime,Placements,Length,Width\n" + 
      data.map(f => `${f.assembly_number},${f.pcb_number},${f.family},${f.family_num},${f.family_setup},${f.top_line_name},${f.bottom_line_name},${f.tertiary_line_name},${f.cycle_time},${f.placement_count},${f.board_length},${f.board_width}`).join("\n");
    
    res.header('Content-Type', 'text/csv');
    res.attachment(`product_line_allocation.csv`);
    res.send(csv);
  });

  // SIMULATION API
  app.post("/api/simulate-allocation", (req, res) => {
    const { components } = req.body; // Array of { part_number, nozzle, placement_count }
    
    const lines = db.prepare("SELECT * FROM lines").all();
    const machines = db.prepare("SELECT * FROM machines").all();
    const constraints = db.prepare("SELECT * FROM constraints WHERE is_active = 1").all();

    const recommendations = lines.map(line => {
      const lineMachines = machines.filter(m => m.line_id === line.id);
      const lineConstraints = constraints.filter(c => c.line_id === line.id);
      
      let score = 0;
      let missingNozzles = [];
      let constraintViolations = [];

      // Simple nozzle check
      components.forEach(comp => {
        const hasNozzle = lineMachines.some(m => 
          m.nozzle_config && m.nozzle_config.includes(comp.nozzle)
        );
        if (hasNozzle) {
          score += comp.placement_count;
        } else {
          missingNozzles.push(comp.nozzle);
        }
      });

      // Basic constraint check (e.g. if a line has a "Large Board" constraint, it might be preferred for some products)
      // For now, we just report active constraints
      const activeConstraints = lineConstraints.map(c => c.type);

      return {
        line_id: line.id,
        line_number: line.line_number,
        score,
        missingNozzles: [...new Set(missingNozzles)],
        constraints: activeConstraints,
        is_capable: missingNozzles.length === 0
      };
    });

    res.json(recommendations.sort((a, b) => b.score - a.score));
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.join(__dirname, "dist")));
    app.get("*", (req, res) => {
      res.sendFile(path.join(__dirname, "dist", "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
    
    // Seed initial data
    const sm1Exists = db.prepare("SELECT COUNT(*) as count FROM lines WHERE line_number = 'SM1'").get().count;
    if (sm1Exists === 0) {
      // Clear all old data to avoid FOREIGN KEY constraint errors and ensure clean SM1-SM7 state
      db.prepare("DELETE FROM nozzle_inventory").run();
      db.prepare("DELETE FROM machines").run();
      db.prepare("DELETE FROM constraints").run();
      db.prepare("DELETE FROM cycle_time_history").run();
      db.prepare("DELETE FROM family_groupings").run();
      db.prepare("DELETE FROM lines").run();

      const insertLine = db.prepare("INSERT INTO lines (facility, line_number, name) VALUES (?, ?, ?)");
      const insertMachine = db.prepare(`
        INSERT INTO machines 
        (line_id, machine_id, equipment_type, brand, model, name, serial_number, software_level, ip_address, dns, gateway, nozzle_config) 
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);

      const sm1 = insertLine.run("Rockwell-SGP", "SM1", "SM1 Production Line").lastInsertRowid;
      const sm2 = insertLine.run("Rockwell-SGP", "SM2", "SM2 Production Line").lastInsertRowid;
      const sm3 = insertLine.run("Rockwell-SGP", "SM3", "SM3 Production Line").lastInsertRowid;
      const sm4 = insertLine.run("Rockwell-SGP", "SM4", "SM4 Production Line").lastInsertRowid;
      const sm5 = insertLine.run("Rockwell-SGP", "SM5", "SM5 Production Line").lastInsertRowid;
      const sm6 = insertLine.run("Rockwell-SGP", "SM6", "SM6 Production Line").lastInsertRowid;
      const sm7 = insertLine.run("Rockwell-SGP", "SM7", "SM7 Production Line").lastInsertRowid;

      // SM1 Machines (GC6A, GC6B, GX3)
      insertMachine.run(sm1, "M-101", "Mounter", "Fuji", "NXT-III", "GC6A", "SN-SM1-01", "V6.2", "192.168.1.10", "8.8.8.8", "192.168.1.1", "CN030, CN040");
      insertMachine.run(sm1, "M-102", "Mounter", "Fuji", "NXT-III", "GC6B", "SN-SM1-02", "V6.2", "192.168.1.11", "8.8.8.8", "192.168.1.1", "CN065");
      insertMachine.run(sm1, "M-103", "Mounter", "Fuji", "AIMEX", "GX3", "SN-SM1-03", "V3.1", "192.168.1.12", "8.8.8.8", "192.168.1.1", "CN131");

      // SM2 Machines (GC11, GC4, GX6)
      insertMachine.run(sm2, "M-201", "Mounter", "Fuji", "NXT-III", "GC11", "SN-SM2-01", "V6.2", "192.168.1.20", "8.8.8.8", "192.168.1.1", "CN030, CN040");
      insertMachine.run(sm2, "M-202", "Mounter", "Fuji", "NXT-III", "GC4", "SN-SM2-02", "V6.2", "192.168.1.21", "8.8.8.8", "192.168.1.1", "CN065");
      insertMachine.run(sm2, "M-203", "Mounter", "Fuji", "AIMEX", "GX6", "SN-SM2-03", "V3.1", "192.168.1.22", "8.8.8.8", "192.168.1.1", "CN131");

      // Seed some family groupings for the new lines
      db.prepare(`
        INSERT INTO family_groupings 
        (assembly_number, pcb_number, family, family_num, family_setup, top_priority_line_id, bottom_priority_line_id, tertiary_priority_line_id, cycle_time, circuit_count, board_length, board_width, placement_count)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run("PN-643408", "PCB-112", "ControlLogix", "F-01", "SET-A", sm1, sm2, sm3, 45.5, 12, 250, 180, 450);

      // Seed constraints
      const insertConstraint = db.prepare("INSERT INTO constraints (line_id, type, description, is_active) VALUES (?, ?, ?, ?)");
      insertConstraint.run(sm1, "Glue Dispenser", "Required for specific glue boards", 1);
      insertConstraint.run(sm3, "Large Board (>10\")", "Max width 450mm", 1);
      insertConstraint.run(sm2, "Reflow Center Support", "Non-retractable support active", 1);

      // Seed some cycle time history for SM1 (based on your data)
      const insertCT = db.prepare(`
        INSERT INTO cycle_time_history 
        (line_id, macyid, plant, setupnum, workorderno, assembly_no, revision, side, machine_name, line_position, boardsp, modules, total_panel, panel_start_time, panel_end_time, medium_cycle_time, current_cycle_time)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);

      insertCT.run(sm1, '315751', '5170', '1547', '4016540857', 'PN-643408', '1', 'Bottom', 'GC6A', '30', 31, 4, 376, '10/1/2025 12:01:10 AM', '10/1/2025 12:29:57 AM', 55, 63);
      insertCT.run(sm1, '315752', '5170', '1547', '4016540857', 'PN-643408', '1', 'Bottom', 'GC6B', '31', 32, 4, 300, '10/1/2025 12:01:04 AM', '10/1/2025 12:30:45 AM', 43, 44);
      insertCT.run(sm1, '315753', '5170', '1547', '4016540857', 'PN-643408', '1', 'Bottom', 'GX3', '32', 33, 4, 108, '10/1/2025 12:01:16 AM', '10/1/2025 12:31:54 AM', 49, 41);
    }
  });
}

startServer();
