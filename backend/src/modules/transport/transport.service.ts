import { Injectable, HttpStatus } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import { DomainException, NotFoundException } from '../../common/exceptions/domain.exception';
import { paginate } from '../../common/pagination/pagination.dto';
import {
  AssignStudentTransportDto,
  CreateRouteDto,
  CreateVehicleDto,
  TransportQueryDto,
} from './dto/transport.dto';

@Injectable()
export class TransportService {
  constructor(private readonly prisma: PrismaService) {}

  private async assertSchoolInOrganization(schoolId: string, organizationId: string) {
    const school = await this.prisma.school.findFirst({
      where: { id: schoolId, organizationId, deletedAt: null },
      select: { id: true },
    });
    if (!school) {
      throw new DomainException(
        'INVALID_SCHOOL',
        'The selected school does not belong to your organization',
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  private async getOrganizationSchoolIds(organizationId: string): Promise<string[]> {
    const schools = await this.prisma.school.findMany({
      where: { organizationId, deletedAt: null },
      select: { id: true },
    });
    return schools.map((s) => s.id);
  }

  // --- Vehicles ---
  async createVehicle(organizationId: string, dto: CreateVehicleDto) {
    await this.assertSchoolInOrganization(dto.schoolId, organizationId);

    return this.prisma.vehicle.create({
      data: {
        schoolId: dto.schoolId,
        plateNumber: dto.plateNumber,
        model: dto.model,
        capacity: dto.capacity,
        driverName: dto.driverName,
        driverPhone: dto.driverPhone,
        isActive: true,
      },
    });
  }

  async getVehicles(organizationId: string, query: TransportQueryDto) {
    const skip = (query.page - 1) * query.pageSize;
    const take = query.pageSize;
    const schoolIds = await this.getOrganizationSchoolIds(organizationId);

    const where: Prisma.VehicleWhereInput = {
      schoolId: query.schoolId ? query.schoolId : { in: schoolIds },
      ...(query.search
        ? {
            OR: [
              { plateNumber: { contains: query.search, mode: 'insensitive' } },
              { driverName: { contains: query.search, mode: 'insensitive' } },
            ],
          }
        : {}),
    };

    const total = await this.prisma.vehicle.count({ where });
    const data = await this.prisma.vehicle.findMany({
      where,
      skip,
      take,
      orderBy: { createdAt: 'desc' },
      include: {
        _count: { select: { routes: true } },
      },
    });

    return paginate(data, total, query.page, query.pageSize);
  }

  // --- Routes ---
  async createRoute(organizationId: string, dto: CreateRouteDto) {
    await this.assertSchoolInOrganization(dto.schoolId, organizationId);

    if (dto.vehicleId) {
      const vehicle = await this.prisma.vehicle.findFirst({
        where: { id: dto.vehicleId, schoolId: dto.schoolId },
        select: { id: true },
      });
      if (!vehicle) {
        throw new NotFoundException('Vehicle', dto.vehicleId);
      }
    }

    return this.prisma.route.create({
      data: {
        schoolId: dto.schoolId,
        vehicleId: dto.vehicleId,
        name: dto.name,
        feeMinor: dto.feeMinor ?? 0,
        stops: dto.stops
          ? {
              create: dto.stops.map((s) => ({
                name: s.name,
                sequence: s.sequence,
                scheduledAt: s.scheduledAt,
              })),
            }
          : undefined,
      },
      include: { stops: { orderBy: { sequence: 'asc' } }, vehicle: true },
    });
  }

  async getRoutes(organizationId: string, query: TransportQueryDto) {
    const skip = (query.page - 1) * query.pageSize;
    const take = query.pageSize;
    const schoolIds = await this.getOrganizationSchoolIds(organizationId);

    const where: Prisma.RouteWhereInput = {
      schoolId: query.schoolId ? query.schoolId : { in: schoolIds },
      ...(query.search
        ? {
            OR: [{ name: { contains: query.search, mode: 'insensitive' } }],
          }
        : {}),
    };

    const total = await this.prisma.route.count({ where });
    const data = await this.prisma.route.findMany({
      where,
      skip,
      take,
      orderBy: { createdAt: 'desc' },
      include: {
        vehicle: true,
        stops: { orderBy: { sequence: 'asc' } },
        _count: { select: { assignments: true } },
      },
    });

    return paginate(data, total, query.page, query.pageSize);
  }

  // --- Student Transport Assignments ---
  async assignStudent(organizationId: string, dto: AssignStudentTransportDto) {
    const schoolIds = await this.getOrganizationSchoolIds(organizationId);
    const route = await this.prisma.route.findFirst({
      where: { id: dto.routeId, schoolId: { in: schoolIds } },
      include: {
        vehicle: true,
        _count: { select: { assignments: true } },
      },
    });

    if (!route) {
      throw new NotFoundException('Route', dto.routeId);
    }

    if (route.vehicle && route._count.assignments >= route.vehicle.capacity) {
      throw new DomainException('ROUTE_FULL', 'Vehicle assigned to this route has reached maximum capacity', HttpStatus.CONFLICT);
    }

    const student = await this.prisma.student.findFirst({
      where: { id: dto.studentId, schoolId: route.schoolId, deletedAt: null },
      select: { id: true },
    });
    if (!student) {
      throw new NotFoundException('Student', dto.studentId);
    }

    return this.prisma.transportAssignment.upsert({
      where: {
        studentId: dto.studentId,
      },
      update: {
        routeId: dto.routeId,
        stopId: dto.stopId,
      },
      create: {
        studentId: dto.studentId,
        routeId: dto.routeId,
        stopId: dto.stopId,
      },
    });
  }
}
