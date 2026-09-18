CREATE TABLE booking_wisata (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  nama_penanggung_jawab TEXT NOT NULL,
  email TEXT,
  no_hp TEXT,
  jumlah_peserta INTEGER
);

CREATE TABLE peserta_wisata (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  booking_id INTEGER REFERENCES booking_wisata(id),
  nama_peserta TEXT NOT NULL
);