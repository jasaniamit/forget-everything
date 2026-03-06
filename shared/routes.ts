import { z } from 'zod';
import { insertFontSchema, fonts } from './schema';

export const errorSchemas = {
  notFound: z.object({ message: z.string() }),
  internal: z.object({ message: z.string() }),
};

export const api = {
  fonts: {
    list: {
      method: 'GET' as const,
      path: '/api/fonts',
      input: z.object({
        search: z.string().optional(),
        category: z.string().optional(),
        useCase: z.string().optional(),
      }).optional(),
      responses: {
        200: z.array(z.custom<any>()), // Allow extra fields like category
      },
    },
    get: {
      method: 'GET' as const,
      path: '/api/fonts/:id',
      responses: {
        200: z.custom<any>(), // Allow extra fields like category
        404: errorSchemas.notFound,
      },
    },
    incrementDownload: {
      method: 'POST' as const,
      path: '/api/fonts/:id/download',
      responses: {
        200: z.object({ count: z.number() }),
        404: errorSchemas.notFound,
      },
    },
  },
};

export function buildUrl(path: string, params?: Record<string, string | number>): string {
  let url = path;
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (url.includes(`:${key}`)) {
        url = url.replace(`:${key}`, String(value));
      }
    });
  }
  return url;
}
