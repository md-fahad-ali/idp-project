import { Document } from 'mongoose';

// Fix for express.default() issue
declare module 'express' {
  const express: any;
  export = express;
}

// Fix for cookieParser.default() issue
declare module 'cookie-parser' {
  const cookieParser: any;
  export = cookieParser;
}

// Fix for cors.default() issue
declare module 'cors' {
  const cors: any;
  export = cors;
} 