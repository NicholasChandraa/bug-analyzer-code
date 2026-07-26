import { simpleGit } from "simple-git";
import { getErrorMessage } from "../../utils/error.js";
import { logger } from "../../utils/logger.js";

/**
 * Interface yang merepresentasikan informasi Git Blame per baris kode.
 */
export interface BlameLine {
    /** Nomor baris di dalam file */
    lineNumber: number
    /** Hash komit yang mengubah baris ini */
    hash: string
    /** Penulis/pengubah baris kode ini */
    author: string
    /** Tanggal komit dalam format ISO string */
    date: string
    /** Isi teks dari baris kode tersebut */
    content: string
}

/**
 * Interface yang merepresentasikan entri entri riwayat komit Git.
 */
export interface LogEntry {
    /** Hash komit (SHA-1) */
    hash: string
    /** Penulis komit */
    author: string
    /** Tanggal komit */
    date: string
    /** Pesan komit (commit message) */
    message: string
}

/**
 * Membaca riwayat commit (`git log`) untuk file tertentu di dalam repositori.
 * Digunakan oleh AI Agent untuk mencari tahu kapan dan mengapa sebuah file/baris berubah.
 * 
 * @param repoPath - Path direktori repositori lokal di disk
 * @param filePath - Path file relatif di dalam repositori
 * @param maxCount - Jumlah maksimal komit yang ingin diambil (default: 20)
 * @returns Array dari objek `LogEntry`
 */
export async function getFileLog(repoPath: string, filePath: string, maxCount = 20): Promise<LogEntry[]> {
    const git = simpleGit(repoPath);

    try {
        const log = await git.log({ file: filePath, maxCount })
        return log.all.map((entry) => ({
            hash: entry.hash,
            author: entry.author_name,
            date: entry.date,
            message: entry.message,
        }))
    } catch (error) {
        throw new Error(`Failed to read git log for ${filePath} in ${repoPath}: ${getErrorMessage(error)}`)
    }
}

/**
 * Membaca riwayat per baris kode (`git blame`) untuk file tertentu di dalam repositori.
 * Menggunakan perintah `git blame --line-porcelain` untuk mendapatkan format machine-readable.
 * 
 * @param repoPath - Path direktori repositori lokal di disk
 * @param filePath - Path file relatif di dalam repositori
 * @returns Array dari objek `BlameLine`
 */
export async function getFileBlame(repoPath: string, filePath: string): Promise<BlameLine[]> {
    const git = simpleGit(repoPath)
    try {
        // "--" wajib ada biar filePath (bisa dari argumen tool/untrusted) yang kebetulan
        // diawali "-" gak kebaca sebagai flag git, tapi tetep sebagai path.
        const raw = await git.raw(["blame", "--line-porcelain", "--", filePath])
        return parseBlamePorcelain(raw)
    } catch (error) {
        throw new Error(`Failed to blame ${filePath} in ${repoPath}: ${getErrorMessage(error)}`)
    }
}

/**
 * Mem-parsing output mentah dari perintah `git blame --line-porcelain` menjadi array dari `BlameLine`.
 * 
 * Format baris `--line-porcelain`:
 * - `<40-char-hash> <orig-line> <final-line>` (Header baris)
 * - `author <Nama Penulis>`
 * - `author-time <Epoch-seconds>`
 * - `\t<Isi Baris Kode>` (Diawali karakter Tab)
 * 
 * @param raw - Output string mentah dari git blame --line-porcelain
 * @returns Array dari `BlameLine`
 */
function parseBlamePorcelain(raw: string): BlameLine[] {
    const result: BlameLine[] = []
    let current: { hash?: string; author?: string; date?: string } = {}

    let lineNumber = 0

    for (const line of raw.split("\n")) {
        // RegEx untuk mencocokkan header 40 karakter heksadesimal SHA-1 hash dan nomor baris akhir
        const header = /^([0-9a-f]{40}) \d+ (\d+)/.exec(line)

        if (header) {
            logger.info({ hash: header[1], lineNum: header[2] }, "HEADER BLAME MATCH!")
            current = { hash: header[1] }
            lineNumber = Number(header[2])
            continue
        }

        if (line.startsWith("author ")) {
            current.author = line.slice("author ".length)
        } else if (line.startsWith("author-time ")) {
            const epochSeconds = Number(line.slice("author-time ".length))

            // Mengonversi epoch detik menjadi milidetik dan membentuk ISO String
            current.date = new Date(epochSeconds * 1000).toISOString()

        } else if (line.startsWith("\t")) {
            result.push({
                lineNumber,
                hash: current.hash ?? "",
                author: current.author ?? "",
                date: current.date ?? "",
                content: line.slice(1),
            })
        }
    }
    return result
}