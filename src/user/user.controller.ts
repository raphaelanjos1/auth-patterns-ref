import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
} from '@nestjs/common';
import { Request } from 'express';
import { ApiTags } from '@nestjs/swagger';
import { Action, CheckPermissions, Subject } from '../auth/authorization';
import { UserService } from './user.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { FindAllUsersQueryDto } from './dto/find-all-users-query.dto';
import { SwaggerApiTags } from '../shared/swagger/api-tags.enum';

@ApiTags(SwaggerApiTags.USERS)
@Controller('user')
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Get()
  @CheckPermissions({ action: Action.READ, subject: Subject.USER })
  findAll(@Query() query: FindAllUsersQueryDto) {
    return this.userService.findAll(query);
  }

  @Get(':id')
  @CheckPermissions({ action: Action.READ, subject: Subject.USER })
  findById(@Param('id') id: string) {
    return this.userService.findById(id);
  }

  @Patch(':id')
  @CheckPermissions({ action: Action.UPDATE, subject: Subject.USER })
  update(@Param('id') id: string, @Body() dto: UpdateUserDto, @Req() req: Request) {
    return this.userService.update(id, dto, req['user']?.sub);
  }

  @Delete(':id')
  @CheckPermissions({ action: Action.DELETE, subject: Subject.USER })
  delete(@Param('id') id: string, @Req() req: Request) {
    return this.userService.delete(id, req['user']?.sub);
  }

  @Post()
  @CheckPermissions({ action: Action.CREATE, subject: Subject.USER })
  create(@Body() dto: CreateUserDto, @Req() req: Request) {
    return this.userService.create(dto, req['user']?.sub);
  }
}
