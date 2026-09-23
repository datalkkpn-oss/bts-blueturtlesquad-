/**
 * admin-config.js
 * -------------------------------------------------------------
 * TINGGAL EDIT DI SINI. Isi data admin secara polos (biasa),
 * TIDAK perlu di-hash manual -- nanti otomatis di-hash oleh
 * seed-super-admin.js pas dijalankan.
 *
 * Bisa isi lebih dari satu akun sekaligus, tinggal tambah objek
 * baru di dalam array di bawah.
 *
 * mode:
 *   "insert" -> bikin akun baru (gagal kalau email sudah terdaftar)
 *   "update" -> ubah role & password akun yang emailnya sudah ada
 */

module.exports = [
  {
    nama: "super admin BTS",
    email: "datalkkpn@gmail.com",
    password: "baguswak",
    role: "super_admin",
    mode: "update", // ganti jadi "update" kalau email ini sudah pernah daftar
  },

  // Contoh nambah admin kedua, tinggal copy-paste blok di atas:
  // {
  //   nama: "Admin Kedua",
  //   email: "admin2@contoh.com",
  //   password: "passwordlain",
  //   role: "admin",
  //   mode: "insert",
  // },
];
