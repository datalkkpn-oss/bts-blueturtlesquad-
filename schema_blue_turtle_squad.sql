CREATE TABLE data_pendaratan (
  kode_sarang TEXT PRIMARY KEY,
  tampilan_sarang TEXT,
  jenis_penyu TEXT,
  kapan_pendaratan DATE,
  lokasi TEXT NOT NULL CHECK(
    lokasi IN ('mangkai utara', 'mangkai selatan')
  ),
  jumlah_telur INTEGER,
  kapan_penetasan DATE
);

CREATE TABLE data_adopsi (
  kode_sarang TEXT PRIMARY KEY
    REFERENCES data_pendaratan(kode_sarang),
  jenis_penyu TEXT,
  jumlah_telur INTEGER,
  lokasi TEXT,
  berapa_sarang INTEGER,
  nama_adopter TEXT,
  email_adopter TEXT,
  bukti_pembayaran TEXT,
  tahap INTEGER DEFAULT 1,
  progress INTEGER DEFAULT 25,
  status_tahap TEXT DEFAULT 'Tahap 1: Formulir Masuk'
);

CREATE TABLE data_perkembangan_penyu (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  kode_sarang TEXT
     REFERENCES data_adopsi(kode_sarang),
  link_gdrive_fase1 TEXT,
  link_gdrive_fase2 TEXT,
  link_gdrive_fase3 TEXT,
  dokumentasi_fase1 TEXT,
  dokumentasi_fase2 TEXT,
  dokumentasi_fase3 TEXT,
  status TEXT
);

-- Tabel Berita Mitra (Bisa diisi oleh: Mitra, Superadmin, Admin. Max 150 huruf)
CREATE TABLE IF NOT EXISTS tabel_berita_mitra (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  judul TEXT NOT NULL,
  tanggal DATE NOT NULL,
  isi_berita TEXT NOT NULL,
  link_berita TEXT,
  penulis TEXT,
  role_penulis TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- Tabel Berita Investasi (Mengenai promosi. Bisa diisi oleh: Admin & Superadmin. Max 150 huruf)
CREATE TABLE IF NOT EXISTS tabel_berita_investasi (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  judul TEXT NOT NULL,
  tanggal DATE NOT NULL,
  isi_promosi TEXT NOT NULL,
  link_promosi TEXT,
  penulis TEXT,
  role_penulis TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);