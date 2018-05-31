import * as fs from "fs";
import * as path from "path";

import { DefReader } from "./DefReader";
import { DtxFileManager } from "./DtxFileManager";
import { Logger } from "./Logger";
import { Settings } from "./Settings";

const songsPath = Settings.conf.songsDirectory;

fs.readdir(songsPath, (err, files) => {
    if (err) {
        Logger.logError("There was an error when trying to read the dir " + songsPath + ". Error: " + err);
    } else {
        files.forEach((songDirName) => {
            const songDirPath = songsPath + songDirName + "/";

            if (fs.statSync(path.join(songsPath, songDirName)).isDirectory()) {
                const innerFiles = fs.readdirSync(songDirPath);

                const setFile = innerFiles.find((value) => {
                    if (value.toLowerCase() === "set.def") {
                        return true;
                    }
                    return false;
                });

                if (setFile) {
                    const reader = new DefReader(songsPath + songDirName + "/" + setFile);

                    if (reader.wasProperlyInitialized) {
                        const dtxFileNames = reader.dtxFilenames;

                        for (const dtxFilename of dtxFileNames) {
                            const dtxManager = new DtxFileManager(songsPath + songDirName + "/" + dtxFilename);
                            if (dtxManager.wasProperlyInitialized && dtxManager.checkFiles()) {
                                dtxManager.saveFile();
                            }
                            // dtxManager.organizeSongDir();
                            // dtxManager.saveFile();
                        }

                        if (path.basename(songDirPath) !== reader.songTitle) {
                            fs.rename(songDirPath, path.join(songsPath, reader.songTitle), (renameErr) => {
                                if (renameErr) { throw renameErr; }
                                Logger.log("Renamed dir '" + path.basename(songDirPath) +
                                    "' to '" + reader.songTitle + "'");
                            });
                        }
                    }
                } else {
                    Logger.logError("Couldn't find a SET.def file for '" + songDirName + "'");
                }
            }
        });
    }
});
