# OpenCode MorphLLM Fast Apply Plugin

## TL;DR

> **Quick Summary**: Membuat plugin OpenCode (`FastApplyPlugin`) yang mengintegrasikan SDK MorphLLM (`@morphllm/morphsdk`) untuk pengeditan file yang sangat cepat. Plugin mencegat tool `edit` bawaan agar agen selalu dipaksa menggunakan tool `fastApply` yang baru.
>
> **Deliverables**:
>
> - `src/fast-apply-plugin.ts` (Implementasi Plugin)
> - `src/fast-apply-plugin.test.ts` (Unit Tests)
>
> **Estimated Effort**: Medium
> **Parallel Execution**: NO - sequential (TDD approach)
> **Critical Path**: Setup -> Test Suite -> Implementation -> Export

---

## Context

### Original Request

Membuat plugin untuk OpenCode berdasarkan dokumentasi resmi OpenCode Plugins dan dokumentasi MorphLLM Fast Apply SDK. Meminta interaksi Q&A dengan format pilihan ganda.

### Interview Summary

**Key Decisions**:

- **Pendekatan**: Hybrid. Membuat custom tool `fastApply` DAN mencegat tool `edit` bawaan. Jika AI mencoba menggunakan `edit`, plugin akan melempar error: _"Gunakan tool 'fastApply' untuk mengedit file agar lebih cepat."_
- **API Key**: Membaca dari `process.env.MORPH_API_KEY`.
- **File I/O**: Menggunakan metode `applyEdit` (Sandbox/Manual). Plugin membaca file dengan `fs.promises`, memanggil SDK Morph (hanya memanipulasi string), lalu menulis kembali ke disk.
- **Pengujian**: YES (TDD). Menulis Vitest tests terlebih dahulu (RED-GREEN-REFACTOR).

### Metis Review

**Auto-Resolved Gaps**:

- **Fallback Strategy**: Jika Morph API gagal, lempar `[ERROR]`, jangan fallback ke `edit` standar agar behavior konsisten.
- **Missing File**: Jika file tidak ada, lempar `[ERROR] File not found`.
- **Workspace Root**: Gunakan `context.directory` dari OpenCode Plugin API untuk me-resolve absolute paths.
- **Naming Conventions**: Gunakan kebab-case `src/fast-apply-plugin.ts` sesuai standar `apex-fast`.
- **Error Handling**: Wajib menggunakan `error instanceof Error`, prefix `[ERROR]`, dan tidak ada catch kosong.

---

## Work Objectives

### Core Objective

Mengembangkan OpenCode Plugin yang menyediakan tool `fastApply` bertenaga MorphLLM dan memaksa agen menggunakannya alih-alih tool `edit` lambat bawaan.

### Concrete Deliverables

- Menambahkan `@morphllm/morphsdk` ke `package.json`.
- `src/fast-apply-plugin.test.ts` (TDD suite)
- `src/fast-apply-plugin.ts` (Implementasi utama)
- Pembaruan ekspor di `src/index.ts`.

### Definition of Done

- [x] Test suite pass (`mise run test`).
- [x] Typecheck pass (`mise run typecheck`).
- [x] Agent-Executed QA scenarios pass.

### Must Have

- [x] Intersepsi `tool.execute.before` untuk tool `edit`.
- [x] Tool `fastApply` dengan Zod schema (`instructions` & `codeEdit`).
- [x] Pengecekan `process.env.MORPH_API_KEY`.
- [x] Penggunaan `applyEdit` dari SDK Morph.

### Must NOT Have (Guardrails)

- [x] JANGAN menggunakan `morph.fastApply.execute` (harus manual I/O dengan `applyEdit`).
- [x] JANGAN melempar error tanpa prefix `[ERROR]`.
- [x] JANGAN menggunakan nested if terlalu dalam (Gunakan pola NeverNest / early returns).
- [x] JANGAN menggunakan `any` (Gunakan TypeScript strict mode).

---

## Verification Strategy

> **ZERO HUMAN INTERVENTION** — ALL verification is agent-executed. No exceptions.

### Test Decision

