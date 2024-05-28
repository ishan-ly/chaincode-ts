export class CustomError implements Error {
    public name: string;
    public message: string;
    public statusCode : number;
    public stack?: string;

    constructor(message: string) {
        this.name = 'CustomError';
        this.statusCode = 400;
        this.message = message;
    }
}
