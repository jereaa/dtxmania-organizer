import * as fs from "fs";

export class Settings {
    private static confVar: ISettings;

    public static get conf(): ISettings {
        if (Settings.confVar === undefined || Settings.confVar === null) {
            Settings.confVar = JSON.parse(fs.readFileSync(__dirname + "/../settings.json", "utf8"));
        }
        return Settings.confVar;
    }
}

export interface ISettings {
    songsDirectory: string;
    songDirStructure: IDirStructure[];
}

export interface IDirStructure {
    dirName: string;
    extensions: string[];
}
