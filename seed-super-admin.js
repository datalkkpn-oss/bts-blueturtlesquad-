/**
 * seed-super-admin.js
 * -------------------------------------------------------------
 * Baca daftar akun dari admin-config.js, hash password-nya
 * (SHA-256, sama seperti backend), lalu jalankan otomatis ke
 * database D1 Cloudflare (--remote).
 *
 * CARA PAKAI:
 * 1. Edit data akun di file admin-config.js (satu folder dengan file ini).
 * 2. Jalankan:
 *      node seed-super-admin.js
 * 3. Setiap akun di admin-config.js otomatis di-hash & disinkronkan ke D1.
 *
 * Syarat: Node.js terpasang, dan sudah `wrangler login` sekali di komputer ini.
 */

const { execSync } = require("child_process");
const crypto = require("crypto");
const akunList = require("./admin-config.js");

const DB_NAME = "blue-turtle-squad"; // sesuaikan kalau nama database D1-mu beda

function hashPassword(password) {
  return crypto.createHash("sha256").update(password).digest("hex");
}

function jalankanSQL(sql) {
  execSync(
    `npx wrangler d1 execute ${DB_NAME} --remote --command="${sql.replace(/"/g, '\\"')}"`,
    { stdio: "inherit" },
  );
}

if (!Array.isArray(akunList) || akunList.length === 0) {
  console.log("Tidak ada akun di admin-config.js. Tidak ada yang diproses.");
  process.exit(0);
}

for (const akun of akunList) {
  const { nama, email, password, role, mode } = akun;

  if (!nama || !email || !password) {
    console.warn(`Lewati satu entri: nama/email/password belum lengkap.`);
    continue;
  }

  const emailLower = email.toLowerCase();
  const passwordHash = hashPassword(password);
  const roleFinal = role || "super_admin";
  const today = new Date().toISOString().split("T")[0];

  let sql;
  if (mode === "update") {
    sql = `UPDATE role SET nama = '${nama.replace(/'/g, "''")}', password_hash = '${passwordHash}', role = '${roleFinal}' WHERE email = '${emailLower}';`;
  } else {
    sql = `INSERT INTO role (nama, email, password_hash, role, created_at) VALUES ('${nama.replace(/'/g, "''")}', '${emailLower}', '${passwordHash}', '${roleFinal}', '${today}');`;
  }

  console.log(`\n>> Memproses akun: ${emailLower} (mode: ${mode || "insert"}, role: ${roleFinal})`);

  try {
    jalankanSQL(sql);
    console.log(`   Berhasil disinkronkan ke D1.`);
  } catch (err) {
    console.error(`   Gagal untuk ${emailLower}:`, err.message);
  }
}

console.log("\nSelesai. Silakan login pakai email & password ASLI (bukan hash-nya) di admin-config.js.");