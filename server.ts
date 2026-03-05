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
    line_number TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    status TEXT DEFAULT 'Active'
  );

  CREATE TABLE IF NOT EXISTS machines (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    line_id INTEGER,
    brand TEXT,
    model TEXT,
    name TEXT NOT NULL,
    software_version TEXT,
    nozzle_config TEXT,
    FOREIGN KEY (line_id) REFERENCES lines(id)
  );

  CREATE TABLE IF NOT EXISTS constraints (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    line_id INTEGER,
    type TEXT NOT NULL, -- 'Glue Dispenser', 'Large Board (>10")', 'Reflow Center Support'
    description TEXT,
    is_active INTEGER DEFAULT 1,
    FOREIGN KEY (line_id) REFERENCES lines(id)
  );

  CREATE TABLE IF NOT EXISTS product_allocations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    module_number TEXT NOT NULL,
    side TEXT NOT NULL,
    family_setup TEXT,
    primary_line_id INTEGER,
    secondary_line_id INTEGER,
    tertiary_line_id INTEGER,
    board_len REAL,
    board_wth REAL,
    constraints_applied TEXT, -- JSON array of constraint IDs
    last_updated DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (primary_line_id) REFERENCES lines(id),
    FOREIGN KEY (secondary_line_id) REFERENCES lines(id),
    FOREIGN KEY (tertiary_line_id) REFERENCES lines(id)
  );

  CREATE TABLE IF NOT EXISTS cycle_time_history (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    line_id INTEGER,
    assembly_no TEXT,
    side TEXT,
    machine_name TEXT,
    min_cycle_time REAL,
    medium_cycle_time REAL,
    current_cycle_time REAL,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (line_id) REFERENCES lines(id)
  );
`);

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // SMT LINE CONFIGURATION API
  app.get("/api/lines", (req, res) => {
    const lines = db.prepare(`
      SELECT l.*, 
      (SELECT COUNT(*) FROM machines WHERE line_id = l.id) as machine_count
      FROM lines l
    `).all();
    res.json(lines);
  });

  app.post("/api/lines", (req, res) => {
    const { line_number, name } = req.body;
    const info = db.prepare("INSERT INTO lines (line_number, name) VALUES (?, ?)").run(line_number, name);
    res.json({ id: info.lastInsertRowid });
  });

  app.delete("/api/lines/:id", (req, res) => {
    db.prepare("DELETE FROM lines WHERE id = ?").run(req.params.id);
    res.json({ success: true });
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
    const { line_id, brand, model, name, software_version, nozzle_config } = req.body;
    const info = db.prepare("INSERT INTO machines (line_id, brand, model, name, software_version, nozzle_config) VALUES (?, ?, ?, ?, ?, ?)")
      .run(line_id, brand, model, name, software_version, nozzle_config);
    res.json({ id: info.lastInsertRowid });
  });

  // CONSTRAINTS API
  app.get("/api/constraints", (req, res) => {
    const constraints = db.prepare("SELECT c.*, l.line_number FROM constraints c JOIN lines l ON c.line_id = l.id").all();
    res.json(constraints);
  });

  app.post("/api/constraints", (req, res) => {
    const { line_id, type, description } = req.body;
    const info = db.prepare("INSERT INTO constraints (line_id, type, description) VALUES (?, ?, ?)")
      .run(line_id, type, description);
    res.json({ id: info.lastInsertRowid });
  });

  // CYCLE TIME API
  app.get("/api/cycle-times", (req, res) => {
    const data = db.prepare("SELECT * FROM cycle_time_history").all();
    res.json(data);
  });

  app.post("/api/upload/cycletime", (req, res) => {
    // Mock parsing of "SGP_GEM_MACHINE_CYCLETIME"
    const { data } = req.body; // Expecting array of objects
    const insert = db.prepare(`
      INSERT INTO cycle_time_history 
      (line_id, assembly_no, side, machine_name, min_cycle_time, medium_cycle_time, current_cycle_time)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);
    
    const transaction = db.transaction((rows) => {
      for (const row of rows) insert.run(row.line_id, row.assembly_no, row.side, row.machine_name, row.min, row.med, row.cur);
    });
    
    transaction(data);
    res.json({ success: true });
  });

  // ALLOCATION API
  app.get("/api/allocations", (req, res) => {
    const data = db.prepare(`
      SELECT a.*, 
      l1.line_number as primary_name, 
      l2.line_number as secondary_name, 
      l3.line_number as tertiary_name
      FROM product_allocations a
      LEFT JOIN lines l1 ON a.primary_line_id = l1.id
      LEFT JOIN lines l2 ON a.secondary_line_id = l2.id
      LEFT JOIN lines l3 ON a.tertiary_line_id = l3.id
    `).all();
    res.json(data);
  });

  // CSV EXPORT MOCK
  app.get("/api/export/config", (req, res) => {
    const machines = db.prepare("SELECT * FROM machines").all();
    const csv = "Line,Brand,Model,Name,Software,Nozzles\n" + 
      machines.map(m => `${m.line_id},${m.brand},${m.model},${m.name},${m.software_version},${m.nozzle_config}`).join("\n");
    res.header('Content-Type', 'text/csv');
    res.attachment('smt_line_configuration.csv');
    res.send(csv);
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
    
    // Seed initial data if empty
    const lineCount = db.prepare("SELECT COUNT(*) as count FROM lines").get().count;
    if (lineCount === 0) {
      const insertLine = db.prepare("INSERT INTO lines (line_number, name) VALUES (?, ?)");
      const insertMachine = db.prepare("INSERT INTO machines (line_id, brand, model, name, software_version, nozzle_config) VALUES (?, ?, ?, ?, ?, ?)");
      const insertConstraint = db.prepare("INSERT INTO constraints (line_id, type, description) VALUES (?, ?, ?)");

      const line1 = insertLine.run("L01", "Main Production").lastInsertRowid;
      const line2 = insertLine.run("L02", "Secondary Line").lastInsertRowid;

      insertMachine.run(line1, "Fuji", "NXT-III", "Mounter 1", "V6.2", "CN030, CN040");
      insertMachine.run(line1, "Fuji", "NXT-III", "Mounter 2", "V6.2", "CN065");
      insertMachine.run(line1, "Rockwell", "Glue Dispenser", "Dispenser 1", "V2.1", "Standard");
      
      insertConstraint.run(line1, "Glue Dispenser", "Required for specific glue boards");
      insertConstraint.run(line1, "Large Board (>10\")", "Max width 450mm");
      insertConstraint.run(line2, "Reflow Center Support", "Non-retractable support active");
    }
  });
}

startServer();
