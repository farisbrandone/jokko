import { Module } from '@nestjs/common';
import { IdentityModule } from '../identity/identity.module';
import { ShopModule } from '../shop/shop.module';
import { s3Provider } from './infrastructure/s3.provider';
import { MediaService } from './application/media.service';
import { MediaController } from './presentation/media.controller';

@Module({
  imports: [IdentityModule, ShopModule],
  controllers: [MediaController],
  providers: [s3Provider, MediaService],
  exports: [MediaService],
})
export class MediaModule {}
