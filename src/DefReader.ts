import * as iconv from "iconv-lite";
import * as fs from "fs";

const TITLE_STR = "#TITLE:";

export class DefReader {
    private rawStr: string;

    constructor(path : string) {
        const dataBuffer = fs.readFileSync(path);
        this.rawStr = iconv.decode(dataBuffer, "Shift-JIS");
    }

    get value(): string {
        return this.rawStr;
    }

    get title(): string {
        let start = this.rawStr.indexOf(TITLE_STR);
        let end = this.rawStr.indexOf("\n", start);
        return this.rawStr.substring(start + TITLE_STR.length, end).trim();
    }

    get dtxFilenames(): string[] {
        let lines = this.rawStr.split("\n");
        let result = new Array<string>();

        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            if (line.includes(".dtx")) {
                let start = line.indexOf(":");
                let dtxFileName = line.substr(start + 1).trim();
                result.push(dtxFileName);
            }
        }
        return result;
    }
}