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