import { readdir } from "node:fs/promises";

const TARGET_DIR = "./translations";
const OUTPUT_FILE = "./chapters.json";

async function generateWebIndex() {
    try {
        const files = await readdir(TARGET_DIR);
        const mdFiles: string[] = files.filter((file) => file.endsWith(".md"));
        const chapters = [];

        console.log(`Found ${mdFiles.length} markdown files.`);

        for (const file of mdFiles) {
            const content: string = await Bun.file(
                `${TARGET_DIR}/${file}`,
            ).text();
            const match = content.match(/^#\s+Chapter\s+(\d+):\s*(.+?)$/m);

            if (match) {
                const chapterNum = parseInt(match[1]);
                const chapterTitle = match[2].trim();
                const compiledFileName = file.replaceAll(".md", "");

                chapters.push({
                    id: chapterNum,
                    title: chapterTitle,
                    url: `../.${TARGET_DIR}/${compiledFileName}`,
                });
            }
        }

        chapters.sort((a, b) => a.id - b.id);

        await Bun.write(OUTPUT_FILE, JSON.stringify(chapters, null, 2));
        console.log(
            `Successfully indexed ${chapters.length} chapters to ${OUTPUT_FILE}`,
        );
    } catch (error) {
        console.error("Error generating index:", error);
    }
}

generateWebIndex();
