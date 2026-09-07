CREATE TABLE users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  nama TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('super_admin', 'admin', 'kemitraan', 'pendata', 'masyarakat')),
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE data_pendaratan (
  kode_sarang TEXT PRIMARY KEY,
  jenis_penyu TEXT,
  waktu_pendaratan TEXT,
  lokasi TEXT,
  jumlah_telur INTEGER,
  waktu_penetasan TEXT
);

CREATE TABLE data_adopsi (
  kode_sarang TEXT PRIMARY KEY REFERENCES data_pendaratan(kode_sarang),
  jenis_penyu TEXT,
  jumlah_telur INTEGER,
  lokasi TEXT,
  berapa_sarang INTEGER,
  nama_adopter TEXT,
  bukti_pembayaran TEXT
);

CREATE TABLE data_perkembangan_penyu (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  kode_sarang TEXT REFERENCES data_adopsi(kode_sarang),
  dokumentasi_fase1 TEXT,
  dokumentasi_fase2 TEXT,
  dokumentasi_fase3 TEXT,
  status TEXT
);