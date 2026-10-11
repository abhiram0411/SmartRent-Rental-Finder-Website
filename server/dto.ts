import { Type } from "class-transformer";
import {
  IsArray,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  MinLength,
  ArrayMaxSize,
} from "class-validator";
export class PropertyInput {
  @IsString() @MinLength(5) @MaxLength(100) title!: string;
  @IsString() @MinLength(2) @MaxLength(60) city!: string;
  @IsString() @MinLength(2) @MaxLength(80) locality!: string;
  @IsInt() @Min(1000) @Max(1000000) rent!: number;
  @IsInt() @Min(1) @Max(10) bedrooms!: number;
  @IsInt() @Min(100) @Max(50000) area!: number;
  @IsIn(["Furnished", "Semi-furnished", "Unfurnished"]) furnishing!: string;
  @IsString() @MinLength(30) @MaxLength(3000) description!: string;
  @IsArray()
  @ArrayMaxSize(5)
  @IsString({ each: true })
  @MaxLength(500, { each: true })
  images!: string[];
}
export class SearchInput {
  @IsOptional() @IsString() @MaxLength(100) q?: string;
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(1000000)
  maxRent?: number;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(10) bedrooms?: number;
  @IsOptional()
  @IsIn(["Furnished", "Semi-furnished", "Unfurnished"])
  furnishing?: string;
  @IsOptional() @IsIn(["newest", "price-asc", "price-desc"]) sort?: string;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(10000) page?: number;
}
export class EnquiryInput {
  @IsString() @MinLength(10) @MaxLength(1000) message!: string;
}
export class UploadInput {
  @IsString() @MinLength(16) @MaxLength(2796204) base64!: string;
}
