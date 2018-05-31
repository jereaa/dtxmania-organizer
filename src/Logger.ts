import * as fs from "fs";
import * as path from "path";

const LOG_FILENAME = "../DTXO.log";

const LOG_PREFIX = "INFO";
const LOG_ERROR_PREFIX = "ERROR";
const LOG_WARNING_PREFIX = "WARN";

export class Logger {
    private static dataLogged = false;

    public static log(logString: string): void {
        this.innerLog(LOG_PREFIX, logString);
        this.dataLogged = true;
    }

    public static logWarning(logString: string): void {
        this.innerLog(LOG_WARNING_PREFIX, logString);
    }

    public static logError(logString: string): void {
        this.innerLog(LOG_ERROR_PREFIX, logString);
    }

    public static get logCreated(): boolean {
        return this.dataLogged;
    }

    private static innerLog(logPrefix: string, logString: string): void {
        const timestamp = (new Date()).toLocaleString("ja-JP");
        const log = timestamp + " - " + logPrefix + " " + logString + "\n";
        fs.appendFileSync(path.join(__dirname, LOG_FILENAME), log);
    }
}
