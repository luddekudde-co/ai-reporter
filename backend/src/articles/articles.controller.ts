import { Controller, Get, Param, ParseIntPipe, Query } from '@nestjs/common';
import { ArticlesService } from './articles.service';

@Controller('articles')
export class ArticlesController {
  constructor(private readonly articlesService: ArticlesService) {}

  @Get()
  findAll(
    @Query('page', new ParseIntPipe({ optional: true })) page = 1,
    @Query('limit', new ParseIntPipe({ optional: true })) limit = 20,
    @Query('category') category?: string,
    @Query('sort') sort = 'newest',
  ) {
    return this.articlesService.findAll(page, limit, category, sort);
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.articlesService.findOne(id);
  }
}
