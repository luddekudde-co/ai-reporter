import { Controller, Get, Param, ParseIntPipe, Post } from '@nestjs/common';
import { DigestService } from './digest.service';

@Controller('digest')
export class DigestController {
  constructor(private readonly digestService: DigestService) {}

  @Get()
  getLatest() {
    return this.digestService.getLatestDigest();
  }

  @Get(':id')
  getById(@Param('id', ParseIntPipe) id: number) {
    return this.digestService.getDigestById(id);
  }

  @Post('generate')
  async generate() {
    await this.digestService.enqueueGeneration();
    return { message: 'Digest generation job enqueued' };
  }
}
