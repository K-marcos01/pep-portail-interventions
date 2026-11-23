import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  IsUUID,
  Min,
  ValidateNested,
} from 'class-validator';

export class CreateQuoteLineDto {
  @IsString()
  @IsNotEmpty({ message: 'Le libellé de la ligne est obligatoire' })
  label: string;

  @IsNumber()
  @IsPositive({ message: 'La quantité doit être supérieure à 0' })
  quantity: number;

  @IsNumber()
  @Min(0, { message: 'Le prix unitaire HT ne peut pas être négatif' })
  unitPriceHT: number;

  @IsOptional()
  @IsUUID(undefined, { message: 'Identifiant de prestation invalide' })
  serviceItemId?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  vatRate?: number;
}

export class CreateQuoteDto {
  @IsUUID(undefined, { message: 'Identifiant client invalide' })
  clientId: string;

  @IsArray({ message: 'Le devis doit contenir une liste de lignes' })
  @ArrayMinSize(1, { message: 'Le devis doit contenir au moins une ligne' })
  @ValidateNested({ each: true })
  @Type(() => CreateQuoteLineDto)
  lines: CreateQuoteLineDto[];
}