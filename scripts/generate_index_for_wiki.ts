import { readdir } from "node:fs/promises";

const TARGET_DIR = "./translations";

async function generateIndex() {
    try {
        const files = await readdir(TARGET_DIR);

        const mdFiles = files.filter((file) => file.endsWith(".md"));

        const chapters = [];

        for (const file of mdFiles) {
            const content = await Bun.file(`${TARGET_DIR}/${file}`).text();

            const firstLine = content.split("\n")[0].trim();

            const match = firstLine.match(/^# Chapter (\d+):\s*(.+)$/);

            if (match) {
                const chapterNum = parseInt(match[1]);
                const chapterTitle = match[2];

                chapters.push({
                    num: chapterNum,
                    title: chapterTitle,
                    fileName: file, // Store the actual filename here
                });
            }
        }

        chapters.sort((a, b) => a.num - b.num);

        for (const chapter of chapters) {
            // Use chapter.fileName in the URL instead of chapter.num
            console.log(
                `|${chapter.num} = [https://github.com/ThunderGod95/nmtci/blob/main/translations/${chapter.fileName} Chapter ${chapter.num}: ${chapter.title}]`,
            );
        }
    } catch (error) {
        console.error("Error reading files:", error);
    }
}

generateIndex();
