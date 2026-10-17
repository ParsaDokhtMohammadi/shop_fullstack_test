import { OmitType, PartialType } from '@nestjs/swagger';
import { CreateAddressDto } from './create-address.dto';

// isDefault is left out on purpose: switching the default has its own endpoint,
// so there is only one code path that touches the partial unique index.
export class UpdateAddressDto extends PartialType(
  OmitType(CreateAddressDto, ['isDefault'] as const),
) {}
