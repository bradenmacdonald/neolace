// From https://github.com/woltapp/blurhash/blob/master/TypeScript/src/encode.ts
// "JavaScript encoder and decoder for the Wolt BlurHash algorithm"
// By Olli Mahlamäki and contributors, MIT licensed

// Modified to be a single file.

class ValidationError extends Error {
    constructor(message: string) {
        super(message);
        this.name = "ValidationError";
        this.message = message;
    }
}

const digitCharacters = [
    "0",
    "1",
    "2",
    "3",
    "4",
    "5",
    "6",
    "7",
    "8",
    "9",
    "A",
    "B",
    "C",
    "D",
    "E",
    "F",
    "G",
    "H",
    "I",
    "J",
    "K",
    "L",
    "M",
    "N",
    "O",
    "P",
    "Q",
    "R",
    "S",
    "T",
    "U",
    "V",
    "W",
    "X",
    "Y",
    "Z",
    "a",
    "b",
    "c",
    "d",
    "e",
    "f",
    "g",
    "h",
    "i",
    "j",
    "k",
    "l",
    "m",
    "n",
    "o",
    "p",
    "q",
    "r",
    "s",
    "t",
    "u",
    "v",
    "w",
    "x",
    "y",
    "z",
    "#",
    "$",
    "%",
    "*",
    "+",
    ",",
    "-",
    ".",
    ":",
    ";",
    "=",
    "?",
    "@",
    "[",
    "]",
    "^",
    "_",
    "{",
    "|",
    "}",
    "~",
];

const encode83 = (n: number, length: number): string => {
    let result = "";
    for (let i = 1; i <= length; i++) {
        const digit = (Math.floor(n) / Math.pow(83, length - i)) % 83;
        result += digitCharacters[Math.floor(digit)];
    }
    return result;
};

const sRGBToLinear = (value: number) => {
    const v = value / 255;
    if (v <= 0.04045) {
        return v / 12.92;
    } else {
        return Math.pow((v + 0.055) / 1.055, 2.4);
    }
};

const linearTosRGB = (value: number) => {
    const v = Math.max(0, Math.min(1, value));
    if (v <= 0.0031308) {
        return Math.round(v * 12.92 * 255 + 0.5);
    } else {
        return Math.round((1.055 * Math.pow(v, 1 / 2.4) - 0.055) * 255 + 0.5);
    }
};

const sign = (n: number) => (n < 0 ? -1 : 1);

export const signPow = (val: number, exp: number) => sign(val) * Math.pow(Math.abs(val), exp);

type NumberTriplet = [number, number, number];

const bytesPerPixel = 4;

const multiplyBasisFunction = (
    pixels: Uint8ClampedArray,
    width: number,
    height: number,
    basisFunction: (i: number, j: number) => number,
): NumberTriplet => {
    let r = 0;
    let g = 0;
    let b = 0;
    const bytesPerRow = width * bytesPerPixel;

    for (let x = 0; x < width; x++) {
        for (let y = 0; y < height; y++) {
            const basis = basisFunction(x, y);
            r += basis * sRGBToLinear(pixels[bytesPerPixel * x + 0 + y * bytesPerRow]);
            g += basis * sRGBToLinear(pixels[bytesPerPixel * x + 1 + y * bytesPerRow]);
            b += basis * sRGBToLinear(pixels[bytesPerPixel * x + 2 + y * bytesPerRow]);
        }
    }

    const scale = 1 / (width * height);

    return [r * scale, g * scale, b * scale];
};

const encodeDC = (value: NumberTriplet): number => {
    const roundedR = linearTosRGB(value[0]);
    const roundedG = linearTosRGB(value[1]);
    const roundedB = linearTosRGB(value[2]);
    return (roundedR << 16) + (roundedG << 8) + roundedB;
};

const encodeAC = (value: NumberTriplet, maximumValue: number): number => {
    const quantR = Math.floor(
        Math.max(
            0,
            Math.min(18, Math.floor(signPow(value[0] / maximumValue, 0.5) * 9 + 9.5)),
        ),
    );
    const quantG = Math.floor(
        Math.max(
            0,
            Math.min(18, Math.floor(signPow(value[1] / maximumValue, 0.5) * 9 + 9.5)),
        ),
    );
    const quantB = Math.floor(
        Math.max(
            0,
            Math.min(18, Math.floor(signPow(value[2] / maximumValue, 0.5) * 9 + 9.5)),
        ),
    );

    return quantR * 19 * 19 + quantG * 19 + quantB;
};

export const encode = (
    pixels: Uint8ClampedArray,
    width: number,
    height: number,
    componentX: number,
    componentY: number,
): string => {
    if (componentX < 1 || componentX > 9 || componentY < 1 || componentY > 9) {
        throw new ValidationError("BlurHash must have between 1 and 9 components");
    }
    if (width * height * 4 !== pixels.length) {
        throw new ValidationError("Width and height must match the pixels array");
    }

    const factors: Array<[number, number, number]> = [];
    for (let y = 0; y < componentY; y++) {
        for (let x = 0; x < componentX; x++) {
            const normalisation = x == 0 && y == 0 ? 1 : 2;
            const factor = multiplyBasisFunction(
                pixels,
                width,
                height,
                (i: number, j: number) =>
                    normalisation *
                    Math.cos((Math.PI * x * i) / width) *
                    Math.cos((Math.PI * y * j) / height),
            );
            factors.push(factor);
        }
    }

    const dc = factors[0];
    const ac = factors.slice(1);

    let hash = "";

    const sizeFlag = componentX - 1 + (componentY - 1) * 9;
    hash += encode83(sizeFlag, 1);

    let maximumValue: number;
    if (ac.length > 0) {
        const actualMaximumValue = Math.max(...ac.map((val) => Math.max(...val)));
        const quantisedMaximumValue = Math.floor(
            Math.max(0, Math.min(82, Math.floor(actualMaximumValue * 166 - 0.5))),
        );
        maximumValue = (quantisedMaximumValue + 1) / 166;
        hash += encode83(quantisedMaximumValue, 1);
    } else {
        maximumValue = 1;
        hash += encode83(0, 1);
    }

    hash += encode83(encodeDC(dc), 4);

    ac.forEach((factor) => {
        hash += encode83(encodeAC(factor, maximumValue), 2);
    });

    return hash;
};
