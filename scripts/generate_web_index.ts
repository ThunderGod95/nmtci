import { readdir } from "node:fs/promises";

const TARGET_DIR = "./translations";
const OUTPUT_FILE = "index.md";

async function generateWebIndex() {
    try {
        const files = await readdir(TARGET_DIR);
        const mdFiles = files.filter((file) => file.endsWith(".md"));
        const chapters = [];

        console.log(`Found ${mdFiles.length} markdown files.`);

        for (const file of mdFiles) {
            const content = await Bun.file(`${TARGET_DIR}/${file}`).text();

            // FIX 1: Use the 'm' (multiline) flag to find the header anywhere in the text
            // This ignores the lines at the top
            const match = content.match(/^#\s+Chapter\s+(\d+):\s*(.+?)$/m);

            if (match) {
                const chapterNum = parseInt(match[1]);
                const chapterTitle = match[2].trim(); // trim to remove trailing whitespace

                chapters.push({
                    num: chapterNum,
                    title: chapterTitle,
                    fileName: file,
                    // FIX 2: Create the 'link' property needed for the output loop later
                    link: `${TARGET_DIR}/${file}`,
                });
            }
        }

        chapters.sort((a, b) => a.num - b.num);

        let outputContent = `---
layout: default
title: Table of Contents
---\n\n`;

        outputContent += `# No Money To Cultivate Immortality\n\n`;
        outputContent += `### [Read on GitHub](https://github.com/ThunderGod95/nmtci)\n\n`;
        outputContent += `## Chapter List\n\n`;

        for (const chap of chapters) {
            // Now 'chap.link' is defined and points to the correct path
            outputContent += `- [Chapter ${chap.num}: ${chap.title}](${chap.link})\n`;
        }

        await Bun.write(OUTPUT_FILE, outputContent);
        console.log(
            `Successfully generated ${OUTPUT_FILE} with ${chapters.length} chapters.`,
        );
    } catch (error) {
        console.error("Error generating index:", error);
    }
}

generateWebIndex();
