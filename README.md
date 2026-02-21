# apex-fast

**apex-fast** adalah plugin untuk [OpenCode AI](https://opencode.ai) yang mengintegrasikan [Morph Fast Apply](https://morphllm.com) — sebuah model AI khusus pengeditan kode dengan kecepatan 10.500+ token/detik dan akurasi 98%. Plugin ini menggantikan alat edit bawaan dengan `morph_edit` yang jauh lebih cepat untuk file besar dan perubahan yang kompleks.

---

## ✨ Fitur

- ⚡ **10x Lebih Cepat** — Gunakan snippet parsial, tanpa perlu membaca seluruh file
- 🧠 **Smart Routing** — Secara otomatis memilih model `morph-v3-fast` atau `morph-v3-large` berdasarkan kompleksitas instruksi
- 🔒 **Override Tool `edit`** — Memblokir penggunaan tool `edit` bawaan dan mengarahkan AI menggunakan `fastApply`
- 🛠️ **MCP Server** — Dapat dijalankan sebagai server MCP mandiri (lokal via stdio atau remote via SSE)

---

## 🚀 Cara Instalasi

### Langkah 1: Dapatkan Morph API Key

Daftar dan dapatkan API key Anda di **[morphllm.com](https://morphllm.com)**.

---

### Langkah 2: Konfigurasi Plugin di OpenCode

Edit file `~/.config/opencode/opencode.json` dan tambahkan plugin berikut:

```json
{
  "plugin": [
    "apex-fast@latest"
  ],
  "instructions": [
    "Follow Instructions in `~/.config/opencode/Morph-Rules.md`"
  ]
}
```

> **Catatan:** Field `"instructions"` memberitahu AI untuk selalu membaca file `Morph-Rules.md` sebagai panduan kapan harus menggunakan `fastApply` vs tool lainnya.

---

### Langkah 3: Install Morph-Rules.md *(WAJIB)*

File `Morph-Rules.md` adalah panduan perilaku AI yang **wajib** disalin ke direktori konfigurasi OpenCode Anda. Tanpa file ini, AI tidak akan tahu kapan dan bagaimana menggunakan `morph_edit` dengan benar.

```bash
# Download Morph-Rules.md ke konfigurasi opencode Anda
curl -o ~/.config/opencode/Morph-Rules.md \
  https://raw.githubusercontent.com/yunaamelia/apex-fast/main/Morph-Rules.md
```

Atau salin secara manual dari repositori ini ke `~/.config/opencode/Morph-Rules.md`.

---

### Langkah 4: Set Environment Variable

Plugin memerlukan `MORPH_API_KEY` yang tersedia di environment.

**Cara permanen (direkomendasikan):**

```bash
# Tambahkan ke ~/.bashrc atau ~/.zshrc
echo 'export MORPH_API_KEY="sk-your-key-here"' >> ~/.bashrc
source ~/.bashrc
```

**Atau** tambahkan langsung ke file `.env` di direktori kerja Anda:

```env
MORPH_API_KEY=sk-your-key-here
```

---

## 🛠️ Cara Menggunakan Tool `fastApply`

Setelah plugin aktif, AI Anda akan memiliki akses ke tool `fastApply`. Gunakan sintaks `// ... existing code ...` sebagai penanda untuk kode yang tidak berubah.

### Parameter

| Parameter      | Tipe     | Wajib | Deskripsi                                                   |
|----------------|----------|-------|-------------------------------------------------------------|
| `filePath`     | `string` | ✅    | Path relatif ke file yang akan diedit                        |
| `instructions` | `string` | ✅    | Instruksi spesifik tentang apa yang harus diubah             |
| `codeEdit`     | `string` | ❌    | Snippet kode parsial dengan penanda `// ... existing code ...` |

### Contoh Penggunaan

**Menambahkan fungsi baru:**
```javascript
// ... existing code ...
import { newDep } from './newDep';
// ... existing code ...

function newFeature() {
  return newDep.process();
}
// ... existing code ...
```

**Memodifikasi fungsi yang ada:**
```javascript
// ... existing code ...
function existingFunc(param) {
  // Updated implementation
  const result = param * 2; // Changed from * 1
  return result;
}
// ... existing code ...
```

> ⚠️ **PENTING:** Selalu sertakan `// ... existing code ...` di awal dan akhir snippet Anda. Jika tidak, Morph akan **menghapus** kode di luar snippet tersebut.

---

## 📋 Panduan Memilih Tool

| Situasi | Tool | Alasan |
|---------|------|--------|
| Penggantian string kecil & tepat | `edit` | Paling cepat, tanpa API call |
| Rename variabel/fungsi sederhana | `edit` | Presisi, tidak perlu AI |
| **File besar (300+ baris)** | `fastApply` | 10x lebih cepat, snippet parsial |
| **Banyak perubahan tersebar** | `fastApply` | Batch changes dalam satu pass |
| **Refaktorisasi kompleks** | `fastApply` | AI memahami konteks lebih baik |
| **Edit sensitif terhadap whitespace** | `fastApply` | Lebih toleran terhadap perbedaan format |

---

## 🖥️ Menjalankan sebagai MCP Server (Opsional)

Plugin ini juga bisa dijalankan sebagai **MCP Server mandiri** untuk digunakan oleh klien MCP lain (misalnya Claude Desktop).

### Mode Stdio (Default)

```bash
MORPH_API_KEY=sk-your-key npx apex-fast-mcp
```

### Mode SSE (Remote/HTTP)

```bash
MORPH_API_KEY=sk-your-key npx apex-fast-mcp sse 3000
```

Server akan berjalan di:
- **SSE Endpoint:** `http://localhost:3000/sse`
- **Message Endpoint:** `http://localhost:3000/message`

---

## ⚠️ Troubleshooting

### Error: `[ERROR] Missing MORPH_API_KEY`

Plugin tidak dapat menemukan API key. Pastikan:
- Environment variable `MORPH_API_KEY` telah di-set
- Jika menggunakan `.env`, pastikan file tersebut ada di direktori kerja

### Error: `[ERROR] Failed to read file`

File yang diberikan pada `filePath` tidak dapat dibaca. Pastikan:
- Path yang diberikan adalah path **relatif** dari direktori kerja saat ini
- File tersebut benar-benar ada di lokasi yang ditentukan

### Fallback jika Morph API Gagal

Jika Morph API mengalami timeout atau rate limit:
1. Plugin akan mengembalikan pesan error dengan detail
2. Gunakan tool `edit` bawaan sebagai fallback
3. Tool `edit` memerlukan pencocokan string yang tepat

---

## 🔧 Development

```bash
mise run build     # Build project
mise run test      # Jalankan tests
mise run lint      # Lint kode
mise run lint:fix  # Perbaiki masalah lint otomatis
```

---

## 📦 Release

Lihat [RELEASE.md](RELEASE.md) untuk instruksi cara merilis versi baru.

---

## 🤝 Kontribusi

Kontribusi sangat disambut! Silakan buka *issue* atau kirim *pull request* di repositori GitHub.

---

## 📄 Lisensi

Lihat [LICENSE](LICENSE) untuk detail.
