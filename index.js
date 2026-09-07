async function hashPassword(password) {
  const data = new TextEncoder().encode(password);

  const hashBuffer = await crypto.subtle.digest("SHA-256", data);

  return Array.from(new Uint8Array(hashBuffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

// =========================
// HELPER RESPONSE + CORS
// =========================

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

    // =========================
    // CORS PREFLIGHT
    // =========================

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

    // =========================
    // API LOGIN
    // =========================

    if (path === "/api/login" && request.method === "POST") {
      try {
        const body = await request.json();

        if (!body.email || !body.password) {
          return jsonResponse(
            {
              success: false,
              message: "Email dan password wajib diisi.",
            },
            400,
          );
        }

        const user = await env.DB.prepare("SELECT * FROM role WHERE email = ?")
          .bind(body.email.toLowerCase())
          .first();

        if (!user) {
          return jsonResponse(
            {
              success: false,
              message: "Email atau password salah",
            },
            401,
          );
        }

        const passwordHash = await hashPassword(body.password);

        if (passwordHash !== user.password_hash) {
          return jsonResponse(
            {
              success: false,
              message: "Email atau password salah",
            },
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

    // =========================
    // API REGISTER MASYARAKAT
    // =========================

    if (path === "/api/register" && request.method === "POST") {
      try {
        const body = await request.json();

        if (!body.nama || !body.email || !body.password) {
          return jsonResponse(
            {
              success: false,
              message: "Data pendaftaran belum lengkap",
            },
            400,
          );
        }

        const email = body.email.toLowerCase();

        // Cek email
        const existingUser = await env.DB.prepare(
          "SELECT id FROM role WHERE email = ?",
        )
          .bind(email)
          .first();

        if (existingUser) {
          return jsonResponse(
            {
              success: false,
              message: "Email sudah terdaftar.",
            },
            409,
          );
        }

        // Hash password
        const passwordHash = await hashPassword(body.password);

        // Simpan user sebagai masyarakat
        await env.DB.prepare(
          `INSERT INTO role
           (nama, email, password_hash, role, created_at)
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
    // Tambah data pendaratan
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
            {
              success: false,
              message: "Data pendaratan belum lengkap.",
            },
            400,
          );
        }

        const kodeSarang = body.kode_sarang.trim().toUpperCase();

        // Cek kode sarang
        const existing = await env.DB.prepare(
          "SELECT kode_sarang FROM data_pendaratan WHERE kode_sarang = ?",
        )
          .bind(kodeSarang)
          .first();

        if (existing) {
          return jsonResponse(
            {
              success: false,
              message: "Kode sarang sudah terdaftar.",
            },
            409,
          );
        }

        await env.DB.prepare(
          `INSERT INTO data_pendaratan
           (
             kode_sarang,
             jenis_penyu,
             kapan_pendaratan,
             lokasi,
             jumlah_telur,
             kapan_penetasan
           )
           VALUES (?, ?, ?, ?, ?, ?)`,
        )
          .bind(
            kodeSarang,
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
    // Edit data pendaratan
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
            {
              success: false,
              message: "Data pendaratan belum lengkap.",
            },
            400,
          );
        }

        const kodeBaru = body.kode_sarang.trim().toUpperCase();

        // Cek data lama
        const existing = await env.DB.prepare(
          "SELECT kode_sarang FROM data_pendaratan WHERE kode_sarang = ?",
        )
          .bind(kodeLama)
          .first();

        if (!existing) {
          return jsonResponse(
            {
              success: false,
              message: "Data pendaratan tidak ditemukan.",
            },
            404,
          );
        }

        // Kalau kode sarang diganti, cek apakah kode baru sudah dipakai
        if (kodeBaru !== kodeLama) {
          const duplicate = await env.DB.prepare(
            "SELECT kode_sarang FROM data_pendaratan WHERE kode_sarang = ?",
          )
            .bind(kodeBaru)
            .first();

          if (duplicate) {
            return jsonResponse(
              {
                success: false,
                message: "Kode sarang baru sudah digunakan.",
              },
              409,
            );
          }
        }

        await env.DB.prepare(
          `UPDATE data_pendaratan
           SET
             kode_sarang = ?,
             jenis_penyu = ?,
             kapan_pendaratan = ?,
             lokasi = ?,
             jumlah_telur = ?,
             kapan_penetasan = ?
           WHERE kode_sarang = ?`,
        )
          .bind(
            kodeBaru,
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
    // Hapus data pendaratan
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
            {
              success: false,
              message: "Data pendaratan tidak ditemukan.",
            },
            404,
          );
        }

        // Hapus data adopsi yang terkait terlebih dahulu
        await env.DB.prepare("DELETE FROM data_adopsi WHERE kode_sarang = ?")
          .bind(kodeSarang)
          .run();

        // Hapus data pendaratan
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
    // API ADOPSI - GET
    // ========================================================

    if (path === "/api/adopsi" && request.method === "GET") {
      try {
        const result = await env.DB.prepare(
          "SELECT * FROM data_adopsi ORDER BY kode_sarang",
        ).all();

        return jsonResponse({
          success: true,
          data: result.results,
        });
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

    // ========================================================
    // API ADOPSI - POST
    // ========================================================

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
            {
              success: false,
              message: "Data adopsi belum lengkap",
            },
            400,
          );
        }

        // Pastikan sarang tersedia
        const pendaratan = await env.DB.prepare(
          "SELECT * FROM data_pendaratan WHERE kode_sarang = ?",
        )
          .bind(body.kode_sarang)
          .first();

        if (!pendaratan) {
          return jsonResponse(
            {
              success: false,
              message: "Sarang tidak ditemukan.",
            },
            404,
          );
        }

        // Cek apakah sudah diadopsi
        const existingAdopsi = await env.DB.prepare(
          "SELECT kode_sarang FROM data_adopsi WHERE kode_sarang = ?",
        )
          .bind(body.kode_sarang)
          .first();

        if (existingAdopsi) {
          return jsonResponse(
            {
              success: false,
              message: "Sarang tersebut sudah diadopsi.",
            },
            409,
          );
        }

        await env.DB.prepare(
          `INSERT INTO data_adopsi
           (
             kode_sarang,
             jenis_penyu,
             jumlah_telur,
             lokasi,
             berapa_sarang,
             nama_adopter,
             bukti_pembayaran
           )
           VALUES (?, ?, ?, ?, ?, ?, ?)`,
        )
          .bind(
            body.kode_sarang,
            body.jenis_penyu,
            Number(body.jumlah_telur),
            body.lokasi,
            Number(body.berapa_sarang),
            body.nama_adopter,
            body.bukti_pembayaran || null,
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
    // API USER - GET
    // ========================================================

    if (path === "/api/users" && request.method === "GET") {
      try {
        const result = await env.DB.prepare(
          "SELECT id, nama, email, role, created_at FROM role ORDER BY id DESC",
        ).all();

        return jsonResponse({
          success: true,
          data: result.results,
        });
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

    // =========================
    // DEFAULT
    // =========================

    return jsonResponse(
      {
        success: false,
        message: "Endpoint tidak ditemukan.",
      },
      404,
    );
  },
};
