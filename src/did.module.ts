import { Module } from '@nestjs/common';
import { DIDService } from './did.service';
import { DIDController } from './did.controller';

@Module({
  controllers: [DIDController],
  providers: [DIDService],
})
export class DIDModule {}
