import { Body, Controller, Get, Post } from '@nestjs/common';
import { ApiHeader, ApiTags } from '@nestjs/swagger';
import { CurrentUserId } from '../../common/decorators/current-user-id.decorator';
import { CreateUserDto } from './dto/create-user.dto';
import { UsersService } from './users.service';

@ApiTags('users')
@ApiHeader({
  name: 'x-user-id',
  required: false,
  description: 'Temporary dev auth header. Falls back to DEMO_USER_ID.',
})
@Controller('v1/users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Post()
  create(@Body() dto: CreateUserDto) {
    return this.usersService.create(dto);
  }

  @Get('me')
  getMe(@CurrentUserId() userId: string) {
    return this.usersService.ensureExists(userId);
  }
}

