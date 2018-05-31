import * as fs from "fs";
import * as iconv from "iconv-lite";
import * as path from "path";
import * as promptSync from "prompt-sync";

import { Logger } from "./Logger";

const TITLE_STR = "#TITLE:";
const PREVIEW_STR = "#PREVIEW:";
const PREIMAGE_STR = "#PREIMAGE:";
const AVI_STR = "#AVI01:";
const AUDIO_START_STR = "#WAV";

export class DtxFileManager {
    private path: string;
    private dir: string;
    private title: string | null = null;
    private rawStr: string = "";
    private prompt = promptSync();

    constructor(pathReceived: string) {
        this.path = pathReceived;
        this.dir = path.dirname(pathReceived);

        let dataBuffer;
        try {
            dataBuffer = fs.readFileSync(pathReceived);
        } catch (error) {
            Logger.logError("Couldn't find file " + path.basename(pathReceived) +
                " in '" + path.dirname(pathReceived) + "'");
            return;
        }

        // Check if decoding worked
        this.rawStr = iconv.decode(dataBuffer, "Shift-JIS");
        if (this.rawStr.indexOf(TITLE_STR) !== -1) {
            this.title = this.valueForProperty(TITLE_STR);
            return;
        }

        // Try once again with different encode
        this.rawStr = iconv.decode(dataBuffer, "utf16-le");
        if (this.rawStr.indexOf(TITLE_STR) === -1) {
            Logger.logError("Couldn't decode the file " + pathReceived);
            this.rawStr = "";
            return;
        }

        this.title = this.valueForProperty(TITLE_STR);
    }

    public get wasProperlyInitialized(): boolean {
        return this.title !== null;
    }

    /**
     * Checks that all referenced files int the DTX are actually in the folder,
     * and if they are there but not properly referenced, try to correct that.
     */
    public checkFiles(): boolean {
        this.checkFileForProperty(PREVIEW_STR);
        this.checkFileForProperty(PREIMAGE_STR);
        this.checkFileForProperty(AVI_STR);

        // Check for all audio files
        let keepLooking = true;
        let startPos = 0;
        let propertyModified = false;
        while (keepLooking) {
            const audioPropIndex = this.rawStr.indexOf(AUDIO_START_STR, startPos);

            if (audioPropIndex !== -1) {
                const audioPropEnd = this.rawStr.indexOf(":", audioPropIndex) + 1;
                startPos = audioPropEnd;
                propertyModified = propertyModified
                    || this.checkFileForProperty(this.rawStr.substring(audioPropIndex, audioPropEnd));
            } else {
                keepLooking = false;
            }
        }
        return propertyModified;
    }

    /**
     * Creates directories if they don't exist and puts files corresponding files in them.
     */
    /*public organizeSongDir(): void {
        const dirStructure = Settings.conf.songDirStructure;

        for (const dir of dirStructure) {

            const dirExists = fs.existsSync(path.join(this.dir, dir.dirName));
            if (!dirExists) {
                console.log("Going to create dir at: " + path.join(this.dir, dir.dirName) + "from file: " + this.path);
                fs.mkdirSync(path.join(this.dir, dir.dirName));
            }

            console.log("Searching for ext: " + dir.extensions.toString());
            const filesToMove = this.getFilesByExtension(dir.extensions, this.dir, true);
            console.log("Files to move: " + filesToMove.toString());

            for (const file of filesToMove) {
                console.log("Comparing: '" + file + "' and '" + path.join(dir.dirName, path.basename(file)));
                if (file === path.join(dir.dirName, path.basename(file))) {
                    continue;
                }

                const newFilePath = path.join(this.dir, dir.dirName, path.basename(file));
                fs.renameSync(path.join(this.dir, file), newFilePath);
                console.log("Renamed " + path.join(this.dir, file) + " to " + newFilePath);

                const indexOfValue = this.rawStr.indexOf(path.basename(file));
                const indexOfProperty = this.rawStr.lastIndexOf("#", indexOfValue);
                const endOfPropertyName = this.rawStr.indexOf(":", indexOfProperty) + 1;
                this.changeProperty(this.rawStr.substring(indexOfProperty, endOfPropertyName),
                    dir.dirName + "/" + path.basename(file));
            }
        }
        this.saveFile();
    }
    */

    private getFilesByExtension(
        searchedExtensions: string | string[],
        dirPath: string,
        includeSubdir: boolean): string[] {

        let result = new Array<string>();
        const filesInDir = fs.readdirSync(dirPath);

        let searchedExt: string[];
        if (!Array.isArray(searchedExtensions)) {
            searchedExt = [searchedExtensions];
        } else {
            searchedExt = searchedExtensions;
        }

        for (const file of filesInDir) {
            const filePath = path.join(dirPath, file);

            if (includeSubdir && fs.statSync(filePath).isDirectory()) {
                result = result.concat(
                    this.getFilesByExtension(searchedExt, filePath, includeSubdir).map((x) => file + "/" + x)
                );
            } else {
                // console.log("File: " + file + " - ext: " + path.extname(file));
                const extIndex = searchedExt.findIndex((value) =>
                    value.toLowerCase() === path.extname(file).toLowerCase());

                if (extIndex !== -1) {
                    result.push(file);
                }
            }
        }

        return result;
    }

