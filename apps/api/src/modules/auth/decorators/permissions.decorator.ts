import { SetMetadata, CustomDecorator } from '@nestjs/common';
import { PERMISSIONS_KEY } from '../guards/permissions.guard';

export const Permissions = (...permissions: string[]): CustomDecorator<string> =>
  SetMetadata(PERMISSIONS_KEY, permissions);