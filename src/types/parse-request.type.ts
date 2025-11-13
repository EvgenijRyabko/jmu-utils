import { Request } from 'express';

export interface FileBuffer {
  type: string;
  data: string;
}

export interface File {
  fieldname: string;
  buffer: FileBuffer;
  mimetype: string;
  size: number;
  encoding: string;
  originalname: string;
}

export type ParsedRequest = Request & {
  files?: File[];
  rawHeaders: string[];
  headers: Record<string, string>;
};