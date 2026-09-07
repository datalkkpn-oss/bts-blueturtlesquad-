CREATE TABLE data_pendaratan (
  kode_sarang TEXT PRIMARY KEY,
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
  bukti_pembayaran TEXT
);

CREATE TABLE data_perkembangan_penyu (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  kode_sarang TEXT
    REFERENCES data_adopsi(kode_sarang),
  dokumentasi_fase1 TEXT,
  dokumentasi_fase2 TEXT,
  dokumentasi_fase3 TEXT,
  status TEXT
);