import * as fs from "fs";
import * as iconv from "iconv-lite";
import * as path from "path";

import { Logger } from "./Logger";

const TITLE_STR = "#TITLE";

export class DefReader {
    private title = "";
    private rawStr: string;
    private properlyInitialized = false;

    constructor(filePath: string) {
        const dataBuffer = fs.readFileSync(filePath);
        this.rawStr = iconv.decode(dataBuffer, "Shift-JIS");

        // Check if decoding worked
        this.rawStr = iconv.decode(dataBuffer, "Shift-JIS");
        let titlePropertyIndex = this.rawStr.indexOf(TITLE_STR);

        if (titlePropertyIndex === -1) {
            // Try once again with different encode
            this.rawStr = iconv.decode(dataBuffer, "utf16-le");
            titlePropertyIndex = this.rawStr.indexOf(TITLE_STR);
            if (titlePropertyIndex === -1) {
                Logger.logError("Couldn't decode the file '" + path.basename(filePath) +
                    "' in '" + path.dirname(filePath) + "'");
                this.rawStr = "";
                return;
            }
        }

        this.title = this.valueForProperty(TITLE_STR);
        this.properlyInitialized = true;
    }

    public get value(): string {
        return this.rawStr;
    }

    public get songTitle(): string {
        return this.title;
    }

    public get wasProperlyInitialized(): boolean {
        return this.properlyInitialized;
    }

    public get dtxFilenames(): string[] {
        const lines = this.rawStr.split("\n");
        const result = new Array<string>();

        for (const line of lines) {
            if (line.includes(".dtx")) {
                const start = Math.max(line.indexOf(" "), line.indexOf(":"));
                const dtxFileName = line.substr(start + 1).trim();
                result.push(dtxFileName);
            }
        }
        return result;
    }

    private valueForProperty(propertyName: string): string {
        const propertyIndex = this.rawStr.indexOf(propertyName);
        if (propertyIndex > -1) {
            const propertyEnd = this.rawStr.indexOf("\n", propertyIndex);
            const titleLine = this.rawStr.slice(propertyIndex, propertyEnd);
            const propertyStartIndex = Math.max(titleLine.indexOf(":", propertyIndex),
                titleLine.indexOf(" ", propertyIndex)) + 1;

            return titleLine.substring(propertyStartIndex, propertyEnd).trim();
        }
        return "";
    }
}
