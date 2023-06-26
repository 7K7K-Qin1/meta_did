import { Controller, Post, Body } from '@nestjs/common';
import { DIDService } from './did.service';

@Controller('did')
export class DIDController {
  constructor(private readonly didService: DIDService) {}

  @Post('register')
  async register(@Body() requestBody: any) {
    const { controller, name, addr, duration } = requestBody;
    return this.didService.nameRegister(controller,name, addr, duration);
  }
}
