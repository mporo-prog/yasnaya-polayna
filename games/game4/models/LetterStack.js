export class LetterStack {

    constructor(letters = []) {this.letters = letters;}

    getTopLetter() {return this.letters[this.letters.length - 1];}

    removeLetter(letter) {
        const index = this.letters.indexOf(letter);

        if (index != -1) {this.letters.splice(index, 1);}
    }

    addLetter(letter) {this.letters.push(letter);}

    isEmpty() {return this.letters.length == 0;}

    getCount() {return this.letters.length;}

    getAll() {return this.letters;}
}