import { readdir } from "node:fs/promises";
import { basename, extname, join, resolve } from "node:path";

const SCRIPT_DIR = import.meta.dir;
const PROJECT_ROOT = resolve(SCRIPT_DIR, "../..");

const CONFIG = {
    targetDir: join(PROJECT_ROOT, "translations"),
    outputFile: join(PROJECT_ROOT, "chapters.json"),
    chapterPattern: /^#{1,6}\s+Chapter\s+([\d\.]+)(?:\s*[:\-–])?\s*(.*)$/im,
    urlPrefix: "/nmtci/translations",
} as const;

interface Chapter {
    id: number;
    title: string;
    url: string;
}

async function parseChapterFile(fileName: string): Promise<Chapter | null> {
    const filePath = join(CONFIG.targetDir, fileName);

    try {
        const file = Bun.file(filePath);
        const content = await file.text();
        const match = content.match(CONFIG.chapterPattern);

        if (!match) {
            console.warn(`[WARN] Skipping "${fileName}": No valid chapter header found.`);
            return null;
        }

        const [, idStr, rawTitle] = match;
        const cleanFileName = basename(fileName, extname(fileName));

        if (!idStr) {
            console.warn(`[WARN] Skipping "${fileName}": Match found but ID is missing.`);
            return null;
        }

        return {
            id: parseFloat(idStr),
            title: (rawTitle || "").trim(),
            url: `${CONFIG.urlPrefix}/${cleanFileName}`,
        };
    } catch (error) {
        console.error(`[ERROR] Failed to read file "${fileName}":`, error);
        return null;
    }
}

async function writeIndexFile(chapters: Chapter[]): Promise<void> {
    try {
        await Bun.write(CONFIG.outputFile, JSON.stringify(chapters, null, 2));
        console.log(`\nSuccess: Indexed ${chapters.length} chapters to "${CONFIG.outputFile}"`);
    } catch (error) {
        throw new Error(`Failed to write output file: ${error instanceof Error ? error.message : error}`);
    }
}

async function generateWebIndex() {
    console.log(`Script location: ${SCRIPT_DIR}`);
    console.log(`Resolved Root:   ${PROJECT_ROOT}`);
    console.log(`Scanning:        ${CONFIG.targetDir}...`);

    try {
        const allFiles = await readdir(CONFIG.targetDir);
        const mdFiles = allFiles.filter((file) => file.endsWith(".md"));

        if (mdFiles.length === 0) {
            console.warn("No markdown files found in the target directory.");
            return;
        }

        const results = await Promise.all(mdFiles.map(parseChapterFile));

        const validChapters = results
            .filter((c): c is Chapter => c !== null)
            .sort((a, b) => a.id - b.id);

        await writeIndexFile(validChapters);
    } catch (error) {
        console.error("\nFatal Error:", error);
        process.exit(1);
    }
}

generateWebIndex();