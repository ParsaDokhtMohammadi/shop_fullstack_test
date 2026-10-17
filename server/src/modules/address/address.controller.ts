import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiCookieAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AddressService } from './address.service';
import { CreateAddressDto } from './dto/create-address.dto';
import { UpdateAddressDto } from './dto/update-address.dto';
import { AuthGuard } from '../../common/guards/auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { JwtPayload } from '../../common/utils/jwt.util';
import { AUTH_COOKIE } from '../../common/utils/cookie.util';

@ApiTags('Addresses')
@Controller('addresses')
@ApiCookieAuth(AUTH_COOKIE)
@UseGuards(AuthGuard)
export class AddressController {
  constructor(private readonly addressService: AddressService) {}

  @Get()
  @ApiOperation({
    summary: 'My saved addresses',
    description:
      'Default address first, then newest. Not paginated: the number of addresses per user is capped, so the list is always small.',
  })
  findAll(@CurrentUser() user: JwtPayload) {
    return this.addressService.findAll(user.sub);
  }

  @Post()
  @ApiOperation({
    summary: 'Save a new delivery address',
    description:
      'The receiver name and phone are per address, not taken from the account. The phone is normalized to +98 form. The first address saved is always the default; sending isDefault on a later one moves the default to it.',
  })
  create(@CurrentUser() user: JwtPayload, @Body() dto: CreateAddressDto) {
    return this.addressService.create(user.sub, dto);
  }

  @Patch(':id')
  @ApiOperation({
    summary: 'Edit one of my addresses',
    description:
      'Only the fields sent are changed. isDefault is not accepted here — that has its own endpoint. 404 when the address is not your own.',
  })
  update(
    @CurrentUser() user: JwtPayload,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateAddressDto,
  ) {
    return this.addressService.update(user.sub, id, dto);
  }

  @Patch(':id/default')
  @ApiOperation({
    summary: 'Make one of my addresses the default',
    description:
      'Takes no body. The previous default is cleared in the same transaction. Safe to repeat on an address that is already the default. 404 when the address is not your own.',
  })
  setDefault(
    @CurrentUser() user: JwtPayload,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.addressService.setDefault(user.sub, id);
  }

  @Delete(':id')
  @ApiOperation({
    summary: 'Delete one of my addresses',
    description:
      'Past orders keep their own copy of the address, so deleting it does not change order history. Deleting the default promotes the newest remaining address. 404 when the address is not your own.',
  })
  remove(
    @CurrentUser() user: JwtPayload,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.addressService.remove(user.sub, id);
  }
}
