import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { Address } from './entities/address.entity';
import { CreateAddressDto } from './dto/create-address.dto';
import { UpdateAddressDto } from './dto/update-address.dto';
import { ADDRESS_MESSAGES } from '../../common/messages';
import { normalizePhone } from '../../common/utils/phone.util';

const MAX_ADDRESSES = 10;

@Injectable()
export class AddressService {
  constructor(
    @InjectRepository(Address)
    private readonly addressRepository: Repository<Address>,
    private readonly dataSource: DataSource,
  ) {}

  // Not paginated, unlike every other list: a user has at most MAX_ADDRESSES
  // rows, so the find is already bounded and page params would be noise the
  // checkout page has to send for nothing. Default first — that is the one the
  // frontend preselects.
  async findAll(userId: string) {
    const addresses = await this.findForUser(userId);

    return { message: ADDRESS_MESSAGES.FETCHED, payload: addresses };
  }

  // The rows themselves, with no { message, payload } wrapper, for another
  // module that is building a response of its own — the admin CRM shows a
  // customer's addresses inside the customer payload.
  findForUser(userId: string): Promise<Address[]> {
    return this.addressRepository.find({
      where: { userId },
      order: { isDefault: 'DESC', createdAt: 'DESC' },
    });
  }

  // The first address a user saves becomes the default even if they did not
  // ask — checkout needs one to preselect. Clearing the old default and
  // inserting the new one is a transaction because the partial unique index
  // would reject the pair as two separate statements.
  async create(userId: string, dto: CreateAddressDto) {
    const phoneNumber = normalizePhone(dto.phoneNumber);
    if (!phoneNumber)
      throw new BadRequestException(ADDRESS_MESSAGES.PHONE_INVALID);
    const count = await this.addressRepository.count({ where: { userId } });
    if (count >= MAX_ADDRESSES)
      throw new BadRequestException(
        ADDRESS_MESSAGES.LIMIT_REACHED(MAX_ADDRESSES),
      );
    const isDefault = count === 0 || dto.isDefault === true;

    const saved = await this.dataSource.transaction(async (manager) => {
      const repository = manager.getRepository(Address);
      if (isDefault)
        await repository.update(
          { userId, isDefault: true },
          { isDefault: false },
        );
      return repository.save(
        repository.create({
          userId,
          firstName: dto.firstName,
          lastName: dto.lastName,
          province: dto.province,
          city: dto.city,
          address: dto.address,
          postalCode: dto.postalCode ?? null,
          phoneNumber,
          info: dto.info ?? null,
          isDefault,
        }),
      );
    });

    return { message: ADDRESS_MESSAGES.CREATED, payload: saved };
  }

  // Scoped by userId as well as id, so a guessed address id cannot edit someone
  // else's. Only the fields sent are touched; isDefault is not editable here.
  async update(userId: string, id: string, dto: UpdateAddressDto) {
    const address = await this.addressRepository.findOne({
      where: { id, userId },
    });
    if (!address) throw new NotFoundException(ADDRESS_MESSAGES.NOT_FOUND);

    if (dto.phoneNumber !== undefined) {
      const phoneNumber = normalizePhone(dto.phoneNumber);
      if (!phoneNumber)
        throw new BadRequestException(ADDRESS_MESSAGES.PHONE_INVALID);
      address.phoneNumber = phoneNumber;
    }

    if (dto.firstName !== undefined) address.firstName = dto.firstName;
    if (dto.lastName !== undefined) address.lastName = dto.lastName;
    if (dto.province !== undefined) address.province = dto.province;
    if (dto.city !== undefined) address.city = dto.city;
    if (dto.address !== undefined) address.address = dto.address;
    if (dto.postalCode !== undefined) address.postalCode = dto.postalCode;
    if (dto.info !== undefined) address.info = dto.info;

    const saved = await this.addressRepository.save(address);

    return { message: ADDRESS_MESSAGES.UPDATED, payload: saved };
  }

  // Hard delete: "order" snapshots the shipping address at purchase time, so a
  // past order renders from its own copy and is unaffected. There is no FK
  // behind "order"."addressId" — see UNCONSTRAINED REFERENCES in
  // docs/schema.sql — so the order keeps the id of a row that is now gone.
  // Nothing reads it to render, and the "ship here again" link has to tolerate
  // a 404 rather than expect a null. Deleting the default promotes the newest
  // remaining address so checkout always has one to preselect.
  async remove(userId: string, id: string) {
    const address = await this.addressRepository.findOne({
      where: { id, userId },
    });
    if (!address) throw new NotFoundException(ADDRESS_MESSAGES.NOT_FOUND);

    await this.dataSource.transaction(async (manager) => {
      const repository = manager.getRepository(Address);

      await repository.delete({ id, userId });
      if (!address.isDefault) return;

      const next = await repository.findOne({
        where: { userId },
        order: { createdAt: 'DESC' },
      });
      if (next) await repository.update({ id: next.id }, { isDefault: true });
    });

    return { message: ADDRESS_MESSAGES.DELETED, payload: { id } };
  }

  // No body: the id in the path says which address wins. One transaction, and
  // the old default is cleared *before* the new one is set — the partial unique
  // index allows only one row per user with isDefault true, so the other order
  // would fail on its own write.
  async setDefault(userId: string, id: string) {
    const address = await this.addressRepository.findOne({
      where: { id, userId },
    });
    if (!address) throw new NotFoundException(ADDRESS_MESSAGES.NOT_FOUND);
    if (address.isDefault)
      return { message: ADDRESS_MESSAGES.DEFAULT_CHANGED, payload: address };

    const saved = await this.dataSource.transaction(async (manager) => {
      const repository = manager.getRepository(Address);

      await repository.update(
        { userId, isDefault: true },
        { isDefault: false },
      );
      await repository.update({ id, userId }, { isDefault: true });

      return repository.findOneByOrFail({ id });
    });

    return { message: ADDRESS_MESSAGES.DEFAULT_CHANGED, payload: saved };
  }
}
