import {
  IsNotEmpty,
  IsNumber,
  IsString,
  Max,
  Min,
} from 'class-validator';

export class CreateServiceItemDto {
  @IsString()
  @IsNotEmpty({ message: 'Le libellé de la prestation est obligatoire' })
  label: string;

  @IsString()
  @IsNotEmpty({ message: "L'unité est obligatoire (ex: heure, jour, forfait)" })
  unit: string;

  @IsNumber()
  @Min(0, { message: 'Le prix unitaire HT ne peut pas être négatif' })
  unitPriceHT: number;

  @IsNumber()
  @Min(0, { message: 'Le taux de TVA ne peut pas être négatif' })
  @Max(100, { message: 'Le taux de TVA ne peut pas dépasser 100 %' })
  vatRate: number;
}