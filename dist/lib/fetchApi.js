"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.fetchApi = fetchApi;
const axios_1 = __importDefault(require("axios"));
const nookies_1 = require("nookies");
async function fetchApi(url, cookieName) {
    try {
        const response = await axios_1.default.get(url);
        const data = response.data;
        // Set a secure cookie
        (0, nookies_1.setCookie)(null, cookieName, JSON.stringify(data), {
            maxAge: 30 * 24 * 60 * 60,
            path: '/',
            secure: true,
            sameSite: 'strict',
        });
        return data;
    }
    catch (error) {
        console.error('Error fetching data:', error);
        throw error;
    }
}
