import { readdir, rename } from "node:fs/promises";
import { join } from "node:path";

// 1. Configuration: Change this to your folder path
const TARGET_DIR = "./translations";

const padFiles = async () => {
    try {
        const allFiles = await readdir(TARGET_DIR);

        const numberFiles = allFiles.filter((file) => /^\d+\.md$/.test(file));

        if (numberFiles.length === 0) {
            console.log("No numbered markdown files found.");
            return;
        }

        const maxNumber = Math.max(
            ...numberFiles.map((f) => parseInt(f.split(".")[0])),
        );
        const padLength = maxNumber.toString().length;

        console.log(
            `Found ${numberFiles.length} files. Max number is ${maxNumber}. Padding to ${padLength} digits.`,
        );

        for (const file of numberFiles) {
            const originalPath = join(TARGET_DIR, file);

            const fileNum = parseInt(file.split(".")[0]);
            const newName = `${fileNum.toString().padStart(padLength, "0")}.md`;
            const newPath = join(TARGET_DIR, newName);

            if (file !== newName) {
                await rename(originalPath, newPath);
                console.log(`Renamed: ${file} -> ${newName}`);
            }
        }

        console.log("✨ Done!");
    } catch (error) {
        console.error("Error processing files:", error);
    }
};

padFiles();
