import htmlContent from "./index.html";

// Helper Hash Password
async function hashPassword(password) {
  const data = new TextEncoder().encode(password);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(hashBuffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

// Helper Response + CORS
function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
    },
  });
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const path = url.pathname;

    // ========================================================
    // TAMPILKAN FRONTEND (HTML)
    // ========================================================
    if (path === "/" || path === "") {
      return new Response(htmlContent, {
        headers: { "Content-Type": "text/html;charset=UTF-8" },
      });
    }

    // ========================================================
    // CORS PREFLIGHT
    // ========================================================
    if (request.method === "OPTIONS") {
      return new Response(null, {
        status: 204,
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
          "Access-Control-Allow-Headers": "Content-Type, Authorization",
        },
      });
    }

    // ========================================================
    // API LOGIN
    // ========================================================
    if (path === "/api/login" && request.method === "POST") {
      try {
        const body = await request.json();

        if (!body.email || !body.password) {
          return jsonResponse(
            { success: false, message: "Email dan password wajib diisi." },
            400,
          );
        }

        const user = await env.DB.prepare("SELECT * FROM role WHERE email = ?")
          .bind(body.email.toLowerCase())
          .first();

        if (!user) {
          return jsonResponse(
            { success: false, message: "Email atau password salah" },
            401,
          );
        }

        const passwordHash = await hashPassword(body.password);

        if (passwordHash !== user.password_hash) {
          return jsonResponse(
            { success: false, message: "Email atau password salah" },
            401,
          );
        }

        return jsonResponse({
          success: true,
          user: {
            id: user.id,
            nama: user.nama,
            email: user.email,
            role: user.role,
          },
        });
      } catch (error) {
        return jsonResponse(
          {
            success: false,
            message: "Terjadi kesalahan saat login.",
            error: error.message,
          },
          500,
        );
      }
    }

    // ========================================================
    // API REGISTER MASYARAKAT
    // ========================================================
    if (path === "/api/register" && request.method === "POST") {
      try {
        const body = await request.json();

        if (!body.nama || !body.email || !body.password) {
          return jsonResponse(
            { success: false, message: "Data pendaftaran belum lengkap" },
            400,
          );
        }

        const email = body.email.toLowerCase();

        const existingUser = await env.DB.prepare(
          "SELECT id FROM role WHERE email = ?",
        )
          .bind(email)
          .first();

        if (existingUser) {
          return jsonResponse(
            { success: false, message: "Email sudah terdaftar." },
            409,
          );
        }

        const passwordHash = await hashPassword(body.password);

        await env.DB.prepare(
          `INSERT INTO role (nama, email, password_hash, role, created_at)
           VALUES (?, ?, ?, ?, ?)`,
        )
          .bind(
            body.nama,
            email,
            passwordHash,
            "masyarakat",
            new Date().toISOString().split("T")[0],
          )
          .run();

        return jsonResponse({
          success: true,
          message: "Akun berhasil didaftarkan.",
        });
      } catch (error) {
        return jsonResponse(
          {
            success: false,
            message: "Gagal mendaftarkan akun.",
            error: error.message,
          },
          500,
        );
      }
    }

    // ========================================================
    // API PENDARATAN - GET
    // ========================================================
    if (path === "/api/pendaratan" && request.method === "GET") {
      try {
        const result = await env.DB.prepare(
          "SELECT * FROM data_pendaratan ORDER BY kapan_pendaratan DESC",
        ).all();

        return jsonResponse({
          success: true,
          data: result.results,
        });
      } catch (error) {
        return jsonResponse(
          {
            success: false,
            message: "Gagal mengambil data pendaratan.",
            error: error.message,
          },
          500,
        );
      }
    }

    // ========================================================
    // API PENDARATAN - POST
    // ========================================================
    if (path === "/api/pendaratan" && request.method === "POST") {
      try {
        const body = await request.json();

        if (
          !body.kode_sarang ||
          !body.jenis_penyu ||
          !body.kapan_pendaratan ||
          !body.lokasi ||
          body.jumlah_telur === undefined ||
          !body.kapan_penetasan
        ) {
          return jsonResponse(
            { success: false, message: "Data pendaratan belum lengkap." },
            400,
          );
        }

        const kodeSarang = body.kode_sarang.trim().toUpperCase();

        const existing = await env.DB.prepare(
          "SELECT kode_sarang FROM data_pendaratan WHERE kode_sarang = ?",
        )
          .bind(kodeSarang)
          .first();

        if (existing) {
          return jsonResponse(
            { success: false, message: "Kode sarang sudah terdaftar." },
            409,
          );
        }

        await env.DB.prepare(
          `INSERT INTO data_pendaratan
           (kode_sarang, tampilan_sarang, jenis_penyu, kapan_pendaratan, lokasi, jumlah_telur, kapan_penetasan)
           VALUES (?, ?, ?, ?, ?, ?, ?)`,
        )
          .bind(
            kodeSarang,
            body.tampilan_sarang || null,
            body.jenis_penyu,
            body.kapan_pendaratan,
            body.lokasi,
            Number(body.jumlah_telur),
            body.kapan_penetasan,
          )
          .run();

        return jsonResponse({
          success: true,
          message: `Data Sarang ${kodeSarang} berhasil ditambahkan.`,
        });
      } catch (error) {
        return jsonResponse(
          {
            success: false,
            message: "Gagal menambahkan data pendaratan.",
            error: error.message,
          },
          500,
        );
      }
    }

    // ========================================================
    // API PENDARATAN - PUT
    // ========================================================
    if (path.startsWith("/api/pendaratan/") && request.method === "PUT") {
      try {
        const kodeLama = decodeURIComponent(
          path.replace("/api/pendaratan/", ""),
        );

        const body = await request.json();

        if (
          !body.kode_sarang ||
          !body.jenis_penyu ||
          !body.kapan_pendaratan ||
          !body.lokasi ||
          body.jumlah_telur === undefined ||
          !body.kapan_penetasan
        ) {
          return jsonResponse(
            { success: false, message: "Data pendaratan belum lengkap." },
            400,
          );
        }

        const kodeBaru = body.kode_sarang.trim().toUpperCase();

        const existing = await env.DB.prepare(
          "SELECT kode_sarang FROM data_pendaratan WHERE kode_sarang = ?",
        )
          .bind(kodeLama)
          .first();

        if (!existing) {
          return jsonResponse(
            { success: false, message: "Data pendaratan tidak ditemukan." },
            404,
          );
        }

        if (kodeBaru !== kodeLama) {
          const duplicate = await env.DB.prepare(
            "SELECT kode_sarang FROM data_pendaratan WHERE kode_sarang = ?",
          )
            .bind(kodeBaru)
            .first();

          if (duplicate) {
            return jsonResponse(
              { success: false, message: "Kode sarang baru sudah digunakan." },
              409,
            );
          }
        }

        await env.DB.prepare(
          `UPDATE data_pendaratan
           SET kode_sarang = ?, tampilan_sarang = ?, jenis_penyu = ?, kapan_pendaratan = ?, lokasi = ?, jumlah_telur = ?, kapan_penetasan = ?
           WHERE kode_sarang = ?`,
        )
          .bind(
            kodeBaru,
            body.tampilan_sarang || null,
            body.jenis_penyu,
            body.kapan_pendaratan,
            body.lokasi,
            Number(body.jumlah_telur),
            body.kapan_penetasan,
            kodeLama,
          )
          .run();

        return jsonResponse({
          success: true,
          message: `Data Sarang ${kodeBaru} berhasil diperbarui.`,
        });
      } catch (error) {
        return jsonResponse(
          {
            success: false,
            message: "Gagal memperbarui data pendaratan.",
            error: error.message,
          },
          500,
        );
      }
    }

    // ========================================================
    // API PENDARATAN - DELETE
    // ========================================================
    if (path.startsWith("/api/pendaratan/") && request.method === "DELETE") {
      try {
        const kodeSarang = decodeURIComponent(
          path.replace("/api/pendaratan/", ""),
        );

        const existing = await env.DB.prepare(
          "SELECT kode_sarang FROM data_pendaratan WHERE kode_sarang = ?",
        )
          .bind(kodeSarang)
          .first();

        if (!existing) {
          return jsonResponse(
            { success: false, message: "Data pendaratan tidak ditemukan." },
            404,
          );
        }

        await env.DB.prepare("DELETE FROM data_adopsi WHERE kode_sarang = ?")
          .bind(kodeSarang)
          .run();

        await env.DB.prepare(
          "DELETE FROM data_pendaratan WHERE kode_sarang = ?",
        )
          .bind(kodeSarang)
          .run();

        return jsonResponse({
          success: true,
          message: `Data Sarang ${kodeSarang} berhasil dihapus.`,
        });
      } catch (error) {
        return jsonResponse(
          {
            success: false,
            message: "Gagal menghapus data pendaratan.",
            error: error.message,
          },
          500,
        );
      }
    }

    // ========================================================
    // API ADOPSI - GET & POST
    // ========================================================
    if (path === "/api/adopsi" && request.method === "GET") {
      try {
        const result = await env.DB.prepare(
          "SELECT * FROM data_adopsi ORDER BY kode_sarang",
        ).all();

        return jsonResponse({ success: true, data: result.results });
      } catch (error) {
        return jsonResponse(
          {
            success: false,
            message: "Gagal mengambil data adopsi.",
            error: error.message,
          },
          500,
        );
      }
    }

    if (path === "/api/adopsi" && request.method === "POST") {
      try {
        const body = await request.json();

        if (
          !body.kode_sarang ||
          !body.jenis_penyu ||
          body.jumlah_telur === undefined ||
          !body.lokasi ||
          !body.berapa_sarang ||
          !body.nama_adopter
        ) {
          return jsonResponse(
            { success: false, message: "Data adopsi belum lengkap" },
            400,
          );
        }

        const pendaratan = await env.DB.prepare(
          "SELECT * FROM data_pendaratan WHERE kode_sarang = ?",
        )
          .bind(body.kode_sarang)
          .first();

        if (!pendaratan) {
          return jsonResponse(
            { success: false, message: "Sarang tidak ditemukan." },
            404,
          );
        }

        const existingAdopsi = await env.DB.prepare(
          "SELECT kode_sarang FROM data_adopsi WHERE kode_sarang = ?",
        )
          .bind(body.kode_sarang)
          .first();

        if (existingAdopsi) {
          return jsonResponse(
            { success: false, message: "Sarang tersebut sudah diadopsi." },
            409,
          );
        }

        await env.DB.prepare(
          `INSERT INTO data_adopsi
           (kode_sarang, jenis_penyu, jumlah_telur, lokasi, berapa_sarang, nama_adopter, email_adopter, bukti_pembayaran, tahap, progress, status_tahap)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        )
          .bind(
            body.kode_sarang,
            body.jenis_penyu,
            Number(body.jumlah_telur),
            body.lokasi,
            Number(body.berapa_sarang),
            body.nama_adopter,
            body.email_adopter || null,
            body.bukti_pembayaran || null,
            1,
            25,
            "Tahap 1: Formulir Masuk",
          )
          .run();

        return jsonResponse({
          success: true,
          message: "Data adopsi berhasil ditambahkan.",
        });
      } catch (error) {
        return jsonResponse(
          {
            success: false,
            message: "Gagal menambahkan data adopsi.",
            error: error.message,
          },
          500,
        );
      }
    }

    // ========================================================
    // API ADOPSI - UPDATE FASE
    // ========================================================
    if (
      path.startsWith("/api/adopsi/") &&
      path.endsWith("/fase") &&
      request.method === "PUT"
    ) {
      try {
        const kodeSarang = decodeURIComponent(
          path.replace("/api/adopsi/", "").replace("/fase", ""),
        );
        const body = await request.json();

        const existing = await env.DB.prepare(
          "SELECT id FROM data_perkembangan_penyu WHERE kode_sarang = ?",
        )
          .bind(kodeSarang)
          .first();

        if (existing) {
          await env.DB.prepare(
            `UPDATE data_perkembangan_penyu
             SET link_gdrive_fase1 = ?, link_gdrive_fase2 = ?, link_gdrive_fase3 = ?,
                 dokumentasi_fase1 = ?, dokumentasi_fase2 = ?, dokumentasi_fase3 = ?,
                 status = ?
             WHERE kode_sarang = ?`,
          )
            .bind(
              body.link_gdrive_fase1 || null,
              body.link_gdrive_fase2 || null,
              body.link_gdrive_fase3 || null,
              body.dokumentasi_fase1
                ? JSON.stringify(body.dokumentasi_fase1)
                : null,
              body.dokumentasi_fase2
                ? JSON.stringify(body.dokumentasi_fase2)
                : null,
              body.dokumentasi_fase3
                ? JSON.stringify(body.dokumentasi_fase3)
                : null,
              body.status || "Progres Adopsi Aktif",
              kodeSarang,
            )
            .run();
        } else {
          await env.DB.prepare(
            `INSERT INTO data_perkembangan_penyu
             (kode_sarang, link_gdrive_fase1, link_gdrive_fase2, link_gdrive_fase3,
              dokumentasi_fase1, dokumentasi_fase2, dokumentasi_fase3, status)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
          )
            .bind(
              kodeSarang,
              body.link_gdrive_fase1 || null,
              body.link_gdrive_fase2 || null,
              body.link_gdrive_fase3 || null,
              body.dokumentasi_fase1
                ? JSON.stringify(body.dokumentasi_fase1)
                : null,
              body.dokumentasi_fase2
                ? JSON.stringify(body.dokumentasi_fase2)
                : null,
              body.dokumentasi_fase3
                ? JSON.stringify(body.dokumentasi_fase3)
                : null,
              body.status || "Progres Adopsi Aktif",
            )
            .run();
        }

        return jsonResponse({
          success: true,
          message: `Dokumentasi Fase Sarang ${kodeSarang} berhasil disimpan.`,
        });
      } catch (error) {
        return jsonResponse(
          {
            success: false,
            message: "Gagal menyimpan dokumentasi fase.",
            error: error.message,
          },
          500,
        );
      }
    }

    // ========================================================
    // API ADOPSI - UPDATE TAHAP
    // ========================================================
    if (
      path.startsWith("/api/adopsi/") &&
      path.endsWith("/tahap") &&
      request.method === "PUT"
    ) {
      try {
        const kodeSarang = decodeURIComponent(
          path.replace("/api/adopsi/", "").replace("/tahap", ""),
        );
        const body = await request.json();

        await env.DB.prepare(
          `UPDATE data_adopsi
           SET tahap = ?, progress = ?, status_tahap = ?
           WHERE kode_sarang = ?`,
        )
          .bind(
            Number(body.tahap || 1),
            Number(body.progress || 25),
            body.status_tahap || "Sedang diproses",
            kodeSarang,
          )
          .run();

        return jsonResponse({
          success: true,
          message: `Tahapan Sarang ${kodeSarang} berhasil diperbarui.`,
        });
      } catch (error) {
        return jsonResponse(
          {
            success: false,
            message: "Gagal memperbarui tahapan adopsi.",
            error: error.message,
          },
          500,
        );
      }
    }

    // ========================================================
    // API BERITA MITRA
    // Path: /api/berita  DAN  /api/berita-mitra  (keduanya jalan)
    // Database: env.DB_BERITA (data_berita)
    // ========================================================
    const isBeritaPath =
      path === "/api/berita" || path === "/api/berita-mitra";
    const beritaIdMatch = path.match(/^\/api\/(berita|berita-mitra)\/(\d+)$/);

    if (isBeritaPath && request.method === "GET") {
      try {
        if (!env.DB_BERITA) {
          return jsonResponse(
            {
              success: false,
              message: "Binding DB_BERITA belum tersedia. Cek wrangler.toml.",
            },
            500,
          );
        }
        const result = await env.DB_BERITA.prepare(
          `SELECT id, judul, tanggal, isi_berita, link_berita, mitra,
                  penulis, role_penulis, owner_id, owner_name, created_at
           FROM tabel_berita_mitra
           ORDER BY tanggal DESC, id DESC`,
        ).all();

        // Normalisasi field agar frontend mudah baca (isi, link)
        const data = (result.results || []).map((r) => ({
          ...r,
          isi: r.isi_berita,
          link: r.link_berita,
        }));

        return jsonResponse({ success: true, data });
      } catch (error) {
        return jsonResponse(
          {
            success: false,
            message: "Gagal mengambil data berita mitra.",
            error: error.message,
          },
          500,
        );
      }
    }

    if (isBeritaPath && request.method === "POST") {
      try {
        if (!env.DB_BERITA) {
          return jsonResponse(
            { success: false, message: "Binding DB_BERITA belum tersedia." },
            500,
          );
        }
        const body = await request.json();

        const judul = (body.judul || "").trim();
        const tanggal =
          body.tanggal || new Date().toISOString().split("T")[0];
        const isiBerita = String(
          body.isi_berita || body.isi || "",
        ).trim();
        const linkBerita = body.link_berita || body.link || null;
        const mitra = body.mitra || body.owner_name || null;
        const penulis = body.penulis || body.owner_name || "Mitra BTS";
        const role = body.role_penulis || body.role || "mitra";
        const owner_id = body.owner_id || null;
        const owner_name = body.owner_name || penulis;

        if (!judul || !isiBerita) {
          return jsonResponse(
            {
              success: false,
              message: "Judul dan isi berita wajib diisi.",
            },
            400,
          );
        }

        if (isiBerita.length > 150) {
          return jsonResponse(
            {
              success: false,
              message: `Isi berita melebihi 150 karakter (saat ini: ${isiBerita.length}).`,
            },
            400,
          );
        }

        const allowedRoles = ["mitra", "kemitraan", "super_admin", "admin"];
        if (role && !allowedRoles.includes(String(role).toLowerCase())) {
          return jsonResponse(
            {
              success: false,
              message:
                "Hanya Mitra, Admin, dan Super Admin yang dapat menambahkan Berita Mitra.",
            },
            403,
          );
        }

        const insert = await env.DB_BERITA.prepare(
          `INSERT INTO tabel_berita_mitra
             (judul, tanggal, isi_berita, link_berita, mitra, penulis, role_penulis, owner_id, owner_name)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        )
          .bind(
            judul,
            tanggal,
            isiBerita,
            linkBerita,
            mitra,
            penulis,
            role,
            owner_id,
            owner_name,
          )
          .run();

        return jsonResponse({
          success: true,
          message: "Berita Mitra berhasil ditambahkan.",
          data: {
            id: insert.meta.last_row_id,
            judul,
            tanggal,
            isi: isiBerita,
            link: linkBerita,
            mitra,
            owner_id,
            owner_name,
          },
        });
      } catch (error) {
        return jsonResponse(
          {
            success: false,
            message: "Gagal menambahkan berita mitra.",
            error: error.message,
          },
          500,
        );
      }
    }

    if (beritaIdMatch && request.method === "PUT") {
      try {
        const id = Number(beritaIdMatch[2]);
        const body = await request.json();
        const judul = (body.judul || "").trim();
        const isiBerita = String(body.isi_berita || body.isi || "").trim();
        const linkBerita = body.link_berita || body.link || null;
        const mitra = body.mitra || null;

        await env.DB_BERITA.prepare(
          `UPDATE tabel_berita_mitra
           SET judul = ?, isi_berita = ?, link_berita = ?,
               mitra = COALESCE(?, mitra)
           WHERE id = ?`,
        )
          .bind(judul, isiBerita, linkBerita, mitra, id)
          .run();

        return jsonResponse({
          success: true,
          message: "Berita Mitra berhasil diperbarui.",
        });
      } catch (error) {
        return jsonResponse(
          {
            success: false,
            message: "Gagal memperbarui berita mitra.",
            error: error.message,
          },
          500,
        );
      }
    }

    if (beritaIdMatch && request.method === "DELETE") {
      try {
        const id = Number(beritaIdMatch[2]);
        await env.DB_BERITA.prepare(
          "DELETE FROM tabel_berita_mitra WHERE id = ?",
        )
          .bind(id)
          .run();

        return jsonResponse({
          success: true,
          message: "Berita Mitra berhasil dihapus.",
        });
      } catch (error) {
        return jsonResponse(
          {
            success: false,
            message: "Gagal menghapus berita mitra.",
            error: error.message,
          },
          500,
        );
      }
    }

    // ========================================================
    // API WARTA / BERITA INVESTASI
    // Path: /api/warta  DAN  /api/berita-investasi
    // Database: env.DB_BERITA (data_berita)
    // ========================================================
    const isWartaPath =
      path === "/api/warta" || path === "/api/berita-investasi";
    const wartaIdMatch = path.match(
      /^\/api\/(warta|berita-investasi)\/(\d+)$/,
    );

    if (isWartaPath && request.method === "GET") {
      try {
        if (!env.DB_BERITA) {
          return jsonResponse(
            { success: false, message: "Binding DB_BERITA belum tersedia." },
            500,
          );
        }
        const result = await env.DB_BERITA.prepare(
          `SELECT id, judul, tanggal, isi_promosi, link_promosi,
                  penulis, role_penulis, owner_id, owner_name, created_at
           FROM tabel_berita_investasi
           ORDER BY tanggal DESC, id DESC`,
        ).all();

        const data = (result.results || []).map((r) => ({
          ...r,
          isi: r.isi_promosi,
          link: r.link_promosi,
        }));

        return jsonResponse({ success: true, data });
      } catch (error) {
        return jsonResponse(
          {
            success: false,
            message: "Gagal mengambil data warta investasi.",
            error: error.message,
          },
          500,
        );
      }
    }

    if (isWartaPath && request.method === "POST") {
      try {
        if (!env.DB_BERITA) {
          return jsonResponse(
            { success: false, message: "Binding DB_BERITA belum tersedia." },
            500,
          );
        }
        const body = await request.json();

        const judul = (body.judul || "").trim();
        const tanggal =
          body.tanggal || new Date().toISOString().split("T")[0];
        const isiPromosi = String(
          body.isi_promosi || body.isi || "",
        ).trim();
        const linkPromosi = body.link_promosi || body.link || null;
        const penulis = body.penulis || body.owner_name || "Pengelola BTS";
        const role = body.role_penulis || body.role || "admin";
        const owner_id = body.owner_id || null;
        const owner_name = body.owner_name || penulis;

        if (!judul || !isiPromosi) {
          return jsonResponse(
            {
              success: false,
              message: "Judul dan isi promosi wajib diisi.",
            },
            400,
          );
        }

        if (isiPromosi.length > 150) {
          return jsonResponse(
            {
              success: false,
              message: `Isi promosi melebihi 150 karakter (saat ini: ${isiPromosi.length}).`,
            },
            400,
          );
        }

        const allowedRoles = ["super_admin", "admin"];
        if (role && !allowedRoles.includes(String(role).toLowerCase())) {
          return jsonResponse(
            {
              success: false,
              message:
                "Hanya Admin dan Super Admin yang dapat menambahkan Promosi Investasi.",
            },
            403,
          );
        }

        const insert = await env.DB_BERITA.prepare(
          `INSERT INTO tabel_berita_investasi
             (judul, tanggal, isi_promosi, link_promosi, penulis, role_penulis, owner_id, owner_name)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        )
          .bind(
            judul,
            tanggal,
            isiPromosi,
            linkPromosi,
            penulis,
            role,
            owner_id,
            owner_name,
          )
          .run();

        return jsonResponse({
          success: true,
          message: "Promosi Investasi berhasil ditambahkan.",
          data: {
            id: insert.meta.last_row_id,
            judul,
            tanggal,
            isi: isiPromosi,
            link: linkPromosi,
            owner_id,
            owner_name,
          },
        });
      } catch (error) {
        return jsonResponse(
          {
            success: false,
            message: "Gagal menambahkan promosi investasi.",
            error: error.message,
          },
          500,
        );
      }
    }

    if (wartaIdMatch && request.method === "PUT") {
      try {
        const id = Number(wartaIdMatch[2]);
        const body = await request.json();
        const judul = (body.judul || "").trim();
        const isiPromosi = String(body.isi_promosi || body.isi || "").trim();
        const linkPromosi = body.link_promosi || body.link || null;

        await env.DB_BERITA.prepare(
          `UPDATE tabel_berita_investasi
           SET judul = ?, isi_promosi = ?, link_promosi = ?
           WHERE id = ?`,
        )
          .bind(judul, isiPromosi, linkPromosi, id)
          .run();

        return jsonResponse({
          success: true,
          message: "Warta berhasil diperbarui.",
        });
      } catch (error) {
        return jsonResponse(
          {
            success: false,
            message: "Gagal memperbarui warta.",
            error: error.message,
          },
          500,
        );
      }
    }

    if (wartaIdMatch && request.method === "DELETE") {
      try {
        const id = Number(wartaIdMatch[2]);
        await env.DB_BERITA.prepare(
          "DELETE FROM tabel_berita_investasi WHERE id = ?",
        )
          .bind(id)
          .run();

        return jsonResponse({
          success: true,
          message: "Promosi Investasi berhasil dihapus.",
        });
      } catch (error) {
        return jsonResponse(
          {
            success: false,
            message: "Gagal menghapus promosi investasi.",
            error: error.message,
          },
          500,
        );
      }
    }

    // ========================================================
    // API USER - GET
    // ========================================================
    if (path === "/api/users" && request.method === "GET") {
      try {
        const result = await env.DB.prepare(
          "SELECT id, nama, email, role, created_at FROM role ORDER BY id DESC",
        ).all();

        return jsonResponse({ success: true, data: result.results });
      } catch (error) {
        return jsonResponse(
          {
            success: false,
            message: "Gagal mengambil data pengguna.",
            error: error.message,
          },
          500,
        );
      }
    }

    // ========================================================
    // DEFAULT 404
    // ========================================================
    return jsonResponse(
      { success: false, message: "Endpoint tidak ditemukan." },
      404,
    );
  },
};