    /**
     * Function to search a file and get it's relative path to it.
     * @param fileName File to search
     * @param dirPath Directory in which to search
     * @returns Relative path to the file if founded, or null if not found
     */
    private findFile(fileName: string, dirPath: string): string | null {
        const filesInCurDir = fs.readdirSync(dirPath);

        for (const file of filesInCurDir) {

            // If we find our file, we return it.
            if (fileName.trim() === file.trim()) {
                return file;
            } else if (fs.statSync(path.join(dirPath, file)).isDirectory()) {
                // If the file is a dir, keep searching inside it.
                const result = this.findFile(fileName, path.join(dirPath, file));
                if (result !== null) {
                    // Return relative path to file from song dir.
                    return path.join(file, result);
                }
            }
        }
        return null;
    }

    private valueForProperty(propertyName: string): string | null {
        const propertyIndex = this.rawStr.indexOf(propertyName);
        if (propertyIndex > -1) {
            const propertyStartIndex = propertyIndex + propertyName.length;
            const propertyEnd = this.rawStr.indexOf("\n", propertyStartIndex);

            return this.rawStr.substring(propertyStartIndex, propertyEnd).trim();
        }
        return null;
    }

    private changeProperty(propertyName: string, newValue: string): void {
        let propertyKey = propertyName;
        if (!propertyKey.trim().endsWith(":")) {
            propertyKey += ":";
        }

        const valueStartIndex = this.rawStr.indexOf(propertyKey) + propertyKey.length;
        const oldValue = this.rawStr.substring(valueStartIndex, this.rawStr.indexOf("\n", valueStartIndex));

        this.rawStr = this.rawStr.replace(oldValue, " " + newValue);
    }

    public saveFile(): void {
        const encodedContent = iconv.encode(this.rawStr, "Shift-JIS");
        fs.writeFileSync(this.path, encodedContent);
    }

    /**
     * Checks if file for a certain property is properly assigned,
     * and tries to correct it in case it's not properly assigned.
     * @param propertyName Name of property to check file for.
     * @returns True if property has been modified, else returns false.
     */
    private checkFileForProperty(propertyName: string): boolean {

        // Find where this property is in the file
        const propertyCurValue = this.valueForProperty(propertyName);
        if (propertyCurValue) {

            // If we can't find the file being referenced,
            // then we search for similar files which could have their names changed
            if (!fs.existsSync(path.join(this.dir, propertyCurValue))) {

                // First we try to find the file including the subdirs
                // and reassign the property if we find it.
                const filePath = this.findFile(propertyCurValue, this.dir);
                if (filePath !== null) {
                    this.changeProperty(propertyName, filePath);

                    Logger.log("Property '" + propertyName + "' reassigned: '" +
                        propertyCurValue + "' -> '" + filePath + "' in file " + this.path);

                    return true;
                }

                let possiblePropertyFiles = this.getFilesByExtension(path.extname(propertyCurValue), this.dir, true);

                // Filter files that are already assigned to another property
                possiblePropertyFiles = possiblePropertyFiles.filter((value) => {
                    return this.rawStr.indexOf(value) === -1;
                });

                if (possiblePropertyFiles.length > 1) {
                    // If we have more than one candidate file

                    console.log("\nPlease select which of this files should be set in '" +
                        propertyName + "' for song '" + this.title + "'.");

                    let i = 0;
                    for (; i < possiblePropertyFiles.length; i++) {
                        const file = possiblePropertyFiles[i];
                        console.log((i + 1) + "_ " + file + " --- " +
                            (fs.statSync(path.join(this.dir, file)).size / (1024 * 1024)).toFixed(2) + "Mb");
                    }
                    console.log((i + 1) + "_ Leave it as it is.");
                    console.log("Currently set value: " + propertyCurValue);

                    const choice = this.promptOption(possiblePropertyFiles.length);

                    if (choice < i + 1) {
                        const newName = possiblePropertyFiles[choice - 1]
                            .replace(path.basename(possiblePropertyFiles[choice - 1]), propertyCurValue);
                        fs.renameSync(path.join(this.dir, possiblePropertyFiles[choice - 1]),
                            path.join(this.dir, newName));
                        this.changeProperty(propertyName, newName);

                        Logger.log("Renamed file '" + possiblePropertyFiles[choice - 1] +
                            "' to '" + newName + "'.");

                        return true;
                    }

                } else if (possiblePropertyFiles.length === 1) {
                    // If there's only one file, then rename it

                    const newName = possiblePropertyFiles[0]
                        .replace(path.basename(possiblePropertyFiles[0]), propertyCurValue);
                    fs.renameSync(path.join(this.dir, possiblePropertyFiles[0]), path.join(this.dir, newName));
                    this.changeProperty(propertyName, newName);

                    Logger.log("Renamed file '" + possiblePropertyFiles[0] + "' to '" + newName + "'.");

                    return true;

                } else {
                    Logger.logWarning("Couldn't find any file candidate for " + propertyName +
                        " for song " + this.title + " in file " + path.basename(this.path));
                }
            }
        }
        return false;
    }

    private promptOption(maxNum: number): number {
        const choice = this.prompt("Please input file number: ");
        const parsed = Number.parseInt(choice);

        if (Number.isNaN(parsed) || parsed <= 0 || parsed > maxNum + 1) {
            return this.promptOption(maxNum);
        }
        return parsed;
    }
}
