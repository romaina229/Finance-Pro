<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

/**
 * Plan comptable de départ, inspiré des classes 6 (Charges) du référentiel
 * SYSCOHADA, adapté aux catégories de dépenses courantes d'une ONG.
 *
 * IMPORTANT : ce jeu de codes est un point de départ pédagogique, pas une
 * certification comptable. Chaque ONG doit le faire valider par son
 * comptable ou son commissaire aux comptes avant usage en production,
 * et peut le personnaliser via expense_categories.organization_id.
 */
class ExpenseCategorySeeder extends Seeder
{
    public function run(): void
    {
        $tree = [
            '60' => [
                'name' => 'Achats',
                'children' => [
                    '604' => 'Achats stockés — matières et fournitures',
                    '605' => 'Autres achats (fournitures de bureau, consommables)',
                ],
            ],
            '61' => [
                'name' => 'Transports',
                'children' => [
                    '614' => 'Transport du personnel (missions, déplacements)',
                    '616' => 'Transport de biens et de matériel',
                ],
            ],
            '62' => [
                'name' => 'Services extérieurs A',
                'children' => [
                    '621' => 'Sous-traitance générale',
                    '622' => 'Locations (bureaux, véhicules, salles)',
                    '624' => 'Entretien, réparations et maintenance',
                    '625' => 'Primes d\'assurance',
                    '626' => 'Études, recherches et documentation',
                    '628' => 'Frais de mission et divers',
                ],
            ],
            '63' => [
                'name' => 'Services extérieurs B',
                'children' => [
                    '631' => 'Frais bancaires et mobile money',
                    '632' => 'Rémunérations d\'intermédiaires et honoraires',
                    '633' => 'Frais de formation du personnel',
                    '637' => 'Redevances (logiciels, licences)',
                ],
            ],
            '64' => [
                'name' => 'Impôts et taxes',
                'children' => [
                    '641' => 'Impôts et taxes directs',
                ],
            ],
            '65' => [
                'name' => 'Autres charges',
                'children' => [
                    '658' => 'Charges diverses de gestion courante',
                ],
            ],
            '66' => [
                'name' => 'Charges de personnel',
                'children' => [
                    '661' => 'Rémunérations du personnel national',
                    '663' => 'Indemnités et primes forfaitaires',
                    '664' => 'Charges sociales (CNSS...)',
                ],
            ],
            '67' => [
                'name' => 'Frais financiers',
                'children' => [
                    '671' => 'Intérêts et frais financiers',
                ],
            ],
        ];

        foreach ($tree as $parentCode => $parent) {
            $parentId = DB::table('expense_categories')
                ->where('code', $parentCode)
                ->whereNull('organization_id')
                ->value('id');

            if (! $parentId) {
                $parentId = (string) Str::uuid();
                DB::table('expense_categories')->insert([
                    'id' => $parentId,
                    'organization_id' => null,
                    'parent_id' => null,
                    'code' => $parentCode,
                    'name' => $parent['name'],
                    'created_at' => now(),
                    'updated_at' => now(),
                ]);
            }

            foreach ($parent['children'] as $childCode => $childName) {
                $exists = DB::table('expense_categories')
                    ->where('code', $childCode)
                    ->whereNull('organization_id')
                    ->exists();

                if (! $exists) {
                    DB::table('expense_categories')->insert([
                        'id' => (string) Str::uuid(),
                        'organization_id' => null,
                        'parent_id' => $parentId,
                        'code' => $childCode,
                        'name' => $childName,
                        'created_at' => now(),
                        'updated_at' => now(),
                    ]);
                }
            }
        }
    }
}
