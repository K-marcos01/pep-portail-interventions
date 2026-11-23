import {
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';

export class UpdateServiceItemDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty({ message: 'Le libellé de la prestation ne peut pas être vide' })
  label?: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty({ message: "L'unité ne peut pas être vide" })
  unit?: string;

  @IsOptional()
  @IsNumber()
  @Min(0, { message: 'Le prix unitaire HT ne peut pas être négatif' })
  unitPriceHT?: number;

  @IsOptional()
  @IsNumber()
  @Min(0, { message: 'Le taux de TVA ne peut pas être négatif' })
  @Max(100, { message: 'Le taux de TVA ne peut pas dépasser 100 %' })
  vatRate?: number;
}