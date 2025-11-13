import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
  Optional,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ParsedRequest } from '@type/parse-request.type';
import { parse } from 'flatted';
import { Observable } from 'rxjs';

@Injectable()
export class RequestParseInterceptor implements NestInterceptor {
  constructor(
    private readonly reflector: Reflector,
    @Optional() private readonly withFiles?: boolean,
  ) {}

  parseParams(url: string, pattern: string) {
    const result: Record<string, string> = {};

    const paramsNames = pattern.match(/:(\w+)/g) || [];
    const params = url.match(/\d+/g) || [];

    for (let i = 0; i < paramsNames.length; i++) {
      const patternPart = paramsNames[i];
      const pathPart = params[i];

      // Если pathPart отсутствует, значит путь короче шаблона — прекращаем цикл
      if (pathPart === undefined) {
        break;
      }

      if (patternPart.startsWith(':')) {
        const paramName = patternPart.slice(1);
        result[paramName] = pathPart;
      }
    }

    return result;
  }

  intercept(
    context: ExecutionContext,
    next: CallHandler<ParsedRequest>,
  ): Observable<ParsedRequest> {
    // Получаем RPC-контекст (для microservices)
    const rpcContext = context.switchToRpc();
    const data = rpcContext.getData();

    const handler = context.getHandler();

    let parsedRequest: ParsedRequest;
    try {
      // Проверка типа входных данных
      if (typeof data !== 'string') {
        throw new TypeError('Request must be a string');
      }

      // Парсинг с обработкой ошибок
      parsedRequest = parse(data);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      throw new Error(`Error parsing request JSON: ${message}`);
    }

    const paramsPattern = this.reflector.get<string>('pattern', handler);

    if (paramsPattern)
      parsedRequest.params = this.parseParams(parsedRequest.originalUrl, paramsPattern);

    // Преобразование rawHeaders в headers
    const headers: Record<string, string> = {};
    const rawHeaders = parsedRequest.rawHeaders || [];

    if (rawHeaders.length > 0 && rawHeaders.length % 2 === 0) {
      for (let i = 0; i < rawHeaders.length; i += 2) {
        const key = rawHeaders[i].toLowerCase(); // Приведение ключа к нижнему регистру
        const value = rawHeaders[i + 1];
        headers[key] = value;
      }
    }
    parsedRequest.headers = headers;

    // Обработка файлов
    if (this.withFiles) {
      parsedRequest.files = parsedRequest.files || [];
    }

    context.getArgs<[ParsedRequest, ...unknown[]]>()[0] = parsedRequest;

    // Возвращаем дальше в контроллер
    return next.handle();
  }
}