- **Infrastructure exists**: YES
- **Automated tests**: TDD (Test-Driven Development)
- **Framework**: Vitest (`bun test` / `mise run test`)
- **TDD Flow**: Setiap task implementasi didahului oleh penulisan tes yang gagal (RED), diikuti oleh implementasi minimal (GREEN), lalu refaktor (REFACTOR).

### QA Policy

Setiap implementasi akhir wajib diverifikasi melalui skenario QA yang dieksekusi agen (Agent-Executed QA) menggunakan Bash REPL.

---

## Execution Strategy

### Parallel Execution Waves

Karena kita menggunakan pendekatan TDD, gelombang eksekusi bersifat sekuensial (Satu demi satu).

```
Wave 1 (Setup):
├── Task 1: Setup Dependencies [quick]

Wave 2 (TDD - RED):
├── Task 2: Write Vitest Test Suite [deep]

Wave 3 (TDD - GREEN/REFACTOR):
├── Task 3: Implement Plugin Logic [deep]

Wave 4 (Export):
├── Task 4: Export Plugin & Lint [quick]

Wave FINAL:
├── Task F1: Plan compliance audit (oracle)
├── Task F2: Code quality review (unspecified-high)
├── Task F3: Real manual QA (unspecified-high)
└── Task F4: Scope fidelity check (deep)
```

---

## TODOs

- [x] 1. **Setup Dependencies**

  **What to do**:
  - Periksa `package.json` untuk `@morphllm/morphsdk`.
  - Jika belum ada, jalankan `bun add @morphllm/morphsdk`.
  - Pastikan types OpenCode plugin tersedia atau gunakan Zod bawaan.

  **Must NOT do**:
  - Mengubah versi TypeScript atau konfigurasi Vite/Vitest.

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: Operasi terminal sederhana untuk dependency.
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: NO (TDD berurutan).
  - **Blocks**: [Task 2]

  **References**:
  - `package.json` - Cek eksistensi morphsdk.

  **Acceptance Criteria**:
  - [ ] `@morphllm/morphsdk` tercatat di dalam `package.json`.

  **QA Scenarios**:

  ```
  Scenario: Verify morphsdk is installed
    Tool: interactive_bash
    Preconditions: bun add has completed.
    Steps:
      1. Send keys: cat package.json | grep morphsdk Enter
      2. Assert output contains "@morphllm/morphsdk"
    Expected Result: Return true, version displayed.
    Failure Indicators: "morphsdk" not found in package.json.
    Evidence: .sisyphus/evidence/task-1-dependency-check.txt
  ```

  **Commit**: YES (1)
  - Message: `chore(deps): install @morphllm/morphsdk`
  - Files: `package.json bun.lockb`

- [x] 2. **Write Vitest Test Suite**

  **What to do**:
  - Buat `src/fast-apply-plugin.test.ts`.
  - Setup mock untuk `applyEdit` dari `@morphllm/morphsdk`.
  - Tulis tes untuk skenario:
    1. Plugin melempar error `[ERROR] Missing MORPH_API_KEY` jika tidak ada env.
    2. Hook `tool.execute.before` mencegat eksekusi tool `edit` dan melempar error `"Gunakan tool 'fastApply'..."`.
    3. Tool `fastApply` memanggil `fs.promises.readFile`, lalu memanggil mock `applyEdit` dengan format yang benar, dan memanggil `fs.promises.writeFile`.
    4. Skenario `fastApply` gagal (file tidak ada) melempar error dengan prefix `[ERROR]`.

  **Must NOT do**:
  - Menulis implementasi plugin `src/fast-apply-plugin.ts` di langkah ini. Biarkan test gagal (RED).

  **Recommended Agent Profile**:
  - **Category**: `deep`
    - Reason: Mocking yang kompleks membutuhkan fokus dan pemahaman TDD.
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: NO.
  - **Blocks**: [Task 3]
  - **Blocked By**: [Task 1]

  **References**:
  - Node `fs.promises` - Untuk mocking readFile dan writeFile.

  **Acceptance Criteria**:
  - [ ] File `src/fast-apply-plugin.test.ts` dibuat.
  - [ ] Menjalankan `bun test src/fast-apply-plugin.test.ts` berjalan namun GAGAL (karena implementasi belum ada).

  **QA Scenarios**:

  ```
  Scenario: Test suite fails on unimplemented source (RED phase)
    Tool: Bash
    Preconditions: Test file is written, source is missing/empty.
    Steps:
      1. Run command: bun test src/fast-apply-plugin.test.ts
    Expected Result: Command exits with failure code (1) and shows failing tests.
    Failure Indicators: Tests pass (which means they are not asserting correctly) or syntax error in test file.
    Evidence: .sisyphus/evidence/task-2-test-red.txt
  ```

  **Commit**: YES (2)
  - Message: `test: add fast apply plugin suite`
  - Files: `src/fast-apply-plugin.test.ts`

