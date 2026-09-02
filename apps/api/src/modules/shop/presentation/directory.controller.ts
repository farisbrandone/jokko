import { Controller, Get, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { DirectoryQuerySchema, type DirectoryQuery } from '@jokko/contracts';
import { ZodValidationPipe } from '../../../shared/zod-validation.pipe';
import { DirectoryService } from '../application/directory.service';

/** Annuaire public des boutiques (page apex de la vitrine). */
@ApiTags('shop')
@Controller('directory')
export class DirectoryController {
  constructor(private readonly directory: DirectoryService) {}

  @Get()
  list(@Query(new ZodValidationPipe(DirectoryQuerySchema)) query: DirectoryQuery) {
    return this.directory.list(query);
  }
}
