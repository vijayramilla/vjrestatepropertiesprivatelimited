"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.resolveMapUrl = void 0;
const functions = __importStar(require("firebase-functions"));
const https = __importStar(require("https"));
const http = __importStar(require("http"));
function followRedirects(url, redirectCount = 0) {
    return new Promise((resolve, reject) => {
        if (redirectCount > 10) {
            return reject(new Error('Too many redirects'));
        }
        const isHttps = url.startsWith('https');
        const lib = isHttps ? https : http;
        const req = lib.get(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (compatible; Bot/1.0)'
            }
        }, (res) => {
            if (res.statusCode &&
                res.statusCode >= 300 &&
                res.statusCode < 400 &&
                res.headers.location) {
                let location = res.headers.location;
                if (location.startsWith('/')) {
                    const parsed = new URL(url);
                    location = `${parsed.protocol}//${parsed.host}${location}`;
                }
                resolve(followRedirects(location, redirectCount + 1));
            }
            else {
                resolve(url);
            }
        });
        req.on('error', reject);
        req.setTimeout(10000, () => {
            req.destroy();
            reject(new Error('Timeout'));
        });
    });
}
function extractCoords(url) {
    const patterns = [
        /!3d(-?\d+\.?\d*)!4d(-?\d+\.?\d*)/,
        /@(-?\d+\.?\d*),(-?\d+\.?\d*)/,
        /[?&]q=(-?\d+\.?\d*),(-?\d+\.?\d*)/,
        /place\/[^/]+\/@(-?\d+\.?\d*),(-?\d+\.?\d*)/,
        /ll=(-?\d+\.?\d*),(-?\d+\.?\d*)/
    ];
    for (const pattern of patterns) {
        const match = url.match(pattern);
        if (match) {
            return {
                lat: parseFloat(match[1]),
                lng: parseFloat(match[2])
            };
        }
    }
    return null;
}
exports.resolveMapUrl = functions
    .region('asia-south1')
    .https.onCall(async (data) => {
    const { url } = data;
    if (!url) {
        throw new functions.https.HttpsError('invalid-argument', 'URL required');
    }
    try {
        const finalUrl = await followRedirects(url);
        const coords = extractCoords(finalUrl);
        return { success: true, finalUrl, coords };
    }
    catch (err) {
        throw new functions.https.HttpsError('internal', err.message);
    }
});
//# sourceMappingURL=index.js.map