- [x] 3. **Implement Plugin Logic**

  **What to do**:
  - Buat `src/fast-apply-plugin.ts` yang mendefinisikan `FastApplyPlugin`.
  - Implementasikan pengecekan `process.env.MORPH_API_KEY` (lempar error `[ERROR] Missing MORPH_API_KEY` jika kosong).
  - Implementasikan hook `tool.execute.before`: Jika `input.tool === 'edit'`, langsung `throw new Error("[ERROR] Gunakan tool 'fastApply' untuk mengedit file agar lebih cepat.");`.
  - Implementasikan custom tool `fastApply` menggunakan Zod:
    - Input: `filePath` (string), `instructions` (string), `codeEdit` (string).
    - Baca file lama menggunakan `fs.promises.readFile(absolutePath, 'utf-8')`. Lempar error `[ERROR]` jika gagal.
    - Panggil `applyEdit` dari `@morphllm/morphsdk` dengan parameter: `{ originalCode, codeEdit, instructions, filepath: filePath }`.
    - Tulis hasil `result.mergedCode` menggunakan `fs.promises.writeFile`.
  - Pastikan pengkondisian menggunakan early returns.

  **Must NOT do**:
  - Menggunakan API `morph.fastApply.execute`. Wajib `applyEdit`.
  - Menangani error secara diam-diam (silent catch). Harus di-rethrow atau throw error dengan prefix `[ERROR]`.

  **Recommended Agent Profile**:
  - **Category**: `deep`
    - Reason: Implementasi I/O async dan logic manipulasi string.
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: NO.
  - **Blocks**: [Task 4]
  - **Blocked By**: [Task 2]

  **References**:
  - `src/fast-apply-plugin.test.ts` - Implementasi harus memenuhi test ini.

  **Acceptance Criteria**:
  - [ ] Implementasi selesai sesuai dengan aturan dan guardrails.
  - [ ] `bun test src/fast-apply-plugin.test.ts` berhasil lulus semua tes (GREEN).

  **QA Scenarios**:

  ```
  Scenario: Test suite passes with full implementation (GREEN phase)
    Tool: Bash
    Preconditions: Implementation is complete.
    Steps:
      1. Run command: bun test src/fast-apply-plugin.test.ts
    Expected Result: All tests pass (0 failures).
    Failure Indicators: Any test failure or console syntax error.
    Evidence: .sisyphus/evidence/task-3-test-green.txt
  ```

  **Commit**: YES (3)
  - Message: `feat: implement fast apply plugin`
  - Files: `src/fast-apply-plugin.ts`

- [x] 4. **Export Plugin & Lint**

  **What to do**:
  - Buka `src/index.ts`.
  - Tambahkan ekspor: `export { FastApplyPlugin } from './fast-apply-plugin.ts';`.
  - Jalankan formatter dan linter (contoh: `mise run typecheck` dan `mise run lint`).

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: Modifikasi minor pada entry point dan verifikasi standar kualitas.
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: NO.
  - **Blocked By**: [Task 3]

  **Acceptance Criteria**:
  - [ ] `src/index.ts` berhasil mengekspor plugin.
  - [ ] Proses typecheck dan lint berhasil (exit 0).

  **QA Scenarios**:

  ```
  Scenario: Validate code quality and export structure
    Tool: interactive_bash
    Preconditions: All code is written.
    Steps:
      1. Run command: mise run typecheck && mise run lint
    Expected Result: Command exits with 0 (no TS errors, no linting errors).
    Failure Indicators: Type errors or lint rule violations.
    Evidence: .sisyphus/evidence/task-4-lint.txt
  ```

  **Commit**: YES (4)
  - Message: `chore: export fast apply plugin`
  - Files: `src/index.ts`

---

## Final Verification Wave
