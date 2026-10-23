import { customAlphabet } from "nanoid";

// 8-character URL-friendly alphanumeric ID (excludes confusing characters 0/O, 1/l/I)
const alphabet = "23456789abcdefghijkmnopqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ";
export const generatePasteId = customAlphabet(alphabet, 8);
