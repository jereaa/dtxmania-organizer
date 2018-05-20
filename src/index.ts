import * as fse from "fs-extra";

import { DefReader } from "./DefReader";
import { DtxFileManager } from "./DtxFileManager";

//TODO: Remove this pls
const testPath = "D:/DTXMania/song_files/test/";

fse.readdir(testPath, (err, files) => {
    if (err) {
        console.error("There was an error when trying to read the dir " + testPath + ". Error: " + err);
    } else {
        files.forEach(songDirName => {
            let songDirPath = testPath + songDirName + "/";
            let innerFiles = fse.readdirSync(songDirPath);

            let setFile = innerFiles.find((value) => {
                if (value.toLowerCase() === "set.def") {
                    return true;
                }
                return false;
            });

            if (setFile) {
                let reader = new DefReader(testPath + songDirName + "/" + setFile);

                let dtxFileNames = reader.dtxFilenames;
                for (let i = 0; i < dtxFileNames.length; i++) {
                    const dtxFileName = dtxFileNames[i];
                    
                    let dtxManager = new DtxFileManager(testPath + songDirName + "/" + dtxFileName);
                    dtxManager.checkFiles();
                }

                fse.rename(songDirPath, testPath + reader.title + "/", (err) => {
                    if (err) throw err;
                });
            }

        });
    }
})
