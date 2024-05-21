export class InvalidInputError implements Error {
    public name: string;
    public message: string;
    public stack?: string;

    constructor(message: string) {
        this.name = 'InvalidInputError';
        this.message = message;
    }
}
