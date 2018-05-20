import * as fs from "fs";
import * as iconv from "iconv-lite";
import * as path from "path";
import * as promptSync from "prompt-sync";

const TITLE_STR = "#TITLE";
const PREVIEW_STR = "#PREVIEW:";
const PREIMAGE_STR = "#PREIMAGE:";
const AVI_STR = "#AVI01:";
const AUDIO_START_STR = "#WAV";

export class DtxFileManager {
    private path: string;
    private title: string | null = null;
    private rawStr: string;
    private prompt = promptSync();

    constructor(path : string) {
        this.path = path;
        const dataBuffer = fs.readFileSync(path);
        this.rawStr = iconv.decode(dataBuffer, "Shift-JIS");

        // Check if decoding worked
        if (this.rawStr.indexOf(TITLE_STR) !== -1) {
            return;
        }

        // Try once again woth different coding
        this.rawStr = iconv.decode(dataBuffer, "utf16-le");
        if (this.rawStr.indexOf(TITLE_STR) === -1) {
            console.error("Couldn't decode the file " + path);
            this.rawStr = "";
            return;
        }

        this.title = this.valueForProperty(TITLE_STR);
    }

    /**
     * Checks that all referenced files int the DTX are actually in the folder,
     * and if they are there but not properly referenced, try to correct that.
     */
    checkFiles(): void {
        this.checkFile(PREVIEW_STR);
        this.checkFile(PREIMAGE_STR);
        this.checkFile(AVI_STR);

        // Check for all audio files
        let keepLooking = true;
        let startPos = 0;
        while (keepLooking) {
            let audioPropIndex = this.rawStr.indexOf(AUDIO_START_STR, startPos);

            if (audioPropIndex !== -1) {
                let audioPropEnd = this.rawStr.indexOf(":", audioPropIndex) + 1;
                startPos = audioPropEnd;
                this.checkFile(this.rawStr.substring(audioPropIndex, audioPropEnd));
            } else {
                keepLooking = false;
            }
        }
    }

    private valueForProperty(propertyName: string): string | null {
        let propertyIndex = this.rawStr.indexOf(propertyName);
        if (propertyIndex > -1) {
            let propertyStartIndex = propertyIndex + propertyName.length;
            let propertyEnd = this.rawStr.indexOf("\n", propertyStartIndex);

            return this.rawStr.substring(propertyStartIndex, propertyEnd).trim();
        }
        return null;
    }

    private checkFile(propertyName: string) {
        let dirPath = path.dirname(this.path);
        let filesInDir = fs.readdirSync(dirPath);
        
        // Find where this property is in the file
        let propertyCurValue = this.valueForProperty(propertyName);
        if (propertyCurValue) {

            // If we can't find the file being referenced, then we search for similar files which could have their names changed
            if (!fs.existsSync(path.join(dirPath, propertyCurValue))) {
                let extension = path.extname(propertyCurValue);
                let possiblePropertyFiles = filesInDir.filter((value) => {
                    return value.endsWith(extension);
                })

                if (possiblePropertyFiles.length > 1) {
                    // If we have more than one candidate file

                    console.log("Please select which of this files should be set in " + propertyName + " for song " + this.title);
                    for (let i = 0; i < possiblePropertyFiles.length; i++) {
                        const file = possiblePropertyFiles[i];
                        console.log((i + 1) + "_ " + file + " --- " + (fs.statSync(path.join(dirPath, file)).size / (1024 * 1024)).toFixed(2) + "Mb");
                    }
                    console.log("Currently set value: " + propertyCurValue);
                    let choice = this.promptOption(possiblePropertyFiles.length);
                    fs.renameSync(path.join(dirPath, possiblePropertyFiles[choice - 1]), path.join(dirPath, propertyCurValue));
                } else if (possiblePropertyFiles.length === 1) {
                    // If there's only one file, then rename it

                    fs.renameSync(path.join(dirPath, possiblePropertyFiles[0]), path.join(dirPath, propertyCurValue));
                } else {
                    console.error("Couldn't find any file for property " + propertyName + " for song " + this.title);
                }
            }
        }
    }

    private promptOption(maxNum: number): number {
        let choice = this.prompt("Please input file number: ");
        let parsed = Number.parseInt(choice);

        if (Number.isNaN(parsed) || parsed <= 0 || parsed > maxNum) {
            return this.promptOption(maxNum);
        }
        return parsed;
    }
}