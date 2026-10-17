import { ApiProperty } from '@nestjs/swagger';

// The first response DTOs in the codebase. Every other module documents only
// its request shape, which is fine until a response carries fields a caller
// cannot guess: the three order stats below were reaching the frontend
// undeclared, so a client generated from Swagger dropped them silently.
//
// Nothing validates these — they are documentation, so that the typed shape in
// Swagger is the shape the service actually returns. Keep them in step with
// CustomerService by hand; there is no compiler link, which is the price of
// not making the service return class instances.

export class CustomerStatsDto {
  @ApiProperty({
    example: 3,
    description:
      'Orders counted for revenue only: paid, processing, shipped, delivered.',
  })
  ordersCount!: number;

  @ApiProperty({
    example: '624000',
    description: 'Digits-only string in Toman, summed over those same orders.',
  })
  totalSpent!: string;

  @ApiProperty({
    nullable: true,
    type: String,
    format: 'date-time',
    description: 'null when the customer has no revenue-counting order.',
  })
  lastOrderAt!: Date | null;
}

// Account fields shared by the list row and the detail payload.
class CustomerBaseDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({
    nullable: true,
    type: String,
    description:
      'Null for most accounts — `user` holds only the phone number, so the ' +
      'customer’s real name lives on their addresses.',
  })
  fullName!: string | null;

  @ApiProperty({ example: '+989120001122' })
  phoneNumber!: string;

  @ApiProperty({ enum: ['user', 'admin'] })
  role!: string;

  @ApiProperty({ format: 'date-time' })
  createdAt!: Date;
}

// The list row spreads the stats flat; the detail nests them under `stats`.
// The two shapes differ, which is why they are two classes rather than one
// plus an extra field. Documented as it is rather than unified, because
// changing either shape breaks a frontend already reading it.
export class CustomerListRowDto extends CustomerBaseDto {
  @ApiProperty({ example: 3 })
  ordersCount!: number;

  @ApiProperty({ example: '624000' })
  totalSpent!: string;

  @ApiProperty({ nullable: true, type: String, format: 'date-time' })
  lastOrderAt!: Date | null;
}

export class PaginationMetaDto {
  @ApiProperty({ example: 1 })
  page!: number;

  @ApiProperty({ example: 20 })
  limit!: number;

  @ApiProperty({ example: 42 })
  total!: number;

  @ApiProperty({
    example: 3,
    description: 'At least 1, even for an empty list.',
  })
  pageCount!: number;
}

export class CustomerListResponseDto {
  @ApiProperty()
  message!: string;

  @ApiProperty({ type: [CustomerListRowDto] })
  items!: CustomerListRowDto[];

  @ApiProperty({ type: PaginationMetaDto })
  meta!: PaginationMetaDto;
}

class CustomerRecentOrderDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ example: 'ORD-1042' })
  orderNumber!: string;

  @ApiProperty()
  status!: string;

  @ApiProperty({ description: 'The status in Persian, ready to render.' })
  statusLabel!: string;

  @ApiProperty({ example: '624000' })
  grandTotal!: string;

  @ApiProperty({ format: 'date-time' })
  createdAt!: Date;
}

class CustomerDetailDto extends CustomerBaseDto {
  @ApiProperty({ type: CustomerStatsDto })
  stats!: CustomerStatsDto;

  @ApiProperty({
    isArray: true,
    description: 'Every saved address, newest first.',
  })
  addresses!: unknown[];

  @ApiProperty({
    type: [CustomerRecentOrderDto],
    description:
      'The 10 newest orders in every status, abandoned attempts included.',
  })
  recentOrders!: CustomerRecentOrderDto[];
}

export class CustomerDetailResponseDto {
  @ApiProperty()
  message!: string;

  @ApiProperty({ type: CustomerDetailDto })
  payload!: CustomerDetailDto;
}
