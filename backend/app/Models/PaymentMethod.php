<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class PaymentMethod extends Model
{
    public $timestamps = false;

    protected $fillable = ['code', 'name', 'requires_reference'];

    protected $casts = ['requires_reference' => 'boolean'];
}
