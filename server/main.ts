import "reflect-metadata";
import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Query,
  Param,
  Req,
  Module,
  ValidationPipe,
  NotFoundException,
  ServiceUnavailableException,
} from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import { SwaggerModule, DocumentBuilder } from "@nestjs/swagger";
import { PrismaClient } from "@prisma/client";
import helmet from "helmet";
import { json } from "express";
import type { Request } from "express";
import { demoProperties } from "./demo";
import { authenticatedUser, requireOwner, validateImageUrls } from "./security";
import { PropertyInput, SearchInput, EnquiryInput, UploadInput } from "./dto";
import { SafeErrorFilter, rateLimiter } from "./http-security";
import { uploadPhoto } from "./uploads";

const database = process.env.DATABASE_URL ? new PrismaClient() : null;
function db() {
  if (!database)
    throw new ServiceUnavailableException(
      "Live accounts are not connected yet. Browsing demo homes is available.",
    );
  return database;
}
const publicFields = {
  id: true,
  title: true,
  city: true,
  locality: true,
  rent: true,
  bedrooms: true,
  area: true,
  furnishing: true,
  description: true,
  images: true,
  latitude: true,
  longitude: true,
} as const;

@Controller("api")
class ApiController {
  @Get("health") health() {
    return { status: "ok", mode: database ? "live" : "demo" };
  }
  @Get("properties") async search(@Query() query: SearchInput) {
    if (!database) {
      let items = demoProperties.filter(
        (p) =>
          (!query.q ||
            `${p.city} ${p.locality} ${p.title}`
              .toLowerCase()
              .includes(query.q.toLowerCase())) &&
          (!query.maxRent || p.rent <= query.maxRent) &&
          (!query.bedrooms || p.bedrooms === query.bedrooms) &&
          (!query.furnishing || p.furnishing === query.furnishing),
      );
      if (query.sort?.startsWith("price"))
        items.sort((a, b) =>
          query.sort === "price-asc" ? a.rent - b.rent : b.rent - a.rent,
        );
      return {
        items: items.slice(
          ((query.page || 1) - 1) * 12,
          (query.page || 1) * 12,
        ),
        total: items.length,
        demo: true,
      };
    }
    const where = {
      ...(query.q
        ? {
            OR: ["title", "city", "locality"].map((key) => ({
              [key]: { contains: query.q, mode: "insensitive" as const },
            })),
          }
        : {}),
      ...(query.maxRent ? { rent: { lte: query.maxRent } } : {}),
      ...(query.bedrooms ? { bedrooms: query.bedrooms } : {}),
      ...(query.furnishing ? { furnishing: query.furnishing } : {}),
    };
    const [items, total] = await Promise.all([
      database.property.findMany({
        where,
        select: publicFields,
        take: 12,
        skip: ((query.page || 1) - 1) * 12,
        orderBy:
          query.sort === "price-asc"
            ? { rent: "asc" }
            : query.sort === "price-desc"
              ? { rent: "desc" }
              : { createdAt: "desc" },
      }),
      database.property.count({ where }),
    ]);
    return { items, total, demo: false };
  }
  @Get("properties/:id") async detail(@Param("id") id: string) {
    const property = database
      ? await database.property.findUnique({
          where: { id },
          select: publicFields,
        })
      : demoProperties.find((p) => p.id === id);
    if (!property)
      throw new NotFoundException("This listing is no longer available.");
    return property;
  }
  @Get("my/properties") async mine(@Req() req: Request) {
    const userId = await authenticatedUser(req);
    return db().property.findMany({
      where: { ownerId: userId },
      select: publicFields,
    });
  }
  @Post("properties") async create(
    @Req() req: Request,
    @Body() input: PropertyInput,
  ) {
    const userId = await authenticatedUser(req);
    validateImageUrls(input.images, userId);
    return db().property.create({
      data: { ...input, ownerId: userId },
      select: publicFields,
    });
  }
  @Put("properties/:id") async update(
    @Req() req: Request,
    @Param("id") id: string,
    @Body() input: PropertyInput,
  ) {
    const userId = await authenticatedUser(req);
    const property = await db().property.findUnique({ where: { id } });
    if (!property) throw new NotFoundException();
    requireOwner(property.ownerId, userId);
    validateImageUrls(input.images, userId);
    return db().property.update({
      where: { id },
      data: input,
      select: publicFields,
    });
  }
  @Delete("properties/:id") async remove(
    @Req() req: Request,
    @Param("id") id: string,
  ) {
    const userId = await authenticatedUser(req);
    const property = await db().property.findUnique({ where: { id } });
    if (!property) throw new NotFoundException();
    requireOwner(property.ownerId, userId);
    await db().property.delete({ where: { id } });
    return { deleted: true };
  }
  @Get("favourites") async favourites(@Req() req: Request) {
    const userId = await authenticatedUser(req);
    return (
      await db().favourite.findMany({
        where: { userId },
        include: { property: { select: publicFields } },
      })
    ).map((f) => f.property);
  }
  @Put("favourites/:id") async save(
    @Req() req: Request,
    @Param("id") propertyId: string,
  ) {
    const userId = await authenticatedUser(req);
    if (!(await db().property.findUnique({ where: { id: propertyId } })))
      throw new NotFoundException();
    await db().favourite.upsert({
      where: { userId_propertyId: { userId, propertyId } },
      create: { userId, propertyId },
      update: {},
    });
    return { saved: true };
  }
  @Delete("favourites/:id") async unsave(
    @Req() req: Request,
    @Param("id") propertyId: string,
  ) {
    const userId = await authenticatedUser(req);
    await db().favourite.deleteMany({ where: { userId, propertyId } });
    return { saved: false };
  }
  @Post("properties/:id/enquiries") async enquire(
    @Req() req: Request,
    @Param("id") propertyId: string,
    @Body() input: EnquiryInput,
  ) {
    const userId = await authenticatedUser(req);
    if (!(await db().property.findUnique({ where: { id: propertyId } })))
      throw new NotFoundException();
    return db().enquiry.create({
      data: { propertyId, userId, message: input.message },
      select: { id: true, createdAt: true },
    });
  }
  @Get("enquiries") async enquiries(@Req() req: Request) {
    const userId = await authenticatedUser(req);
    return db().enquiry.findMany({
      where: { OR: [{ userId }, { property: { ownerId: userId } }] },
      select: {
        id: true,
        message: true,
        createdAt: true,
        property: { select: { title: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 100,
    });
  }
  @Post("uploads") async upload(
    @Req() req: Request,
    @Body() input: UploadInput,
  ) {
    const userId = await authenticatedUser(req);
    db();
    return uploadPhoto(req, userId, input.base64);
  }
}
@Module({ controllers: [ApiController] })
class AppModule {}
export async function createApp() {
  const app = await NestFactory.create(AppModule, { bodyParser: false });
  app.use(helmet());
  app.use(rateLimiter(database));
  app.use(json({ limit: "3mb" }));
  app.useGlobalFilters(new SafeErrorFilter());
  app.enableCors({ origin: process.env.APP_ORIGIN || "http://127.0.0.1:5173" });
  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,
      whitelist: true,
      forbidNonWhitelisted: true,
    }),
  );
  const document = SwaggerModule.createDocument(
    app,
    new DocumentBuilder()
      .setTitle("SmartRent API")
      .setDescription(
        "Rental search and owner workflows. Authentication required for writes.",
      )
      .setVersion("1.0")
      .addBearerAuth()
      .build(),
  );
  SwaggerModule.setup("api/docs", app, document);
  await app.init();
  return app;
}
if (require.main === module)
  createApp().then((app) =>
    app.listen(Number(process.env.PORT || 3001), "127.0.0.1"),
  );
