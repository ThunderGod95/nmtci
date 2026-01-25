import { readdir } from "node:fs/promises";

const TARGET_DIR = "./translations";
const OUTPUT_FILE = "index.md";

async function generateWebIndex() {
    try {
        const files = await readdir(TARGET_DIR);
        const mdFiles = files.filter((file) => file.endsWith(".md"));
        const chapters = [];

        console.log(mdFiles.length);

        for (const file of mdFiles) {
            const content = await Bun.file(`${TARGET_DIR}/${file}`).text();
            // Extract title from the first line, e.g., "# Chapter 1: The Title"
            const firstLine = content.split("\n")[0].trim();
            const match = firstLine.match(/^#\s+Chapter\s+(\d+):\s*(.+?)$/);

            if (match) {
                chapters.push({
                    num: parseInt(match[1]),
                    title: match[2],
                    link: `translations/${file.replace(".md", ".html")}`,
                });
            } else {
                console.log(`No match in ${TARGET_DIR}/${file}`);
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
