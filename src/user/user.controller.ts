import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { Action, CheckPermissions, Subject } from '../auth/authorization';
import { UserService } from './user.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { FindAllUsersQueryDto } from './dto/find-all-users-query.dto';

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
  update(@Param('id') id: string, @Body() dto: UpdateUserDto) {
    return this.userService.update(id, dto);
  }

  @Post()
  @CheckPermissions({ action: Action.CREATE, subject: Subject.USER })
  create(@Body() dto: CreateUserDto) {
    return this.userService.create(dto);
  }
}
