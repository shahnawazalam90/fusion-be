import fs from 'fs';
import path from 'path';

class Logger {

    // private logFile: fs.WriteStream;
    // private static instance: Logger;
    private logFile: string;

    private newDirectory: string = 'logs';

    private LOG_FOLDER = path.join(__dirname, './logs');

    private getTimestamp(): string {
        return new Date().toLocaleString().replace(/[TZ,.:\s/]+/g, '-').replace(/-+/g, '-');
    }

    constructor(fileName: string = `log_${this.getTimestamp()}.log`) {
        this.logFile = path.join(__dirname, '../../logs', fileName);
        this.createLogDirectory();
    }

    private createLogDirectory(): void {
        const logFolder = path.dirname(this.logFile);
        if (!fs.existsSync(logFolder)) {
            fs.mkdirSync(logFolder, { recursive: true });
        }
    }

    log(level: string, message: string): void {
        const logMessage = `[${this.getTimestamp()}] [${level.toUpperCase()}] ${message}\n`;
        fs.appendFileSync(this.logFile, logMessage, 'utf8');
    }

    public info(message: string) {
        console.log(message);
        this.log('info', message);
    }

    public debug(message: string) {
        console.debug(message);
        this.log('debug', message);
    }

    public warn(message: string) {
        console.warn(message);
        this.log('warn', message);
    }

    public error(message: string) {
        console.error(message);
        this.log('error', message);
    }

}

export default Logger;
