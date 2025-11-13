import { SetMetadata } from '@nestjs/common';

export const ParamsMeta = (meta: string) => SetMetadata('pattern', meta);
